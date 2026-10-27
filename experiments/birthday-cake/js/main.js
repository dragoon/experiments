import { DEFAULT_CONFIG, PALETTES, surpriseConfig } from "./config.js";
import { createRenderer } from "./renderer.js";
import { createAnimator } from "./animation.js";

const svg = document.querySelector("#cake-svg");
const form = document.querySelector("#cake-controls");
const wishButton = document.querySelector("#wish-button");
const motionButton = document.querySelector("#motion-toggle");
const announcement = document.querySelector("#announcement");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const state = { config: { ...DEFAULT_CONFIG }, lit: true, paused: false, reduced: reducedMotion.matches };
const renderer = createRenderer(svg);
const animator = createAnimator(svg);

for (const palette of PALETTES) {
  const label = document.createElement("label");
  label.title = palette.name;
  const input = document.createElement("input");
  input.type = "radio";
  input.name = "palette";
  input.value = palette.id;
  input.setAttribute("aria-label", palette.name);
  const swatch = document.createElement("span");
  swatch.style.setProperty("--swatch-top", palette.top);
  swatch.style.setProperty("--swatch-side", palette.side);
  swatch.setAttribute("aria-hidden", "true");
  label.append(input, swatch);
  document.querySelector("#palette-options").append(label);
}

function syncControls() {
  for (const name of ["tiers", "palette", "icing", "topping"]) {
    for (const input of form.querySelectorAll(`input[name="${name}"]`)) input.checked = input.value === String(state.config[name]);
  }
  document.querySelector("#candles").value = state.config.candles;
  document.querySelector("#candle-count").value = state.config.candles;
  document.querySelector("#message").value = state.config.message;
  document.querySelector("#message-count").textContent = state.config.message.length;
  document.querySelector("#palette-name").textContent = PALETTES.find((palette) => palette.id === state.config.palette).name;
}

function syncCelebration() {
  wishButton.replaceChildren();
  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = state.lit ? "✧" : "↻";
  wishButton.append(icon, state.lit ? " Make a wish" : " Relight candles");
  document.querySelector("#wish-hint").textContent = state.lit ? "Close your eyes. Think of something lovely." : "Here’s to your wish coming true.";
}

function syncMotion() {
  animator.setMotion(state.paused, state.reduced);
  motionButton.setAttribute("aria-pressed", String(state.paused));
  motionButton.textContent = state.reduced ? "Motion reduced" : state.paused ? "▷ Resume motion" : "Ⅱ Pause motion";
  motionButton.disabled = state.reduced;
  motionButton.title = state.reduced ? "Your device prefers reduced motion. Decorative animations are off." : "";
}

form.addEventListener("submit", (event) => event.preventDefault());
form.addEventListener("input", (event) => {
  const input = event.target;
  if (!Object.hasOwn(state.config, input.name)) return;
  animator.cancel();
  state.config[input.name] = ["tiers", "candles"].includes(input.name) ? Number(input.value) : input.value;
  renderer.render(state.config, state.lit);
  // Keep the text input untouched while typing, preserving caret and IME behavior.
  document.querySelector("#message-count").textContent = state.config.message.length;
  document.querySelector("#candle-count").value = state.config.candles;
  document.querySelector("#palette-name").textContent = PALETTES.find((palette) => palette.id === state.config.palette).name;
});

document.querySelector("#surprise-button").addEventListener("click", () => {
  animator.cancel();
  state.config = surpriseConfig(state.config);
  state.lit = true;
  renderer.render(state.config, state.lit);
  syncControls();
  syncCelebration();
  animator.assemble();
  const palette = PALETTES.find((item) => item.id === state.config.palette);
  announcement.textContent = `A fresh ${state.config.tiers}-tier ${palette.name.toLowerCase()} cake with ${state.config.candles} lit candles. Your message is kept.`;
});

wishButton.addEventListener("click", () => {
  animator.cancel();
  state.lit = !state.lit;
  renderer.render(state.config, state.lit);
  syncCelebration();
  if (!state.lit) animator.celebrate(state.config);
  announcement.textContent = state.lit ? "Candles relit. Ready for another wish." : "Candles out. Happy birthday! May your wish come true.";
});

motionButton.addEventListener("click", () => { state.paused = !state.paused; syncMotion(); });
reducedMotion.addEventListener("change", (event) => { state.reduced = event.matches; syncMotion(); });

syncControls();
renderer.render(state.config, state.lit);
syncMotion();
animator.assemble();
