use std::io::Write;
use std::sync::Arc;
use tokio::sync::mpsc;
use tauri::{AppHandle, Emitter};
use portable_pty::{CommandBuilder, PtySize, native_pty_system};
use serde::{Deserialize, Serialize};

use crate::terminal::environment::EnvironmentInfo;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTerminalRequest {
    pub worktree_id: String,
    pub name: String,
    pub working_directory: String,
}

#[derive(Debug, Clone)]
pub struct TerminalTask {
    pub id: String,
    pub name: String,
    pub worktree_id: String,
    pub working_directory: String,
    pub input_tx: mpsc::UnboundedSender<String>,
    pub is_active: bool,
}

impl TerminalTask {
    pub fn new(
        id: String,
        name: String,
        worktree_id: String,
        working_directory: String,
        input_tx: mpsc::UnboundedSender<String>,
    ) -> Self {
        Self {
            id,
            name,
            worktree_id,
            working_directory,
            input_tx,
            is_active: true,
        }
    }

    pub fn send_input(&self, data: &str) -> Result<(), String> {
        self.input_tx
            .send(data.to_string())
            .map_err(|_| "Terminal task not running".to_string())
    }
}

/// Independent async task that handles terminal I/O streaming
pub async fn terminal_task(
    terminal_id: String,
    request: CreateTerminalRequest,
    input_rx: mpsc::UnboundedReceiver<String>,
    app: AppHandle,
    env_info: Arc<EnvironmentInfo>,
) -> Result<(), String> {
    
    // Create PTY system
    let pty_system = native_pty_system();
    
    // Create PTY pair
    let pty_pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to create PTY: {}", e))?;
    
    // Set up shell command with detected environment
    let mut cmd = if cfg!(windows) {
        CommandBuilder::new("cmd.exe")
    } else {
        // Use user's detected shell or fallback to bash
        let shell_path = if env_info.shell == "zsh" {
            "/bin/zsh"
        } else if env_info.shell == "fish" {
            "/usr/local/bin/fish"
        } else {
            "/bin/bash"
        };
        
        // Check if the detected shell exists, fallback to bash
        let final_shell = if std::path::Path::new(shell_path).exists() {
            shell_path
        } else {
            "/bin/bash"
        };
        
        println!("Using shell: {}", final_shell);
        CommandBuilder::new(final_shell)
    };
    
    // Add enhanced environment variables
    for (key, value) in env_info.get_env_for_spawn() {
        cmd.env(key, value);
    }
    
    // Validate working directory
    let working_dir = std::path::Path::new(&request.working_directory);
    if !working_dir.exists() {
        return Err(format!("Working directory does not exist: {}", request.working_directory));
    }
    cmd.cwd(&request.working_directory);
    
    // Spawn shell process
    let _child = pty_pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;
    
    // Give the shell a moment to initialize and send initial prompt
    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    
    // Get master PTY and split reader/writer before moving
    let pty_master = pty_pair.master;
    
    // Get reader and writer before moving into tasks
    let reader = match pty_master.try_clone_reader() {
        Ok(r) => r,
        Err(e) => {
            return Err(format!("Failed to get PTY reader: {}", e));
        }
    };
    
    let writer = match pty_master.take_writer() {
        Ok(w) => w,
        Err(e) => {
            return Err(format!("Failed to get PTY writer: {}", e));
        }
    };
    
    // Create shutdown coordination
    let (shutdown_tx, shutdown_rx) = mpsc::channel::<()>(1);
    let shutdown_tx_clone = shutdown_tx.clone();
    
    // Clone terminal_id for tasks
    let output_terminal_id = terminal_id.clone();
    let input_terminal_id = terminal_id.clone();
    let cleanup_terminal_id = terminal_id.clone();
    
    // Task 1: Stream output from terminal to frontend
    let output_task = {
        let app = app.clone();
        let mut shutdown_rx = shutdown_rx;
        let output_terminal_id_clone = output_terminal_id.clone();
        tokio::spawn(async move {
            // Create a channel for streaming output from blocking task to async task
            let (output_tx, mut output_rx) = mpsc::unbounded_channel::<Option<String>>();
            
            // Spawn a dedicated blocking task that owns the reader
            let read_handle = tokio::task::spawn_blocking(move || {
                use std::io::Read;
                let mut reader = reader;
                let mut buffer = vec![0u8; 8192];
                
                loop {
                    match reader.read(&mut buffer) {
                        Ok(n) if n > 0 => {
                            let output = String::from_utf8_lossy(&buffer[..n]).to_string();
                            
                            // Send output via channel
                            if output_tx.send(Some(output)).is_err() {
                                break; // Channel closed, probably shutdown
                            }
                        }
                        Ok(_) => {
                            let _ = output_tx.send(None); // Signal EOF
                            break;
                        }
                        Err(_) => {
                            let _ = output_tx.send(None); // Signal error/end
                            break;
                        }
                    }
                }
            });
            
            // Handle output streaming and shutdown coordination
            loop {
                tokio::select! {
                    // Receive output from the blocking reader
                    output_result = output_rx.recv() => {
                        match output_result {
                            Some(Some(output)) => {
                                // Stream output to frontend via Tauri event
                                let event_name = format!("terminal-output-{}", output_terminal_id_clone);
                                if let Err(_) = app.emit(&event_name, &output) {
                                    break; // Frontend disconnected
                                }
                            }
                            Some(None) | None => {
                                break; // EOF or channel closed
                            }
                        }
                    }
                    
                    // Handle shutdown signal
                    _ = shutdown_rx.recv() => {
                        read_handle.abort(); // Stop the blocking reader
                        break;
                    }
                }
            }
        })
    };
    
    // Task 2: Handle input from frontend to terminal
    let input_task = {
        tokio::spawn(async move {
            let mut writer = writer;
            let mut input_rx = input_rx;
            
            while let Some(input_data) = input_rx.recv().await {
                if let Err(_) = writer.write_all(input_data.as_bytes()) {
                    break; // Terminal closed
                }
                
                if let Err(_) = writer.flush() {
                    break;
                }
            }
        })
    };
    
    // Task 3: Wait for either task to complete and handle cleanup
    let cleanup_task = tokio::spawn(async move {
        tokio::select! {
            _ = output_task => {}
            _ = input_task => {}
        }
        
        // Notify frontend that terminal is closed
        let event_name = format!("terminal-closed-{}", cleanup_terminal_id);
        let _ = app.emit(&event_name, ());
        
        // Send shutdown signal to any remaining tasks
        let _ = shutdown_tx_clone.send(()).await;
    });
    
    // Wait for cleanup to complete
    let _ = cleanup_task.await;
    
    Ok(())
}