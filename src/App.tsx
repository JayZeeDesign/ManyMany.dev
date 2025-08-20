import React from 'react';
import { Sidebar } from './components/Sidebar';
import { useAppStore } from './stores/useAppStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GitBranch, Terminal } from 'lucide-react';

function App() {
  const { selectedWorktreeId } = useAppStore();

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'rgb(var(--color-background))', color: 'rgb(var(--color-foreground))' }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header/Tabs Bar - 40px height to match sidebar header */}
        <div className="h-10 flex items-center px-4 titlebar" style={{ backgroundColor: 'rgb(var(--color-card))', borderBottom: '1px solid rgb(var(--color-border))' }}>
          <div className="flex-1 flex items-center space-x-2">
            {selectedWorktreeId ? (
              <div className="flex items-center gap-2 text-sm">
                <Terminal className="w-4 h-4" style={{ color: 'rgb(var(--color-muted-foreground))' }} />
                <span style={{ color: 'rgb(var(--color-foreground))' }}>Terminal</span>
              </div>
            ) : (
              <span className="text-sm" style={{ color: 'rgb(var(--color-muted-foreground))' }}>Select a worktree to get started</span>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex">
          {/* Terminal Area */}
          <div className="flex-1" style={{ backgroundColor: 'rgb(var(--color-background))' }}>
            {selectedWorktreeId ? (
              <div className="h-full flex items-center justify-center">
                {/* Terminal will be rendered here */}
                <Card className="p-8" style={{ backgroundColor: 'rgba(var(--color-card), 0.5)', borderColor: 'rgb(var(--color-border))' }}>
                  <div className="flex flex-col items-center gap-4">
                    <Terminal className="w-12 h-12" style={{ color: 'rgb(var(--color-muted-foreground))' }} />
                    <p className="text-sm">Terminal placeholder</p>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <h2 className="text-2xl font-light mb-4" style={{ color: 'rgb(var(--color-foreground))' }}>Welcome to Worktree Studio</h2>
                  <p className="mb-6" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                    Add a project and create worktrees to get started
                  </p>
                  <button
                    className="px-6 py-2 text-sm font-medium rounded-md transition-all"
                    style={{ 
                      border: '1px solid rgb(var(--color-border))',
                      backgroundColor: 'transparent',
                      color: 'rgb(var(--color-foreground))',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgb(var(--color-accent))';
                      e.currentTarget.style.borderColor = 'rgb(var(--color-accent))';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = 'rgb(var(--color-border))';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    Get Started
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Git Panel (Right Side) */}
          {selectedWorktreeId && (
            <div className="w-80" style={{ borderLeft: '1px solid rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-card))' }}>
              <div className="p-4" style={{ borderBottom: '1px solid rgb(var(--color-border))' }}>
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4" style={{ color: 'rgb(var(--color-muted-foreground))' }} />
                  <h3 className="font-medium text-sm uppercase tracking-wide" style={{ color: 'rgb(var(--color-foreground))' }}>Changes</h3>
                </div>
              </div>
              <div className="p-4">
                <div className="text-sm text-center py-8" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                  No changes detected
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;