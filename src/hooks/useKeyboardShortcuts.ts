import { useEffect, useCallback, useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';

export interface KeyboardShortcut {
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
    getSelectedWorktree,
  } = useProjectStore();
  
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
    const worktrees = getCurrentProjectWorktrees();
    if (worktrees.length === 0) return;

    const currentIndex = getCurrentWorktreeIndex();
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % worktrees.length;
    
    const project = getSelectedProject();
    if (project) {
      selectProject(project.id);
      selectWorktree(worktrees[nextIndex].id);
    }
  }, [getCurrentProjectWorktrees, getCurrentWorktreeIndex, getSelectedProject, selectProject, selectWorktree]);

  // Navigate to previous worktree
  const navigateToPreviousWorktree = useCallback(() => {
    const worktrees = getCurrentProjectWorktrees();
    if (worktrees.length === 0) return;

    const currentIndex = getCurrentWorktreeIndex();
    const prevIndex = currentIndex === -1 ? worktrees.length - 1 : (currentIndex - 1 + worktrees.length) % worktrees.length;
    
    const project = getSelectedProject();
    if (project) {
      selectProject(project.id);
      selectWorktree(worktrees[prevIndex].id);
    }
  }, [getCurrentProjectWorktrees, getCurrentWorktreeIndex, getSelectedProject, selectProject, selectWorktree]);

  // Navigate to next project
  const navigateToNextProject = useCallback(() => {
    if (projects.length === 0) return;

    const currentIndex = selectedProjectId ? projects.findIndex(p => p.id === selectedProjectId) : -1;
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % projects.length;
    
    const nextProject = projects[nextIndex];
    selectProject(nextProject.id);
    
    // Select the first worktree if available
    if (nextProject.worktrees && nextProject.worktrees.length > 0) {
      selectWorktree(nextProject.worktrees[0].id);
    } else {
      selectWorktree(null);
    }
  }, [projects, selectedProjectId, selectProject, selectWorktree]);

  // Navigate to previous project
  const navigateToPreviousProject = useCallback(() => {
    if (projects.length === 0) return;

    const currentIndex = selectedProjectId ? projects.findIndex(p => p.id === selectedProjectId) : -1;
    const prevIndex = currentIndex === -1 ? projects.length - 1 : (currentIndex - 1 + projects.length) % projects.length;
    
    const prevProject = projects[prevIndex];
    selectProject(prevProject.id);
    
    // Select the first worktree if available
    if (prevProject.worktrees && prevProject.worktrees.length > 0) {
      selectWorktree(prevProject.worktrees[0].id);
    } else {
      selectWorktree(null);
    }
  }, [projects, selectedProjectId, selectProject, selectWorktree]);

  // Navigate to worktree by number (1-9)
  const navigateToWorktreeByNumber = useCallback((number: number) => {
    const worktrees = getCurrentProjectWorktrees();
    if (number >= 1 && number <= worktrees.length) {
      const project = getSelectedProject();
      if (project) {
        selectProject(project.id);
        selectWorktree(worktrees[number - 1].id);
      }
    }
  }, [getCurrentProjectWorktrees, getSelectedProject, selectProject, selectWorktree]);

  // Define keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'ArrowRight',
      metaKey: true,
      description: 'Next worktree',
      action: navigateToNextWorktree,
    },
    {
      key: 'ArrowLeft',
      metaKey: true,
      description: 'Previous worktree',
      action: navigateToPreviousWorktree,
    },
    {
      key: 'ArrowDown',
      metaKey: true,
      description: 'Next project',
      action: navigateToNextProject,
    },
    {
      key: 'ArrowUp',
      metaKey: true,
      description: 'Previous project',
      action: navigateToPreviousProject,
    },
    {
      key: '/',
      metaKey: true,
      description: 'Show keyboard shortcuts',
      action: () => setShowHelp(true),
    },
    // Worktree numbers 1-9
    ...Array.from({ length: 9 }, (_, i) => ({
      key: (i + 1).toString(),
      metaKey: true,
      description: `Switch to worktree ${i + 1}`,
      action: () => navigateToWorktreeByNumber(i + 1),
    })),
  ];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input/textarea
      const activeElement = document.activeElement;
      if (
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      // Handle Escape to close help modal
      if (event.key === 'Escape' && showHelp) {
        setShowHelp(false);
        return;
      }

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
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, showHelp]);

  return { shortcuts, showHelp, setShowHelp };
};