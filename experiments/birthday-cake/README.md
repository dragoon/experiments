# Birthday Cake Studio

A browser-only SVG cake generator with six palettes, one to three tiers, three icing styles, four topping choices, up to twelve candles, and a birthday message. Surprise Me keeps the message and creates a fresh, lit cake. Make a Wish extinguishes the candles; Relight Candles restores them.

Serve the repository root over HTTP and open `experiments/birthday-cake/`. There is no build step, backend, external dependency, storage, or audio. All asset paths are relative for GitHub Pages subdirectory hosting.

## Structure

- `js/config.js`: palettes, deterministic randomization, tier geometry, candle placement.
- `js/renderer.js`: SVG layers and targeted updates; birthday messages are text nodes.
- `js/animation.js`: cancelable assembly, smoke, confetti, and pause behavior.
- `js/main.js`: form controls, candle state, and device motion preference.

The device's reduced-motion preference disables decorative animation. Pause Motion freezes ongoing animations; edits cancel obsolete animations and show the updated cake immediately.

## Checks

From the repository root:

```sh
node --test experiments/birthday-cake/tests/config.test.mjs
```

With the cake page loaded, run in the browser console:

```js
await (await import('./tests/browser-checks.js')).runBrowserChecks()
```

The browser check covers all 216 tier/palette/icing/topping combinations at twelve candles, drawing bounds, text safety, candle state, pause behavior, and rapid interaction cleanup. It changes the displayed cake; reload afterward to restore the default.

Also visually review desktop and 320px layouts, keyboard focus, reduced motion, and the gallery link. No runtime dependencies are needed for these checks.
