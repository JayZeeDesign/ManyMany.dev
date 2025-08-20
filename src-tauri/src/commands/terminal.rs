use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Terminal {
    pub id: String,
    pub worktree_id: String,
    pub name: String,
    pub terminal_type: String,
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