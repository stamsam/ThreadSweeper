# Contributing

## Development Principles

- Safety first: default behaviors should reduce accidental deletion risk.
- Keep selectors defensive and well-commented when logic is non-obvious.
- Favor small, reviewable pull requests.

## Local Testing

1. Edit `threadsweeper.user.js`.
2. Re-paste into Tampermonkey (or use your local userscript sync workflow).
3. Test dry-run mode on a non-critical account/sidebar state.
4. Verify section scoping before live deletion.

## Pull Requests

- Include a clear summary of behavior changes.
- Include manual test notes:
  - Browser and Tampermonkey version
  - Dry-run behavior
  - Live-delete behavior
  - Any known limitations

## Issue Reports

Please include:

- Browser + version
- Userscript manager + version
- A screenshot of sidebar layout (redact private info)
- Console logs from ThreadSweeper panel
