import * as THREE from "three";
import "./style.css";
import {
  preloadAllModels,
  replacePlaceholder,
  setModelsVisible,
  waitForModelReplacements,
} from "./model-loader.js";

const $ = (selector) => document.querySelector(selector);
const bootProgress = $("#boot-progress");
const bootStatus = $("#boot-status");
const canvas = $("#game-canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101713);
scene.fog = new THREE.FogExp2(0x101713, 0.012);
const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 240);
const raycaster = new THREE.Raycaster();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const mouseNdc = new THREE.Vector2(0, 0);
const aimPoint = new THREE.Vector3(0, 0, 10);
let previousFrameAt = performance.now();

const ui = {
  hud: $("#hud"), start: $("#start-screen"), upgrade: $("#upgrade-screen"), result: $("#result-screen"),
  startButton: $("#start-button"), restartButton: $("#restart-button"), options: $("#upgrade-options"),
  objective: $("#objective"), enemyCount: $("#enemy-count"), ammo: $("#ammo-current"),
  reload: $("#reload-status"), healthText: $("#health-text"), healthFill: $("#health-fill"),
  boss: $("#boss-health"), bossText: $("#boss-health-text"), bossFill: $("#boss-health-fill"),
  dots: [...document.querySelectorAll(".room-dot")], hitMarker: $("#hit-marker"),
  crosshair: $("#crosshair"),
  damage: $("#damage-vignette"), toast: $("#toast"),
  resultEyebrow: $("#result-eyebrow"), resultTitle: $("#result-title"), resultCopy: $("#result-copy"),
  statKills: $("#stat-kills"), statShots: $("#stat-shots"), statAccuracy: $("#stat-accuracy"),
  visualModeButton: $("#visual-mode-button"), visualModeNote: $("#visual-mode-note"),
};

const state = {
  phase: "menu", room: 0, enemies: [], effects: [], obstacles: [], keys: new Set(),
  firing: false, aimYaw: 0, lastShotAt: 0,
  kills: 0, shots: 0, hits: 0, shake: 0, toastTimer: 0, useModels: true,
};

const weapon = {
  damage: 28, fireRate: 8.5, magazineSize: 30, ammo: 30, reloadTime: 1.55,
  spread: 0.018, penetration: 0, reloading: false, reloadStartedAt: 0,
};

const upgradePool = [
  ["重型槍管", "強化彈道終端效果，提高單發傷害。", "傷害 +35%", () => { weapon.damage *= 1.35; }],
  ["競賽級扳機", "縮短擊發間隔，提升持續壓制能力。", "射速 +28%", () => { weapon.fireRate *= 1.28; }],
  ["加長彈匣", "增加彈匣容量，並立即補滿彈藥。", "彈匣 +15", () => {
    weapon.magazineSize += 15; weapon.ammo = weapon.magazineSize;
  }],
  ["快拆彈匣座", "改良供彈結構，降低換彈空檔。", "換彈時間 -35%", () => { weapon.reloadTime *= 0.65; }],
  ["穿甲彈", "子彈可貫穿一個感染者，命中後方目標。", "貫穿 +1", () => { weapon.penetration += 1; }],
  ["戰術前握把", "改善射擊穩定度，收緊彈著分布。", "散布 -45%", () => { weapon.spread *= 0.55; }],
];

const rooms = [
  {
    name: "第一封鎖區",
    spawns: [["infected",-10,-4],["infected",-6,-9],["infected",7,-8],
      ["infected",11,-2],["infected",5,8],["infected",-7,7]],
  },
  {
    name: "第二封鎖區",
    spawns: [["infected",-12,-8],["infected",-8,3],["infected",-3,-10],
      ["infected",4,10],["infected",10,6],["infected",12,-5],["heavy",-2,9],["heavy",8,-10]],
  },
  { name: "感染源核心", boss: true },
];

function visualRoot(parent) {
  const root = new THREE.Group();
  root.name = "visualRoot";
  parent.add(root);
  return root;
}

