use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct Worktree {
    pub id: String,
    pub project_id: String,
    pub branch: String,
    pub path: String,
    pub is_active: bool,
    pub has_uncommitted_changes: bool,
    pub created_at: String,
}

#[tauri::command]
pub async fn create_worktree(
    project_path: String,
    branch: String,
    project_id: String,
) -> Result<Worktree, String> {
    let home_dir = dirs::home_dir()
        .ok_or_else(|| "Could not find home directory".to_string())?;
    
    let worktree_base = home_dir.join(".worktrees");
    let project_name = PathBuf::from(&project_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    
    let worktree_path = worktree_base
        .join(&project_name)
        .join(&branch);
    
    // Create directory if it doesn't exist
    std::fs::create_dir_all(&worktree_path)
        .map_err(|e| format!("Failed to create worktree directory: {}", e))?;
    
    // Create Git worktree
    let output = Command::new("git")
        .args(&[
            "-C",
            &project_path,
            "worktree",
            "add",
            worktree_path.to_str().unwrap(),
            &branch,
        ])
        .output()
        .map_err(|e| format!("Failed to create worktree: {}", e))?;
    
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Git worktree failed: {}", error));
    }
    
    let worktree = Worktree {
        id: uuid::Uuid::new_v4().to_string(),
        project_id,
        branch,
        path: worktree_path.to_string_lossy().to_string(),
        is_active: true,
        has_uncommitted_changes: false,
        created_at: chrono::Utc::now().to_rfc3339(),
    };
    
    Ok(worktree)
}

#[tauri::command]
pub async fn list_worktrees(project_path: String) -> Result<Vec<Worktree>, String> {
    let output = Command::new("git")
        .args(&["-C", &project_path, "worktree", "list", "--porcelain"])
        .output()
        .map_err(|e| format!("Failed to list worktrees: {}", e))?;
    
    if !output.status.success() {
        return Err("Failed to list worktrees".to_string());
    }
    
    let output_str = String::from_utf8_lossy(&output.stdout);
    let mut worktrees = Vec::new();
    let mut current_worktree: Option<Worktree> = None;
    
    for line in output_str.lines() {
        if line.starts_with("worktree ") {
            if let Some(wt) = current_worktree.take() {
                worktrees.push(wt);
            }
            
            let path = line.strip_prefix("worktree ").unwrap_or("");
            current_worktree = Some(Worktree {
                id: uuid::Uuid::new_v4().to_string(),
                project_id: String::new(), // Will be set by caller
                branch: String::new(), // Will be set from branch line
                path: path.to_string(),
                is_active: false,
                has_uncommitted_changes: false,
                created_at: chrono::Utc::now().to_rfc3339(),
            });
        } else if line.starts_with("branch ") {
            if let Some(ref mut wt) = current_worktree {
                wt.branch = line.strip_prefix("branch refs/heads/")
                    .unwrap_or(line.strip_prefix("branch ").unwrap_or(""))
                    .to_string();
            }
        }
    }
    
    if let Some(wt) = current_worktree {
        worktrees.push(wt);
    }
    
    Ok(worktrees)
}

#[tauri::command]
pub async fn remove_worktree(project_path: String, worktree_path: String) -> Result<(), String> {
    let output = Command::new("git")
        .args(&[
            "-C",
            &project_path,
            "worktree",
            "remove",
            &worktree_path,
            "--force",
        ])
        .output()
        .map_err(|e| format!("Failed to remove worktree: {}", e))?;
    
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to remove worktree: {}", error));
    }
    
    Ok(())
}