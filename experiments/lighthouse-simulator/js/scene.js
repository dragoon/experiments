import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { SCENE_CONFIG } from "./config.js?v=23";

function vectorFrom(point) {
  return new THREE.Vector3(point.x, point.y, point.z);
}

function hasWebGL() {
  const testCanvas = document.createElement("canvas");
  return Boolean(
    window.WebGLRenderingContext &&
    (testCanvas.getContext("webgl2") || testCanvas.getContext("webgl"))
  );
}

export function createSceneHost({ canvas, fallback }) {
  if (!hasWebGL()) {
    fallback.hidden = false;
    return { available: false };
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(SCENE_CONFIG.camera.fov, 1, 0.1, 160);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });

  const target = vectorFrom(SCENE_CONFIG.camera.target);
  const baseCamera = vectorFrom(SCENE_CONFIG.camera.fixed);
  const currentTarget = target.clone();
  const currentBaseCamera = baseCamera.clone();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x02060a, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene.fog = null;

  camera.position.copy(baseCamera);
  camera.lookAt(target);

  const controls = new OrbitControls(camera, renderer.domElement);
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.34, 0.58, 0.82);
  controls.target.copy(currentTarget);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 7;
  controls.maxDistance = 28;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.enabled = false;
  controls.update();
  composer.addPass(renderPass);
  composer.addPass(bloomPass);

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const narrow = width < 680;
    currentTarget.copy(target);
    currentBaseCamera.copy(baseCamera);

    if (narrow) {
      currentTarget.y = 5.45;
      currentBaseCamera.set(baseCamera.x * 1.18, baseCamera.y + 2.2, baseCamera.z * 1.72);
    }

    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = width / Math.max(1, height);
    camera.fov = narrow ? 68 : SCENE_CONFIG.camera.fov;
    camera.updateProjectionMatrix();
    controls.target.copy(currentTarget);
    controls.update();
  }

  function setFogAmount(amount) {
    return THREE.MathUtils.clamp(amount, 0, 1);
  }

  function setCameraMode(mode) {
    controls.enabled = mode === "orbit";
    if (mode !== "orbit") {
      controls.target.copy(currentTarget);
      controls.update();
    }
  }

  function updateCamera(mode, time) {
    if (mode === "orbit") {
      controls.update();
      return;
    }

    const drift = mode === "drift" ? 1 : 0;
    const orbit = time * 0.065;
    const position = currentBaseCamera.clone();
    position.x += Math.sin(orbit) * 1.15 * drift;
    position.y += Math.sin(orbit * 0.7) * 0.22 * drift;
    position.z += Math.cos(orbit * 0.85) * 0.85 * drift;
    camera.position.lerp(position, 0.035);
    camera.lookAt(currentTarget);
  }

  function render() {
    composer.render();
  }

  function dispose() {
    controls.dispose();
    composer.dispose();
    renderer.dispose();
  }

  window.addEventListener("resize", resize);
  resize();
  setFogAmount(0.54);

  return {
    available: true,
    THREE,
    scene,
    camera,
    renderer,
    controls,
    resize,
    render,
    dispose,
    setFogAmount,
    setCameraMode,
    updateCamera
  };
}
