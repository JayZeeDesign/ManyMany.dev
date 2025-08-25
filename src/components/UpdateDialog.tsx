import { Download, CheckCircle, AlertCircle, X, RotateCcw } from 'lucide-react';
import { useUpdateStore } from '../stores/updateStore';

export function UpdateDialog() {
  const {
    showUpdateDialog,
    downloading,
    downloaded,
    installing,
    progress,
    version,
    body,
    error,
    setShowUpdateDialog,
    downloadAndInstall,
    resetState,
  } = useUpdateStore();

  if (!showUpdateDialog) {
    return null;
  }

  const handleClose = () => {
    if (!downloading && !installing) {
      setShowUpdateDialog(false);
    }
  };

  const handleRetry = () => {
    resetState();
    downloadAndInstall();
  };

  const getStatusIcon = () => {
    if (error) return <AlertCircle className="w-6 h-6" style={{ color: 'rgb(220 38 38)' }} />;
    if (installing) return <RotateCcw className="w-6 h-6 animate-spin" style={{ color: 'rgb(var(--color-primary))' }} />;
    if (downloaded) return <CheckCircle className="w-6 h-6" style={{ color: 'rgb(34 197 94)' }} />;
    if (downloading) return <Download className="w-6 h-6" style={{ color: 'rgb(var(--color-primary))' }} />;
    return <Download className="w-6 h-6" style={{ color: 'rgb(var(--color-primary))' }} />;
  };

  const getStatusText = () => {
    if (error) return 'Update failed';
    if (installing) return 'Installing update and restarting...';
    if (downloaded) return 'Update downloaded successfully';
    if (downloading) return `Downloading update... ${progress}%`;
    return 'Ready to download';
  };

  const getStatusDescription = () => {
    if (error) return error;
    if (installing) return 'The application will restart automatically once the update is installed.';
    if (downloaded) return 'The update has been downloaded and will be installed when you restart the application.';
    if (downloading) return 'Please wait while the update is being downloaded.';
    return 'Click "Download" to start downloading the latest version.';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={handleClose}
      >
        {/* Dialog */}
        <div
          className="w-full max-w-md mx-4 rounded-lg shadow-xl"
          style={{
            backgroundColor: 'rgb(var(--color-card))',
            border: '1px solid rgb(var(--color-border))',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <h2
                  className="text-lg font-semibold"
                  style={{ color: 'rgb(var(--color-card-foreground))' }}
                >
                  {getStatusText()}
                </h2>
                {version && (
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="text-sm"
                      style={{ color: 'rgb(var(--color-muted-foreground))' }}
                    >
                      Version
                    </span>
                    <span
                      className="text-sm px-2 py-1 rounded"
                      style={{
                        backgroundColor: 'rgb(var(--color-muted))',
                        color: 'rgb(var(--color-foreground))',
                      }}
                    >
                      {version}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {!downloading && !installing && (
              <button
                onClick={handleClose}
                className="flex items-center justify-center w-8 h-8 rounded-md transition-all"
                style={{ color: 'rgb(var(--color-muted-foreground))' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {downloading && (
            <div className="px-6 pb-4">
              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'rgb(var(--color-muted))' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: 'rgb(var(--color-primary))',
                    width: `${progress}%`,
                  }}
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <span
                  className="text-sm"
                  style={{ color: 'rgb(var(--color-muted-foreground))' }}
                >
                  {progress}% complete
                </span>
                <span
                  className="text-xs"
                  style={{ color: 'rgb(var(--color-muted-foreground))' }}
                >
                  Downloading...
                </span>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="px-6 pb-6">
            <p
              className="text-sm mb-4"
              style={{ color: 'rgb(var(--color-muted-foreground))' }}
            >
              {getStatusDescription()}
            </p>

            {body && (
              <div className="mb-4">
                <h4
                  className="text-sm font-medium mb-2"
                  style={{ color: 'rgb(var(--color-card-foreground))' }}
                >
                  What's new:
                </h4>
                <div
                  className="text-sm p-3 rounded-md"
                  style={{
                    backgroundColor: 'rgb(var(--color-muted))',
                    color: 'rgb(var(--color-muted-foreground))',
                  }}
                >
                  {body.split('\n').map((line, index) => (
                    <p key={index} className={index > 0 ? 'mt-1' : ''}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              {error ? (
                <>
                  <button
                    onClick={handleRetry}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-md transition-all font-medium"
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
                    <RotateCcw className="w-4 h-4" />
                    Retry
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex-1 px-4 py-2 text-sm rounded-md transition-all"
                    style={{
                      backgroundColor: 'rgb(var(--color-muted))',
                      color: 'rgb(var(--color-muted-foreground))',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted) / 0.8)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : downloading || installing ? (
                <div
                  className="flex-1 text-center py-2 text-sm"
                  style={{ color: 'rgb(var(--color-muted-foreground))' }}
                >
                  {installing ? 'Restarting application...' : 'Download in progress...'}
                </div>
              ) : downloaded ? (
                <div
                  className="flex-1 text-center py-2 text-sm"
                  style={{ color: 'rgb(34 197 94)' }}
                >
                  ✓ Update ready. Application will restart automatically.
                </div>
              ) : (
                <>
                  <button
                    onClick={downloadAndInstall}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-md transition-all font-medium"
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
                    Download
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex-1 px-4 py-2 text-sm rounded-md transition-all"
                    style={{
                      backgroundColor: 'rgb(var(--color-muted))',
                      color: 'rgb(var(--color-muted-foreground))',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted) / 0.8)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgb(var(--color-muted))';
                    }}
                  >
                    Later
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}