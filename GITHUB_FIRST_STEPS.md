# GitHub First Steps (Beginner)

## 1. Create Your GitHub Account

1. Go to `https://github.com`.
2. Click `Sign up`.
3. Verify your email.

## 2. Create a New Repository

1. Click the `+` button (top right) -> `New repository`.
2. Repository name: `ThreadSweeper`.
3. Set visibility (`Public` if open source).
4. Do **not** initialize with README (you already have files locally).
5. Click `Create repository`.

## 3. Push This Local Folder

Run these commands from the `ThreadSweeper` folder:

```bash
git init
git add .
git commit -m "Initial ThreadSweeper extension MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ThreadSweeper.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## 4. Create a Release Zip

```bash
./scripts/package-extension.sh
```

Then upload `releases/threadsweeper-extension-vX.Y.Z.zip` in GitHub Releases.

## 5. Create a GitHub Release

1. Open your repo on GitHub.
2. Right side -> `Releases` -> `Create a new release`.
3. Tag version: `v0.1.0`.
4. Title: `ThreadSweeper v0.1.0`.
5. Drag and drop the zip file from `releases/`.
6. Publish release.

Users can now download the zip and sideload it.
