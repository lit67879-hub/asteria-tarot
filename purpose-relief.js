import * as THREE from "./vendor/three/three.module.js";

const LOOP_SECONDS = 11.4;
const TAU = Math.PI * 2;

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0, edge1, value) {
  const amount = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return amount * amount * (3 - 2 * amount);
}

function windowAlpha(time, start, end, feather = 0.45) {
  return smoothstep(start, start + feather, time) * (1 - smoothstep(end - feather, end, time));
}

function makePaperTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 384;
  const context = canvas.getContext("2d");
  const image = context.createImageData(canvas.width, canvas.height);
  let seed = 271828;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let index = 0; index < image.data.length; index += 4) {
    const grain = Math.round(246 + (random() - 0.5) * 9);
    image.data[index] = grain;
    image.data[index + 1] = grain;
    image.data[index + 2] = Math.min(255, grain + 1);
    image.data[index + 3] = 255;
  }

  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.8, 1.8);
  return texture;
}

function makeExtrudedShape(points, depth = 0.07) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y, c1x, c1y, c2x, c2y]) => {
    if (c1x === undefined) shape.lineTo(x, y);
    else shape.bezierCurveTo(c1x, c1y, c2x, c2y, x, y);
  });
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    curveSegments: 12,
    steps: 1
  });
  geometry.computeVertexNormals();
  return geometry;
}

function makeReliefMaterial(color = 0xf4f3ef) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0, transparent: true });
}

function prepareMesh(mesh, opacity = 1) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.material = mesh.material.clone();
  mesh.material.opacity = opacity;
  mesh.userData.reliefOpacity = opacity;
  return mesh;
}

function setGroupOpacity(group, opacity) {
  const amount = clamp(opacity);
  group.visible = amount > 0.008;
  group.traverse((object) => {
    if (!object.isMesh || object.userData.reliefOpacity === undefined) return;
    object.material.opacity = object.userData.reliefOpacity * amount;
    object.castShadow = amount > 0.08;
  });
}

function createBranch(points, radius, material) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, y, z = 0]) => new THREE.Vector3(x, y, z)),
    false,
    "catmullrom",
    0.42
  );
  return prepareMesh(new THREE.Mesh(new THREE.TubeGeometry(curve, 56, radius, 8, false), material));
}

function createLeaf(leafGeometry, material, x, y, rotation, scale = 1) {
  const leaf = prepareMesh(new THREE.Mesh(leafGeometry, material));
  leaf.position.set(x, y, 0.1);
  leaf.rotation.z = rotation;
  leaf.scale.set(0.46 * scale, 0.46 * scale, scale);
  return leaf;
}

function createFlower(petalGeometry, material, x, y, scale = 1, rotation = 0, petals = 5) {
  const flower = new THREE.Group();
  flower.position.set(x, y, 0.14);
  flower.rotation.z = rotation;

  for (let index = 0; index < petals; index += 1) {
    const petal = prepareMesh(new THREE.Mesh(petalGeometry, material));
    petal.rotation.z = index / petals * TAU;
    petal.rotation.x = 0.08 * Math.sin(index * 2.7);
    const variation = 0.84 + (index % 3) * 0.08;
    petal.scale.set(0.55 * scale * variation, 0.55 * scale, scale);
    flower.add(petal);
  }

  const center = prepareMesh(new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 12), material));
  center.position.z = 0.09;
  center.scale.setScalar(scale);
  flower.add(center);

  for (let index = 0; index < 7; index += 1) {
    const stamen = prepareMesh(new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), material));
    const angle = index / 7 * TAU;
    stamen.position.set(Math.cos(angle) * 0.12 * scale, Math.sin(angle) * 0.12 * scale, 0.18);
    stamen.scale.setScalar(scale);
    flower.add(stamen);
  }
  return flower;
}

function addBud(group, material, x, y, scale = 1) {
  const bud = prepareMesh(new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), material));
  bud.position.set(x, y, 0.15);
  bud.scale.set(0.72 * scale, scale, 0.62 * scale);
  group.add(bud);
}

