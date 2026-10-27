import * as THREE from "three";

function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function createSky() {
  const geometry = new THREE.SphereGeometry(80, 48, 24);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      time: { value: 0 },
      fogAmount: { value: 0.54 }
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = normalize(world.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vWorld;
      uniform float time;
      uniform float fogAmount;
      void main() {
        float h = clamp(vWorld.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 horizon = vec3(0.22, 0.13, 0.12);
        vec3 upper = vec3(0.008, 0.018, 0.038);
        vec3 color = mix(horizon, upper, smoothstep(0.18, 0.92, h));
        float afterglow = exp(-pow((h - 0.34) * 4.0, 2.0)) * 0.16;
        float fogBand = exp(-pow((h - 0.38) * 5.2, 2.0)) * fogAmount;
        color += vec3(0.75, 0.28, 0.14) * afterglow;
        color = mix(color, vec3(0.38, 0.37, 0.35), fogBand * 0.38);
        gl_FragColor = vec4(color, 1.0);
      }
    `
  });
  return new THREE.Mesh(geometry, material);
}

function createOcean() {
  const material = new THREE.ShaderMaterial({
    transparent: false,
    uniforms: {
      time: { value: 0 },
      fogTint: { value: new THREE.Color(0x071a22) },
      foamTint: { value: new THREE.Color(0x9fbec2) },
      beaconTint: { value: new THREE.Color(0xffc778) },
      beamAngle: { value: -0.72 },
      beamCount: { value: 1 },
      beamStrength: { value: 0.3 },
      fogAmount: { value: 0.54 }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vWave;
      uniform float time;
      void main() {
        vUv = uv;
        vec3 p = position;
        float swell = sin(p.x * 0.18 + p.y * 0.09 + time * 0.44) * 0.22;
        float chop = sin(p.x * 0.72 - p.y * 0.31 + time * 1.18) * 0.045;
        float ripple = sin(length(p.xy) * 0.72 - time * 0.82) * 0.055;
        float wave = swell + chop + ripple;
        p.z += wave;
        vWave = wave;
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vWave;
      uniform float time;
      uniform vec3 fogTint;
      uniform vec3 foamTint;
      uniform vec3 beaconTint;
      uniform float beamAngle;
      uniform float beamCount;
      uniform float beamStrength;
      uniform float fogAmount;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(41.13, 289.97))) * 45758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 4; i++) {
          value += noise(p) * amp;
          p *= 2.03;
          amp *= 0.5;
        }
        return value;
      }

      void main() {
        vec2 world = vWorld.xz;
        float surface = fbm(world * 0.22 + vec2(time * 0.025, -time * 0.018));
        float fine = fbm(world * 1.18 + vec2(-time * 0.12, time * 0.06));
        float islandDistance = length(world * vec2(0.88, 1.12));
        float shore = smoothstep(7.4, 4.6, islandDistance) * (1.0 - smoothstep(2.4, 0.7, islandDistance));
        float horizon = smoothstep(-18.0, 38.0, vWorld.z);
        float glint = pow(max(0.0, fine - 0.56), 2.5) * 0.24;
        float lace = sin(islandDistance * 7.6 + time * 0.92 + surface * 4.0) * 0.5 + 0.5;
        float foam = smoothstep(0.62, 0.92, surface + shore * 0.42 + vWave * 0.72) * (0.08 + shore * (0.34 + lace * 0.28));
        vec2 beamDir = vec2(cos(beamAngle), -sin(beamAngle));
        vec2 worldDir = normalize(world + vec2(0.001));
        float facing = pow(max(0.0, dot(worldDir, beamDir)), 38.0);
        if (beamCount > 1.5) {
          facing = max(facing, pow(max(0.0, dot(worldDir, -beamDir)), 38.0));
        }
        float distanceFade = smoothstep(2.2, 8.0, length(world)) * (1.0 - smoothstep(34.0, 68.0, length(world)));
        float reflection = facing * distanceFade * (0.35 + fine * 0.65);
        vec3 deep = vec3(0.003, 0.021, 0.030);
        vec3 mid = vec3(0.006, 0.052, 0.065);
        vec3 color = mix(deep, mid, clamp(surface * 0.7 + vWave * 0.9 + 0.28, 0.0, 1.0));
        color = mix(color, fogTint, horizon * (0.24 + fogAmount * 0.48));
        color += foamTint * foam * 0.42;
        color += vec3(0.62, 0.78, 0.77) * glint * (1.0 - shore * 0.24);
        color += beaconTint * reflection * (0.38 + beamStrength);
        gl_FragColor = vec4(color, 1.0);
      }
    `
  });
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(320, 320, 220, 220), material);
  ocean.rotation.x = -Math.PI * 0.5;
  ocean.position.y = -0.44;
  ocean.receiveShadow = true;
  return ocean;
}

