# ThreadSweeper
**Clean your ChatGPT sidebar without nuking your Projects.**

![Image](https://github.com/user-attachments/assets/8004ba43-6e39-4972-a138-00e3a034e4c0)

ChatGPT's built-in "Delete all chats" nukes your Projects too. Clicking one by one is slow, error-prone, and easy to put off. ThreadSweeper lets you bulk-delete regular threads with dry run, filters, and a stop button, without touching your **Projects**.

No DevTools. No Tampermonkey. Just load the extension and go. [![Follow on X](https://img.shields.io/twitter/follow/stamatiou?style=social)](https://x.com/stamatiou)

## Install (No Store Required)

1. Download `threadsweeper-extension-vX.Y.Z.zip` from the [latest GitHub Release](https://github.com/stamsam/ThreadSweeper/releases/latest)
2. Unzip it
3. Open `chrome://extensions` (or `edge://extensions`)
4. Enable **Developer mode**
5. Click **Load unpacked** -> select the unzipped `threadsweeper-extension` folder
6. Go to `https://chatgpt.com` and click the ThreadSweeper icon

## Safety Defaults

Every run starts with guardrails on:

| Setting | Default | Why |
|---|---|---|
| Dry run | On | Preview what would be deleted before anything happens |
| Restrict to Your chats | On | Skips shared and Project threads |
| Max deletes | Limited | Caps the run so nothing spirals |
| Stop button | Always visible | Kill it mid-run instantly |
| Browser confirmation | Optional | Extra prompt before live deletes |

## Usage

1. First run: keep **Dry run** on, click **Start**, and read the preview logs
2. When it looks right, uncheck **Dry run** and run for real
3. Hit **Stop** anytime
4. Only turn off **Restrict to Your chats** if you know what you're doing

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

- Not affiliated with OpenAI
- ChatGPT UI changes can break selectors; always dry-run after major updates
- Only acts on sidebar threads that are currently loaded and visible

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

MIT. See [LICENSE](./LICENSE)
