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
   - ✅ AddProject component (replaces dialog approach)
   - ✅ Repository folder picker with native file dialogs
   - ✅ Workspace file picker (.code-workspace, .json)
   - ✅ Auto-detection of project name and Git branch
   - ✅ Project form with validation and styling
   - ✅ Project store integration (Zustand)

3. **Data Persistence** 🔄 Next Priority
   - 🔄 JSON config in app data directory
   - 🔄 Project metadata storage
   - 🔄 Load projects on app startup

### Week 3: Worktree Management
**Goal:** Full worktree lifecycle management

1. **Git Operations** ✅ Backend Ready
   - ✅ Shell out to `git worktree` commands (Rust commands ready)
   - ✅ Worktree listing and status
   - ✅ Create worktree with branch selection
   - ✅ Delete worktree (clean up files + git refs)

2. **UI Components** 🔄 TODO
   - ✅ Worktree list per project (UI structure ready)
   - 🔄 Create worktree dialog
   - 🔄 Branch selector/input
   - 🔄 Delete confirmation modal

3. **Worktree Storage** ✅ Backend Ready
   - ✅ Auto-create `~/.worktrees/<project>/` structure
   - ✅ Path management and validation
   - ✅ Handle edge cases (existing folders, permissions)

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

### ✅ Completed (Weeks 1-2)
1. ✅ Set up Tauri project with React/Vite
2. ✅ Create sidebar layout with project list
3. ✅ VS Code-like dark theme
4. ✅ State management with Zustand
5. ✅ All Rust backend commands structure
6. ✅ TypeScript types and interfaces
7. ✅ **Add Project Feature Complete**
   - ✅ Folder picker using Tauri's dialog API with proper permissions
   - ✅ Workspace file picker for .code-workspace/.json files
   - ✅ Auto-detection of Git repositories and default branches
   - ✅ Connected to backend `add_project` command
   - ✅ Updates Zustand store with new projects
   - ✅ Clean UI integrated into main content area

### 🔄 Immediate Next Steps (Week 3)
1. **Data Persistence** 🚨 High Priority
   - Implement config file storage in Rust backend
   - Load projects on app startup from persistent storage
   - Save projects when added/removed
   - Handle app data directory creation

2. **Worktree Creation UI**
   - Create worktree dialog component
   - Branch input/selector
   - Connect to backend `create_worktree` command
   - Integrate with selected project context

3. **Project Management Polish**
   - Remove project functionality
   - Edit project settings
   - Project validation and error handling

4. **Terminal Integration**
   - Create Terminal component with xterm.js
   - Integrate with worktree selection
   - Handle terminal lifecycle

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
- 🔄 Can remove projects (needs persistence first)
- 🔄 Can create/delete worktrees
- 🔄 Terminals work reliably
- 🔄 Can commit changes
- 🔄 Opens in VS Code/Cursor
- ✅ Runs on macOS (tested), 🔄 Windows, Linux

## 📝 Notes
- Decided to use web-based UI for easier future web deployment
- Implemented VS Code-like dark theme as default
- **Add Project feature is fully functional** with native file dialogs
- Fixed Tauri v2 dialog plugin permissions (`dialog:allow-open`, `dialog:default`)
- Project data flows: UI → Tauri commands → Zustand store
- **Next major milestone: Project persistence** (save/load from disk)
- Terminal integration and worktree management follow after persistence