function makeGarden(toolkit) {
  const { petalGeometry, leafGeometry, material } = toolkit;
  const group = new THREE.Group();
  group.add(createBranch([
    [-3.4, -2.3, 0.04], [-2.55, -1.8, 0.05], [-1.65, -1.62, 0.04], [-0.52, -1.08, 0.05], [0.62, -1.3, 0.04]
  ], 0.04, material));
  group.add(createBranch([
    [3.4, -1.72, 0.03], [2.55, -1.3, 0.04], [1.72, -0.92, 0.05], [0.72, -1.08, 0.05], [-0.15, -1.55, 0.03]
  ], 0.035, material));

  [
    [-2.78, -1.72, 0.88, 0.1, 6], [-2.04, -1.35, 0.58, 0.5, 5],
    [-1.35, -1.72, 0.66, -0.2, 5], [-0.54, -1.16, 0.48, 0.3, 5],
    [0.33, -1.55, 0.62, -0.5, 5], [1.25, -1.08, 0.5, 0.1, 5],
    [2.05, -1.32, 0.56, -0.3, 5], [2.78, -1.58, 0.8, 0.25, 6]
  ].forEach(([x, y, scale, rotation, petals]) => {
    group.add(createFlower(petalGeometry, material, x, y, scale, rotation, petals));
  });

  [
    [-2.45, -2.02, 0.18, 1], [-2.1, -1.72, 2.65, 0.9], [-1.72, -1.48, 0.35, 0.82],
    [-1.04, -1.45, 2.8, 0.9], [-0.12, -1.38, 0.45, 0.9], [0.72, -1.18, 2.7, 0.85],
    [1.48, -1.04, 0.42, 0.82], [2.32, -1.45, 2.7, 0.92], [2.6, -1.18, 0.55, 0.75]
  ].forEach(([x, y, rotation, scale]) => group.add(createLeaf(leafGeometry, material, x, y, rotation, scale)));
  addBud(group, material, -0.88, -1.08, 0.9);
  addBud(group, material, 1.67, -0.93, 0.78);
  return group;
}

function makeSideBloom(toolkit, side = -1) {
  const { petalGeometry, leafGeometry, material } = toolkit;
  const group = new THREE.Group();
  const direction = side < 0 ? 1 : -1;
  group.add(createBranch([
    [side * 3.45, -0.12, 0.04], [side * 2.78, -0.3, 0.05],
    [side * 2.2, -0.58, 0.04], [side * 1.65, -0.62, 0.03]
  ], 0.036, material));
  group.add(createFlower(petalGeometry, material, side * 2.76, -0.18, 0.66, side * 0.18, 6));
  group.add(createFlower(petalGeometry, material, side * 2.12, -0.52, 0.48, side * -0.4, 5));
  group.add(createLeaf(leafGeometry, material, side * 2.5, -0.48, direction * 0.7 + (side < 0 ? 0 : Math.PI), 0.9));
  group.add(createLeaf(leafGeometry, material, side * 1.86, -0.72, direction * -0.5 + (side < 0 ? 0 : Math.PI), 0.76));
  addBud(group, material, side * 3.08, 0.08, 0.78);
  return group;
}

function createBird({ featherGeometry, material, facing = 1 }) {
  const bird = new THREE.Group();
  const body = prepareMesh(new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 18), material));
  body.scale.set(1.32, 0.46, 0.43);
  body.rotation.z = -0.05;
  bird.add(body);

  const chest = prepareMesh(new THREE.Mesh(new THREE.SphereGeometry(0.28, 22, 14), material));
  chest.position.set(0.42, 0.07, 0.02);
  chest.scale.set(0.85, 1.05, 0.9);
  bird.add(chest);

  const head = prepareMesh(new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), material));
  head.position.set(0.63, 0.18, 0.02);
  bird.add(head);

  const beak = prepareMesh(new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 5), material));
  beak.position.set(0.82, 0.17, 0.01);
  beak.rotation.z = -Math.PI / 2;
  bird.add(beak);

  for (let index = 0; index < 5; index += 1) {
    const feather = prepareMesh(new THREE.Mesh(featherGeometry, material));
    feather.position.set(-0.48, -0.02, -0.01 + index * 0.012);
    feather.rotation.z = Math.PI + (index - 2) * 0.13;
    feather.scale.set(0.62 - Math.abs(index - 2) * 0.045, 0.72, 0.8);
    bird.add(feather);
  }

  const upperWing = new THREE.Group();
  upperWing.position.set(-0.06, 0.08, 0.13);
  for (let index = 0; index < 11; index += 1) {
    const feather = prepareMesh(new THREE.Mesh(featherGeometry, material));
    const amount = index / 10;
    feather.rotation.z = 0.46 + amount * 0.92;
    feather.position.z = index * 0.006;
    feather.scale.set(0.72 + amount * 0.22, 0.54 - amount * 0.12, 0.82);
    upperWing.add(feather);
  }
  bird.add(upperWing);

  const lowerWing = new THREE.Group();
  lowerWing.position.set(-0.02, -0.07, 0.06);
  for (let index = 0; index < 8; index += 1) {
    const feather = prepareMesh(new THREE.Mesh(featherGeometry, material));
    const amount = index / 7;
    feather.rotation.z = -0.22 - amount * 0.76;
    feather.position.z = index * 0.004;
    feather.scale.set(0.62 + amount * 0.18, 0.48 - amount * 0.1, 0.76);
    lowerWing.add(feather);
  }
  bird.add(lowerWing);

  const cover = prepareMesh(new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 12), material));
  cover.position.set(-0.05, 0.08, 0.2);
  cover.scale.set(1.4, 0.72, 0.3);
  bird.add(cover);
  if (facing < 0) bird.rotation.y = Math.PI;
  bird.userData.upperWing = upperWing;
  bird.userData.lowerWing = lowerWing;
  return bird;
}

