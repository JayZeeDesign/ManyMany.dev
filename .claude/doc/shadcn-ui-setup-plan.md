# shadcn/ui Setup Plan for Tauri React Project

## Project Analysis

### Current Setup
- **Framework**: Tauri + React 19 + TypeScript
- **CSS Framework**: Tailwind CSS v4 (4.1.12)
- **Build Tool**: Vite
- **Package Manager**: pnpm (as specified)
- **Existing Dependencies**: 
  - Several Radix UI components already installed
  - `clsx` and `tailwind-merge` already available
  - `lucide-react` for icons
  - Utility function `cn()` already exists

### Key Considerations for Tailwind CSS v4
- Uses `@import 'tailwindcss';` instead of traditional directives
- Different CSS variable handling and layer system
- RGB color mode support (as requested)
- Compatible with shadcn/ui v4 components

## Implementation Plan

### Phase 1: Update Package Dependencies

**Files to modify**: `package.json`

Add these shadcn/ui related dependencies:
```json
{
  "devDependencies": {
    "shadcn": "^2.1.0"
  }
}
```

**Command to run**:
```bash
pnpm add -D shadcn@latest
```

### Phase 2: Initialize shadcn/ui Configuration

**Files to create**: 
- `components.json` (root directory)

**Content for components.json**:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/styles.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "src/components",
    "utils": "src/utils",
    "ui": "src/components/ui",
    "lib": "src/lib",
    "hooks": "src/hooks"
  },
  "iconLibrary": "lucide"
}
```

### Phase 3: Update Tailwind Configuration

**Files to modify**: `tailwind.config.js`

**New content**:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ["class"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Geist",
          "-apple-system",
          "BlinkMacSystemFont", 
          "SF Pro Text", 
          "system-ui", 
          "sans-serif"
        ],
        mono: [
          "Geist Mono",
          "SF Mono", 
          "Monaco", 
          "Inconsolata", 
          "Fira Code", 
          "monospace"
        ],
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        border: "rgb(var(--border))",
        input: "rgb(var(--input))",
        ring: "rgb(var(--ring))",
        background: "rgb(var(--background))",
        foreground: "rgb(var(--foreground))",
        primary: {
          DEFAULT: "rgb(var(--primary))",
          foreground: "rgb(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary))",
          foreground: "rgb(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "rgb(var(--destructive))",
          foreground: "rgb(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "rgb(var(--muted))",
          foreground: "rgb(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "rgb(var(--accent))",
          foreground: "rgb(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "rgb(var(--popover))",
          foreground: "rgb(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "rgb(var(--card))",
          foreground: "rgb(var(--card-foreground))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
}
```

### Phase 4: Update Global Styles

**Files to modify**: `src/styles.css`

**New content (replace existing)**:
```css
@import 'tailwindcss';

/* shadcn/ui CSS variables for New York style with RGB color mode */
@layer base {
  :root {
    --background: 255 255 255;
    --foreground: 9 9 11;
    --card: 255 255 255;
    --card-foreground: 9 9 11;
    --popover: 255 255 255;
    --popover-foreground: 9 9 11;
    --primary: 9 9 11;
    --primary-foreground: 250 250 250;
    --secondary: 244 244 245;
    --secondary-foreground: 9 9 11;
    --muted: 244 244 245;
    --muted-foreground: 113 113 122;
    --accent: 244 244 245;
    --accent-foreground: 9 9 11;
    --destructive: 239 68 68;
    --destructive-foreground: 250 250 250;
    --border: 228 228 231;
    --input: 228 228 231;
    --ring: 9 9 11;
    --radius: 0.75rem;
  }

  .dark {
    --background: 9 9 11;
    --foreground: 250 250 250;
    --card: 9 9 11;
    --card-foreground: 250 250 250;
    --popover: 9 9 11;
    --popover-foreground: 250 250 250;
    --primary: 250 250 250;
    --primary-foreground: 9 9 11;
    --secondary: 39 39 42;
    --secondary-foreground: 250 250 250;
    --muted: 39 39 42;
    --muted-foreground: 161 161 170;
    --accent: 39 39 42;
    --accent-foreground: 250 250 250;
    --destructive: 239 68 68;
    --destructive-foreground: 250 250 250;
    --border: 39 39 42;
    --input: 39 39 42;
    --ring: 250 250 250;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-family: "Geist", -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif;
    font-feature-settings: "rlig" 1, "calt" 1;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}

/* Preserve existing macOS native styles */
.titlebar {
  -webkit-app-region: drag;
  user-select: none;
  @apply bg-card;
}

.titlebar button,
.titlebar a,
.titlebar input {
  -webkit-app-region: no-drag;
}

/* Update sidebar with theme variables */
.sidebar {
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  @apply bg-card/95;
}

/* Terminal styles with theme variables */
.terminal {
  font-family: "Geist Mono", "SF Mono", Monaco, Inconsolata, "Fira Code", monospace;
  font-size: 13px;
  line-height: 1.5;
  @apply bg-card text-card-foreground;
}

/* Custom scrollbar with theme variables */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  @apply bg-border/40;
  border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-border/60;
}

::-webkit-scrollbar-corner {
  background: transparent;
}
```

