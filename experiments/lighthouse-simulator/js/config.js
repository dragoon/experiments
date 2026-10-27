export const THREE_VERSION = "0.169.0";

export const SCENE_CONFIG = {
  defaultBody: "white-red-band",
  defaultLight: "warm-fresnel",
  reducedMotionSpeed: 0.42,
  camera: {
    fov: 56,
    fixed: { x: 12.4, y: 7.8, z: 23.4 },
    target: { x: 0, y: 5.05, z: 0 }
  },
  fog: {
    color: 0x505a58,
    near: 16,
    farBase: 48,
    farRange: 38
  }
};

export const BODY_PRESETS = {
  "stone-round": {
    label: "Stone round",
    height: 8.9,
    baseRadius: 1.42,
    topRadius: 0.92,
    bodyColor: 0x8f8a7e,
    bodyAccent: 0xb8b09e,
    trimColor: 0x2d3439,
    roofColor: 0x26313a,
    glassColor: 0xbfe9ff,
    bands: [
      { y: 1.4, height: 0.18, color: 0x67645d },
      { y: 4.6, height: 0.14, color: 0xaca492 }
    ],
    windows: 5,
    windowColor: 0xf4c46d,
    galleryRadius: 1.28,
    lanternY: 8.95
  },
  "white-red-band": {
    label: "White red band",
    height: 9.4,
    baseRadius: 1.34,
    topRadius: 0.86,
    bodyColor: 0xe5e0d2,
    bodyAccent: 0xf6f1df,
    trimColor: 0x443733,
    roofColor: 0x9f372e,
    glassColor: 0xc8f2ff,
    bands: [
      { y: 2.55, height: 0.7, color: 0xa63c32 },
      { y: 6.18, height: 0.58, color: 0xa63c32 }
    ],
    windows: 4,
    windowColor: 0xffe4a8,
    galleryRadius: 1.24,
    lanternY: 9.45
  },
  "concrete-modern": {
    label: "Concrete modern",
    height: 9.8,
    baseRadius: 1.18,
    topRadius: 0.82,
    bodyColor: 0xa7a9a4,
    bodyAccent: 0xc8cac2,
    trimColor: 0x24313a,
    roofColor: 0x1e2830,
    glassColor: 0xb4efff,
    bands: [
      { y: 5.25, height: 0.16, color: 0x3f555d }
    ],
    windows: 6,
    windowColor: 0xcdeeff,
    galleryRadius: 1.18,
    lanternY: 9.85,
    angular: true
  }
};

export const LIGHT_PRESETS = {
  "warm-fresnel": {
    label: "Warm Fresnel",
    color: 0xffc66f,
    coreColor: 0xfff0bd,
    intensity: 4.2,
    beamOpacity: 0.42,
    beamLength: 30,
    beamRadius: 4.2,
    sweepSpeed: 1,
    beamCount: 1,
    hazeBoost: 0.08
  },
  "cool-haze": {
    label: "Cool haze",
    color: 0xaee7ff,
    coreColor: 0xe9fbff,
    intensity: 3.5,
    beamOpacity: 0.28,
    beamLength: 32,
    beamRadius: 5.2,
    sweepSpeed: 0.72,
    beamCount: 1,
    hazeBoost: 0.2
  },
  "double-sweep": {
    label: "Double sweep",
    color: 0xffd08b,
    coreColor: 0xfff4cf,
    intensity: 3.9,
    beamOpacity: 0.24,
    beamLength: 30,
    beamRadius: 3.8,
    sweepSpeed: 1.22,
    beamCount: 2,
    hazeBoost: 0.12
  }
};