function box(width, height, depth, color, options = {}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({
      color, roughness: options.roughness ?? 0.75, metalness: options.metalness ?? 0.05,
      emissive: options.emissive ?? 0, emissiveIntensity: options.emissiveIntensity ?? 0,
    }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function setupWorld() {
  scene.add(new THREE.HemisphereLight(0xa6c6b7, 0x182018, 1.7));
  const sun = new THREE.DirectionalLight(0xfff2d0, 3);
  sun.position.set(-18, 30, -8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -35, right: 35, top: 35, bottom: -35, near: 1, far: 80 });
  scene.add(sun);
  const redLight = new THREE.PointLight(0xff4b32, 18, 16, 2);
  redLight.position.set(16, 4, -13);
  scene.add(redLight);

  const groundEntity = new THREE.Group();
  scene.add(groundEntity);
  const groundRoot = visualRoot(groundEntity);
  const ground = box(54, 0.7, 54, 0x263128, { roughness: 0.95 });
  ground.position.y = -0.35;
  groundRoot.add(ground);
  // The supplied ground GLB is a tall prop, not a floor plane, so keep the stable base floor.

  const grid = new THREE.GridHelper(54, 27, 0x485b48, 0x354239);
  grid.position.y = 0.02;
  grid.material.opacity = 0.27;
  grid.material.transparent = true;
  scene.add(grid);

  [[0,-27,54,2,1.4],[0,27,54,2,1.4],[-27,0,1.4,2,54],[27,0,1.4,2,54],
    [-13,-11,6,2.4,2],[10,-13,2,2.4,7],[-11,9,3,2.4,5],[12,10,7,2.4,2],
    [0,-18,5,2.4,2],[0,17,5,2.4,2]].forEach((data) => createBarrier(...data));

  const propsEntity = new THREE.Group();
  scene.add(propsEntity);
  const propsRoot = visualRoot(propsEntity);
  const placeholders = new THREE.Group();
  propsRoot.add(placeholders);
  [[-20,-18],[-18,18],[19,-18],[20,17],[-18,0],[18,0],[-5,-22],[7,22]].forEach(([x,z], i) => {
    const crate = box(1.8, 1.8 + (i % 2) * 0.7, 1.8, i % 2 ? 0x596156 : 0x3e4a40);
    crate.position.set(x, crate.geometry.parameters.height / 2, z);
    placeholders.add(crate);
  });
  replacePlaceholder(propsRoot, "arenaProps", placeholders);
}

function createBarrier(x, z, width, height, depth) {
  const entity = new THREE.Group();
  entity.position.set(x, 0, z);
  scene.add(entity);
  const root = visualRoot(entity);
  const placeholder = box(width, height, depth, 0x465046, { metalness: 0.22 });
  placeholder.position.y = height / 2;
  root.add(placeholder);
  replacePlaceholder(root, "barrier", placeholder, { fitTo: [width, height, depth] });
  state.obstacles.push({
    minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2,
    box: new THREE.Box3(
      new THREE.Vector3(x - width / 2, 0, z - depth / 2),
      new THREE.Vector3(x + width / 2, height, z + depth / 2),
    ),
  });
}

function createPlayer() {
  const root = new THREE.Group();
  root.position.set(0, 0, 15);
  scene.add(root);
  const visuals = visualRoot(root);
  const placeholder = new THREE.Group();
  visuals.add(placeholder);
  const legs = box(0.9, 0.7, 0.8, 0x26302a); legs.position.y = 0.35;
  const torso = box(1.15, 1.15, 0.8, 0x71826d); torso.position.y = 1.25;
  const head = box(0.65, 0.65, 0.65, 0xc2a27c); head.position.y = 2.15;
  placeholder.add(legs, torso, head);
  const playerModelLoaded = replacePlaceholder(visuals, "player", placeholder);

  const weaponMount = new THREE.Group();
  weaponMount.position.set(0.62, 1.35, 0.75);
  root.add(weaponMount);
  const gunRoot = visualRoot(weaponMount);
  const gun = box(0.18, 0.18, 1.65, 0x151a18, { metalness: 0.65 });
  gun.position.z = 0.62;
  gunRoot.add(gun);
  replacePlaceholder(gunRoot, "assaultRifle", gun);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0, 1.55);
  weaponMount.add(muzzle);
  playerModelLoaded.then((loaded) => {
    if (!loaded) return;
    player.hasModel = true;
    gunRoot.visible = !state.useModels;
    if (visuals.userData.muzzleAnchor) {
      player.modelMuzzle = visuals.userData.muzzleAnchor;
      player.muzzle = state.useModels ? player.modelMuzzle : player.defaultMuzzle;
    }
  });

  const player = {
    root, visuals, muzzle, defaultMuzzle: muzzle, modelMuzzle: null, gunRoot, hasModel: false,
    health: 100, maxHealth: 100, speed: 4.4, radius: 0.75,
    rolling: false, rollStartedAt: 0, rollCooldownUntil: 0,
    rollDirection: new THREE.Vector3(), invulnerableUntil: 0,
  };
  return player;
}

