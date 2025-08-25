import { Download, X } from 'lucide-react';
import { useUpdateStore } from '../stores/updateStore';

export function UpdateBanner() {
  const {
    showUpdateBanner,
    version,
    body,
    setShowUpdateBanner,
    downloadAndInstall,
    dismissUpdate,
  } = useUpdateStore();

  if (!showUpdateBanner) {
    return null;
  }

  const handleDownload = () => {
    downloadAndInstall();
  };

  const handleDismiss = () => {
    dismissUpdate();
  };

  const handleRemindLater = () => {
    setShowUpdateBanner(false);
  };

  return (
    <div
      className="flex items-center justify-between px-4 py-3 border-b"
      style={{
        backgroundColor: 'rgb(var(--color-primary) / 0.1)',
        borderColor: 'rgb(var(--color-border))',
        color: 'rgb(var(--color-foreground))',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: 'rgb(var(--color-primary))',
            color: 'rgb(var(--color-primary-foreground))',
          }}
        >
          <Download className="w-4 h-4" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium">
              New update available
            </h4>
            {version && (
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{
                  backgroundColor: 'rgb(var(--color-primary))',
                  color: 'rgb(var(--color-primary-foreground))',
                }}
              >
                v{version}
              </span>
            )}
          </div>
          
          {body && (
            <p
              className="text-sm mt-1 line-clamp-1"
              style={{ color: 'rgb(var(--color-muted-foreground))' }}
            >
              {body}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all font-medium"
          style={{
            backgroundColor: 'rgb(var(--color-primary))',
            color: 'rgb(var(--color-primary-foreground))',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <Download className="w-4 h-4" />
          Update now
        </button>

        <button
          onClick={handleRemindLater}
          className="px-3 py-1.5 text-sm rounded-md transition-all"
          style={{ color: 'rgb(var(--color-muted-foreground))' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          Later
        </button>

        <button
          onClick={handleDismiss}
          className="flex items-center justify-center w-8 h-8 rounded-md transition-all"
          style={{ color: 'rgb(var(--color-muted-foreground))' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Don't show again for this version"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}