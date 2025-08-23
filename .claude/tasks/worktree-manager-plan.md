# Worktree Desktop Manager - Implementation Plan

## 🎯 Project Overview
Build a Tauri-based desktop app for managing Git worktrees with integrated terminals and editor launching capabilities.

## 📅 6-Week Development Roadmap

### Week 1: Foundation & Setup ✅ COMPLETED
**Goal:** Project scaffolding and core infrastructure

1. **Tauri + React/Vite Setup** ✅
   - ✅ Initialize Tauri project with React frontend
   - ✅ Configure Vite for development
   - ✅ Set up TypeScript for both frontend and backend
   - ⏳ Configure ESLint, Prettier (skipped for MVP)

2. **Basic Window & IPC** ✅
   - ✅ Create main window with sidebar layout
   - ✅ Implement Tauri IPC commands structure
   - ✅ Set up state management (Zustand)
   - ⏳ Create basic routing (not needed for MVP)

3. **Development Environment** ✅
   - ✅ Set up hot reload for both Rust and React
   - ⏳ Configure logging system (basic console logging)
   - ✅ Create development scripts

**Additional Completed:**
- ✅ VS Code-like dark theme implemented
- ✅ macOS native window styling (draggable titlebar)
- ✅ All core dependencies installed (@xterm/xterm, zustand, Tailwind CSS, Lucide icons)
- ✅ Project folder structure created
- ✅ Basic IPC commands for project, worktree, git, and terminal operations

### Week 2: Project Management Core ✅ COMPLETED
**Goal:** Complete project CRUD operations

1. **Backend (Rust)** ✅ Complete
   - ✅ Project data model and storage structures
   - ✅ Git repository detection (`is_git_repository` command)
   - ✅ Default branch detection (`get_default_branch` command)
   - ✅ Project validation logic
   - ✅ Add project command with proper request/response structure
   - ✅ Tauri dialog plugin integration with permissions

2. **Frontend Components** ✅ Complete
   - ✅ Project sidebar component with Add Project button
   - ✅ AddProject component (uses main content area, not dialog)
   - ✅ Repository folder picker with native file dialogs
   - ✅ Workspace file picker (.code-workspace, .json)
   - ✅ Auto-detection of project name and Git branch
   - ✅ Project form with validation and styling
   - ✅ Project store integration (Zustand with persistence)
   - ✅ Project display when selected in sidebar
   - ✅ Clean UI matching sidebar theme (no cards)

3. **Data Persistence** ✅ Complete
   - ✅ Zustand persist middleware for local storage
   - ✅ Project metadata storage in browser storage
   - ✅ Load projects on app startup automatically

### Week 3: Worktree Management ✅ COMPLETED
**Goal:** Full worktree lifecycle management

1. **Git Operations** ✅ Complete
   - ✅ Shell out to `git worktree` commands with proper error handling
   - ✅ Worktree listing and status (`list_worktrees` command)
   - ✅ Create worktree with branch selection (`create_worktree` command)
   - ✅ Delete worktree with cleanup (`remove_worktree` command)
   - ✅ Get available branches (`get_available_branches` command)
   - ✅ Support for main/master branches with `--force` flag

2. **UI Components** ✅ Complete
   - ✅ Worktree list integrated into ProjectForm
   - ✅ Create worktree dialog with branch selection
   - ✅ Custom worktree naming with auto-suggestions
   - ✅ Branch selector with existing/custom branch options
   - ✅ Delete worktree functionality with confirmation
   - ✅ "Open in Editor" button for each worktree

3. **Worktree Storage** ✅ Complete
   - ✅ Auto-create `~/.worktrees/<project>/<custom-name>/` structure
   - ✅ Sanitized folder names for filesystem safety
   - ✅ Path management and validation
   - ✅ Handle edge cases (existing folders, permissions, branch conflicts)

**Additional Features Implemented:**
- ✅ Custom worktree naming (user-provided names instead of branch names)
- ✅ Auto-suggestion of worktree names based on selected branches
- ✅ Support for creating multiple worktrees from main/master branches
- ✅ Real-time worktree list updates after creation/deletion
- ✅ Path preview in creation dialog
- ✅ Comprehensive error handling and user-friendly messages

### Week 4: Terminal Integration
**Goal:** Embedded terminal functionality

1. **Terminal Backend** 🔄 TODO
   - 🔄 Integrate portable-pty or tauri-plugin-terminal
   - 🔄 Spawn shell processes per worktree
   - 🔄 Handle terminal lifecycle (create, destroy, restart)

2. **Terminal Frontend** 🔄 TODO
   - ✅ xterm.js installed and ready
   - 🔄 Integrate xterm.js into UI
   - 🔄 Terminal tabs management
   - 🔄 Custom terminal profiles (empty, claude code)
   - 🔄 Terminal theming

3. **Terminal Features** 🔄 TODO
   - 🔄 Working directory management
   - 🔄 Environment variable injection
   - 🔄 Terminal resize handling
   - 🔄 Copy/paste support

### Week 5: Git Status & Editor Integration
**Goal:** Git panel and external editor launching

1. **Git Status Panel** ✅ Backend Ready
   - ✅ Parse `git status` output (Rust commands ready)
   - ✅ File change detection (staged/unstaged)
   - ✅ Simple commit interface (backend ready)
   - 🔄 Refresh on file system changes

