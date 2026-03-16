# ThreadSweeper

ThreadSweeper is a Chrome/Edge extension for cleaning ChatGPT sidebar threads with safety guardrails.

## What This Solves

- No DevTools paste every time
- No Tampermonkey required
- Shareable install via GitHub zip

## Core Safety Defaults

- `Dry run` enabled by default
- `Restrict to Your chats` enabled by default
- `Max deletes` limit
- `Stop` button
- Optional final browser confirmation prompt

## Install From GitHub (No Store)

Download the latest release from:

- `https://github.com/stamsam/ThreadSweeper/releases/latest`

Then:

1. Download `threadsweeper-extension-vX.Y.Z.zip` from the latest GitHub Release.
2. Unzip it.
3. Open `chrome://extensions` (or `edge://extensions`).
4. Turn on `Developer mode`.
5. Click `Load unpacked`.
6. Select the unzipped `threadsweeper-extension` folder.
7. Open `https://chatgpt.com`.
8. Click the ThreadSweeper extension icon.

## Usage

1. Keep `Dry run` checked for your first run.
2. Click `Start` and confirm preview logs look correct.
3. Uncheck `Dry run` only when ready.
4. Keep `Restrict to Your chats` on unless intentional.
5. Click `Stop` anytime.

## Project Structure

- `extension/` Chrome MV3 extension files (`manifest.json`, popup, content script)
- `scripts/package-extension.sh` builds a local release zip
- `threadsweeper.user.js` legacy userscript version (optional)

## Build Release Zip

```bash
./scripts/package-extension.sh
```

This creates:

- `releases/threadsweeper-extension-vX.Y.Z.zip`

The generated zip is kept local for GitHub Releases and is not committed to the repository.

To publish a new version, create a GitHub Release and attach the generated zip there.

## Important Notes

- This project is not affiliated with OpenAI.
- ChatGPT UI changes can break selectors.
- Always run dry mode first after major ChatGPT UI updates.
- Script only acts on currently loaded/visible sidebar items.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## License

MIT. See [`LICENSE`](./LICENSE).
