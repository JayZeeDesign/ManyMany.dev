mod commands;
mod git_commands;

use commands::{
    project::{add_project, list_projects, remove_project, get_default_branch, parse_workspace_file},
    worktree::{create_worktree, list_worktrees, remove_worktree},
    git::{get_git_status, git_commit, git_stage_file, git_unstage_file},
    terminal::open_editor,
};
use git_commands::{is_git_repository};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            add_project,
            list_projects,
            remove_project,
            create_worktree,
            list_worktrees,
            remove_worktree,
            get_git_status,
            git_commit,
            git_stage_file,
            git_unstage_file,
            open_editor,
            is_git_repository,
            get_default_branch,
            parse_workspace_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
