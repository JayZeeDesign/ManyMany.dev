use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::fs;
use std::process::Command;
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
    pub workspace_repos: Option<Vec<WorkspaceRepo>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkspaceRepo {
    pub name: String,
    pub path: String,
    pub default_branch: String,
    pub is_git_repo: bool,
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

#[tauri::command]
pub async fn parse_workspace_file(workspace_path: String) -> Result<Vec<WorkspaceRepo>, String> {
    let workspace_path = PathBuf::from(&workspace_path);
    
    if !workspace_path.exists() {
        return Err("Workspace file does not exist".to_string());
    }
    
    // Read and parse the workspace file
    let content = fs::read_to_string(&workspace_path)
        .map_err(|e| format!("Failed to read workspace file: {}", e))?;
    
    let workspace_data: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse workspace file: {}", e))?;
    
    let mut repos = Vec::new();
    
    // Extract folders from workspace
    if let Some(folders) = workspace_data.get("folders").and_then(|f| f.as_array()) {
        for folder in folders {
            if let Some(path_str) = folder.get("path").and_then(|p| p.as_str()) {
                let folder_path = if path_str.starts_with("./") || path_str.starts_with("../") {
                    // Relative path - resolve relative to workspace file
                    workspace_path.parent()
                        .unwrap_or(&workspace_path)
                        .join(path_str)
                        .canonicalize()
                        .unwrap_or_else(|_| workspace_path.parent().unwrap().join(path_str))
                } else if path_str.starts_with("/") {
                    // Absolute path
                    PathBuf::from(path_str)
                } else {
                    // Relative path without ./
                    workspace_path.parent()
                        .unwrap_or(&workspace_path)
                        .join(path_str)
                        .canonicalize()
                        .unwrap_or_else(|_| workspace_path.parent().unwrap().join(path_str))
                };
                
                if folder_path.exists() {
                    let folder_name = folder.get("name")
                        .and_then(|n| n.as_str())
                        .unwrap_or_else(|| {
                            folder_path.file_name()
                                .and_then(|n| n.to_str())
                                .unwrap_or("Unknown")
                        });
                    
                    // Check if it's a Git repository
                    let is_git_repo = folder_path.join(".git").exists();
                    
                    // Get default branch if it's a Git repo
                    let default_branch = if is_git_repo {
                        get_default_branch(folder_path.to_string_lossy().to_string())
                            .unwrap_or_else(|_| "main".to_string())
                    } else {
                        "main".to_string()
                    };
                    
                    repos.push(WorkspaceRepo {
                        name: folder_name.to_string(),
                        path: folder_path.to_string_lossy().to_string(),
                        default_branch,
                        is_git_repo,
                    });
                }
            }
        }
    }
    
    Ok(repos)
}

#[tauri::command]
pub async fn open_in_app(path: String, app: String) -> Result<(), String> {
    let command_result = match app.as_str() {
        "cursor" => Command::new("cursor").arg(&path).spawn(),
        "vscode" => Command::new("code").arg(&path).spawn(),
        "finder" => {
            #[cfg(target_os = "macos")]
            {
                Command::new("open").arg(&path).spawn()
            }
            #[cfg(target_os = "windows")]
            {
                Command::new("explorer").arg(&path).spawn()
            }
            #[cfg(target_os = "linux")]
            {
                Command::new("xdg-open").arg(&path).spawn()
            }
        },
        _ => return Err(format!("Unsupported app: {}", app))
    };
        
    match command_result {
        Ok(_) => {
            println!("Successfully opened {} in {}", path, app);
            Ok(())
        },
        Err(e) => {
            eprintln!("Failed to open {} in {}: {}", path, app, e);
            Err(format!("Failed to open in {}: {}", app, e))
        }
    }
}