function createRocks() {
  const group = new THREE.Group();
  const rand = seededRandom(19);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x23272a, roughness: 0.88, metalness: 0.02 });
  const lichenMat = new THREE.MeshStandardMaterial({ color: 0x49524d, roughness: 0.9 });

  for (let i = 0; i < 36; i += 1) {
    const angle = rand() * Math.PI * 2;
    const radius = 1.5 + rand() * 6.4;
    const geometry = new THREE.DodecahedronGeometry(0.54 + rand() * 0.92, 1);
    const rock = new THREE.Mesh(geometry, i % 7 === 0 ? lichenMat : rockMat);
    rock.position.set(Math.sin(angle) * radius, 0.05 + rand() * 0.68, Math.cos(angle) * radius);
    rock.scale.set(1 + rand() * 1.7, 0.42 + rand() * 1.25, 0.8 + rand() * 1.7);
    rock.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
  }

  const island = new THREE.Mesh(new THREE.CylinderGeometry(4.7, 5.7, 0.7, 18), rockMat);
  island.position.y = 0.0;
  island.scale.z = 0.82;
  island.receiveShadow = true;
  island.castShadow = true;
  group.add(island);
  return group;
}

function createCliffAndTrees() {
  const group = new THREE.Group();
  const cliffMat = new THREE.MeshStandardMaterial({ color: 0x5a4b50, roughness: 0.9, metalness: 0 });
  const cliff = new THREE.Mesh(new THREE.CylinderGeometry(4.9, 6.5, 2.65, 15), cliffMat);
  cliff.position.y = -0.72;
  cliff.scale.z = 0.82;
  cliff.receiveShadow = true;
  cliff.castShadow = true;
  group.add(cliff);

  const treeMat = new THREE.MeshStandardMaterial({ color: 0x151a18, roughness: 0.82 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2a201c, roughness: 0.9 });
  const rand = seededRandom(73);
  for (let i = 0; i < 18; i += 1) {
    const angle = -2.65 + rand() * 2.0;
    const radius = 3.0 + rand() * 2.25;
    const height = 1.0 + rand() * 1.4;
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, height * 0.48, 5), trunkMat);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.36 + rand() * 0.24, height, 5), treeMat);
    trunk.position.y = height * 0.2;
    crown.position.y = height * 0.65;
    crown.rotation.y = rand() * Math.PI;
    tree.add(trunk, crown);
    tree.position.set(Math.sin(angle) * radius, 0.52, Math.cos(angle) * radius);
    tree.rotation.y = rand() * Math.PI;
    tree.scale.setScalar(0.88 + rand() * 0.46);
    tree.castShadow = true;
    group.add(tree);
  }

  return group;
}