function animateBird(bird, time, phase = 0, amplitude = 1) {
  const flap = Math.sin(time * 4.4 + phase);
  bird.userData.upperWing.rotation.x = -0.12 - flap * 0.48 * amplitude;
  bird.userData.upperWing.rotation.z = flap * 0.045;
  bird.userData.lowerWing.rotation.x = 0.12 + flap * 0.34 * amplitude;
  bird.userData.lowerWing.rotation.z = -flap * 0.035;
}

export function createPurposeRelief(canvas) {
  if (!canvas) return { setActive() {}, destroy() {} };
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true
    });
    renderer.setClearColor(0xf6f6f4, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-3.2, 3.2, 3.2, -3.2, 0.1, 20);
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);

    const paperTexture = makePaperTexture();
    const paper = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, 6.4),
      new THREE.MeshStandardMaterial({ color: 0xf8f8f6, map: paperTexture, roughness: 1, metalness: 0 })
    );
    paper.position.z = -0.16;
    paper.receiveShadow = true;
    scene.add(paper);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xc9c9c4, 2.1));
    const keyLight = new THREE.DirectionalLight(0xffffff, 4.2);
    keyLight.position.set(-3.6, 4.5, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(512, 512);
    keyLight.shadow.bias = -0.00035;
    Object.assign(keyLight.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 14 });
    keyLight.shadow.camera.updateProjectionMatrix();
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xdfe3e5, 1.15);
    fillLight.position.set(4, -2.5, 4);
    scene.add(fillLight);

    const material = makeReliefMaterial();
    const petalGeometry = makeExtrudedShape([
      [0, -0.04], [1, 0, 0.18, -0.34, 0.72, -0.42], [0, 0.04, 0.72, 0.42, 0.18, 0.34]
    ], 0.075);
    const leafGeometry = makeExtrudedShape([
      [0, -0.025], [1, 0, 0.26, -0.2, 0.78, -0.23], [0, 0.025, 0.78, 0.23, 0.26, 0.2]
    ], 0.065);
    const featherGeometry = makeExtrudedShape([
      [0, -0.018], [1.08, 0, 0.25, -0.13, 0.78, -0.11], [0, 0.018, 0.78, 0.11, 0.25, 0.13]
    ], 0.045);
    const toolkit = { petalGeometry, leafGeometry, featherGeometry, material };
    const reliefRoot = new THREE.Group();
    scene.add(reliefRoot);

    const garden = makeGarden(toolkit);
    const leftBloom = makeSideBloom(toolkit, -1);
    const rightBloom = makeSideBloom(toolkit, 1);
    const openingLeftBird = createBird({ featherGeometry, material, facing: 1 });
    const openingRightBird = createBird({ featherGeometry, material, facing: -1 });
    const passingLeftBird = createBird({ featherGeometry, material, facing: 1 });
    const passingRightBird = createBird({ featherGeometry, material, facing: -1 });
    openingLeftBird.position.set(-1.95, 1.52, 0.58);
    openingLeftBird.scale.setScalar(0.96);
    openingLeftBird.rotation.z = -0.12;
    openingRightBird.position.set(1.75, 1.55, 0.62);
    openingRightBird.scale.setScalar(1.02);
    openingRightBird.rotation.z = 0.08;
    passingLeftBird.scale.setScalar(0.52);
    passingRightBird.scale.setScalar(0.92);
    reliefRoot.add(garden, leftBloom, rightBloom, openingLeftBird, openingRightBird, passingLeftBird, passingRightBird);

    let active = false;
    let frameId = 0;
    let lastTime = 0;
    let elapsed = 0.45;
    let pointerX = 0;
    let pointerY = 0;
    let smoothPointerX = 0;
    let smoothPointerY = 0;
    let renderCount = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      const size = Math.max(1, Math.round(Math.min(parent?.clientWidth || 640, parent?.clientHeight || 640)));
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(size, size, false);
      renderer.render(scene, camera);
    };

    const renderFrame = (time) => {
      const cycle = time % LOOP_SECONDS;
      const gardenAlpha = Math.max(1 - smoothstep(1.2, 2.2, cycle), smoothstep(9.2, 10.15, cycle));
      const openingBirdAlpha = 1 - smoothstep(1.25, 2.05, cycle);
      const leftBloomAlpha = windowAlpha(cycle, 1.65, 3.55, 0.52);
      const rightBloomAlpha = windowAlpha(cycle, 3.25, 5.25, 0.58);
      const leftBirdAlpha = windowAlpha(cycle, 5.35, 7.15, 0.38);
      const rightBirdAlpha = windowAlpha(cycle, 7.25, 9.35, 0.42);
      setGroupOpacity(garden, gardenAlpha);
      setGroupOpacity(leftBloom, leftBloomAlpha);
      setGroupOpacity(rightBloom, rightBloomAlpha);
      setGroupOpacity(openingLeftBird, openingBirdAlpha);
      setGroupOpacity(openingRightBird, openingBirdAlpha);
      setGroupOpacity(passingLeftBird, leftBirdAlpha);
      setGroupOpacity(passingRightBird, rightBirdAlpha);

      garden.position.y = -0.14 * (1 - gardenAlpha) + Math.sin(time * 0.7) * 0.018;
      leftBloom.position.set(smoothstep(1.65, 3.55, cycle) * 0.65 - 0.4, Math.sin(time * 1.1) * 0.025, 0);
      rightBloom.position.set(0.35 - smoothstep(3.25, 5.25, cycle) * 0.5, -0.65 + Math.sin(time * 0.8) * 0.03, 0);

      const leftProgress = clamp((cycle - 5.35) / 1.8);
      passingLeftBird.position.set(-3.45 + leftProgress * 1.75, 1.35 + Math.sin(leftProgress * Math.PI) * 0.32, 0.58);
      passingLeftBird.rotation.z = -0.12 + Math.sin(leftProgress * Math.PI) * 0.11;
      const rightProgress = clamp((cycle - 7.25) / 2.1);
      passingRightBird.position.set(3.55 - rightProgress * 1.78, 1.5 + Math.sin(rightProgress * Math.PI) * 0.2, 0.62);
      passingRightBird.rotation.z = 0.1 - Math.sin(rightProgress * Math.PI) * 0.08;

      animateBird(openingLeftBird, time, 0.3, 0.9);
      animateBird(openingRightBird, time, 2.1, 1);
      animateBird(passingLeftBird, time, 1.2, 1.15);
      animateBird(passingRightBird, time, 2.8, 1);
      smoothPointerX += (pointerX - smoothPointerX) * 0.035;
      smoothPointerY += (pointerY - smoothPointerY) * 0.035;
      reliefRoot.position.x = smoothPointerX * 0.055;
      reliefRoot.position.y = -smoothPointerY * 0.04;
      reliefRoot.rotation.y = smoothPointerX * 0.018;
      reliefRoot.rotation.x = smoothPointerY * 0.012;
      renderCount += 1;
      renderer.shadowMap.needsUpdate = renderCount % 3 === 1;
      renderer.render(scene, camera);
    };

    const tick = (time) => {
      if (!active) return;
      if (!lastTime) lastTime = time;
      elapsed = (elapsed + Math.min(0.2, (time - lastTime) / 1000)) % LOOP_SECONDS;
      lastTime = time;
      renderFrame(elapsed);
      frameId = requestAnimationFrame(tick);
    };

    const move = (event) => {
      pointerX = event.clientX / Math.max(1, window.innerWidth) * 2 - 1;
      pointerY = event.clientY / Math.max(1, window.innerHeight) * 2 - 1;
    };
    const resetPointer = () => { pointerX = 0; pointerY = 0; };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", resetPointer);
    window.addEventListener("resize", resize, { passive: true });
    resize();
    renderFrame(elapsed);

    return {
      setActive(nextActive) {
        if (active === nextActive) return;
        active = nextActive;
        cancelAnimationFrame(frameId);
        lastTime = 0;
        if (active) frameId = requestAnimationFrame(tick);
        else renderFrame(elapsed);
      },
      destroy() {
        active = false;
        cancelAnimationFrame(frameId);
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", move);
        document.documentElement.removeEventListener("pointerleave", resetPointer);
        renderer.dispose();
        paperTexture.dispose();
        petalGeometry.dispose();
        leafGeometry.dispose();
        featherGeometry.dispose();
      }
    };
  } catch (error) {
    console.warn("Purpose relief could not start; the typographic fallback remains visible.", error);
    return { setActive() {}, destroy() {} };
  }
}