function createEnemy(type, x, z) {
  const heavy = type === "heavy";
  const boss = type === "boss";
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  scene.add(root);
  const visuals = visualRoot(root);
  const placeholder = new THREE.Group();
  visuals.add(placeholder);
  const body = box(
    boss ? 3 : heavy ? 1.5 : 0.95, boss ? 3.5 : heavy ? 2.1 : 1.45,
    boss ? 2.2 : heavy ? 1.25 : 0.8, boss ? 0x8f3025 : heavy ? 0x785346 : 0x59704e,
    { emissive: boss ? 0x3d0905 : 0, emissiveIntensity: boss ? 0.8 : 0 },
  );
  body.position.y = boss ? 1.75 : heavy ? 1.05 : 0.72;
  const head = box(boss ? 1.6 : heavy ? 0.85 : 0.62, boss ? 1.3 : 0.7,
    boss ? 1.3 : 0.65, boss ? 0xb33c2e : 0x8da073);
  head.position.y = boss ? 4 : heavy ? 2.45 : 1.78;
  placeholder.add(body, head);
  const modelKey = boss ? "boss" : heavy ? "infectedHeavy" : "infected";
  replacePlaceholder(visuals, modelKey, placeholder);

  const maxHealth = boss ? 900 : heavy ? 170 : 72;
  const now = performance.now() / 1000;
  const enemy = {
    root, visuals, type, health: maxHealth, maxHealth,
    speed: boss ? 2.2 : heavy ? 2 : 3.1 + Math.random() * 0.5,
    radius: boss ? 2.2 : heavy ? 1.1 : 0.7,
    damage: boss ? 24 : heavy ? 18 : 10,
    attackRange: boss ? 2.7 : heavy ? 1.6 : 1.2,
    attackCooldown: boss ? 1.15 : heavy ? 1.4 : 0.9,
    nextAttackAt: 0, hitFlashUntil: 0, dead: false,
    nextChargeAt: now + 4, chargeUntil: 0, chargeDirection: new THREE.Vector3(),
    nextSummonAt: now + 7, navSide: Math.random() < 0.5 ? -1 : 1, stuckTime: 0,
  };
  root.userData.enemy = enemy;
  state.enemies.push(enemy);
  return enemy;
}

function updateBootProgress({ completed, total, key, available }) {
  const percent = Math.round(completed / total * 82);
  bootProgress.style.width = `${Math.max(4, percent)}%`;
  bootStatus.textContent = available
    ? `載入模型 ${completed}/${total}：${key}`
    : `模型 ${key} 未提供，使用方塊替代`;
}

function waitForWindowLoad() {
  if (document.readyState === "complete") return Promise.resolve();
  return new Promise((resolve) => addEventListener("load", resolve, { once: true }));
}

await preloadAllModels(updateBootProgress);
bootStatus.textContent = "建立作戰區域...";
setupWorld();
const player = createPlayer();
await waitForModelReplacements();
await Promise.all([document.fonts?.ready ?? Promise.resolve(), waitForWindowLoad()]);
bootProgress.style.width = "94%";
bootStatus.textContent = "完成第一幀渲染...";
updateCamera(1);
renderer.render(scene, camera);
await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
bootProgress.style.width = "100%";
document.documentElement.classList.remove("booting");
document.documentElement.classList.add("ready");
document.documentElement.dataset.bootComplete = "true";

function resetWeapon() {
  Object.assign(weapon, {
    damage: 28, fireRate: 8.5, magazineSize: 30, ammo: 30, reloadTime: 1.55,
    spread: 0.018, penetration: 0, reloading: false, reloadStartedAt: 0,
  });
}