function createShorelineFoam() {
  const group = new THREE.Group();
  const foamMat = new THREE.MeshBasicMaterial({
    color: 0x9fd7d4,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  [
    { radius: 5.45, tube: 0.025, z: 0.72, opacity: 0.42 },
    { radius: 5.9, tube: 0.018, z: 0.76, opacity: 0.18 },
    { radius: 4.95, tube: 0.016, z: 0.69, opacity: 0.22 }
  ].forEach((ring) => {
    const material = foamMat.clone();
    material.opacity = ring.opacity;
    const foam = new THREE.Mesh(new THREE.TorusGeometry(ring.radius, ring.tube, 8, 128), material);
    foam.rotation.x = Math.PI * 0.5;
    foam.position.y = -0.37;
    foam.scale.z = ring.z;
    group.add(foam);
  });

  return group;
}

function createIslandReflection() {
  const group = new THREE.Group();

  const darkMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      time: { value: 0 },
      opacity: { value: 0.52 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float time;
      uniform float opacity;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(17.17, 91.3))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      void main() {
        vec2 p = vUv - 0.5;
        float ellipse = smoothstep(0.62, 0.07, length(p * vec2(0.72, 1.58)));
        float verticalPull = smoothstep(0.02, 0.32, vUv.y) * (1.0 - smoothstep(0.92, 1.0, vUv.y));
        float ripple = 0.64 + noise(vec2(vUv.x * 12.0 + time * 0.16, vUv.y * 34.0)) * 0.36;
        float bands = 0.72 + sin(vUv.y * 84.0 + time * 0.9 + noise(vUv * 5.0) * 2.2) * 0.18;
        gl_FragColor = vec4(0.0, 0.008, 0.010, opacity * ellipse * verticalPull * ripple * bands);
      }
    `
  });

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(15, 26, 1, 1), darkMat);
  shadow.rotation.x = -Math.PI * 0.5;
  shadow.position.set(0, -0.405, 5.4);
  group.add(shadow);

  const lanternMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      time: { value: 0 },
      opacity: { value: 0.38 },
      color: { value: new THREE.Color(0xffcf81) }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float time;
      uniform float opacity;
      uniform vec3 color;

      void main() {
        vec2 p = vUv - 0.5;
        float column = smoothstep(0.34, 0.015, abs(p.x));
        float fade = smoothstep(0.52, 0.06, abs(p.y));
        float wavering = 0.54 + 0.28 * sin((vUv.y + time * 0.06) * 70.0);
        float broken = smoothstep(0.16, 0.92, wavering + sin(vUv.x * 25.0 + time) * 0.08);
        gl_FragColor = vec4(color, opacity * column * fade * broken);
      }
    `
  });

  const lantern = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 16, 1, 1), lanternMat);
  lantern.rotation.x = -Math.PI * 0.5;
  lantern.position.set(0, -0.397, 6.8);
  group.add(lantern);

  return group;
}

