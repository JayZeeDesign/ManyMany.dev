import { useEffect, useCallback, useState, useMemo } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useShortcutsStore } from '@/stores/shortcutsStore';
import { useTerminalStore } from '@/stores/terminalStore';
import { useAppSettingsStore } from '@/stores/appSettingsStore';

export interface KeyboardShortcut {
  id: string;
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  action: () => void;
}


export const useKeyboardShortcuts = () => {
  const {
    projects,
    selectedProjectId,
    selectedWorktreeId,
    selectProject,
    selectWorktree,
    getSelectedProject,
  } = useProjectStore();
  
  const { shortcuts: shortcutConfigs, enabled } = useShortcutsStore();
  const { focusActiveTerminal } = useTerminalStore();
  const { settings } = useAppSettingsStore();
  const [showHelp, setShowHelp] = useState(false);

  // Helper to get all worktrees from the current project
  const getCurrentProjectWorktrees = useCallback(() => {
    const project = getSelectedProject();
    return project?.worktrees || [];
  }, [getSelectedProject]);

  // Helper to get the current worktree index
  const getCurrentWorktreeIndex = useCallback(() => {
    const worktrees = getCurrentProjectWorktrees();
    if (!selectedWorktreeId) return -1;
    return worktrees.findIndex(w => w.id === selectedWorktreeId);
  }, [getCurrentProjectWorktrees, selectedWorktreeId]);

  // Helper to focus terminal after navigation
  const focusTerminalAfterNavigation = useCallback(async (worktreeId: string) => {
    // Only auto-focus if user has this preference enabled
    if (settings.autoFocusTerminalOnNavigation) {
      console.log(`[KeyboardShortcuts] Attempting to focus terminal for worktree: ${worktreeId}`);
      try {
        const success = await focusActiveTerminal(worktreeId);
        console.log(`[KeyboardShortcuts] Focus result: ${success}`);
      } catch (error) {
        console.error('Failed to auto-focus terminal after navigation:', error);
      }
    } else {
      console.log(`[KeyboardShortcuts] Auto-focus disabled in settings`);
    }
  }, [focusActiveTerminal, settings.autoFocusTerminalOnNavigation]);

  // Navigate to next worktree
  const navigateToNextWorktree = useCallback(() => {
    try {
      const worktrees = getCurrentProjectWorktrees();
      if (worktrees.length === 0) return;

      const currentIndex = getCurrentWorktreeIndex();
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % worktrees.length;
      
      const project = getSelectedProject();
      if (project && worktrees[nextIndex]) {
        selectProject(project.id);
        selectWorktree(worktrees[nextIndex].id);
        // Focus terminal after navigation
        focusTerminalAfterNavigation(worktrees[nextIndex].id);
      }
    } catch (error) {
      console.error('Failed to navigate to next worktree:', error);
    }
  }, [getCurrentProjectWorktrees, getCurrentWorktreeIndex, getSelectedProject, selectProject, selectWorktree, focusTerminalAfterNavigation]);

  // Navigate to previous worktree
  const navigateToPreviousWorktree = useCallback(() => {
    try {
      const worktrees = getCurrentProjectWorktrees();
      if (worktrees.length === 0) return;

      const currentIndex = getCurrentWorktreeIndex();
      const prevIndex = currentIndex === -1 ? worktrees.length - 1 : (currentIndex - 1 + worktrees.length) % worktrees.length;
      
      const project = getSelectedProject();
      if (project && worktrees[prevIndex]) {
        selectProject(project.id);
        selectWorktree(worktrees[prevIndex].id);
        // Focus terminal after navigation
        focusTerminalAfterNavigation(worktrees[prevIndex].id);
      }
    } catch (error) {
      console.error('Failed to navigate to previous worktree:', error);
    }
  }, [getCurrentProjectWorktrees, getCurrentWorktreeIndex, getSelectedProject, selectProject, selectWorktree, focusTerminalAfterNavigation]);

  // Navigate to next project
  const navigateToNextProject = useCallback(() => {
    try {
      if (projects.length === 0) return;

      const currentIndex = selectedProjectId ? projects.findIndex(p => p.id === selectedProjectId) : -1;
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % projects.length;
      
      const nextProject = projects[nextIndex];
      if (!nextProject) return;
      
      selectProject(nextProject.id);
      
      // Select the first worktree if available
      if (nextProject.worktrees && nextProject.worktrees.length > 0) {
        selectWorktree(nextProject.worktrees[0].id);
        // Focus terminal after navigation
        focusTerminalAfterNavigation(nextProject.worktrees[0].id);
      } else {
        selectWorktree(null);
      }
    } catch (error) {
      console.error('Failed to navigate to next project:', error);
    }
  }, [projects, selectedProjectId, selectProject, selectWorktree, focusTerminalAfterNavigation]);

  // Navigate to previous project
  const navigateToPreviousProject = useCallback(() => {
    try {
      if (projects.length === 0) return;

      const currentIndex = selectedProjectId ? projects.findIndex(p => p.id === selectedProjectId) : -1;
      const prevIndex = currentIndex === -1 ? projects.length - 1 : (currentIndex - 1 + projects.length) % projects.length;
      
      const prevProject = projects[prevIndex];
      if (!prevProject) return;
      
      selectProject(prevProject.id);
      
      // Select the first worktree if available
      if (prevProject.worktrees && prevProject.worktrees.length > 0) {
        selectWorktree(prevProject.worktrees[0].id);
        // Focus terminal after navigation
        focusTerminalAfterNavigation(prevProject.worktrees[0].id);
      } else {
        selectWorktree(null);
      }
    } catch (error) {
      console.error('Failed to navigate to previous project:', error);
    }
  }, [projects, selectedProjectId, selectProject, selectWorktree, focusTerminalAfterNavigation]);

  // Navigate to worktree by number (1-9)
  const navigateToWorktreeByNumber = useCallback((number: number) => {
    try {
      const worktrees = getCurrentProjectWorktrees();
      if (number >= 1 && number <= worktrees.length) {
        const project = getSelectedProject();
        const targetWorktree = worktrees[number - 1];
        if (project && targetWorktree) {
          selectProject(project.id);
          selectWorktree(targetWorktree.id);
          // Focus terminal after navigation
          focusTerminalAfterNavigation(targetWorktree.id);
        }
      }
    } catch (error) {
      console.error(`Failed to navigate to worktree ${number}:`, error);
    }
  }, [getCurrentProjectWorktrees, getSelectedProject, selectProject, selectWorktree, focusTerminalAfterNavigation]);

  // Action mapping for configurable shortcuts
  const actionMap = useMemo(() => ({
    navigateToNextWorktree,
    navigateToPreviousWorktree,
    navigateToNextProject,
    navigateToPreviousProject,
    showHelp: () => setShowHelp(true),
  }), [
    navigateToNextWorktree,
    navigateToPreviousWorktree,
    navigateToNextProject,
    navigateToPreviousProject,
  ]);

  // Memoized shortcuts array from configuration
  const shortcuts: KeyboardShortcut[] = useMemo(() => {
    if (!enabled) return [];
    
    return shortcutConfigs.map((config) => {
      let action: () => void;
      
      // Handle parameterized actions (like worktree numbers)
      if (config.action.includes(':')) {
        const [actionName, param] = config.action.split(':');
        if (actionName === 'navigateToWorktreeByNumber') {
          const number = parseInt(param, 10);
          action = () => navigateToWorktreeByNumber(number);
        } else {
          action = () => console.warn(`Unknown parameterized action: ${config.action}`);
        }
      } else {
        action = actionMap[config.action as keyof typeof actionMap] || 
                (() => console.warn(`Unknown action: ${config.action}`));
      }

      return {
        id: config.id,
        key: config.key,
        metaKey: config.metaKey,
        ctrlKey: config.ctrlKey,
        shiftKey: config.shiftKey,
        altKey: config.altKey,
        description: config.description,
        action,
      };
    });
  }, [shortcutConfigs, enabled, actionMap, navigateToWorktreeByNumber]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      try {
        // Don't trigger shortcuts if user is typing in interactive elements
        // Also don't trigger if user is in terminal (terminal handles its own navigation)
        const activeElement = document.activeElement;
        const isTerminal = activeElement?.classList.contains('xterm-helper-textarea');
        const isOtherInteractiveElement = 
          activeElement?.tagName === 'INPUT' ||
          activeElement?.tagName === 'TEXTAREA' ||
          activeElement?.tagName === 'SELECT' ||
          activeElement?.getAttribute('contenteditable') === 'true' ||
          activeElement?.getAttribute('role') === 'textbox';

        if (isOtherInteractiveElement || isTerminal) {
          console.log(`[KeyboardShortcuts] Blocked - ${isTerminal ? 'terminal' : 'interactive element'} focused`);
          return;
        }

        // Handle Escape to close help modal (always works)
        if (event.key === 'Escape' && showHelp) {
          setShowHelp(false);
          event.preventDefault();
          return;
        }

        // Process configured shortcuts
        for (const shortcut of shortcuts) {
          const keyMatches = event.key === shortcut.key;
          const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey;
          const metaMatches = !!shortcut.metaKey === event.metaKey;
          const shiftMatches = !!shortcut.shiftKey === event.shiftKey;
          const altMatches = !!shortcut.altKey === event.altKey;

          if (keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches) {
            event.preventDefault();
            shortcut.action();
            break;
          }
        }
      } catch (error) {
        console.error('Error handling keyboard shortcut:', error);
      }
    };

    document.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, showHelp, enabled]);

  return { shortcuts, showHelp, setShowHelp };
};