function resetGame() {
  state.enemies.forEach((enemy) => scene.remove(enemy.root));
  state.effects.forEach((effect) => scene.remove(effect.object));
  Object.assign(state, {
    room: 0, kills: 0, shots: 0, hits: 0, firing: false,
    aimYaw: 0, lastShotAt: 0,
  });
  state.enemies = [];
  state.effects = [];
  player.root.position.set(0, 0, 15);
  player.root.rotation.y = 0;
  player.health = player.maxHealth;
  player.rolling = false;
  player.invulnerableUntil = 0;
  resetWeapon();
  const requestedRoom = Number.parseInt(new URLSearchParams(location.search).get("room") ?? "1", 10);
  startRoom(THREE.MathUtils.clamp(requestedRoom - 1, 0, rooms.length - 1));
}

function startRoom(index) {
  state.room = index;
  state.phase = index === 2 ? "boss" : "combat";
  ui.objective.textContent = rooms[index].name;
  ui.dots.forEach((dot, i) => {
    dot.classList.toggle("active", i === index);
    dot.classList.toggle("complete", i < index);
  });
  if (rooms[index].boss) {
    createEnemy("boss", 0, -9);
    ui.boss.classList.remove("hidden");
    toast("警告：偵測到巨型感染體");
  } else {
    rooms[index].spawns.forEach(([type, x, z]) => createEnemy(type, x, z));
    ui.boss.classList.add("hidden");
    toast(`${rooms[index].name}：清除所有目標`);
  }
}

function startGame() {
  ui.start.classList.add("hidden");
  ui.result.classList.add("hidden");
  ui.hud.classList.remove("hidden");
  resetGame();
}

function applyVisualMode() {
  setModelsVisible(state.useModels);
  if (player.hasModel) {
    player.gunRoot.visible = !state.useModels;
    player.muzzle = state.useModels && player.modelMuzzle
      ? player.modelMuzzle
      : player.defaultMuzzle;
  }
  ui.visualModeButton.textContent = state.useModels ? "目前：3D 模型" : "目前：方塊示意";
  ui.visualModeNote.textContent = state.useModels
    ? "角色、怪物與場景使用 GLB 模型"
    : "使用方塊顯示，碰撞與玩法保持不變";
}

function showUpgrades() {
  state.phase = "upgrade";
  ui.options.replaceChildren();
  [...upgradePool].sort(() => Math.random() - 0.5).slice(0, 3).forEach((upgrade, i) => {
    const card = document.createElement("button");
    card.className = "upgrade-card";
    card.innerHTML = `<span class="upgrade-number">0${i + 1} // 配件</span>
      <h3>${upgrade[0]}</h3><p>${upgrade[1]}</p><span class="upgrade-stat">${upgrade[2]}</span>`;
    card.onclick = () => {
      upgrade[3]();
      ui.upgrade.classList.add("hidden");
      startRoom(state.room + 1);
    };
    ui.options.appendChild(card);
  });
  ui.upgrade.classList.remove("hidden");
}

function showResult(victory) {
  state.phase = victory ? "victory" : "defeat";
  state.firing = false;
  ui.resultEyebrow.textContent = victory ? "MISSION COMPLETE" : "MISSION FAILED";
  ui.resultTitle.textContent = victory ? "感染源已清除" : "特遣隊失去訊號";
  ui.resultCopy.textContent = victory ? "隔離區 K-17 暫時恢復控制。" : "感染體突破防線，準備再次部署。";
  ui.resultEyebrow.style.color = victory ? "var(--signal)" : "var(--danger)";
  ui.statKills.textContent = state.kills;
  ui.statShots.textContent = state.shots;
  ui.statAccuracy.textContent = `${state.shots ? Math.round(state.hits / state.shots * 100) : 0}%`;
  ui.result.classList.remove("hidden");
}

function canMove(position, radius) {
  if (Math.abs(position.x) > 25.2 - radius || Math.abs(position.z) > 25.2 - radius) return false;
  return !state.obstacles.some((o) =>
    position.x + radius > o.minX && position.x - radius < o.maxX
    && position.z + radius > o.minZ && position.z - radius < o.maxZ);
}

