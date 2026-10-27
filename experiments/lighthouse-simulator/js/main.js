import { BODY_PRESETS, LIGHT_PRESETS } from "./config.js?v=23";
import { createControls } from "./controls.js?v=23";
import { createEnvironment } from "./environment.js?v=23";
import { createLighthouse, disposeObject } from "./lighthouseFactory.js?v=23";
import { createLightRig } from "./lightRig.js?v=23";
import { createSceneHost } from "./scene.js?v=23";

const canvas = document.getElementById("lighthouse-scene");
const fallback = document.getElementById("webgl-fallback");
const host = createSceneHost({ canvas, fallback });

if (host.available) {
  const environment = createEnvironment(host.scene);
  const state = {
    bodyKey: null,
    lightKey: null,
    lighthouse: null,
    lightRig: null,
    lightUpdater: null,
    beamSpeed: 1,
    fogAmount: 0.54,
    cameraMode: "drift",
    paused: false,
    time: 0
  };

  function setLighthouse(bodyKey) {
    const preset = BODY_PRESETS[bodyKey] || BODY_PRESETS["stone-round"];
    if (state.lighthouse) {
      host.scene.remove(state.lighthouse.group);
      disposeObject(state.lighthouse.group);
    }

    state.bodyKey = bodyKey;
    state.lighthouse = createLighthouse(preset);
    host.scene.add(state.lighthouse.group);
    setLightRig(state.lightKey || "warm-fresnel");
  }

  function setLightRig(lightKey) {
    const preset = LIGHT_PRESETS[lightKey] || LIGHT_PRESETS["warm-fresnel"];
    if (!state.lighthouse) return;
    if (state.lightRig) {
      host.scene.remove(state.lightRig);
      disposeObject(state.lightRig);
    }

    state.lightKey = lightKey;
    const rig = createLightRig(preset, state.lighthouse.lanternPosition);
    state.lightRig = rig.group;
    state.lightUpdater = rig.update;
    host.scene.add(state.lightRig);
  }

  function setFog(amount) {
    state.fogAmount = amount;
    host.setFogAmount(amount);
  }

  const controls = createControls({
    onBodyChange: setLighthouse,
    onLightChange: (lightKey) => {
      setLightRig(lightKey);
      setFog(state.fogAmount);
    },
    onSpeedChange: (speed) => {
      state.beamSpeed = speed;
    },
    onFogChange: setFog,
    onCameraModeChange: (mode) => {
      state.cameraMode = mode;
      host.setCameraMode(mode);
    },
    onPauseChange: (paused) => {
      state.paused = paused;
    }
  });

  state.beamSpeed = controls.beamSpeed;
  state.fogAmount = controls.fogAmount;
  state.cameraMode = controls.cameraMode;
  setLighthouse(controls.bodyPreset);
  setLightRig(controls.lightPreset);
  setFog(controls.fogAmount);

  let last = performance.now();
  function animate(now) {
    const delta = Math.min(0.045, (now - last) / 1000);
    last = now;
    if (!state.paused) state.time += delta;

    const beam = state.lightUpdater ? state.lightUpdater(state.time, state.beamSpeed, state.fogAmount) : null;
    environment.update(state.time, state.fogAmount, beam);
    host.updateCamera(state.cameraMode, state.time);
    host.render();
    window.requestAnimationFrame(animate);
  }

  window.requestAnimationFrame(animate);
}
