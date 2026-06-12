const modelUrl = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

export const MODEL_CONFIG = {
  player: {
    path: modelUrl("assets/models/characters/player.glb"),
    scale: 1,
    rotationY: 0,
    offset: [0, 0, 0],
    normalizeOrigin: true,
    animation: {
      poseTime: 0.8,
      timeScale: 1,
      rootMotionPattern: /NPCMedium_110|walk_aim/i,
    },
    muzzle: {
      materialPattern: /M4/i,
      parentPattern: /M4_bone_anim/i,
      axis: "z",
      endpoint: "max",
      offset: [0, 0, 0.04],
    },
  },
  infected: {
    path: modelUrl("assets/models/characters/infected.glb"),
    scale: 0.01,
    rotationY: 0,
    offset: [0, 0, 0],
    normalizeOrigin: true,
    animation: {
      poseTime: 0.4,
      timeScale: 1,
      rootMotionPattern: /walk_0|rootJoint/i,
    },
  },
  infectedHeavy: {
    path: modelUrl("assets/models/characters/infected_heavy.glb"),
    scale: 0.012,
    rotationY: 0,
    offset: [0, 0, 0],
    normalizeOrigin: true,
    animation: {
      poseTime: 0.5,
      timeScale: 0.8,
      rootMotionPattern: /slowB_002_strafe_walkslow|rootJoint/i,
    },
  },
  boss: {
    path: modelUrl("assets/models/characters/boss.glb"),
    scale: 1.15,
    rotationY: 0,
    offset: [0, 0, 0],
    normalizeOrigin: true,
    animation: {
      poseTime: 0.5,
      timeScale: 0.85,
      rootMotionPattern: /rootJoint/i,
    },
  },
  assaultRifle: { path: modelUrl("assets/models/weapons/assault_rifle.glb"), scale: 1, rotationY: 0, offset: [0, 0, 0] },
  ground: {
    path: modelUrl("assets/models/environment/ground.glb"),
    scale: 1,
    rotationY: 0,
    offset: [0, 0, 0],
    normalizeOrigin: true,
    enabled: false,
  },
  barrier: {
    path: modelUrl("assets/models/environment/barrier.glb"),
    scale: 1,
    rotationY: 0,
    offset: [0, 0, 0],
    normalizeOrigin: true,
  },
  arenaProps: {
    path: modelUrl("assets/models/environment/arena_props.glb"),
    scale: 1,
    rotationY: 0,
    offset: [0, 0, 0],
    normalizeOrigin: true,
  },
};