function createSilhouetteStrip({ width, height, segments, seed, material }) {
  const rand = seededRandom(seed);
  const positions = [];
  const indices = [];

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const x = (t - 0.5) * width;
    const low = -0.62 - rand() * 0.22;
    const ridge =
      Math.sin(t * Math.PI) * height +
      Math.sin(t * Math.PI * 3.1 + rand()) * height * 0.14 +
      (rand() - 0.5) * height * 0.22;
    const top = Math.max(0.1, ridge);
    positions.push(x, low, 0, x, top, 0);

    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

function createIslandPatch({ width, depth, seed, material }) {
  const rand = seededRandom(seed);
  const positions = [0, 0, 0];
  const indices = [];
  const points = 18;

  for (let i = 0; i < points; i += 1) {
    const angle = (i / points) * Math.PI * 2;
    const radiusX = width * (0.4 + rand() * 0.16);
    const radiusZ = depth * (0.38 + rand() * 0.2);
    const wobble = 0.78 + Math.sin(angle * 3.0 + rand() * 2.0) * 0.12 + rand() * 0.16;
    positions.push(Math.cos(angle) * radiusX * wobble, 0, Math.sin(angle) * radiusZ * wobble);
  }

  for (let i = 1; i <= points; i += 1) {
    const next = i === points ? 1 : i + 1;
    indices.push(0, i, next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

function createPineSilhouette(height, radius, material) {
  const positions = [
    -radius, 0.0, 0,
    0, height, 0,
    radius, 0.0, 0,
    -radius * 0.78, height * 0.26, 0,
    0, height * 0.92, 0,
    radius * 0.78, height * 0.26, 0,
    -radius * 0.5, height * 0.5, 0,
    0, height * 0.98, 0,
    radius * 0.5, height * 0.5, 0
  ];
  const indices = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

function createDistantScenery() {
  const group = new THREE.Group();
  const landMat = new THREE.MeshBasicMaterial({ color: 0x151c1d, depthWrite: true });
  const farLandMat = new THREE.MeshBasicMaterial({ color: 0x263332, depthWrite: true });
  const shoreMat = new THREE.MeshBasicMaterial({ color: 0x121818, depthWrite: true });
  const treeMat = new THREE.MeshBasicMaterial({ color: 0x101716, depthWrite: true });
  const rand = seededRandom(127);

  [
    { x: -43, z: -47, width: 13, depth: 3.6, height: 1.15, mat: farLandMat, seed: 401, trees: 2 },
    { x: -27, z: -43, width: 18, depth: 4.2, height: 1.35, mat: farLandMat, seed: 402, trees: 3 },
    { x: -7, z: -46, width: 10, depth: 3.0, height: 0.9, mat: farLandMat, seed: 405, trees: 1 },
    { x: 22, z: -50, width: 16, depth: 3.8, height: 1.05, mat: farLandMat, seed: 406, trees: 2 },
    { x: 43, z: -47, width: 22, depth: 4.8, height: 1.3, mat: farLandMat, seed: 407, trees: 3 },
    { x: -19, z: -29, width: 13, depth: 4.4, height: 2.0, mat: landMat, seed: 403, trees: 4 },
    { x: -1, z: -32, width: 10, depth: 3.6, height: 1.45, mat: landMat, seed: 408, trees: 3 },
    { x: 24, z: -31, width: 15, depth: 4.8, height: 1.8, mat: landMat, seed: 404, trees: 5 },
    { x: 42, z: -34, width: 12, depth: 3.8, height: 1.25, mat: landMat, seed: 409, trees: 3 }
  ].forEach((land) => {
    const patch = createIslandPatch({
      width: land.width,
      depth: land.depth,
      seed: land.seed + 90,
      material: shoreMat
    });
    patch.position.set(land.x, -0.18, land.z - 0.12);
    patch.rotation.y = (rand() - 0.5) * 0.18;
    group.add(patch);

    const mesh = createSilhouetteStrip({
      width: land.width,
      height: land.height,
      segments: 16,
      seed: land.seed,
      material: land.mat
    });
    mesh.position.set(land.x, -0.42, land.z);
    mesh.rotation.y = (rand() - 0.5) * 0.16;
    group.add(mesh);

    for (let i = 0; i < land.trees; i += 1) {
      const height = 1.45 + rand() * 1.15;
      const radius = 0.36 + rand() * 0.28;
      const tree = createPineSilhouette(height, radius, treeMat);
      const t = land.trees <= 1 ? 0.5 : i / (land.trees - 1);
      const x = land.x - land.width * 0.34 + t * land.width * 0.68 + (rand() - 0.5) * 0.9;
      const baseLift = 0.08 + Math.sin(t * Math.PI) * land.height * 0.28 + rand() * 0.08;
      tree.position.set(x, -0.42 + baseLift, land.z - 0.04);
      tree.rotation.y = mesh.rotation.y;
      group.add(tree);
    }
  });

  return group;
}

function createMarineFog() {
  const group = new THREE.Group();

  function layerMaterial(seed, strength) {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        fogAmount: { value: 0.54 },
        time: { value: 0 },
        seed: { value: seed },
        strength: { value: strength },
        color: { value: new THREE.Color(0xb7b2a7) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float fogAmount;
        uniform float time;
        uniform float seed;
        uniform float strength;
        uniform vec3 color;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(19.19, 83.71))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }

        void main() {
          float horizontal = smoothstep(0.0, 0.28, vUv.x) * (1.0 - smoothstep(0.72, 1.0, vUv.x));
          float base = exp(-pow((vUv.y - 0.33) * 2.35, 2.0));
          float upper = exp(-pow((vUv.y - 0.62) * 3.9, 2.0)) * 0.38;
          float n = noise(vec2(vUv.x * 3.1 + time * 0.012, vUv.y * 1.4 + seed));
          float fine = noise(vec2(vUv.x * 8.7 - time * 0.018, vUv.y * 3.3 + seed * 0.7));
          float alpha = fogAmount * strength * horizontal * (base + upper) * (0.62 + n * 0.26 + fine * 0.12);
          gl_FragColor = vec4(color, alpha);
        }
      `
    });
  }

  [
    { z: -35, y: 1.85, width: 190, height: 15.5, strength: 0.22, seed: 8.8 },
    { z: -62, y: 3.2, width: 290, height: 24.0, strength: 0.34, seed: 14.2 }
  ].forEach((layer) => {
    const fog = new THREE.Mesh(new THREE.PlaneGeometry(layer.width, layer.height, 1, 1), layerMaterial(layer.seed, layer.strength));
    fog.position.set(0, layer.y, layer.z);
    group.add(fog);
  });

  return group;
}

function createClouds() {
  const group = new THREE.Group();
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xc5aaa9, transparent: true, opacity: 0.36, depthWrite: false });
  const rand = seededRandom(211);

  for (let i = 0; i < 9; i += 1) {
    const cloud = new THREE.Group();
    const parts = 3 + Math.floor(rand() * 4);
    for (let j = 0; j < parts; j += 1) {
      const part = new THREE.Mesh(new THREE.CircleGeometry(1.1 + rand() * 1.7, 8), cloudMat.clone());
      part.scale.y = 0.22 + rand() * 0.16;
      part.position.set(j * (1.5 + rand() * 0.6), (rand() - 0.5) * 0.5, 0);
      cloud.add(part);
    }
    cloud.position.set(-44 + rand() * 88, 9.4 + rand() * 7.2, -36 - rand() * 28);
    cloud.scale.setScalar(1.0 + rand() * 1.8);
    group.add(cloud);
  }

  return group;
}

function createStars() {
  const rand = seededRandom(313);
  const positions = [];
  const colors = [];
  for (let i = 0; i < 120; i += 1) {
    const theta = rand() * Math.PI * 2;
    const radius = 42 + rand() * 28;
    const y = 12 + rand() * 42;
    positions.push(Math.sin(theta) * radius, y, Math.cos(theta) * radius);
    const warm = 0.72 + rand() * 0.28;
    colors.push(warm, warm, 1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.055,
    vertexColors: true,
    transparent: true,
    opacity: 0.62,
    depthWrite: false
  });
  return new THREE.Points(geometry, material);
}

function createHorizonFog() {
  const group = new THREE.Group();

  function fogMaterial(depth) {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      uniforms: {
        fogAmount: { value: 0.54 },
        color: { value: new THREE.Color(0x8a8880) },
        depth: { value: depth }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float fogAmount;
        uniform vec3 color;
        uniform float depth;

        void main() {
          float horizon = exp(-pow((vUv.y - 0.38) * 2.75, 2.0));
          float lowerBloom = exp(-pow((vUv.y - 0.19) * 5.4, 2.0)) * 0.36;
          float feather = smoothstep(0.0, 0.24, vUv.x) * (1.0 - smoothstep(0.76, 1.0, vUv.x));
          float alpha = fogAmount * (0.13 + depth * 0.11) * (horizon + lowerBloom) * feather;
          gl_FragColor = vec4(color, alpha);
        }
      `
    });
  }

  [
    { z: -40, y: 3.4, width: 220, height: 22, depth: 0.55 },
    { z: -72, y: 4.8, width: 340, height: 32, depth: 1.0 }
  ].forEach((layer) => {
    const fog = new THREE.Mesh(new THREE.PlaneGeometry(layer.width, layer.height, 1, 1), fogMaterial(layer.depth));
    fog.position.set(0, layer.y, layer.z);
    group.add(fog);
  });

  return group;
}

function createMist() {
  const group = new THREE.Group();
  const rand = seededRandom(41);

  function mistMaterial(seed) {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        color: { value: new THREE.Color(0xb9b5aa) },
        opacity: { value: 0.0 },
        seed: { value: seed },
        time: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 color;
        uniform float opacity;
        uniform float seed;
        uniform float time;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }

        void main() {
          vec2 centered = vUv - 0.5;
          float edge = smoothstep(0.52, 0.08, length(centered * vec2(1.05, 1.8)));
          float cloud = noise(vUv * 3.4 + vec2(seed, time * 0.035));
          cloud += noise(vUv * 7.2 + vec2(time * -0.028, seed)) * 0.42;
        float alpha = opacity * edge * smoothstep(0.22, 0.88, cloud);
        gl_FragColor = vec4(color, alpha);
      }
    `
    });
  }

  for (let i = 0; i < 34; i += 1) {
    const puff = new THREE.Mesh(new THREE.PlaneGeometry(6.0 + rand() * 10.0, 1.4 + rand() * 2.9), mistMaterial(rand() * 100));
    puff.position.set(-19 + rand() * 38, 0.08 + rand() * 2.35, -17 + rand() * 34);
    puff.rotation.y = rand() * Math.PI;
    puff.userData.speed = 0.016 + rand() * 0.024;
    puff.userData.offset = rand() * Math.PI * 2;
    group.add(puff);
  }

  return group;
}

export function createEnvironment(scene) {
  const sky = createSky();
  const ocean = createOcean();
  const rocks = createRocks();
  const cliffAndTrees = createCliffAndTrees();
  const shorelineFoam = createShorelineFoam();
  const islandReflection = createIslandReflection();
  const distantScenery = createDistantScenery();
  const clouds = createClouds();
  const stars = createStars();
  const horizonFog = createHorizonFog();
  const marineFog = createMarineFog();
  const mist = createMist();

  const moon = new THREE.DirectionalLight(0x9fc7df, 1.1);
  moon.position.set(-6, 9, 7);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);

  const dusk = new THREE.HemisphereLight(0xd89d73, 0x061018, 1.55);
  const lowWarmth = new THREE.PointLight(0xf08c5e, 0.78, 36, 2);
  lowWarmth.position.set(-8, 3.2, -12);

  scene.add(sky, stars, clouds, ocean, islandReflection, distantScenery, horizonFog, marineFog, cliffAndTrees, rocks, shorelineFoam, mist, moon, dusk, lowWarmth);

  function update(time, fogAmount, beam = null) {
    sky.material.uniforms.time.value = time;
    sky.material.uniforms.fogAmount.value = fogAmount;
    clouds.children.forEach((cloud, index) => {
      cloud.position.x += Math.sin(time * 0.02 + index) * 0.0025;
    });
    shorelineFoam.children.forEach((foam, index) => {
      foam.material.opacity = (0.14 + fogAmount * 0.22) * (1 - index * 0.18) * (0.82 + Math.sin(time * 1.8 + index) * 0.12);
    });
    islandReflection.children.forEach((reflection) => {
      reflection.material.uniforms.time.value = time;
    });
    horizonFog.children.forEach((layer) => {
      layer.material.uniforms.fogAmount.value = fogAmount;
    });
    marineFog.children.forEach((layer) => {
      layer.material.uniforms.time.value = time;
      layer.material.uniforms.fogAmount.value = fogAmount;
    });
    ocean.material.uniforms.time.value = time;
    ocean.material.uniforms.fogAmount.value = fogAmount;
    if (beam) {
      ocean.material.uniforms.beamAngle.value = beam.angle;
      ocean.material.uniforms.beamCount.value = beam.beamCount;
      ocean.material.uniforms.beamStrength.value = beam.strength;
    }
    mist.children.forEach((puff, index) => {
      puff.position.x += Math.sin(time * puff.userData.speed + puff.userData.offset) * 0.006;
      puff.position.z += Math.cos(time * puff.userData.speed + index) * 0.004;
      puff.material.uniforms.time.value = time;
      puff.material.uniforms.opacity.value = (fogAmount * 0.18) * (0.62 + Math.sin(time * 0.21 + index) * 0.22);
      puff.lookAt(0, puff.position.y, 0);
    });
  }

  return { update };
}
