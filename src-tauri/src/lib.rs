mod commands;

use commands::{
    project::{add_project, list_projects, remove_project},
    worktree::{create_worktree, list_worktrees, remove_worktree},
    git::{get_git_status, git_commit, git_stage_file, git_unstage_file},
    terminal::open_editor,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
