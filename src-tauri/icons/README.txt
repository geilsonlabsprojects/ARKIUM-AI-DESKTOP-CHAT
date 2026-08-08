Place your app icons here before building.

Required files:
  32x32.png          - 32x32 PNG icon
  128x128.png        - 128x128 PNG icon
  128x128@2x.png     - 256x256 PNG icon (2x for HiDPI)
  icon.icns          - macOS icon bundle
  icon.ico           - Windows icon

To generate icons from a single source image, use:
  npm install -g @tauri-apps/cli
  tauri icon path/to/your-icon.png

Or use the online Tauri icon generator:
  https://v2.tauri.app/learn/icons/

The icon should be at least 1024x1024px PNG with transparent background.

For development, Tauri will use placeholder icons if these files are missing.
