# ThreadSweeper
**Clean ChatGPT and Claude history without nuking Projects.**

![Image](https://github.com/user-attachments/assets/8004ba43-6e39-4972-a138-00e3a034e4c0)

ThreadSweeper helps clean up ChatGPT and Claude conversation history without touching protected areas like **Projects**. It adds dry run, provider-aware safety checks, scoped deletion, and a stop button so you can bulk-delete regular chats without using DevTools or userscripts.

Clean it up once on the web and it syncs across all your devices. No DevTools. No Tampermonkey. Just load the extension and go.

[![Follow on X](https://img.shields.io/twitter/follow/stamatiou?style=social)](https://x.com/stamatiou)

## Install (No Store Required)

1. Download `threadsweeper-extension-vX.Y.Z.zip` from the [latest GitHub Release](https://github.com/stamsam/ThreadSweeper/releases/latest)
2. Unzip it
3. Open `chrome://extensions` (or `edge://extensions`)
4. Enable **Developer mode**
5. Click **Load unpacked** -> select the unzipped `threadsweeper-extension` folder
6. Go to `https://chatgpt.com` or `https://claude.ai`
7. Click the ThreadSweeper icon

## Safety Defaults

Every run starts with guardrails on:

| Setting | Default | Why |
|---|---|---|
| Dry run | On | Preview what would be deleted before anything happens |
| Provider selector | Auto | Matches the active tab or lets you force ChatGPT or Claude |
| Restrict scope | On | ChatGPT stays in `Your chats`; Claude stays in `Recents` |
| Max deletes | Limited | Caps the run so nothing spirals |
| Stop button | Always visible | Kill it mid-run instantly |
| Browser confirmation | Optional | Extra prompt before live deletes |

## Usage

1. First run: keep **Dry run** on, click **Start**, and read the preview logs
2. When it looks right, uncheck **Dry run** and run for real
3. Hit **Stop** anytime
4. Claude runs only from `claude.ai/recents` so Projects stay protected
5. Only turn off **Restrict to Your chats** on ChatGPT if you know what you're doing

## Project Structure

```text
extension/  Chrome MV3 extension (manifest, popup, content script)
scripts/    package-extension.sh builds the release zip locally
```

## Build a Release Zip

```bash
./scripts/package-extension.sh
```

Outputs `releases/threadsweeper-extension-vX.Y.Z.zip` locally. Attach it to a GitHub Release. The zip is gitignored and never committed.

## Heads Up

- Deletions are permanent and sync across all your devices
- Not affiliated with OpenAI
- ChatGPT and Claude UI changes can break selectors; always dry-run after major updates
- Claude deletion is limited to `claude.ai/recents` to protect Projects
- Only acts on threads that are currently loaded and visible to the provider-specific flow

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

MIT. See [LICENSE](./LICENSE)
