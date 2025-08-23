use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use uuid::Uuid;
use chrono::Utc;

fn sanitize_project_name(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            c if c.is_control() => '_',
            c => c,
        })
        .collect::<String>()
        .trim_matches('.')
        .to_string()
}

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
    worktree_name: String,
) -> Result<Worktree, String> {
    let home_dir = dirs::home_dir()
        .ok_or_else(|| "Could not find home directory".to_string())?;
    
    let worktree_base = home_dir.join(".manymany");
    let project_name = PathBuf::from(&project_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    
    let sanitized_project_name = sanitize_project_name(&project_name);
    let sanitized_worktree_name = sanitize_project_name(&worktree_name);
    
    let worktree_path = worktree_base
        .join(&sanitized_project_name)
        .join(&sanitized_worktree_name);
    
    // Create directory if it doesn't exist
    std::fs::create_dir_all(&worktree_path)
        .map_err(|e| format!("Failed to create worktree directory: {}", e))?;
    
    // Check if branch is already checked out somewhere
    let list_output = Command::new("git")
        .args(&["-C", &project_path, "worktree", "list", "--porcelain"])
        .output()
        .map_err(|e| format!("Failed to list existing worktrees: {}", e))?;
    
    if list_output.status.success() {
        let list_str = String::from_utf8_lossy(&list_output.stdout);
        let mut current_path = String::new();
        let mut current_branch = String::new();
        
        for line in list_str.lines() {
            if line.starts_with("worktree ") {
                current_path = line.strip_prefix("worktree ").unwrap_or("").to_string();
                current_branch.clear();
            } else if line.starts_with("branch ") {
                current_branch = line.strip_prefix("branch refs/heads/")
                    .unwrap_or(line.strip_prefix("branch ").unwrap_or(""))
                    .to_string();
                
                // Check if this branch is already checked out (but allow main/master to be used in multiple worktrees)
                if current_branch == branch && !current_path.is_empty() && branch != "main" && branch != "master" {
                    return Err(format!(
                        "Branch '{}' is already checked out at: {}\n\nPlease choose a different branch or delete the existing worktree first.",
                        branch, current_path
                    ));
                }
            }
        }
    }

    // Create Git worktree
    let mut args = vec![
        "-C",
        &project_path,
        "worktree",
        "add",
    ];
    
    // Use --force flag for main/master branches to allow creating worktrees 
    // even when the branch is already checked out in the main repository
    if branch == "main" || branch == "master" {
        args.push("--force");
    }
    
    args.push(worktree_path.to_str().unwrap());
    args.push(&branch);
    
    let output = Command::new("git")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to create worktree: {}", e))?;
    
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        // Provide more helpful error messages
        if error.contains("already checked out") {
            return Err(format!(
                "Branch '{}' is already checked out in another worktree.\n\nPlease choose a different branch or delete the existing worktree first.",
                branch
            ));
        } else if error.contains("not a valid branch") {
            return Err(format!(
                "Branch '{}' does not exist.\n\nPlease create the branch first or choose an existing branch.",
                branch
            ));
        } else {
            return Err(format!("Failed to create worktree: {}", error));
        }
    }
    
    let worktree = Worktree {
        id: Uuid::new_v4().to_string(),
        project_id,
        branch,
        path: worktree_path.to_string_lossy().to_string(),
        is_active: true,
        has_uncommitted_changes: false,
        created_at: Utc::now().to_rfc3339(),
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
                id: format!("worktree-{:x}", path.bytes().fold(0u64, |acc, b| acc.wrapping_mul(31).wrapping_add(b as u64))),
                project_id: String::new(), // Will be set by caller
                branch: String::new(), // Will be set from branch line
                path: path.to_string(),
                is_active: false,
                has_uncommitted_changes: false,
                created_at: Utc::now().to_rfc3339(),
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

#[tauri::command]
pub async fn get_available_branches(project_path: String) -> Result<Vec<String>, String> {
    // First get all existing worktrees to filter out checked-out branches
    let mut checked_out_branches = std::collections::HashSet::new();
    
    let list_output = Command::new("git")
        .args(&["-C", &project_path, "worktree", "list", "--porcelain"])
        .output()
        .map_err(|e| format!("Failed to list existing worktrees: {}", e))?;
    
    if list_output.status.success() {
        let list_str = String::from_utf8_lossy(&list_output.stdout);
        let mut current_branch;
        
        for line in list_str.lines() {
            if line.starts_with("branch ") {
                current_branch = line.strip_prefix("branch refs/heads/")
                    .unwrap_or(line.strip_prefix("branch ").unwrap_or(""))
                    .to_string();
                // Don't filter out main/master branches - users should be able to create worktrees from them
                if !current_branch.is_empty() && current_branch != "main" && current_branch != "master" {
                    checked_out_branches.insert(current_branch);
                }
            }
        }
    }
    // Get local branches
    let local_output = Command::new("git")
        .args(&["-C", &project_path, "branch", "--format=%(refname:short)"])
        .output()
        .map_err(|e| format!("Failed to get local branches: {}", e))?;
    
    // Get remote branches
    let remote_output = Command::new("git")
        .args(&["-C", &project_path, "branch", "-r", "--format=%(refname:short)"])
        .output()
        .map_err(|e| format!("Failed to get remote branches: {}", e))?;
    
    let mut branches = Vec::new();
    
    // Process local branches
    if local_output.status.success() {
        let local_str = String::from_utf8_lossy(&local_output.stdout);
        for line in local_str.lines() {
            let branch = line.trim();
            if !branch.is_empty() && branch != "HEAD" && !checked_out_branches.contains(branch) {
                branches.push(branch.to_string());
            }
        }
    }
    
    // Process remote branches
    if remote_output.status.success() {
        let remote_str = String::from_utf8_lossy(&remote_output.stdout);
        for line in remote_str.lines() {
            let branch = line.trim();
            if !branch.is_empty() && !branch.contains("HEAD") {
                // Remove origin/ prefix for remote branches
                let clean_branch = branch.strip_prefix("origin/").unwrap_or(branch);
                if !branches.contains(&clean_branch.to_string()) && !checked_out_branches.contains(clean_branch) {
                    branches.push(clean_branch.to_string());
                }
            }
        }
    }
    
    // Sort branches with main/master first
    branches.sort_by(|a, b| {
        match (a.as_str(), b.as_str()) {
            ("main", _) => std::cmp::Ordering::Less,
            (_, "main") => std::cmp::Ordering::Greater,
            ("master", _) => std::cmp::Ordering::Less,
            (_, "master") => std::cmp::Ordering::Greater,
            _ => a.cmp(b),
        }
    });
    
    Ok(branches)
}