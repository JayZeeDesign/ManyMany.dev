use std::collections::HashMap;
use tokio::sync::mpsc;
use tokio::task::JoinHandle;
use tauri::AppHandle;
use uuid::Uuid;

use crate::terminal::task::{TerminalTask, CreateTerminalRequest};
use crate::terminal::task::terminal_task as run_terminal_task;

#[derive(Debug)]
pub struct TerminalManager {
    terminals: HashMap<String, TerminalTask>,
    tasks: HashMap<String, JoinHandle<Result<(), String>>>,
}

impl TerminalManager {
    pub fn new() -> Self {
        Self {
            terminals: HashMap::new(),
            tasks: HashMap::new(),
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
        let handle = tokio::spawn(async move {
            run_terminal_task(task_terminal_id, request, input_rx, app).await
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