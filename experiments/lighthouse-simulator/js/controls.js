import { BODY_PRESETS, LIGHT_PRESETS, SCENE_CONFIG } from "./config.js?v=23";

function setPressed(buttons, activeValue, attr) {
  buttons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset[attr] === activeValue));
  });
}

export function createControls({ onBodyChange, onLightChange, onSpeedChange, onFogChange, onCameraModeChange, onPauseChange }) {
  const bodySelect = document.getElementById("body-preset");
  const lightSelect = document.getElementById("light-preset");
  const speedInput = document.getElementById("beam-speed");
  const fogInput = document.getElementById("fog-amount");
  const pauseButton = document.getElementById("pause-toggle");
  const status = document.getElementById("scene-status");
  const cameraButtons = [...document.querySelectorAll("[data-camera-mode]")];
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let cameraMode = prefersReduced ? "fixed" : "drift";
  let paused = false;

  function statusText() {
    const body = BODY_PRESETS[bodySelect.value]?.label || "Lighthouse";
    const light = LIGHT_PRESETS[lightSelect.value]?.label || "Light";
    status.textContent = `${body} / ${light}`;
  }

  function setCameraMode(mode) {
    cameraMode = mode;
    setPressed(cameraButtons, mode, "cameraMode");
    onCameraModeChange(mode);
  }

  bodySelect.value = SCENE_CONFIG.defaultBody;
  lightSelect.value = SCENE_CONFIG.defaultLight;
  if (prefersReduced) speedInput.value = SCENE_CONFIG.reducedMotionSpeed;

  bodySelect.addEventListener("change", () => {
    onBodyChange(bodySelect.value);
    statusText();
  });

  lightSelect.addEventListener("change", () => {
    onLightChange(lightSelect.value);
    statusText();
  });

  speedInput.addEventListener("input", () => onSpeedChange(Number(speedInput.value)));
  fogInput.addEventListener("input", () => onFogChange(Number(fogInput.value)));

  cameraButtons.forEach((button) => {
    button.addEventListener("click", () => setCameraMode(button.dataset.cameraMode));
  });

  pauseButton.addEventListener("click", () => {
    paused = !paused;
    pauseButton.textContent = paused ? "Resume" : "Pause";
    pauseButton.setAttribute("aria-pressed", String(paused));
    onPauseChange(paused);
  });

  setCameraMode(cameraMode);
  statusText();

  return {
    bodyPreset: bodySelect.value,
    lightPreset: lightSelect.value,
    beamSpeed: Number(speedInput.value),
    fogAmount: Number(fogInput.value),
    cameraMode
  };
}
