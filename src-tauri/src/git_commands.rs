use std::path::Path;
use std::process::Command;

#[tauri::command]
pub fn is_git_repository(path: String) -> Result<bool, String> {
    let path = Path::new(&path);
    
    if !path.exists() {
        return Ok(false);
    }
    
    let output = Command::new("git")
        .arg("-C")
        .arg(path)
        .arg("rev-parse")
        .arg("--is-inside-work-tree")
        .output()
        .map_err(|e| e.to_string())?;
    
    Ok(output.status.success())
}