function move(root, delta, radius) {
  const beforeX = root.position.x;
  const beforeZ = root.position.z;
  const x = root.position.clone(); x.x += delta.x;
  if (canMove(x, radius)) root.position.x = x.x;
  const z = root.position.clone(); z.z += delta.z;
  if (canMove(z, radius)) root.position.z = z.z;
  return Math.hypot(root.position.x - beforeX, root.position.z - beforeZ);
}

function moveEnemyToward(enemy, toward, delta) {
  if (toward.lengthSq() < 0.0001) return 0;
  const desired = toward.clone().normalize();
  const step = enemy.speed * delta;
  const lookAhead = Math.max(step, enemy.radius * 0.9);
  const angles = [
    0,
    enemy.navSide * Math.PI / 4,
    enemy.navSide * Math.PI / 2,
    -enemy.navSide * Math.PI / 4,
    -enemy.navSide * Math.PI / 2,
  ];

  for (const angle of angles) {
    const candidate = desired.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    const probe = enemy.root.position.clone().addScaledVector(candidate, lookAhead);
    if (!canMove(probe, enemy.radius)) continue;
    const moved = move(enemy.root, candidate.multiplyScalar(step), enemy.radius);
    if (moved > 0.0001) {
      enemy.stuckTime = 0;
      return moved;
    }
  }

  enemy.stuckTime += delta;
  if (enemy.stuckTime > 0.2) {
    enemy.navSide *= -1;
    enemy.stuckTime = 0;
  }
  return 0;
}

function inputDirection() {
  const direction = new THREE.Vector3();
  if (state.keys.has("KeyW")) direction.z += 1;
  if (state.keys.has("KeyS")) direction.z -= 1;
  if (state.keys.has("KeyA")) direction.x += 1;
  if (state.keys.has("KeyD")) direction.x -= 1;
  return direction;
}

function updatePlayer(delta, now) {
  raycaster.setFromCamera(mouseNdc, camera);
  if (raycaster.ray.intersectPlane(aimPlane, aimPoint)) {
    const aimDirection = aimPoint.clone().sub(player.root.position);
    aimDirection.y = 0;
    if (aimDirection.lengthSq() > 0.01) {
      state.aimYaw = Math.atan2(aimDirection.x, aimDirection.z);
    }
  }
  player.root.rotation.y = state.aimYaw;
  const direction = inputDirection();
  const isMoving = direction.lengthSq() > 0 && !player.rolling;
  const facingDirection = new THREE.Vector3(Math.sin(state.aimYaw), 0, Math.cos(state.aimYaw));
  const movementDirection = direction.lengthSq() > 0 ? direction.clone().normalize() : direction;
  const isMovingBackward = isMoving && movementDirection.dot(facingDirection) < -0.2;
  const animation = player.visuals.userData.animation;
  if (animation) {
    if (isMoving) {
      animation.action.paused = false;
      animation.action.timeScale = isMovingBackward
        ? -animation.timeScale
        : animation.timeScale;
      animation.mixer.update(delta);
    } else {
      animation.action.paused = true;
      animation.action.timeScale = animation.timeScale;
      animation.mixer.setTime(animation.poseTime);
    }
  }
  if (player.rolling) {
    const elapsed = now - player.rollStartedAt;
    if (elapsed > 0.34) player.rolling = false;
    else {
      move(player.root, player.rollDirection.clone().multiplyScalar(16 * delta), player.radius);
      player.visuals.rotation.z = Math.sin(elapsed / 0.34 * Math.PI) * 0.28;
    }
  } else {
    player.visuals.rotation.z *= Math.pow(0.002, delta);
    if (direction.lengthSq()) move(player.root, direction.normalize().multiplyScalar(player.speed * delta), player.radius);
  }
  if (weapon.reloading && now - weapon.reloadStartedAt >= weapon.reloadTime) {
    weapon.reloading = false;
    weapon.ammo = weapon.magazineSize;
  }
  if (state.firing) shoot(now);
}

function roll(now) {
  if (!["combat", "boss"].includes(state.phase) || player.rolling || now < player.rollCooldownUntil) return;
  const direction = inputDirection();
  if (!direction.lengthSq()) direction.set(Math.sin(state.aimYaw), 0, Math.cos(state.aimYaw));
  player.rolling = true;
  player.rollStartedAt = now;
  player.rollCooldownUntil = now + 0.85;
  player.invulnerableUntil = now + 0.38;
  player.rollDirection.copy(direction.normalize());
}