2. **Editor Integration** ✅ Backend Ready
   - 🔄 Detect installed editors (VS Code, Cursor)
   - ✅ Launch editor with worktree path (command ready)
   - 🔄 Editor preference settings
   - ✅ Handle launch errors gracefully

3. **UI Polish** 🔄 TODO
   - 🔄 Status indicators (loading, errors)
   - 🔄 Keyboard shortcuts
   - 🔄 Context menus
   - 🔄 Tooltips and help text

### Week 6: Polish & Release Prep
**Goal:** Production-ready MVP

1. **Error Handling & Edge Cases** 🔄 TODO
   - 🔄 Graceful degradation
   - 🔄 Error boundaries
   - 🔄 User-friendly error messages
   - 🔄 Recovery mechanisms

2. **Performance & UX** 🔄 TODO
   - 🔄 Optimize terminal rendering
   - 🔄 Lazy loading for large repos
   - 🔄 Smooth animations
   - 🔄 Responsive design

3. **Distribution** 🔄 TODO
   - 🔄 App signing and notarization
   - 🔄 Auto-updater setup
   - 🔄 Installation packages (DMG, MSI, AppImage)
   - 🔄 Documentation and README

## 🏗️ Technical Architecture

### Frontend Stack
- **Framework:** React 18 with TypeScript ✅
- **Build Tool:** Vite ✅
- **State:** Zustand ✅
- **UI Components:** Tailwind CSS ✅ (Radix UI ready to use)
- **Terminal:** @xterm/xterm ✅ (installed, not integrated)
- **Icons:** Lucide React ✅

### Backend Stack
- **Framework:** Tauri 2.0 ✅
- **Language:** Rust ✅
- **Terminal:** 🔄 (portable-pty to be integrated)
- **Storage:** JSON files via serde ✅
- **Git:** Shell commands ✅

### Project Structure ✅ CREATED
```
worktree-studio/
├── src/                    # React frontend
│   ├── components/         # UI components ✅
│   ├── hooks/             # Custom React hooks ✅
│   ├── stores/            # State management ✅
│   ├── types/             # TypeScript types ✅
│   └── utils/             # Helper functions ✅
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── commands/      # Tauri commands ✅
│   │   │   ├── mod.rs
│   │   │   ├── project.rs ✅
│   │   │   ├── worktree.rs ✅
│   │   │   ├── git.rs ✅
│   │   │   └── terminal.rs ✅
│   │   ├── git/          # Git operations ✅
│   │   ├── terminal/     # Terminal management ✅
│   │   └── storage/      # Config/data persistence ✅
│   └── Cargo.toml
└── package.json
```

## 📋 Current Status & Next Steps

### ✅ Completed (Weeks 1-3)
1. ✅ Set up Tauri project with React/Vite
2. ✅ Create sidebar layout with project list
3. ✅ VS Code-like dark theme
4. ✅ State management with Zustand (with persistence)
5. ✅ All Rust backend commands structure
6. ✅ TypeScript types and interfaces
7. ✅ **Add Project Feature Complete**
   - ✅ Folder picker using Tauri's dialog API with proper permissions
   - ✅ Workspace file picker for .code-workspace/.json files
   - ✅ Auto-detection of Git repositories and default branches
   - ✅ Git commands (`is_git_repository`, `get_default_branch`)
   - ✅ Updates Zustand store with new projects
   - ✅ Clean UI integrated into main content area
   - ✅ Project display view when selected
   - ✅ Data persistence with Zustand persist middleware

### 🔄 Immediate Next Steps (Week 4)

1. **Worktree UI Integration** 🚨 Next Priority
   - Connect worktree backend to frontend
   - Create worktree button in project view
   - Worktree list display in project view
   - Delete worktree functionality
   - Open in editor functionality

2. **Terminal Integration** 🔄 In Progress
   - Fix portable-pty integration issues
   - Create Terminal component with xterm.js
   - Spawn shell processes per worktree
   - Handle terminal lifecycle (create, destroy, restart)
   - Terminal tabs management
   - Working directory management

3. **Project Management Polish**
   - Remove project functionality
   - Edit project settings
   - Better error handling and user feedback

## 🚀 Quick Start (Current State)

```bash
# Development
cd worktree-studio
npm run tauri dev

# The app will launch with:
# - Dark VS Code-like theme
# - Working Add Project functionality
# - Repository folder and workspace file pickers
# - Auto-detection of Git repos and branches
# - Project form with validation
```

## 🎯 Success Metrics
- ✅ Can add projects (folder picker + workspace files)
- ✅ Projects persist across app restarts
- 🔄 Can remove projects (UI needs implementation)
- ✅ Can create/delete worktrees with custom names (backend ready)
- ✅ Can create worktrees from main/master branches (backend ready)
- 🔄 Terminals work reliably (fixing portable-pty issues)
- 🔄 Can commit changes (backend ready, UI needed)
- 🔄 Opens in VS Code/Cursor (backend ready, UI needed)
- ✅ Runs on macOS (tested), 🔄 Windows, Linux

## 📝 Notes
- Decided to use web-based UI for easier future web deployment
- Implemented VS Code-like dark theme as default
- **Add Project feature is fully functional** with native file dialogs
- Fixed Tauri v2 dialog plugin permissions (`dialog:allow-open`, `dialog:default`)
- Project data flows: UI → Tauri commands → Zustand store → LocalStorage
- **Data persistence completed** using Zustand persist middleware
- **Current focus:** Connecting worktree backend to frontend UI
- Terminal integration has portable-pty compilation issues to resolve