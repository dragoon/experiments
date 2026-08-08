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
