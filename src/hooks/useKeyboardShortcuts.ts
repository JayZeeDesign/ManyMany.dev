import { useEffect, useCallback, useState, useMemo } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useShortcutsStore, ShortcutConfig } from '@/stores/shortcutsStore';

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

// Utility to detect platform
const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

export const useKeyboardShortcuts = () => {
  const {
    projects,
    selectedProjectId,
    selectedWorktreeId,
    selectProject,
    selectWorktree,
    getSelectedProject,
    getSelectedWorktree,
  } = useProjectStore();
  
  const { shortcuts: shortcutConfigs, enabled } = useShortcutsStore();
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
      }
    } catch (error) {
      console.error('Failed to navigate to next worktree:', error);
    }
  }, [getCurrentProjectWorktrees, getCurrentWorktreeIndex, getSelectedProject, selectProject, selectWorktree]);

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
      }
    } catch (error) {
      console.error('Failed to navigate to previous worktree:', error);
    }
  }, [getCurrentProjectWorktrees, getCurrentWorktreeIndex, getSelectedProject, selectProject, selectWorktree]);

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
      } else {
        selectWorktree(null);
      }
    } catch (error) {
      console.error('Failed to navigate to next project:', error);
    }
  }, [projects, selectedProjectId, selectProject, selectWorktree]);

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
      } else {
        selectWorktree(null);
      }
    } catch (error) {
      console.error('Failed to navigate to previous project:', error);
    }
  }, [projects, selectedProjectId, selectProject, selectWorktree]);

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
        }
      }
    } catch (error) {
      console.error(`Failed to navigate to worktree ${number}:`, error);
    }
  }, [getCurrentProjectWorktrees, getSelectedProject, selectProject, selectWorktree]);

  // Action mapping for configurable shortcuts
  const actionMap = useMemo(() => ({
    navigateToNextWorktree,
    navigateToPreviousWorktree,
    navigateToNextProject,
    navigateToPreviousProject,
    showHelp: () => setShowHelp(true),
    navigateToWorktreeByNumber: (number: number) => () => navigateToWorktreeByNumber(number),
  }), [
    navigateToNextWorktree,
    navigateToPreviousWorktree,
    navigateToNextProject,
    navigateToPreviousProject,
    navigateToWorktreeByNumber,
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
          action = actionMap.navigateToWorktreeByNumber(parseInt(param, 10));
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
  }, [shortcutConfigs, enabled, actionMap]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      try {
        // Don't trigger shortcuts if user is typing in any interactive element
        const activeElement = document.activeElement;
        const isInteractiveElement = 
          activeElement?.tagName === 'INPUT' ||
          activeElement?.tagName === 'TEXTAREA' ||
          activeElement?.tagName === 'SELECT' ||
          activeElement?.getAttribute('contenteditable') === 'true' ||
          activeElement?.getAttribute('role') === 'textbox' ||
          // Check for xterm.js terminals
          activeElement?.classList.contains('xterm-helper-textarea');

        if (isInteractiveElement) {
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