### Phase 5: Update TypeScript Configuration

**Files to modify**: `tsconfig.json`

**Add path mapping**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    
    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    
    /* Path mapping for shadcn/ui */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    
    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Phase 6: Update Vite Configuration

**Files to modify**: `vite.config.ts`

**Add path resolution**:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
```

### Phase 7: Create UI Components Directory Structure

**Directories to create**:
- `src/components/ui/` (for shadcn components)
- `src/lib/` (for utilities)

### Phase 8: Update Existing Utils

**Files to modify**: `src/utils/cn.ts` → Move to `src/lib/utils.ts`

**New file**: `src/lib/utils.ts`
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Note**: Update all imports from `src/utils/cn` to `src/lib/utils` in existing components.

### Phase 9: Install Core shadcn/ui Components

**Commands to run after setup**:
```bash
# Install essential components
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add input
pnpm dlx shadcn@latest add label
pnpm dlx shadcn@latest add card
pnpm dlx shadcn@latest add separator
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add dropdown-menu
pnpm dlx shadcn@latest add tooltip
```

### Phase 10: Apply Theme (Optional Enhancement)

**If desired, apply a modern theme**:
```bash
# Example: Apply modern-minimal theme
pnpm dlx shadcn@canary add https://tweakcn.com/r/themes/modern-minimal.json
```

## Important Notes

### Tailwind CSS v4 Compatibility
- The configuration uses RGB color values for CSS variables (as requested)
- Maintains compatibility with existing Tailwind classes
- Uses the new `@import 'tailwindcss';` directive

### Font Configuration
- Configured to use Geist fonts (Sans and Mono) which are modern and work well with shadcn/ui
- Fallbacks to system fonts for macOS compatibility
- Maintains the existing macOS-native styling

### Existing Code Integration
- Your existing `cn()` utility will be moved to follow shadcn conventions
- Existing Radix UI components will continue to work
- Tauri-specific styling is preserved and enhanced with theme variables

### Dark Mode Support
- Configured for class-based dark mode switching
- CSS variables defined for both light and dark themes
- Maintains your existing dark-first approach

### Project Structure After Setup
```
src/
├── components/
│   ├── ui/           # shadcn/ui components
│   └── Sidebar.tsx   # existing components
├── lib/
│   └── utils.ts      # moved from src/utils/cn.ts
└── ...
```

## Validation Steps

After implementation:

1. **Verify shadcn CLI works**:
   ```bash
   pnpm dlx shadcn@latest add button
   ```

2. **Test component import**:
   ```tsx
   import { Button } from "@/components/ui/button"
   ```

3. **Verify theme switching**:
   - Toggle between light and dark modes
   - Ensure all colors follow the theme

4. **Check existing functionality**:
   - Tauri APIs still work
   - Terminal component functions
   - Sidebar maintains macOS native feel

This plan ensures a seamless integration of shadcn/ui while preserving your existing Tauri + macOS native styling and functionality.