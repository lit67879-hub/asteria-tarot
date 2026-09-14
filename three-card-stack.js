import * as THREE from "./vendor/three/three.module.js";

const CARD_WIDTH = 2.2;
const CARD_HEIGHT = 3.3;
const CARD_DEPTH = 0.0094;
const CARD_PITCH = 0.0148;

function roundedCardShape(width, height, radius) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const shape = new THREE.Shape();

  shape.moveTo(-halfWidth + radius, -halfHeight);
  shape.lineTo(halfWidth - radius, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + radius);
  shape.lineTo(halfWidth, halfHeight - radius);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - radius, halfHeight);
  shape.lineTo(-halfWidth + radius, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - radius);
  shape.lineTo(-halfWidth, -halfHeight + radius);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + radius, -halfHeight);

  return shape;
}

export function createThreeCardStack(host, { cardCount = 52 } = {}) {
  if (!host) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
  } catch (error) {
    console.warn("Three.js card stack could not start; keeping the DOM fallback.", error);
    return null;
  }

  renderer.setClearColor(0x000000, 0);
  // The stack is a small object inside a full-size transparent canvas. A
  // lower cap avoids an expensive first composite on high-DPI displays while
  // keeping the card edges crisp at normal desktop density.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Keep the card-back SVG colors crisp during the DOM-to-WebGL handoff.
  // Filmic tone mapping lifts dark pixels around the textured silhouette and
  // makes the stack read as a soft black halo against the star field.
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.domElement.className = "three-card-stack-canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.replaceChildren(renderer.domElement);

  const threeScene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
  camera.position.set(0, 0, 8);

  const deck = new THREE.Group();
  threeScene.add(deck);

  const cardShape = roundedCardShape(CARD_WIDTH, CARD_HEIGHT, 0.105);
  const cardGeometry = new THREE.ExtrudeGeometry(cardShape, {
    depth: CARD_DEPTH,
    steps: 1,
    curveSegments: 7,
    bevelEnabled: false
  });
  cardGeometry.center();

  const capMaterial = new THREE.MeshStandardMaterial({
    color: 0x0d0c14,
    roughness: 0.82,
    metalness: 0
  });
  const edgeMaterial = new THREE.MeshBasicMaterial({
    // Keep the edge readable when the deck is turned. The previous shared
    // instance tones multiplied this material down to near-black, making the
    // stack read like a solid box instead of individual card layers.
    color: 0xc9c2b5
  });
  const cardLayers = new THREE.InstancedMesh(cardGeometry, [capMaterial, edgeMaterial], cardCount);
  cardLayers.frustumCulled = false;
  // Match the textured face to the rounded extruded body. A square plane
  // left dark corner wedges visible around the card and made the 3D shell
  // look oversized during a tilt.
  const faceGeometry = new THREE.ShapeGeometry(cardShape);
  const facePositions = faceGeometry.getAttribute("position");
  const faceUvs = new Float32Array(facePositions.count * 2);
  for (let index = 0; index < facePositions.count; index += 1) {
    faceUvs[index * 2] = facePositions.getX(index) / CARD_WIDTH + 0.5;
    faceUvs[index * 2 + 1] = facePositions.getY(index) / CARD_HEIGHT + 0.5;
  }
  faceGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(faceUvs, 2));
  const faceMaterial = new THREE.MeshBasicMaterial({
    color: 0x0b0b14,
    // The card-back SVG is opaque. Keeping this material opaque preserves a
    // stable depth buffer when 52 textured layers sit close together and
    // avoids the soft blended look caused by transparent sorting.
    transparent: false,
    depthWrite: true,
    depthTest: true,
    toneMapped: false
  });
  const cardFaces = new THREE.InstancedMesh(faceGeometry, faceMaterial, cardCount);
  cardFaces.frustumCulled = false;

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3(1, 1, 1);
  const frontZ = (cardCount - 1) * CARD_PITCH * 0.5;
  let deckScale = 1;
  let pixelsPerWorldUnit = 1;
  let gatherCards = null;
  let gatherDuration = 0.78;
  let gatherStagger = 0.006;
  let gatherTotal = gatherDuration + (cardCount - 1) * gatherStagger;
  const scatterMatrices = Array.from({ length: cardCount }, () => new THREE.Matrix4());
  const stackMatrices = Array.from({ length: cardCount }, () => new THREE.Matrix4());

  for (let index = 0; index < cardCount; index += 1) {
    position.set(
      Math.sin(index * 1.91) * 0.0045,
      Math.cos(index * 1.37) * 0.003,
      frontZ - index * CARD_PITCH
    );
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.sin(index * 1.63) * 0.0014);
    matrix.compose(position, quaternion, scale);
    cardLayers.setMatrixAt(index, matrix);
  }
  cardLayers.instanceMatrix.needsUpdate = true;
  deck.add(cardLayers);
  deck.add(cardFaces);

  const hemisphere = new THREE.HemisphereLight(0xfff7e4, 0x202337, 1.5);
  threeScene.add(hemisphere);

  const keyLight = new THREE.DirectionalLight(0xfff2d0, 1.8);
  keyLight.position.set(-4.5, 4, 7);
  threeScene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x91a7ff, 0.8);
  fillLight.position.set(4, -2, 5);
  threeScene.add(fillLight);

  let disposed = false;
  let cardTexture = null;
  let resolveReady;
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });

  const render = () => {
    if (!disposed) renderer.render(threeScene, camera);
  };

  const textureUrl = new URL("./assets/card-back.svg", import.meta.url).href;
  const loadCardBackImage = async () => {
    try {
      // Remove only the SVG's Gaussian glow filters for the WebGL copy. The
      // DOM cards keep the original artwork, while the stack stays crisp at
      // the larger scale used during inspection.
      const response = await fetch(textureUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const sourceText = await response.text();
      const documentNode = new DOMParser().parseFromString(sourceText, "image/svg+xml");
      if (documentNode.querySelector("parsererror")) throw new Error("Invalid card-back SVG");
      documentNode.querySelectorAll("[filter]").forEach((element) => {
        const filter = element.getAttribute("filter") || "";
        if (/softGlow|blueGlow/.test(filter)) element.removeAttribute("filter");
      });
      const serialized = new XMLSerializer().serializeToString(documentNode.documentElement);
      const objectUrl = URL.createObjectURL(new Blob([serialized], { type: "image/svg+xml" }));
      try {
        const image = new Image();
        image.decoding = "async";
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
          image.src = objectUrl;
        });
        return image;
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch (error) {
      // Keep a reliable fallback if a restrictive browser blocks SVG fetch.
      return await new Promise((resolve, reject) => {
        new THREE.TextureLoader().load(textureUrl, (texture) => resolve(texture.image), undefined, reject);
      });
    }
  };

  loadCardBackImage().then(
    (source) => {
      if (disposed) {
        return;
      }
      // Rasterize once at 3x into a canvas before uploading to WebGL, so a large desktop
      // stack does not magnify the browser's low-resolution source bitmap.
      const sourceWidth = source?.naturalWidth || source?.width || 800;
      const sourceHeight = source?.naturalHeight || source?.height || 1200;
      const rasterScale = 3;
      const rasterCanvas = document.createElement("canvas");
      rasterCanvas.width = sourceWidth * rasterScale;
      rasterCanvas.height = sourceHeight * rasterScale;
      const rasterContext = rasterCanvas.getContext("2d");
      if (rasterContext) {
        rasterContext.imageSmoothingEnabled = true;
        rasterContext.imageSmoothingQuality = "high";
        rasterContext.drawImage(source, 0, 0, rasterCanvas.width, rasterCanvas.height);
      }
      const highResTexture = rasterContext ? new THREE.CanvasTexture(rasterCanvas) : new THREE.Texture(source);
      if (!rasterContext) highResTexture.needsUpdate = true;
      highResTexture.colorSpace = THREE.SRGBColorSpace;
      highResTexture.generateMipmaps = false;
      highResTexture.minFilter = THREE.LinearFilter;
      highResTexture.magFilter = THREE.LinearFilter;
      highResTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      highResTexture.needsUpdate = true;
      cardTexture = highResTexture;
      faceMaterial.color.set(0xffffff);
      faceMaterial.map = highResTexture;
      faceMaterial.needsUpdate = true;
      // Shader compilation is synchronous in WebGLRenderer. Running it from
      // the texture callback can land on the exact frame where the DOM stack
      // hands off to WebGL, producing a visible hitch. Warm the shader during
      // an idle slice instead; readiness is resolved independently so the
      // handoff cannot be stranded while the browser is busy animating.
      let warmupStarted = false;
      const warmup = () => {
        if (warmupStarted || disposed) return;
        warmupStarted = true;
        try {
          renderer.compile(threeScene, camera);
        } catch (compileError) {
          // Rendering can still recover by compiling lazily on the first
          // frame; never leave the handoff promise pending on this path.
          console.warn("Three.js shader warmup skipped.", compileError);
        }
        render();
      };
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(warmup, { timeout: 600 });
      }
      // A short timer guarantees warmup before the ~1s gather transition even
      // on browsers that defer idle callbacks while an animation is running.
      window.setTimeout(warmup, 120);
      // Run one compile before resolving readiness. The DOM cards are still
      // visible at this point, so any synchronous shader work is hidden from
      // the WebGL handoff frame.
      warmup();
      resolveReady(true);
      render();
    },
    (error) => {
      console.warn("The Three.js card-back texture could not load.", error);
      resolveReady(false);
    }
  );

  const resize = () => {
    if (disposed) return;
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    const targetWidth = Math.max(116, Math.min(width * (width >= 700 ? 0.17 : 0.3), 210));
    const visibleWorldHeight = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
    pixelsPerWorldUnit = height / visibleWorldHeight;
    deckScale = targetWidth / (CARD_WIDTH * pixelsPerWorldUnit);
    deck.scale.setScalar(deckScale);
    render();
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();

  return {
    ready,
    prepareGather(cardStates, { cardWidth = 60, duration = 0.78, stagger = 0.006 } = {}) {
      gatherDuration = duration;
      gatherStagger = stagger;
      gatherTotal = gatherDuration + Math.max(0, cardCount - 1) * gatherStagger;
      const worldPerPixel = 1 / Math.max(1e-6, deckScale * pixelsPerWorldUnit);
      const spreadScale = cardWidth / Math.max(1, (CARD_WIDTH * deckScale * pixelsPerWorldUnit));
      gatherCards = cardStates;
      for (let index = 0; index < cardCount; index += 1) {
        const state = cardStates[index] || {};
        const scatterPosition = new THREE.Vector3(
          (Number(state.x) || 0) * worldPerPixel,
          -(Number(state.y) || 0) * worldPerPixel,
          (index - cardCount * 0.5) * 0.002
        );
        const scatterQuaternion = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 0, 1),
          THREE.MathUtils.degToRad(Number(state.rotation) || 0)
        );
        const scatterScale = Math.max(0.08, (Number(state.scale) || 1) * spreadScale);
        scatterMatrices[index].compose(
          scatterPosition,
          scatterQuaternion,
          new THREE.Vector3(scatterScale, scatterScale, scatterScale)
        );

        const stackPosition = new THREE.Vector3(
          Math.sin(index * 1.91) * 0.0045,
          Math.cos(index * 1.37) * 0.003,
          frontZ - index * CARD_PITCH
        );
        const stackQuaternion = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 0, 1),
          Math.sin(index * 1.63) * 0.0014
        );
        stackMatrices[index].compose(
          stackPosition,
          stackQuaternion,
          new THREE.Vector3(1, 1, 1)
        );
        cardLayers.setMatrixAt(index, scatterMatrices[index]);
        const facePosition = scatterPosition.clone();
        facePosition.z += CARD_DEPTH * 0.65;
        const faceMatrix = new THREE.Matrix4().compose(facePosition, scatterQuaternion, new THREE.Vector3(scatterScale, scatterScale, scatterScale));
        cardFaces.setMatrixAt(index, faceMatrix);
      }
      cardLayers.instanceMatrix.needsUpdate = true;
      cardFaces.instanceMatrix.needsUpdate = true;
      render();
    },
    setGatherProgress(elapsed = 0) {
      if (!gatherCards) return;
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      const matrix = new THREE.Matrix4();
      for (let index = 0; index < cardCount; index += 1) {
        const local = Math.max(0, Math.min(1, (elapsed - index * gatherStagger) / Math.max(0.001, gatherDuration)));
        const eased = local < 0.5
          ? 4 * local * local * local
          : 1 - Math.pow(-2 * local + 2, 3) / 2;
        matrix.copy(scatterMatrices[index]).decompose(position, quaternion, scale);
        const targetPosition = new THREE.Vector3();
        const targetQuaternion = new THREE.Quaternion();
        const targetScale = new THREE.Vector3();
        stackMatrices[index].decompose(targetPosition, targetQuaternion, targetScale);
        position.lerp(targetPosition, eased);
        quaternion.slerp(targetQuaternion, eased);
        scale.lerp(targetScale, eased);
        matrix.compose(position, quaternion, scale);
        cardLayers.setMatrixAt(index, matrix);
        const facePosition = position.clone();
        facePosition.z += CARD_DEPTH * 0.65;
        const faceMatrix = new THREE.Matrix4().compose(facePosition, quaternion, scale);
        cardFaces.setMatrixAt(index, faceMatrix);
      }
      cardLayers.instanceMatrix.needsUpdate = true;
      cardFaces.instanceMatrix.needsUpdate = true;
      render();
    },
    setRotation(rotationY, rotationX = 0) {
      deck.rotation.y = THREE.MathUtils.degToRad(rotationY);
      deck.rotation.x = THREE.MathUtils.degToRad(rotationX - Math.abs(rotationY) * 0.035);
      render();
    },
    render,
    dispose() {
      if (disposed) return;
      disposed = true;
      resolveReady(false);
      resizeObserver.disconnect();
      cardTexture?.dispose();
      faceGeometry.dispose();
      faceMaterial.dispose();
      cardGeometry.dispose();
      capMaterial.dispose();
      edgeMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      host.replaceChildren();
    }
  };
}