function reload(now) {
  if (weapon.reloading || weapon.ammo === weapon.magazineSize) return;
  weapon.reloading = true;
  weapon.reloadStartedAt = now;
}

function shoot(now) {
  if (weapon.reloading || now - state.lastShotAt < 1 / weapon.fireRate) return;
  if (!weapon.ammo) { reload(now); return; }
  state.lastShotAt = now;
  weapon.ammo -= 1;
  state.shots += 1;
  state.shake = Math.min(0.16, state.shake + 0.035);

  const start = new THREE.Vector3();
  player.muzzle.getWorldPosition(start);
  const aimTarget = aimPoint.clone();
  aimTarget.y = start.y;
  const direction = aimTarget.sub(start).normalize();
  const spreadYaw = THREE.MathUtils.randFloatSpread(weapon.spread);
  direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), spreadYaw);

  const playerCenter = player.root.position.clone();
  playerCenter.y = start.y;
  const muzzleFromCenter = start.clone().sub(playerCenter);
  const forwardDistance = muzzleFromCenter.dot(direction);
  const minimumMuzzleDistance = player.radius + 0.25;
  if (forwardDistance < minimumMuzzleDistance) {
    start.addScaledVector(direction, minimumMuzzleDistance - forwardDistance);
  }

  const shotRay = new THREE.Ray(start, direction);
  let barrierDistance = Infinity;
  const barrierHit = new THREE.Vector3();
  const candidateHit = new THREE.Vector3();
  state.obstacles.forEach((obstacle) => {
    const hit = shotRay.intersectBox(obstacle.box, candidateHit);
    if (!hit) return;
    const distance = start.distanceTo(hit);
    if (distance > 0.01 && distance < barrierDistance) {
      barrierDistance = distance;
      barrierHit.copy(hit);
    }
  });

  const targets = state.enemies.filter((enemy) => !enemy.dead).map((enemy) => enemy.root);
  raycaster.set(start, direction);
  raycaster.far = Math.min(45, barrierDistance);
  const hits = raycaster.intersectObjects(targets, true);
  const enemiesHit = [];
  hits.forEach((hit) => {
    let object = hit.object;
    while (object && !object.userData.enemy) object = object.parent;
    const enemy = object?.userData.enemy;
    if (enemy && !enemiesHit.includes(enemy)) enemiesHit.push(enemy);
  });
  let end = Number.isFinite(barrierDistance)
    ? barrierHit.clone()
    : start.clone().addScaledVector(direction, 42);
  if (enemiesHit.length) {
    enemiesHit.slice(0, 1 + weapon.penetration).forEach((enemy) => damageEnemy(enemy, weapon.damage, now));
    end = hits[0].point;
    state.hits += 1;
    ui.hitMarker.classList.add("active");
    setTimeout(() => ui.hitMarker.classList.remove("active"), 70);
  }
  tracer(start, end);
}

function damageEnemy(enemy, amount, now) {
  enemy.health -= amount;
  enemy.hitFlashUntil = now + 0.08;
  if (enemy.health > 0) return;
  enemy.dead = true;
  state.kills += 1;
  burst(enemy.root.position, enemy.type === "boss" ? 0xff5c39 : 0x9bbb6e, enemy.radius);
  scene.remove(enemy.root);
}

function tracer(start, end) {
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([start, end]),
    new THREE.LineBasicMaterial({ color: 0xffe7a2, transparent: true, opacity: 0.9 }),
  );
  scene.add(line);
  state.effects.push({ object: line, life: 0.055, max: 0.055, kind: "fade" });
  const flash = new THREE.PointLight(0xffb23e, 12, 7, 2);
  flash.position.copy(start);
  scene.add(flash);
  state.effects.push({ object: flash, life: 0.04, max: 0.04, kind: "fade" });
}

