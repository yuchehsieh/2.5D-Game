import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { MODEL_CONFIG } from "./model-config.js";

const loader = new GLTFLoader();
const cache = new Map();
const warned = new Set();
const loadedModels = new Set();
const replacementTasks = new Set();
const visualReplacements = [];
let modelsVisible = true;

function recordLoadedModel(key) {
  loadedModels.add(key);
  document.documentElement.dataset.loadedModels = [...loadedModels].join(",");
}

function cloneScene(source) {
  const clone = cloneSkeleton(source);
  clone.traverse((child) => {
    if (!child.isMesh) return;
    child.material = Array.isArray(child.material)
      ? child.material.map((material) => material.clone())
      : child.material?.clone();
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return clone;
}

function normalizeModelOrigin(model) {
  model.updateMatrixWorld(true);

  model.traverse((child) => {
    if (child.isSkinnedMesh) {
      child.computeBoundingBox();
    }
  });

  const bounds = new THREE.Box3().setFromObject(model, true);
  if (bounds.isEmpty()) return null;

  const center = bounds.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.y -= bounds.min.y;
  model.position.z -= center.z;
  model.updateMatrixWorld(true);

  return {
    width: bounds.max.x - bounds.min.x,
    height: bounds.max.y - bounds.min.y,
    depth: bounds.max.z - bounds.min.z,
  };
}

function prepareAnimationClip(clip, rootMotionPattern) {
  const prepared = clip.clone();
  if (rootMotionPattern) {
    prepared.tracks = prepared.tracks.filter((track) => (
      !rootMotionPattern.test(track.name) || !track.name.endsWith(".position")
    ));
  }
  return prepared;
}

function applyAnimationPose(model, animations, animationConfig) {
  const poseTime = animationConfig?.poseTime;
  if (!animations?.length || poseTime === undefined) return null;

  const clip = prepareAnimationClip(animations[0], animationConfig.rootMotionPattern);
  const mixer = new THREE.AnimationMixer(model);
  const action = mixer.clipAction(clip);
  action.play();
  mixer.setTime(THREE.MathUtils.clamp(poseTime, 0, clip.duration));
  action.paused = true;
  model.updateMatrixWorld(true);
  return { mixer, action, poseTime, timeScale: animationConfig.timeScale ?? 1 };
}

function createMuzzleAnchor(model, muzzleConfig) {
  if (!muzzleConfig) return null;

  const weaponMeshes = [];
  model.traverse((child) => {
    if (!child.isMesh && !child.isSkinnedMesh) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    if (materials.some((material) => muzzleConfig.materialPattern.test(material?.name ?? ""))) {
      weaponMeshes.push(child);
    }
  });
  if (!weaponMeshes.length) return null;

  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  weaponMeshes.forEach((mesh) => {
    if (mesh.isSkinnedMesh) mesh.computeBoundingBox();
    bounds.expandByObject(mesh, true);
  });
  if (bounds.isEmpty()) return null;

  const worldPosition = bounds.getCenter(new THREE.Vector3());
  const axis = muzzleConfig.axis ?? "z";
  const endpoint = muzzleConfig.endpoint ?? "max";
  worldPosition[axis] = bounds[endpoint][axis];
  worldPosition.add(new THREE.Vector3(...(muzzleConfig.offset ?? [0, 0, 0])));

  let anchorParent = model;
  if (muzzleConfig.parentPattern) {
    model.traverse((child) => {
      if (muzzleConfig.parentPattern.test(child.name)) anchorParent = child;
    });
  }
  const anchor = new THREE.Object3D();
  anchor.name = "muzzleAnchor";
  anchorParent.add(anchor);
  anchor.position.copy(anchorParent.worldToLocal(worldPosition));
  return anchor;
}

async function fetchModel(key) {
  if (cache.has(key)) return cache.get(key);
  const config = MODEL_CONFIG[key];
  if (!config) throw new Error(`Unknown model key: ${key}`);
  const promise = fetch(config.path)
    .then(async (response) => {
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || contentType.includes("text/html")) return null;
      const data = await response.arrayBuffer();
      const basePath = config.path.slice(0, config.path.lastIndexOf("/") + 1);
      return loader.parseAsync(data, basePath);
    })
    .catch(() => null);
  cache.set(key, promise);
  return promise;
}

export async function preloadAllModels(onProgress) {
  const entries = Object.entries(MODEL_CONFIG).filter(([, config]) => config.enabled !== false);
  let completed = 0;
  await Promise.all(entries.map(async ([key, config]) => {
    const model = await fetchModel(key);
    completed += 1;
    onProgress?.({
      completed,
      total: entries.length,
      key,
      path: config.path,
      available: Boolean(model),
    });
  }));
}

export async function waitForModelReplacements() {
  while (replacementTasks.size > 0) {
    await Promise.all([...replacementTasks]);
  }
}

async function replacePlaceholderInternal(visualRoot, key, placeholder, options = {}) {
  const config = MODEL_CONFIG[key];
  if (!config || config.enabled === false) return false;
  try {
    const gltf = await fetchModel(key);
    if (!gltf) {
      if (!warned.has(key)) {
        console.info(`[GLB] 找不到 ${config.path}，使用方塊模型。`);
        warned.add(key);
      }
      return false;
    }
    if (!visualRoot.parent) return false;
    const model = cloneScene(gltf.scene);
    const animation = applyAnimationPose(model, gltf.animations, config.animation);
    const normalizedSize = config.normalizeOrigin ? normalizeModelOrigin(model) : null;
    let scale = Array.isArray(config.scale) ? [...config.scale] : [config.scale, config.scale, config.scale];
    if (normalizedSize && options.fitTo) {
      const sourceSize = [normalizedSize.width, normalizedSize.height, normalizedSize.depth];
      scale = options.fitTo.map((target, index) => (
        target === null || target === undefined
          ? scale[index]
          : target / Math.max(sourceSize[index], 0.0001)
      ));
    }
    model.scale.set(...scale);
    model.rotation.y = config.rotationY ?? 0;
    model.position.set(...(config.offset ?? [0, 0, 0]));
    visualRoot.add(model);
    visualReplacements.push({ model, placeholder });
    model.visible = modelsVisible;
    if (placeholder) placeholder.visible = !modelsVisible;
    if (animation) visualRoot.userData.animation = animation;
    const muzzleAnchor = createMuzzleAnchor(model, config.muzzle);
    if (muzzleAnchor) {
      visualRoot.userData.muzzleAnchor = muzzleAnchor;
      document.documentElement.dataset[`${key}Muzzle`] = muzzleAnchor.position
        .toArray()
        .map((value) => value.toFixed(2))
        .join(",");
    }
    recordLoadedModel(key);
    if (normalizedSize) {
      document.documentElement.dataset[`${key}ModelSize`] = [
        normalizedSize.width * scale[0],
        normalizedSize.height * scale[1],
        normalizedSize.depth * scale[2],
      ].map((value) => value.toFixed(2)).join(",");
    }
    return true;
  } catch (error) {
    if (!warned.has(key)) {
      console.warn(`[GLB] ${key} 載入失敗，保留方塊模型：${config.path}`, error);
      warned.add(key);
    }
    return false;
  }
}

export function replacePlaceholder(visualRoot, key, placeholder, options) {
  const task = replacePlaceholderInternal(visualRoot, key, placeholder, options);
  replacementTasks.add(task);
  task.finally(() => replacementTasks.delete(task));
  return task;
}

export function setModelsVisible(visible) {
  modelsVisible = visible;
  visualReplacements.forEach(({ model, placeholder }) => {
    model.visible = visible;
    if (placeholder) placeholder.visible = !visible;
  });
}
