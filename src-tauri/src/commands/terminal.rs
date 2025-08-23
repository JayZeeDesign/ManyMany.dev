use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
use std::sync::Mutex;

use crate::terminal::{TerminalManager};
use crate::terminal::task::CreateTerminalRequest;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Terminal {
    pub id: String,
    pub worktree_id: String,
    pub name: String,
    pub terminal_type: String,
    pub working_directory: String,
    pub is_active: bool,
}

/// Create a new terminal with real-time streaming
#[tauri::command]
pub async fn create_terminal(
    request: CreateTerminalRequest,
    app: AppHandle,
    state: State<'_, Mutex<TerminalManager>>,
) -> Result<String, String> {
    let terminal_id = {
        let mut manager = state.lock().unwrap();
        manager.create_terminal(request, app)?
    };
    
    Ok(terminal_id)
}

/// Send input to a terminal (replaces the old write_to_terminal)
#[tauri::command]
pub async fn terminal_input(
    terminal_id: String,
    data: String,
    state: State<'_, Mutex<TerminalManager>>,
) -> Result<(), String> {
    let manager = state.lock().unwrap();
    manager.send_input(&terminal_id, &data)?;
    
    Ok(())
}

/// Close a terminal and clean up resources
#[tauri::command]
pub async fn close_terminal(
    terminal_id: String,
    state: State<'_, Mutex<TerminalManager>>,
) -> Result<(), String> {
    {
        let mut manager = state.lock().unwrap();
        manager.close_terminal(&terminal_id)?;
    }
    
    Ok(())
}

/// List all active terminals
#[tauri::command]
pub async fn list_terminals(
    state: State<'_, Mutex<TerminalManager>>,
) -> Result<Vec<String>, String> {
    let manager = state.lock().unwrap();
    let terminal_ids = manager.list_terminals();
    
    Ok(terminal_ids)
}

/// Resize a terminal (for compatibility - may implement later)
#[tauri::command]
pub async fn resize_terminal(
    terminal_id: String, 
    cols: u16, 
    rows: u16,
    _state: State<'_, Mutex<TerminalManager>>,
) -> Result<(), String> {
    // TODO: Implement terminal resizing in the streaming architecture
    // For now, just return success to avoid breaking existing code
    Ok(())
}

/// Get terminal info (new command for debugging/info)
#[tauri::command]
pub async fn get_terminal_info(
    terminal_id: String,
    state: State<'_, Mutex<TerminalManager>>,
) -> Result<Option<Terminal>, String> {
    let manager = state.lock().unwrap();
    
    if let Some(task) = manager.get_terminal(terminal_id.as_str()) {
        let terminal_info = Terminal {
            id: task.id.clone(),
            worktree_id: task.worktree_id.clone(),
            name: task.name.clone(),
            terminal_type: "shell".to_string(),
            working_directory: task.working_directory.clone(),
            is_active: task.is_active,
        };
        
        Ok(Some(terminal_info))
    } else {
        Ok(None)
    }
}

/// Clean up completed tasks (maintenance command)
#[tauri::command]
pub async fn cleanup_terminals(
    state: State<'_, Mutex<TerminalManager>>,
) -> Result<usize, String> {
    let (count_before, count_after) = {
        let mut manager = state.lock().unwrap();
        let count_before = manager.terminal_count();
        
        manager.cleanup_completed_tasks();
        
        let count_after = manager.terminal_count();
        (count_before, count_after)
    };
    
    let cleaned = count_before - count_after;
    
    Ok(cleaned)
}

/// Open a file in an external editor
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

// ============================================================================
// DEPRECATED COMMANDS - Keep for compatibility but log warnings
// ============================================================================

/// DEPRECATED: Use terminal_input instead
#[tauri::command]
pub async fn write_to_terminal(
    terminal_id: String,
    data: String,
    state: State<'_, Mutex<TerminalManager>>,
) -> Result<(), String> {
    // Forward to new command
    terminal_input(terminal_id, data, state).await
}

/// DEPRECATED: Polling is no longer needed with streaming
#[tauri::command]
pub async fn read_from_terminal(
    terminal_id: String,
    _state: State<'_, Mutex<TerminalManager>>,
) -> Result<String, String> {
    // Return empty string since output is now streamed via events
    Ok(String::new())
}