function burst(position, color, size) {
  const group = new THREE.Group();
  group.position.copy(position);
  scene.add(group);
  for (let i = 0; i < 8; i += 1) {
    const shard = box(size * 0.25, size * 0.25, size * 0.25, color);
    shard.position.y = 0.5;
    shard.userData.velocity = new THREE.Vector3(THREE.MathUtils.randFloatSpread(6), 2 + Math.random() * 4,
      THREE.MathUtils.randFloatSpread(6));
    group.add(shard);
  }
  state.effects.push({ object: group, life: 0.75, max: 0.75, kind: "burst" });
}

function updateEffects(delta) {
  state.effects = state.effects.filter((effect) => {
    effect.life -= delta;
    if (effect.kind === "fade" && effect.object.material) effect.object.material.opacity = Math.max(0, effect.life / effect.max);
    if (effect.kind === "burst") effect.object.children.forEach((child) => {
      child.userData.velocity.y -= 12 * delta;
      child.position.addScaledVector(child.userData.velocity, delta);
      child.rotation.x += 8 * delta; child.rotation.z += 6 * delta;
    });
    if (effect.life > 0) return true;
    scene.remove(effect.object);
    return false;
  });
}

function updateEnemies(delta, now) {
  const living = state.enemies.filter((enemy) => !enemy.dead);
  living.forEach((enemy) => {
    const toward = player.root.position.clone().sub(enemy.root.position);
    const distance = toward.length();
    toward.y = 0;
    const animation = enemy.visuals.userData.animation;
    if (animation) {
      animation.action.paused = false;
      animation.action.timeScale = animation.timeScale;
      animation.mixer.update(delta);
    }
    if (enemy.type === "boss") updateBoss(enemy, toward, distance, delta, now);
    else if (distance > enemy.attackRange) moveEnemyToward(enemy, toward, delta);
    else if (now >= enemy.nextAttackAt) {
      enemy.nextAttackAt = now + enemy.attackCooldown;
      damagePlayer(enemy.damage, now);
    }
    if (toward.lengthSq()) enemy.root.rotation.y = Math.atan2(toward.x, toward.z);
    const scale = now < enemy.hitFlashUntil ? 1.08 : 1;
    enemy.visuals.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.25);
  });
  separateEnemies(living);
  state.enemies = living;
  if (!living.length && ["combat", "boss"].includes(state.phase)) {
    if (state.phase === "boss") showResult(true); else showUpgrades();
  }
}

function updateBoss(enemy, toward, distance, delta, now) {
  if (now >= enemy.nextSummonAt && state.enemies.length < 7) {
    enemy.nextSummonAt = now + 8;
    for (let i = 0; i < 3; i += 1) {
      const angle = i / 3 * Math.PI * 2 + Math.random();
      createEnemy("infected", enemy.root.position.x + Math.sin(angle) * 4,
        enemy.root.position.z + Math.cos(angle) * 4);
    }
    toast("感染體正在增生");
  }
  if (enemy.chargeUntil > now) {
    const moved = move(enemy.root, enemy.chargeDirection.clone().multiplyScalar(10.5 * delta), enemy.radius);
    if (moved < 0.001) enemy.chargeUntil = now;
    if (distance < enemy.attackRange + 0.6 && now >= enemy.nextAttackAt) {
      enemy.nextAttackAt = now + 1.4;
      damagePlayer(enemy.damage + 12, now);
    }
  } else if (now >= enemy.nextChargeAt && distance > 5) {
    enemy.chargeDirection.copy(toward.normalize());
    enemy.chargeUntil = now + 0.85;
    enemy.nextChargeAt = now + 5.5;
    toast("警告：衝撞");
  } else if (distance > enemy.attackRange) {
    moveEnemyToward(enemy, toward, delta);
  } else if (now >= enemy.nextAttackAt) {
    enemy.nextAttackAt = now + enemy.attackCooldown;
    damagePlayer(enemy.damage, now);
  }
}

function separateEnemies(enemies) {
  for (let i = 0; i < enemies.length; i += 1) for (let j = i + 1; j < enemies.length; j += 1) {
    const offset = enemies[j].root.position.clone().sub(enemies[i].root.position);
    offset.y = 0;
    const distance = offset.length();
    const minimum = (enemies[i].radius + enemies[j].radius) * 0.72;
    if (distance > 0 && distance < minimum) {
      const correction = offset.normalize().multiplyScalar((minimum - distance) * 0.5);
      const nextA = enemies[i].root.position.clone().addScaledVector(correction, -1);
      const nextB = enemies[j].root.position.clone().add(correction);
      if (canMove(nextA, enemies[i].radius)) enemies[i].root.position.copy(nextA);
      if (canMove(nextB, enemies[j].radius)) enemies[j].root.position.copy(nextB);
    }
  }
}

