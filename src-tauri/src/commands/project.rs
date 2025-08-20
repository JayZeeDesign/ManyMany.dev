use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use uuid::Uuid;
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: String,
    pub project_type: String, // "repository" or "workspace"
    pub default_branch: Option<String>,
    pub created_at: String,
    pub worktrees: Vec<Worktree>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Worktree {
    pub id: String,
    pub branch: String,
    pub path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AddProjectRequest {
    pub name: String,
    pub path: String,
    pub project_type: String,
    pub default_branch: Option<String>,
}

#[tauri::command]
pub async fn add_project(request: AddProjectRequest) -> Result<Project, String> {
    let project_path = PathBuf::from(&request.path);
    
    if !project_path.exists() {
        return Err("Project path does not exist".to_string());
    }
    
    // Validate project type
    if request.project_type == "repository" {
        if !project_path.join(".git").exists() {
            return Err("Selected folder is not a Git repository".to_string());
        }
    } else if request.project_type == "workspace" {
        if !request.path.ends_with(".code-workspace") && !request.path.ends_with(".json") {
            return Err("Selected file is not a valid workspace file".to_string());
        }
    }
    
    let project = Project {
        id: Uuid::new_v4().to_string(),
        name: request.name,
        path: request.path,
        project_type: request.project_type,
        default_branch: request.default_branch,
        created_at: Utc::now().to_rfc3339(),
        worktrees: vec![],
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

#[tauri::command]
pub fn get_default_branch(path: String) -> Result<String, String> {
    use std::process::Command;
    
    let output = Command::new("git")
        .args(&["-C", &path, "symbolic-ref", "refs/remotes/origin/HEAD"])
        .output()
        .map_err(|e| format!("Failed to execute git command: {}", e))?;
    
    if output.status.success() {
        let branch = String::from_utf8_lossy(&output.stdout);
        let branch = branch.trim().replace("refs/remotes/origin/", "");
        if !branch.is_empty() {
            return Ok(branch);
        }
    }
    
    // Fallback to checking current branch
    let output = Command::new("git")
        .args(&["-C", &path, "branch", "--show-current"])
        .output()
        .map_err(|e| format!("Failed to execute git command: {}", e))?;
    
    if output.status.success() {
        let branch = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !branch.is_empty() {
            return Ok(branch);
        }
    }
    
    // Final fallback to "main"
    Ok("main".to_string())
}