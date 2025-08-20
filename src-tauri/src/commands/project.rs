use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: String,
    pub default_branch: String,
    pub is_git_repo: bool,
    pub created_at: String,
    pub last_opened_at: String,
}

#[tauri::command]
pub async fn add_project(path: String) -> Result<Project, String> {
    let project_path = PathBuf::from(&path);
    
    if !project_path.exists() {
        return Err("Project path does not exist".to_string());
    }
    
    let name = project_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string();
    
    let is_git_repo = project_path.join(".git").exists();
    let default_branch = if is_git_repo {
        get_default_branch(&path).unwrap_or_else(|| "main".to_string())
    } else {
        String::new()
    };
    
    let project = Project {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        path,
        default_branch,
        is_git_repo,
        created_at: chrono::Utc::now().to_rfc3339(),
        last_opened_at: chrono::Utc::now().to_rfc3339(),
    };
    
    Ok(project)
}

#[tauri::command]
pub async fn list_projects() -> Result<Vec<Project>, String> {
    // TODO: Load from persistent storage
    Ok(vec![])
}

#[tauri::command]
pub async fn remove_project(_id: String) -> Result<(), String> {
    // TODO: Remove from persistent storage
    Ok(())
}

fn get_default_branch(path: &str) -> Option<String> {
    use std::process::Command;
    
    let output = Command::new("git")
        .args(&["-C", path, "symbolic-ref", "refs/remotes/origin/HEAD"])
        .output()
        .ok()?;
    
    if output.status.success() {
        let branch = String::from_utf8_lossy(&output.stdout);
        let branch = branch.trim().replace("refs/remotes/origin/", "");
        Some(branch)
    } else {
        // Fallback to checking current branch
        let output = Command::new("git")
            .args(&["-C", path, "branch", "--show-current"])
            .output()
            .ok()?;
        
        if output.status.success() {
            Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
        } else {
            None
        }
    }
}