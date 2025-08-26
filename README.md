# ManyMany.dev
A powerful desktop application for managing Git worktrees with integrated terminal support by [AI Builder Club](https://www.aibuilderclub.com/) x [AI Jason](https://x.com/jasonzhou1993)


## 🎬 Demo Video (Click to play)
[![ManyMany.dev Demo](https://ymhkwmpktydkksimfqxq.supabase.co/storage/v1/object/public/chat-attachments/manymanyplay.jpg)](https://www.youtube.com/watch?v=ieqhrrud-Xo&ab_channel=AIJason)


## Features

- **Git Worktree Management**: Create, switch, and manage multiple Git worktrees from a single interface
- **Integrated Terminal**: Full-featured terminal with environment detection and shell support (bash, zsh, fish)
- **Native Performance**: Built with Tauri for native desktop performance
- **Agent Context Sharing**: Coming soon. Share context across git worktrees

## Download & Install
Get early access to latest version at [AI Builder Club](https://www.aibuilderclub.com/), otherwise you can dev run below

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
