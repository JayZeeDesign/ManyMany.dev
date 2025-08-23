import { useState, useEffect } from 'react';
import { GitBranch, Plus, X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface CreateWorktreeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (worktree: any) => void;
  projectId: string;
  projectPath: string;
  projectName: string;
}

export function CreateWorktreeDialog({ 
  isOpen, 
  onClose, 
  onSuccess, 
  projectId, 
  projectPath, 
  projectName 
}: CreateWorktreeDialogProps) {
  
  const [selectedBranch, setSelectedBranch] = useState('');
  const [customBranch, setCustomBranch] = useState('');
  const [worktreeName, setWorktreeName] = useState('');
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [useCustomBranch, setUseCustomBranch] = useState(false);

  useEffect(() => {
    if (isOpen && projectPath) {
      loadAvailableBranches();
    }
  }, [isOpen, projectPath]);

  const loadAvailableBranches = async () => {
    setIsLoadingBranches(true);
    try {
      const branches = await invoke<string[]>('get_available_branches', {
        projectPath: projectPath
      });
      setAvailableBranches(branches);
      if (branches.length > 0) {
        setSelectedBranch(branches[0]); // Default to first branch (main/master)
        // Auto-suggest worktree name based on branch
        if (!worktreeName) {
          setWorktreeName(branches[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load branches:', error);
    } finally {
      setIsLoadingBranches(false);
    }
  };

  const handleCreateWorktree = async () => {
    const branchToUse = useCustomBranch ? customBranch : selectedBranch;
    
    if (!branchToUse.trim() || !worktreeName.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      const worktree = await invoke('create_worktree', {
        projectPath: projectPath,
        branch: branchToUse.trim(),
        projectId: projectId,
        worktreeName: worktreeName.trim()
      });
      
      onSuccess(worktree);
      onClose();
      
      // Reset form
      setSelectedBranch('');
      setCustomBranch('');
      setWorktreeName('');
      setUseCustomBranch(false);
    } catch (error) {
      console.error('Failed to create worktree:', error);
      // TODO: Show error toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedBranch('');
    setCustomBranch('');
    setWorktreeName('');
    setUseCustomBranch(false);
    onClose();
  };

  if (!isOpen) {
    return null;
  }
  

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
        style={{ 
          backgroundColor: 'rgb(var(--color-card))',
          borderColor: 'rgb(var(--color-border))'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-foreground))' }}>
            Create New Worktree
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-md transition-all"
            style={{ 
              backgroundColor: 'transparent',
              color: 'rgb(var(--color-muted-foreground))'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Project</label>
            <div className="p-2 rounded border" style={{ 
              backgroundColor: 'rgb(var(--color-muted))',
              borderColor: 'rgb(var(--color-border))',
              color: 'rgb(var(--color-foreground))'
            }}>
              {projectName}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Branch</label>
            
            {/* Branch selection tabs */}
            <div className="flex mb-3 border rounded" style={{ borderColor: 'rgb(var(--color-border))' }}>
              <button
                onClick={() => setUseCustomBranch(false)}
                className="flex-1 px-3 py-2 text-sm font-medium transition-all"
                style={{
                  backgroundColor: !useCustomBranch ? 'rgb(var(--color-primary))' : 'transparent',
                  color: !useCustomBranch ? 'rgb(var(--color-primary-foreground))' : 'rgb(var(--color-foreground))'
                }}
              >
                Existing Branch
              </button>
              <button
                onClick={() => setUseCustomBranch(true)}
                className="flex-1 px-3 py-2 text-sm font-medium transition-all"
                style={{
                  backgroundColor: useCustomBranch ? 'rgb(var(--color-primary))' : 'transparent',
                  color: useCustomBranch ? 'rgb(var(--color-primary-foreground))' : 'rgb(var(--color-foreground))'
                }}
              >
                New Branch
              </button>
            </div>

            {!useCustomBranch ? (
              <div>
                {isLoadingBranches ? (
                  <div className="p-3 text-center text-sm" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                    Loading branches...
                  </div>
                ) : (
                  <select
                    value={selectedBranch}
                    onChange={(e) => {
                      setSelectedBranch(e.target.value);
                      // Auto-suggest worktree name based on selected branch
                      if (!useCustomBranch && e.target.value) {
                        setWorktreeName(e.target.value);
                      }
                    }}
                    className="w-full p-2 rounded border"
                    style={{
                      backgroundColor: 'rgb(var(--color-background))',
                      borderColor: 'rgb(var(--color-border))',
                      color: 'rgb(var(--color-foreground))'
                    }}
                  >
                    {availableBranches.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4" style={{ color: 'rgb(var(--color-muted-foreground))' }} />
                <input
                  type="text"
                  value={customBranch}
                  onChange={(e) => {
                    setCustomBranch(e.target.value);
                    // Auto-suggest worktree name based on custom branch
                    if (useCustomBranch && e.target.value) {
                      setWorktreeName(e.target.value);
                    }
                  }}
                  placeholder="Enter new branch name"
                  className="flex-1 p-2 rounded border"
                  style={{
                    backgroundColor: 'rgb(var(--color-background))',
                    borderColor: 'rgb(var(--color-border))',
                    color: 'rgb(var(--color-foreground))'
                  }}
                  autoFocus={useCustomBranch}
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Worktree Name</label>
            <input
              type="text"
              value={worktreeName}
              onChange={(e) => setWorktreeName(e.target.value)}
              placeholder="Enter worktree name"
              className="w-full p-2 rounded border"
              style={{
                backgroundColor: 'rgb(var(--color-background))',
                borderColor: 'rgb(var(--color-border))',
                color: 'rgb(var(--color-foreground))'
              }}
            />
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
              This will be used as the folder name for your worktree
            </p>
          </div>

          <div className="text-xs p-3 rounded" style={{ 
            backgroundColor: 'rgb(var(--color-muted))',
            color: 'rgb(var(--color-muted-foreground))'
          }}>
            <strong>Worktree will be created at:</strong><br />
            ~/.manymany/{projectName}/{worktreeName || '[worktree-name]'}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-md transition-all border"
            style={{ 
              backgroundColor: 'transparent',
              color: 'rgb(var(--color-foreground))',
              borderColor: 'rgb(var(--color-border))',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateWorktree}
            disabled={isLoading || (!selectedBranch && !customBranch.trim()) || !worktreeName.trim()}
            className="px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2"
            style={{ 
              backgroundColor: (isLoading || (!selectedBranch && !customBranch.trim()) || !worktreeName.trim()) 
                ? 'rgb(var(--color-muted))' 
                : 'rgb(var(--color-primary))',
              color: (isLoading || (!selectedBranch && !customBranch.trim()) || !worktreeName.trim()) 
                ? 'rgb(var(--color-muted-foreground))' 
                : 'rgb(var(--color-primary-foreground))',
              cursor: (isLoading || (!selectedBranch && !customBranch.trim()) || !worktreeName.trim()) 
                ? 'not-allowed' 
                : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!isLoading && (selectedBranch || customBranch.trim()) && worktreeName.trim()) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create Worktree
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
