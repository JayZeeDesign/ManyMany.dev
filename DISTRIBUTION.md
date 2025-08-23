# ManyMany.dev Distribution & Updates Guide

This document explains how to distribute your ManyMany.dev app and push updates to users.

## Prerequisites

### 1. Apple Developer Account (Required for macOS)
- Sign up for Apple Developer Program ($99/year)
- Create signing certificates:
  - Developer ID Application certificate
  - Developer ID Installer certificate (for .pkg files)

### 2. Generate Updater Keys
Run this command interactively in your terminal:
```bash
npx tauri signer generate
```
This will generate:
- Private key (keep secret) - for signing updates
- Public key - for embedding in your app

## GitHub Repository Setup

### 1. Repository Secrets
Add these secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

#### Code Signing (macOS)
- `APPLE_CERTIFICATE`: Base64 encoded .p12 certificate
- `APPLE_CERTIFICATE_PASSWORD`: Certificate password
- `APPLE_ID`: Your Apple ID email
- `APPLE_PASSWORD`: App-specific password
- `APPLE_TEAM_ID`: Your Apple Developer Team ID

#### Updater Signing
- `TAURI_SIGNING_PRIVATE_KEY`: The private key from step 2
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: Password you set for the private key

### 2. Configure tauri.conf.json
Update your `src-tauri/tauri.conf.json` with the updater configuration:

```json
{
  "updater": {
    "active": true,
    "endpoints": [
      "https://github.com/JayZeeDesign/ManyMany.dev/releases/latest/download/latest.json"
    ],
    "dialog": true,
    "pubkey": "YOUR_PUBLIC_KEY_HERE"
  },
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)",
      "hardenedRuntime": true,
      "entitlements": "src-tauri/entitlements.plist"
    }
  }
}
```

Replace `YOUR_PUBLIC_KEY_HERE` with the public key from step 2.

### 3. Add Entitlements File (macOS)
Create `src-tauri/entitlements.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.disable-executable-page-protection</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
  <key>com.apple.security.network.client</key>
  <true/>
  <key>com.apple.security.network.server</key>
  <true/>
</dict>
</plist>
```

## Adding Update Functionality to Your App

### 1. Install Tauri Updater Plugin
```bash
npm install @tauri-apps/plugin-updater
```

### 2. Add Update Code
Add this to your React app (e.g., in App.tsx):

```typescript
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

async function checkForUpdates() {
  try {
    const update = await check();
    if (update?.available) {
      console.log(\`Update available: \${update.version}\`);
      
      // Download and install update
      let downloaded = 0;
      let contentLength = 0;
      
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength ?? 0;
            console.log('Download started');
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            console.log(\`Downloaded \${downloaded} of \${contentLength}\`);
            break;
          case 'Finished':
            console.log('Download finished');
            break;
        }
      });

      // Restart the app to apply update
      await relaunch();
    }
  } catch (error) {
    console.error('Update check failed:', error);
  }
}

// Check for updates on app start
useEffect(() => {
  checkForUpdates();
}, []);
```

## Release Process

### 1. Create a New Release

1. **Update version** in `src-tauri/tauri.conf.json` and `package.json`
2. **Commit changes** and push to main branch
3. **Create and push a tag**:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

4. **GitHub Actions will automatically**:
   - Build for all platforms (macOS, Windows, Linux)
   - Code sign the macOS app
   - Create GitHub release with assets
   - Generate `latest.json` for the updater

### 2. Manual Release (Alternative)
You can also create releases manually through GitHub's web interface:
1. Go to `Releases` tab in your repository
2. Click "Create a new release"
3. Choose tag version (e.g., `v1.0.1`)
4. Add release notes
5. GitHub Actions will build and attach assets

## Distribution Methods

### 1. Direct Download
Users can download from your GitHub releases page:
`https://github.com/JayZeeDesign/ManyMany.dev/releases`

### 2. macOS App Store (Future)
For App Store distribution, you'll need additional setup:
- App Store provisioning profiles
- App Store entitlements
- Sandbox compliance

### 3. Website Distribution
Host download links on your website pointing to GitHub releases.

## Automatic Updates

Once users have the app installed:
1. App checks for updates on startup
2. If update available, user gets notification dialog
3. User can choose to download and install
4. App restarts with new version

## Troubleshooting

### Common Issues:
1. **Code signing fails**: Check certificates and Team ID
2. **Update check fails**: Verify public key in config
3. **GitHub Actions fail**: Check repository secrets
4. **Notarization fails**: Ensure proper entitlements

### Debugging:
- Check GitHub Actions logs for build errors
- Use `tauri build --debug` for local testing
- Verify certificates with `security find-identity -v`

## Security Notes

- Keep your private signing key secure
- Use repository secrets for sensitive data
- Regularly rotate certificates and keys
- Consider using a dedicated signing service for production

## Next Steps

1. Set up proper code signing certificates
2. Configure repository secrets
3. Test the release process with a beta version
4. Add update UI to your app
5. Set up analytics to track update adoption