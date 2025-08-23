import { Sidebar } from './components/Sidebar';
import { ProjectForm } from './components/ProjectForm';
import { WorktreeView } from './components/WorktreeView';
import { useProjectStore } from './stores/projectStore';
import { FolderGit2 } from 'lucide-react';

function App() {
  const { selectedProjectId, selectedWorktreeId, getSelectedProject, getSelectedWorktree } = useProjectStore();
  const selectedProject = getSelectedProject();
  const selectedWorktree = getSelectedWorktree();
  

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'rgb(var(--color-background))', color: 'rgb(var(--color-foreground))' }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header/Tabs Bar - 40px height to match sidebar header */}
        <div className="h-10 flex items-center px-4 titlebar" style={{ backgroundColor: 'rgb(var(--color-card))', borderBottom: '1px solid rgb(var(--color-border))' }}>
          <div className="flex-1 flex items-center space-x-2">
            {selectedProject ? (
              <div className="flex items-center gap-2 text-sm">
                <FolderGit2 className="w-4 h-4" style={{ color: 'rgb(var(--color-muted-foreground))' }} />
                <span style={{ color: 'rgb(var(--color-foreground))' }}>{selectedProject.name}</span>
              </div>
            ) : (
              <span className="text-sm" style={{ color: 'rgb(var(--color-muted-foreground))' }}>Add a new project to get started</span>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex">
          {/* Main Content Area */}
          {selectedWorktreeId && selectedWorktree ? (
            <WorktreeView />
          ) : selectedProjectId === null ? (
            <ProjectForm mode="create" />
          ) : selectedProject ? (
            <ProjectForm mode="edit" />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-light mb-4" style={{ color: 'rgb(var(--color-foreground))' }}>Welcome to Worktree Studio</h2>
                <p className="mb-6" style={{ color: 'rgb(var(--color-muted-foreground))' }}>
                  Add a project to get started
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;