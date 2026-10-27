import * as THREE from "three";

const shared = {
  railMaterial: new THREE.MeshStandardMaterial({ color: 0x172025, metalness: 0.55, roughness: 0.36 }),
  warmGlass: new THREE.MeshPhysicalMaterial({
    color: 0xd8f5ff,
    roughness: 0.04,
    metalness: 0,
    transparent: true,
    opacity: 0.34,
    transmission: 0.22,
    thickness: 0.25
  })
};

function material(color, roughness = 0.72, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addCylinder(group, radiusTop, radiusBottom, height, y, mat, segments = 56) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), mat);
  mesh.position.y = y;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addBand(group, preset, band) {
  const taper = THREE.MathUtils.lerp(preset.baseRadius, preset.topRadius, band.y / preset.height);
  addCylinder(group, taper + 0.012, taper + 0.025, band.height, band.y, material(band.color, 0.58), 64);
}

function addWindows(group, preset) {
  const windowMat = new THREE.MeshStandardMaterial({
    color: preset.windowColor,
    emissive: preset.windowColor,
    emissiveIntensity: 0.34,
    roughness: 0.22
  });

  for (let i = 0; i < preset.windows; i += 1) {
    const y = 2.0 + i * ((preset.height - 3.3) / Math.max(1, preset.windows - 1));
    const radius = THREE.MathUtils.lerp(preset.baseRadius, preset.topRadius, y / preset.height) + 0.016;
    const angle = i % 2 === 0 ? -0.72 : 0.62;
    const window = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.56, 0.035), windowMat);
    window.position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
    window.rotation.y = angle;
    group.add(window);
  }
}

function addGallery(group, preset) {
  const deckMat = material(preset.trimColor, 0.48, 0.24);
  const y = preset.height + 0.16;
  addCylinder(group, preset.galleryRadius, preset.galleryRadius, 0.18, y, deckMat, 64);

  const railCount = 20;
  for (let i = 0; i < railCount; i += 1) {
    const angle = (i / railCount) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.48, 8), shared.railMaterial);
    post.position.set(Math.sin(angle) * (preset.galleryRadius + 0.08), y + 0.3, Math.cos(angle) * (preset.galleryRadius + 0.08));
    group.add(post);
  }

  const rail = new THREE.Mesh(new THREE.TorusGeometry(preset.galleryRadius + 0.08, 0.018, 8, 72), shared.railMaterial);
  rail.position.y = y + 0.53;
  rail.rotation.x = Math.PI * 0.5;
  group.add(rail);
}

function addLantern(group, preset) {
  const glassMat = shared.warmGlass.clone();
  glassMat.color.setHex(preset.glassColor);
  glassMat.emissive = new THREE.Color(0xffd88a);
  glassMat.emissiveIntensity = 0.62;
  const trimMat = material(preset.trimColor, 0.36, 0.45);
  const roofMat = material(preset.roofColor, 0.44, 0.34);
  const y = preset.height + 0.82;

  addCylinder(group, 0.72, 0.78, 0.16, y - 0.5, trimMat, 48);
  addCylinder(group, 0.64, 0.7, 0.82, y, glassMat, 8);
  addCylinder(group, 0.78, 0.72, 0.16, y + 0.48, trimMat, 48);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.86, 0.7, 48), roofMat);
  roof.position.y = y + 0.9;
  roof.castShadow = true;
  group.add(roof);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 12), roofMat);
  cap.position.y = y + 1.27;
  group.add(cap);

  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.92, 0.035), trimMat);
    rib.position.set(Math.sin(angle) * 0.65, y, Math.cos(angle) * 0.65);
    rib.rotation.y = angle;
    group.add(rib);
  }

  return new THREE.Vector3(0, y, 0);
}

export function createLighthouse(preset) {
  const group = new THREE.Group();
  group.name = `lighthouse-${preset.label}`;

  const segments = preset.angular ? 12 : 72;
  const bodyMat = material(preset.bodyColor, 0.78, 0.02);
  addCylinder(group, preset.topRadius, preset.baseRadius, preset.height, preset.height * 0.5, bodyMat, segments);

  const baseMat = material(preset.bodyAccent, 0.7, 0.04);
  addCylinder(group, preset.baseRadius + 0.25, preset.baseRadius + 0.35, 0.5, 0.25, baseMat, segments);

  preset.bands.forEach((band) => addBand(group, preset, band));
  addWindows(group, preset);
  addGallery(group, preset);
  const lanternPosition = addLantern(group, preset);

  return { group, lanternPosition };
}

export function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((item) => {
        if (item.map) item.map.dispose();
        item.dispose();
      });
    }
  });
}
