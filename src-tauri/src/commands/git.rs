use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct GitStatus {
    pub branch: String,
    pub ahead: u32,
    pub behind: u32,
    pub staged: Vec<GitFile>,
    pub unstaged: Vec<GitFile>,
    pub untracked: Vec<GitFile>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitFile {
    pub path: String,
    pub status: String,
}

#[tauri::command]
pub async fn get_git_status(worktree_path: String) -> Result<GitStatus, String> {
    // Get current branch
    let branch_output = Command::new("git")
        .args(&["-C", &worktree_path, "branch", "--show-current"])
        .output()
        .map_err(|e| format!("Failed to get branch: {}", e))?;
    
    let branch = if branch_output.status.success() {
        String::from_utf8_lossy(&branch_output.stdout).trim().to_string()
    } else {
        "unknown".to_string()
    };
    
    // Get status
    let status_output = Command::new("git")
        .args(&["-C", &worktree_path, "status", "--porcelain=v1"])
        .output()
        .map_err(|e| format!("Failed to get status: {}", e))?;
    
    let mut staged = Vec::new();
    let mut unstaged = Vec::new();
    let mut untracked = Vec::new();
    
    if status_output.status.success() {
        let status_str = String::from_utf8_lossy(&status_output.stdout);
        
        for line in status_str.lines() {
            if line.len() < 3 {
                continue;
            }
            
            let index_status = &line[0..1];
            let worktree_status = &line[1..2];
            let file_path = line[3..].trim();
            
            if index_status != " " && index_status != "?" {
                staged.push(GitFile {
                    path: file_path.to_string(),
                    status: get_status_type(index_status),
                });
            }
            
            if worktree_status != " " && worktree_status != "?" {
                unstaged.push(GitFile {
                    path: file_path.to_string(),
                    status: get_status_type(worktree_status),
                });
            }
            
            if index_status == "?" && worktree_status == "?" {
                untracked.push(GitFile {
                    path: file_path.to_string(),
                    status: "untracked".to_string(),
                });
            }
        }
    }
    
    // Get ahead/behind count
    let (ahead, behind) = get_ahead_behind(&worktree_path, &branch);
    
    Ok(GitStatus {
        branch,
        ahead,
        behind,
        staged,
        unstaged,
        untracked,
    })
}

#[tauri::command]
pub async fn git_commit(worktree_path: String, message: String) -> Result<(), String> {
    let output = Command::new("git")
        .args(&["-C", &worktree_path, "commit", "-m", &message])
        .output()
        .map_err(|e| format!("Failed to commit: {}", e))?;
    
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Commit failed: {}", error));
    }
    
    Ok(())
}

#[tauri::command]
pub async fn git_stage_file(worktree_path: String, file_path: String) -> Result<(), String> {
    let output = Command::new("git")
        .args(&["-C", &worktree_path, "add", &file_path])
        .output()
        .map_err(|e| format!("Failed to stage file: {}", e))?;
    
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to stage file: {}", error));
    }
    
    Ok(())
}

#[tauri::command]
pub async fn git_unstage_file(worktree_path: String, file_path: String) -> Result<(), String> {
    let output = Command::new("git")
        .args(&["-C", &worktree_path, "reset", "HEAD", &file_path])
        .output()
        .map_err(|e| format!("Failed to unstage file: {}", e))?;
    
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to unstage file: {}", error));
    }
    
    Ok(())
}

fn get_status_type(status: &str) -> String {
    match status {
        "M" => "modified".to_string(),
        "A" => "added".to_string(),
        "D" => "deleted".to_string(),
        "R" => "renamed".to_string(),
        "C" => "copied".to_string(),
        "U" => "unmerged".to_string(),
        _ => "unknown".to_string(),
    }
}

fn get_ahead_behind(path: &str, branch: &str) -> (u32, u32) {
    let output = Command::new("git")
        .args(&[
            "-C",
            path,
            "rev-list",
            "--left-right",
            "--count",
            &format!("{}...origin/{}", branch, branch),
        ])
        .output();
    
    if let Ok(output) = output {
        if output.status.success() {
            let result = String::from_utf8_lossy(&output.stdout);
            let parts: Vec<&str> = result.trim().split('\t').collect();
            if parts.len() == 2 {
                let ahead = parts[0].parse().unwrap_or(0);
                let behind = parts[1].parse().unwrap_or(0);
                return (ahead, behind);
            }
        }
    }
    
    (0, 0)
}