mod commands;
mod git_commands;
mod terminal;

use commands::{
    project::{add_project, list_projects, remove_project, get_default_branch, parse_workspace_file, open_in_app},
    worktree::{create_worktree, list_worktrees, remove_worktree, get_available_branches},
    git::{get_git_status, git_commit, git_stage_file, git_unstage_file},
    terminal::{open_editor, create_terminal, write_to_terminal, read_from_terminal, resize_terminal, close_terminal, list_terminals, terminal_input, get_terminal_info, cleanup_terminals},
};
use git_commands::{is_git_repository};
use terminal::TerminalManager;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize the terminal manager as global state
    let terminal_manager = TerminalManager::new();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Mutex::new(terminal_manager))
        .invoke_handler(tauri::generate_handler![
            add_project,
            list_projects,
            remove_project,
            create_worktree,
            list_worktrees,
            remove_worktree,
            get_available_branches,
            get_git_status,
            git_commit,
            git_stage_file,
            git_unstage_file,
            open_editor,
            create_terminal,
            terminal_input,
            write_to_terminal,
            read_from_terminal,
            resize_terminal,
            close_terminal,
            list_terminals,
            get_terminal_info,
            cleanup_terminals,
            is_git_repository,
            get_default_branch,
            parse_workspace_file,
            open_in_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
