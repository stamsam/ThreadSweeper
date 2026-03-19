# Contributing

## Development Principles
- Safety first: default behaviors should reduce accidental deletion risk.
- Keep selectors defensive and well-commented when logic is non-obvious.
- Favor small, reviewable pull requests.

## Local Testing
1. Edit the extension files in `extension/`.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the `extension/` folder, or click **Reload** if already installed.
5. Open `https://chatgpt.com`.
6. Test dry-run mode on a non-critical account/sidebar state.
7. Verify section scoping before live deletion.

## Build a Release Zip

```bash
./scripts/package-extension.sh
```

Outputs `releases/threadsweeper-extension-vX.Y.Z.zip` locally. Attach it to a GitHub Release; the zip is gitignored and never committed.

## Pull Requests

- Include a clear summary of behavior changes.
- Include manual test notes for browser and version.
- Include manual test notes for dry-run behavior.
- Include manual test notes for live-delete behavior.
- Include manual test notes for known limitations.

## Issue Reports

Please include:

- Browser + version
- Extension install method (`Load unpacked`, Chrome, Edge, etc.)
- A screenshot of the relevant sidebar/history layout (redact private info)
- Logs from the ThreadSweeper popup and browser console
