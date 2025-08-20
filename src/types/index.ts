export interface Project {
  id: string;
  name: string;
  path: string;
  defaultBranch: string;
  isGitRepo: boolean;
  createdAt: string;
  lastOpenedAt: string;
}

export interface Worktree {
  id: string;
  projectId: string;
  branch: string;
  path: string;
  isActive: boolean;
  hasUncommittedChanges: boolean;
  createdAt: string;
}

export interface Terminal {
  id: string;
  worktreeId: string;
  name: string;
  type: 'shell' | 'claude-code';
  isActive: boolean;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: GitFile[];
  unstaged: GitFile[];
  untracked: GitFile[];
}

export interface GitFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
}