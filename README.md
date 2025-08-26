# ManyMany.dev

A powerful desktop application for managing Git worktrees with integrated terminal support. Built with Tauri, React, and TypeScript.

## Features

- **Git Worktree Management**: Create, switch, and manage multiple Git worktrees from a single interface
- **Integrated Terminal**: Full-featured terminal with environment detection and shell support (bash, zsh, fish)
- **Auto-Updates**: Built-in updater system for seamless application updates
- **Native Performance**: Built with Tauri for native desktop performance
- **Modern UI**: Clean, dark-mode interface built with React and Tailwind CSS v4

## Tech Stack

- **Frontend**: React 19, TypeScript, Zustand
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **Desktop**: Tauri v2 with Rust backend
- **Terminal**: xterm.js integration
- **Icons**: Lucide React

## Development

### Prerequisites

- Node.js (LTS version)
- Rust (latest stable)
- macOS (for building DMG files)

### Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Building

```bash
# Build for production
npm run tauri build
```

This will generate:
- macOS app bundle: `src-tauri/target/release/bundle/macos/ManyMany.dev.app`
- DMG installer: `src-tauri/target/release/bundle/dmg/ManyMany.dev_[version]_aarch64.dmg`

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # ui components
│   ├── Sidebar.tsx     # Main sidebar
│   └── Terminal.tsx    # Terminal component
├── stores/             # Zustand state management
├── lib/               # Utilities and helpers
└── styles.css         # Global styles and Tailwind config

src-tauri/
├── src/
│   ├── commands/      # Tauri commands
│   └── terminal/      # Terminal management system
└── Cargo.toml        # Rust dependencies
```

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
