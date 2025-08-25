use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::task::JoinHandle;
use tauri::AppHandle;
use uuid::Uuid;

use crate::terminal::task::{TerminalTask, CreateTerminalRequest};
use crate::terminal::task::terminal_task as run_terminal_task;
use crate::terminal::environment::EnvironmentInfo;

#[derive(Debug)]
pub struct TerminalManager {
    terminals: HashMap<String, TerminalTask>,
    tasks: HashMap<String, JoinHandle<Result<(), String>>>,
    env_info: Arc<EnvironmentInfo>,
}

impl TerminalManager {
    pub fn new() -> Self {
        // Detect environment once at startup
        let env_info = Arc::new(EnvironmentInfo::detect());
        
        // Log discovered environment for debugging
        println!("Terminal Environment Detected:");
        println!("  Shell: {}", env_info.shell);
        println!("  PATH: {}", env_info.get_path());
        println!("  Dev Tools: {:?}", env_info.dev_tools);
        
        // Log authentication variables for debugging
        let auth_vars: Vec<_> = env_info.env_vars.iter()
            .filter(|(key, _)| {
                key.contains("CLAUDE") || key.contains("ANTHROPIC") || 
                key.contains("SSH_") || key.ends_with("_API_KEY") ||
                key.ends_with("_TOKEN") || key.ends_with("_AUTH")
            })
            .collect();
        
        if !auth_vars.is_empty() {
            println!("  Authentication Variables Found:");
            for (key, value) in auth_vars {
                // Don't log full values for security, just show they exist
                println!("    {}: {}", key, if value.len() > 20 { "[REDACTED]" } else { value });
            }
        }
        
        Self {
            terminals: HashMap::new(),
            tasks: HashMap::new(),
            env_info,
        }
    }

    /// Create a new terminal with async streaming
    pub fn create_terminal(
        &mut self,
        request: CreateTerminalRequest,
        app: AppHandle,
    ) -> Result<String, String> {
        let terminal_id = Uuid::new_v4().to_string();
        
        // Create communication channel for input
        let (input_tx, input_rx) = mpsc::unbounded_channel::<String>();
        
        // Create terminal task info
        let terminal_task = TerminalTask::new(
            terminal_id.clone(),
            request.name.clone(),
            request.worktree_id.clone(),
            request.working_directory.clone(),
            input_tx,
        );
        
        // Spawn independent async task for this terminal
        let task_terminal_id = terminal_id.clone();
        let env_info_clone = self.env_info.clone();
        let handle = tokio::spawn(async move {
            run_terminal_task(task_terminal_id, request, input_rx, app, env_info_clone).await
        });
        
        // Store terminal and task
        self.terminals.insert(terminal_id.clone(), terminal_task);
        self.tasks.insert(terminal_id.clone(), handle);
        
        Ok(terminal_id)
    }

    /// Send input to a specific terminal
    pub fn send_input(&self, terminal_id: &str, data: &str) -> Result<(), String> {
        if let Some(terminal) = self.terminals.get(terminal_id) {
            terminal.send_input(data)?;
            Ok(())
        } else {
            Err("Terminal not found".to_string())
        }
    }

    /// Close a specific terminal
    pub fn close_terminal(&mut self, terminal_id: &str) -> Result<(), String> {
        // Remove terminal from active list
        if let Some(_terminal) = self.terminals.remove(terminal_id) {
            // Terminal removed successfully
        }
        
        // Abort the task (this will trigger cleanup in the task)
        if let Some(handle) = self.tasks.remove(terminal_id) {
            handle.abort();
        }
        
        Ok(())
    }

    /// List all active terminals
    pub fn list_terminals(&self) -> Vec<String> {
        self.terminals.keys().cloned().collect()
    }

    /// Get terminal info
    pub fn get_terminal(&self, terminal_id: &str) -> Option<&TerminalTask> {
        self.terminals.get(terminal_id)
    }

    /// Check if terminal exists
    pub fn has_terminal(&self, terminal_id: &str) -> bool {
        self.terminals.contains_key(terminal_id)
    }

    /// Get terminal count
    pub fn terminal_count(&self) -> usize {
        self.terminals.len()
    }

    /// Clean up completed tasks
    pub fn cleanup_completed_tasks(&mut self) {
        let mut completed_tasks = Vec::new();
        
        for (terminal_id, handle) in &self.tasks {
            if handle.is_finished() {
                completed_tasks.push(terminal_id.clone());
            }
        }
        
        for terminal_id in completed_tasks {
            if let Some(handle) = self.tasks.remove(&terminal_id) {
                // Just remove the completed task - no await needed
                drop(handle);
            }
            
            // Also remove from terminals if still there
            self.terminals.remove(&terminal_id);
        }
    }
}

impl Default for TerminalManager {
    fn default() -> Self {
        Self::new()
    }
}