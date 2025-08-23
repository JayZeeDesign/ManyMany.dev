use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::io::Write;
use portable_pty::{CommandBuilder, PtySize, native_pty_system};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Terminal {
    pub id: String,
    pub worktree_id: String,
    pub name: String,
    pub terminal_type: String,
    pub working_directory: String,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTerminalRequest {
    pub worktree_id: String,
    pub name: String,
    pub working_directory: String,
}

// Global terminal manager
lazy_static::lazy_static! {
    static ref TERMINALS: Arc<Mutex<HashMap<String, Arc<Mutex<Box<dyn portable_pty::MasterPty + Send>>>>>> = Arc::new(Mutex::new(HashMap::new()));
}

#[tauri::command]
pub async fn create_terminal(request: CreateTerminalRequest) -> Result<Terminal, String> {
    let terminal_id = Uuid::new_v4().to_string();
    
    // Create PTY system
    let pty_system = native_pty_system();
    
    // Determine shell command based on OS
    let mut cmd = if cfg!(windows) {
        CommandBuilder::new("cmd.exe")
    } else {
        CommandBuilder::new("bash")
    };
    
    // Set working directory
    cmd.cwd(&request.working_directory);
    
    // Create PTY pair
    let pty_pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to create PTY: {}", e))?;
    
    // Spawn the shell process
    let _child = pty_pair.slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;
    
    // Store the master PTY for later use
    {
        let mut terminals = TERMINALS.lock().unwrap();
        terminals.insert(terminal_id.clone(), Arc::new(Mutex::new(pty_pair.master)));
    }
    
    let terminal = Terminal {
        id: terminal_id,
        worktree_id: request.worktree_id,
        name: request.name,
        terminal_type: "shell".to_string(),
        working_directory: request.working_directory,
        is_active: true,
    };
    
    Ok(terminal)
}

#[tauri::command]
pub async fn write_to_terminal(terminal_id: String, data: String) -> Result<(), String> {
    let terminals = TERMINALS.lock().unwrap();
    if let Some(pty) = terminals.get(&terminal_id) {
        let mut pty_guard = pty.lock().unwrap();
        let mut writer = pty_guard.take_writer()
            .map_err(|e| format!("Failed to get writer: {}", e))?;
        writer.write_all(data.as_bytes())
            .map_err(|e| format!("Failed to write to terminal: {}", e))?;
        Ok(())
    } else {
        Err("Terminal not found".to_string())
    }
}

#[tauri::command]
pub async fn read_from_terminal(terminal_id: String) -> Result<String, String> {
    let terminals = TERMINALS.lock().unwrap();
    if let Some(pty) = terminals.get(&terminal_id) {
        let mut pty_guard = pty.lock().unwrap();
        let mut reader = pty_guard.try_clone_reader()
            .map_err(|e| format!("Failed to get reader: {}", e))?;
        let mut buffer = [0u8; 1024];
        use std::io::Read;
        match reader.read(&mut buffer) {
            Ok(n) => {
                let output = String::from_utf8_lossy(&buffer[..n]).to_string();
                Ok(output)
            }
            Err(e) => Err(format!("Failed to read from terminal: {}", e))
        }
    } else {
        Err("Terminal not found".to_string())
    }
}

#[tauri::command]
pub async fn resize_terminal(terminal_id: String, cols: u16, rows: u16) -> Result<(), String> {
    let terminals = TERMINALS.lock().unwrap();
    if let Some(pty) = terminals.get(&terminal_id) {
        let pty_guard = pty.lock().unwrap();
        pty_guard.resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        }).map_err(|e| format!("Failed to resize terminal: {}", e))?;
        Ok(())
    } else {
        Err("Terminal not found".to_string())
    }
}

#[tauri::command]
pub async fn close_terminal(terminal_id: String) -> Result<(), String> {
    let mut terminals = TERMINALS.lock().unwrap();
    if terminals.remove(&terminal_id).is_some() {
        Ok(())
    } else {
        Err("Terminal not found".to_string())
    }
}

#[tauri::command]
pub async fn list_terminals() -> Result<Vec<Terminal>, String> {
    // For now, return empty list. In a full implementation, you'd track terminals
    // in a more persistent way
    Ok(vec![])
}

#[tauri::command]
pub async fn open_editor(path: String, editor: String) -> Result<(), String> {
    use std::process::Command;
    
    let editor_cmd = match editor.as_str() {
        "vscode" => "code",
        "cursor" => "cursor",
        _ => return Err("Unsupported editor".to_string()),
    };
    
    let _output = Command::new(editor_cmd)
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to open editor: {}", e))?;
    
    Ok(())
}