function damagePlayer(amount, now) {
  if (now < player.invulnerableUntil || !["combat", "boss"].includes(state.phase)) return;
  player.health = Math.max(0, player.health - amount);
  player.invulnerableUntil = now + 0.45;
  state.shake = 0.34;
  ui.damage.classList.add("active");
  setTimeout(() => ui.damage.classList.remove("active"), 180);
  if (!player.health) showResult(false);
}

function updateCamera(delta) {
  const offset = new THREE.Vector3(0, 18, -12);
  offset.add(new THREE.Vector3(THREE.MathUtils.randFloatSpread(state.shake),
    THREE.MathUtils.randFloatSpread(state.shake), THREE.MathUtils.randFloatSpread(state.shake)));
  state.shake *= Math.pow(0.003, delta);
  camera.position.lerp(player.root.position.clone().add(offset), 1 - Math.pow(0.0008, delta));
  camera.lookAt(player.root.position.x, 0.45, player.root.position.z);
}

function updateHud() {
  ui.ammo.textContent = weapon.ammo;
  ui.reload.textContent = weapon.reloading ? "RELOADING..." : "READY";
  ui.reload.style.color = weapon.reloading ? "var(--danger)" : "var(--signal)";
  ui.healthText.textContent = `${Math.ceil(player.health)} / ${player.maxHealth}`;
  ui.healthFill.style.width = `${player.health / player.maxHealth * 100}%`;
  ui.enemyCount.textContent = state.enemies.filter((enemy) => !enemy.dead).length;
  const boss = state.enemies.find((enemy) => enemy.type === "boss" && !enemy.dead);
  if (boss) {
    ui.boss.classList.remove("hidden");
    ui.bossText.textContent = `${Math.max(0, Math.ceil(boss.health))} / ${boss.maxHealth}`;
    ui.bossFill.style.width = `${Math.max(0, boss.health / boss.maxHealth) * 100}%`;
  }
}

function toast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add("show");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => ui.toast.classList.remove("show"), 1800);
}

function animate() {
  const frameAt = performance.now();
  const delta = Math.min((frameAt - previousFrameAt) / 1000, 0.05);
  previousFrameAt = frameAt;
  const now = frameAt / 1000;
  if (["combat", "boss"].includes(state.phase)) {
    updatePlayer(delta, now);
    updateEnemies(delta, now);
  }
  updateEffects(delta);
  updateCamera(delta);
  updateHud();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

ui.startButton.onclick = startGame;
ui.restartButton.onclick = startGame;
ui.visualModeButton.onclick = () => {
  state.useModels = !state.useModels;
  applyVisualMode();
};
document.addEventListener("mousemove", (event) => {
  mouseNdc.x = event.clientX / innerWidth * 2 - 1;
  mouseNdc.y = -(event.clientY / innerHeight) * 2 + 1;
  ui.crosshair?.style.setProperty("left", `${event.clientX}px`);
  ui.crosshair?.style.setProperty("top", `${event.clientY}px`);
  ui.hitMarker?.style.setProperty("left", `${event.clientX}px`);
  ui.hitMarker?.style.setProperty("top", `${event.clientY}px`);
});
canvas.addEventListener("mousedown", (event) => {
  if (event.button === 0 && ["combat", "boss"].includes(state.phase)) state.firing = true;
});
document.addEventListener("mouseup", (event) => { if (event.button === 0) state.firing = false; });
document.addEventListener("keydown", (event) => {
  state.keys.add(event.code);
  if (event.code === "KeyR") reload(performance.now() / 1000);
  if (event.code === "Space") { event.preventDefault(); roll(performance.now() / 1000); }
});
document.addEventListener("keyup", (event) => state.keys.delete(event.code));
addEventListener("blur", () => { state.keys.clear(); state.firing = false; });
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

updateCamera(1);
animate();
