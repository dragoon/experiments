# Interactive Experiments

A static gallery for small browser-native interaction, audio, and visual experiments.

## Structure

```text
index.html
manifest.json
shared/
  gallery.css
  gallery.js
experiments/
  guitar-strings/
    index.html
    js/
```

Each experiment lives in its own folder under `experiments/` and can be opened directly. Add new experiments by creating a folder and adding an entry to `manifest.json`.

## GitHub Pages

This repo is designed to publish as a static GitHub Pages site from the repository root.

Recommended setup:

1. Create a public GitHub repository, for example `experiments`.
2. Push this local `main` branch to it.
3. In GitHub, open `Settings -> Pages`.
4. Set the source to `Deploy from a branch`.
5. Choose branch `main` and folder `/ (root)`.

The gallery will be available at:

```text
https://<your-github-username>.github.io/<repo-name>/
```
