# ThreadSweeper
Clean your ChatGPT sidebar without nuking your Projects.

ChatGPT's built-in "Delete all chats" nukes your Projects too. And clicking one-by-one is a nightmare if you have ADHD or just let the sidebar pile up. ThreadSweeper lets you bulk-delete regular threads safely — with dry run, filters, and a stop button — without touching your **Projects**!.

No DevTools. No Tampermonkey. Just load the extension and go.

## Install (No Store Required)

1. Download `threadsweeper-extension-vX.Y.Z.zip` from the [latest GitHub Release](https://github.com/stamsam/ThreadSweeper/releases/latest)
2. Unzip it
3. Open `chrome://extensions` (or `edge://extensions`)
4. Enable **Developer mode**
5. Click **Load unpacked** → select the unzipped `threadsweeper-extension` folder
6. Go to `https://chatgpt.com` and click the ThreadSweeper icon

## Safety Defaults

Every run starts with guardrails on:

| Setting | Default | Why |
|---|---|---|
| Dry run | ✅ On | Preview what would be deleted before anything happens |
| Restrict to Your chats | ✅ On | Skips shared/Project threads |
| Max deletes | Limited | Caps the run so nothing spirals |
| Stop button | Always visible | Kill it mid-run instantly |
| Browser confirmation | Optional | Extra prompt before live deletes |

## Usage

1. First run: keep **Dry run** on, click **Start**, read the preview logs
2. When it looks right, uncheck **Dry run** and run for real
3. Hit **Stop** anytime — it halts immediately
4. Only turn off **Restrict to Your chats** if you know what you're doing

## Project Structure

```
extension/          Chrome MV3 extension (manifest, popup, content script)
scripts/            package-extension.sh — builds the release zip locally
threadsweeper.user.js  Legacy userscript (kept for reference)
```

## Build a Release Zip

```bash
./scripts/package-extension.sh
```

Outputs `releases/threadsweeper-extension-vX.Y.Z.zip` locally. Attach it to a GitHub Release — the zip is gitignored and never committed.

## Heads Up

- Not affiliated with OpenAI
- ChatGPT UI changes can break selectors — always dry-run after major updates
- Only acts on sidebar threads currently loaded/visible

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

MIT — see [LICENSE](./LICENSE)

---

Key changes: led with the actual problem (Projects getting nuked, one-by-one clicking), made the safety table scannable, cut the redundant "What This Solves" section, tightened everything else. Drop this in when ready.Here's a tighter, more human rewrite that leads with the real problem:

---

# ThreadSweeper

ChatGPT's built-in "Delete all chats" nukes your Projects too. And clicking one-by-one is a nightmare if you have ADHD or just let the sidebar pile up. ThreadSweeper lets you bulk-delete regular threads safely — with dry run, filters, and a stop button — without touching your Projects.

No DevTools. No Tampermonkey. Just load the extension and go.

## Install (No Store Required)

1. Download `threadsweeper-extension-vX.Y.Z.zip` from the [latest GitHub Release](https://github.com/stamsam/ThreadSweeper/releases/latest)
2. Unzip it
3. Open `chrome://extensions` (or `edge://extensions`)
4. Enable **Developer mode**
5. Click **Load unpacked** → select the unzipped `threadsweeper-extension` folder
6. Go to `https://chatgpt.com` and click the ThreadSweeper icon

## Safety Defaults

Every run starts with guardrails on:

| Setting | Default | Why |
|---|---|---|
| Dry run | ✅ On | Preview what would be deleted before anything happens |
| Restrict to Your chats | ✅ On | Skips shared/Project threads |
| Max deletes | Limited | Caps the run so nothing spirals |
| Stop button | Always visible | Kill it mid-run instantly |
| Browser confirmation | Optional | Extra prompt before live deletes |

## Usage

1. First run: keep **Dry run** on, click **Start**, read the preview logs
2. When it looks right, uncheck **Dry run** and run for real
3. Hit **Stop** anytime — it halts immediately
4. Only turn off **Restrict to Your chats** if you know what you're doing

## Project Structure

```
extension/          Chrome MV3 extension (manifest, popup, content script)
scripts/            package-extension.sh — builds the release zip locally
threadsweeper.user.js  Legacy userscript (kept for reference)
```

## Build a Release Zip

```bash
./scripts/package-extension.sh
```

Outputs `releases/threadsweeper-extension-vX.Y.Z.zip` locally. Attach it to a GitHub Release — the zip is gitignored and never committed.

## Heads Up

- Not affiliated with OpenAI
- ChatGPT UI changes can break selectors — always dry-run after major updates
- Only acts on sidebar threads currently loaded/visible

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

MIT — see [LICENSE](./LICENSE)

---
