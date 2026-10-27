import * as THREE from "three";

function frustumBeamGeometry(length, nearRadius, farRadius, shellScale = 1, segments = 56, rings = 18) {
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let xIndex = 0; xIndex <= rings; xIndex += 1) {
    const along = xIndex / rings;
    const radius = THREE.MathUtils.lerp(nearRadius, farRadius, Math.pow(along, 0.78)) * shellScale;
    const x = length * along;

    for (let segment = 0; segment <= segments; segment += 1) {
      const theta = (segment / segments) * Math.PI * 2;
      positions.push(x, Math.cos(theta) * radius * 0.34, Math.sin(theta) * radius);
      uvs.push(along, shellScale);
    }
  }

  for (let xIndex = 0; xIndex < rings; xIndex += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const row = segments + 1;
      const a = xIndex * row + segment;
      const b = a + row;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createFresnelLens(preset) {
  const group = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({
    color: preset.coreColor,
    emissive: preset.color,
    emissiveIntensity: 0.46,
    roughness: 0.04,
    metalness: 0,
    transparent: true,
    opacity: 0.56,
    transmission: 0.16,
    thickness: 0.32
  });
  const ringMat = new THREE.MeshStandardMaterial({ color: preset.color, emissive: preset.color, emissiveIntensity: 0.2 });

  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.54, 32), glass);
  core.rotation.z = Math.PI * 0.5;
  group.add(core);

  for (let i = 0; i < 4; i += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26 + i * 0.065, 0.008, 8, 36), ringMat);
    ring.rotation.y = Math.PI * 0.5;
    group.add(ring);
  }

  return group;
}

function createBeamMaterial(preset, shellIndex, shellCount) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      color: { value: new THREE.Color(preset.color) },
      coreColor: { value: new THREE.Color(preset.coreColor) },
      opacity: { value: preset.beamOpacity },
      fogAmount: { value: 0.54 },
      shell: { value: shellIndex / Math.max(1, shellCount - 1) }
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
      uniform vec3 coreColor;
      uniform float opacity;
      uniform float fogAmount;
      uniform float shell;

      void main() {
        float along = vUv.x;
        float nearFade = smoothstep(0.0, 0.13, along);
        float farFade = 1.0 - smoothstep(0.68, 1.0, along);
        float shellFade = pow(1.0 - shell, 1.7);
        float body = nearFade * farFade * (0.18 + fogAmount * 0.86);
        float alpha = opacity * body * shellFade * 0.12;
        vec3 beamColor = mix(color, coreColor, pow(1.0 - shell, 2.2) * 0.45);
        gl_FragColor = vec4(beamColor, alpha);
      }
    `
  });
}

function addBeam(group, preset, angle, beamMaterials) {
  const beamGroup = new THREE.Group();
  beamGroup.rotation.y = angle;

  const shellCount = 9;
  for (let i = 0; i < shellCount; i += 1) {
    const shellScale = THREE.MathUtils.lerp(0.28, 1.12, i / (shellCount - 1));
    const geometry = frustumBeamGeometry(preset.beamLength, 0.13, preset.beamRadius, shellScale);
    const material = createBeamMaterial(preset, i, shellCount);
    const shell = new THREE.Mesh(geometry, material);
    beamGroup.add(shell);
    beamMaterials.push(material);
  }

  group.add(beamGroup);

  const spot = new THREE.SpotLight(preset.color, preset.intensity * 18, preset.beamLength * 1.35, Math.PI * 0.075, 0.72, 1.35);
  spot.position.set(0, 0, 0);
  spot.target.position.set(Math.cos(angle) * preset.beamLength, 0, -Math.sin(angle) * preset.beamLength);
  group.add(spot, spot.target);
}

export function createLightRig(preset, lanternPosition) {
  const rig = new THREE.Group();
  const beamMaterials = [];
  rig.name = `light-rig-${preset.label}`;
  rig.position.copy(lanternPosition);

  const glow = new THREE.PointLight(preset.coreColor, preset.intensity * 1.5, 18, 1.8);
  rig.add(glow);
  rig.add(createFresnelLens(preset));

  for (let i = 0; i < preset.beamCount; i += 1) {
    addBeam(rig, preset, (i / preset.beamCount) * Math.PI * 2, beamMaterials);
  }

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.78, 32, 18),
    new THREE.MeshBasicMaterial({
      color: preset.color,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  rig.add(halo);

  function update(time, speed = 1, fogAmount = 0.5) {
    const angle = time * preset.sweepSpeed * speed - 0.72;
    rig.rotation.y = angle;
    halo.material.opacity = 0.09 + Math.sin(time * 4.5) * 0.025;
    beamMaterials.forEach((material) => {
      material.uniforms.fogAmount.value = fogAmount;
    });
    return { angle, beamCount: preset.beamCount, color: preset.color, strength: preset.beamOpacity };
  }

  return { group: rig, update };
}
