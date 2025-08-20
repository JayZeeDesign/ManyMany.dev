import React from 'react';
import { Sidebar } from './components/Sidebar';
import { useAppStore } from './stores/useAppStore';

function App() {
  const { selectedWorktreeId } = useAppStore();

  return (
    <div className="flex h-screen bg-[#1e1e1e] text-[#cccccc]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header/Tabs Bar */}
        <div className="h-10 bg-[#2d2d30] border-b border-[#3e3e42] flex items-center px-4 titlebar">
          <div className="flex-1 flex items-center space-x-2">
            {selectedWorktreeId ? (
              <div className="text-sm">
                {/* Terminal tabs will go here */}
                <span className="text-[#969696]">Terminal</span>
              </div>
            ) : (
              <span className="text-sm text-[#969696]">Select a worktree to get started</span>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex">
          {/* Terminal Area */}
          <div className="flex-1 bg-[#1e1e1e]">
            {selectedWorktreeId ? (
              <div className="h-full flex items-center justify-center text-[#969696]">
                {/* Terminal will be rendered here */}
                <div>Terminal placeholder</div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <h2 className="text-2xl font-light mb-2">Welcome to Worktree Studio</h2>
                  <p className="text-[#969696] mb-4">
                    Add a project and create worktrees to get started
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Git Panel (Right Side) */}
          {selectedWorktreeId && (
            <div className="w-80 border-l border-[#3e3e42] bg-[#252526]">
              <div className="p-4 border-b border-[#3e3e42]">
                <h3 className="font-normal text-sm uppercase tracking-wide text-[#cccccc]">Changes</h3>
              </div>
              <div className="p-4">
                <p className="text-sm text-[#969696]">No changes detected</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;