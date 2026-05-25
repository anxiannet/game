export const DESIGN_WIDTH = 1080;
export const DESIGN_HEIGHT = 1920;
export const MAX_WAVES = 50;

export type Vec2 = { x: number; y: number };
export type TowerKind = 'machineGun' | 'coffee' | 'frost' | 'bomb' | 'tesla';
export type EnemyKind = 'yellow' | 'slacker' | 'overtime' | 'requirement' | 'boss';

export const pathPoints: Vec2[] = [
  { x: 253, y: 250 },
  { x: 258, y: 304 },
  { x: 266, y: 357 },
  { x: 297, y: 396 },
  { x: 355, y: 409 },
  { x: 414, y: 410 },
  { x: 472, y: 411 },
  { x: 527, y: 411 },
  { x: 583, y: 412 },
  { x: 637, y: 414 },
  { x: 691, y: 424 },
  { x: 726, y: 462 },
  { x: 729, y: 511 },
  { x: 725, y: 562 },
  { x: 701, y: 606 },
  { x: 654, y: 622 },
  { x: 599, y: 624 },
  { x: 549, y: 624 },
  { x: 499, y: 625 },
  { x: 448, y: 626 },
  { x: 394, y: 627 },
  { x: 346, y: 628 },
  { x: 298, y: 633 },
  { x: 255, y: 658 },
  { x: 242, y: 702 },
  { x: 238, y: 758 },
  { x: 259, y: 808 },
  { x: 310, y: 836 },
  { x: 365, y: 839 },
  { x: 422, y: 839 },
  { x: 479, y: 839 },
  { x: 537, y: 839 },
  { x: 593, y: 838 },
  { x: 652, y: 840 },
  { x: 709, y: 840 },
  { x: 766, y: 841 },
  { x: 823, y: 847 },
  { x: 872, y: 877 },
  { x: 879, y: 927 },
  { x: 884, y: 979 },
  { x: 870, y: 1024 },
  { x: 832, y: 1057 },
  { x: 778, y: 1060 },
  { x: 730, y: 1062 },
  { x: 680, y: 1063 },
  { x: 632, y: 1063 },
  { x: 581, y: 1062 },
  { x: 527, y: 1063 },
  { x: 473, y: 1062 },
  { x: 422, y: 1060 },
  { x: 371, y: 1063 },
  { x: 316, y: 1076 },
  { x: 289, y: 1119 },
  { x: 278, y: 1166 },
  { x: 279, y: 1214 },
  { x: 306, y: 1258 },
  { x: 352, y: 1281 },
  { x: 403, y: 1284 },
  { x: 454, y: 1284 },
  { x: 508, y: 1287 },
  { x: 566, y: 1287 },
  { x: 621, y: 1287 },
  { x: 677, y: 1287 },
  { x: 734, y: 1294 },
  { x: 769, y: 1327 },
  { x: 780, y: 1379 },
  { x: 775, y: 1430 },
  { x: 753, y: 1469 },
  { x: 713, y: 1492 },
];

export const buildSpots: Vec2[] = [
  { x: 600, y: 520 },
  { x: 360, y: 740 },
  { x: 771, y: 960 },
  { x: 406, y: 1180 },
  { x: 363, y: 520 },
  { x: 600, y: 733 },
  { x: 368, y: 948 },
  { x: 639, y: 1178 },
  { x: 876, y: 736 },
  { x: 895, y: 1178 },
];

export const towerConfigs = {
  machineGun: { name: '胶带机枪塔', price: 100, range: 245, damage: 14, fireRate: 0.14, color: '#f59e0b' },
  coffee: { name: '咖啡塔', price: 200, range: 235, damage: 16, fireRate: 0.26, color: '#f6b84a' },
  frost: { name: '冰冻塔', price: 120, range: 235, damage: 8, fireRate: 0.75, color: '#67e8f9' },
  bomb: { name: '炸弹塔', price: 150, range: 260, damage: 40, fireRate: 1.25, color: '#fb923c' },
  tesla: { name: '电磁塔', price: 180, range: 270, damage: 22, fireRate: 0.72, color: '#a78bfa' },
} satisfies Record<TowerKind, {
  name: string;
  price: number;
  range: number;
  damage: number;
  fireRate: number;
  color: string;
}>;

export const enemyConfigs = {
  yellow: { name: '小黄怪', hp: 42, speed: 98, reward: 8, damage: 1, radius: 22, color: '#facc15' },
  slacker: { name: '摸鱼怪', hp: 92, speed: 65, reward: 14, damage: 1, radius: 27, color: '#38bdf8' },
  overtime: { name: '加班怪', hp: 180, speed: 45, reward: 22, damage: 1, radius: 32, color: '#94a3b8' },
  requirement: { name: '需求怪', hp: 122, speed: 58, reward: 20, damage: 1, radius: 29, color: '#f472b6' },
  boss: { name: '老板 Boss', hp: 1120, speed: 53, reward: 90, damage: 3, radius: 52, color: '#f97316' },
} satisfies Record<EnemyKind, {
  name: string;
  hp: number;
  speed: number;
  reward: number;
  damage: number;
  radius: number;
  color: string;
}>;

export type SpriteFrame = { x: number; y: number; w: number; h: number; anchorY?: number };
export type EnemyAnimState = 'idle' | 'run' | 'hit' | 'death';
export type EnemySpriteAtlas = {
  fps: Record<EnemyAnimState, number>;
  frames: Record<EnemyAnimState, SpriteFrame[]>;
};

export const yellowMonsterSpriteAtlas = {
  image: 'yellow',
  fps: {
    idle: 5,
    run: 10,
    hit: 14,
    death: 8,
  },
  frames: {
    idle: [
      { x: 35, y: 836, w: 136, h: 126 },
      { x: 229, y: 823, w: 164, h: 144 },
    ],
    run: [
      { x: 0, y: 0, w: 260, h: 180 },
      { x: 260, y: 0, w: 260, h: 180 },
      { x: 520, y: 0, w: 260, h: 180 },
      { x: 780, y: 0, w: 260, h: 180 },
      { x: 1040, y: 0, w: 260, h: 180 },
      { x: 1300, y: 0, w: 260, h: 180 },
      { x: 1560, y: 0, w: 260, h: 180 },
    ],
    hit: [
      { x: 0, y: 0, w: 260, h: 180 },
      { x: 260, y: 0, w: 260, h: 180 },
      { x: 520, y: 0, w: 260, h: 180 },
      { x: 780, y: 0, w: 260, h: 180 },
      { x: 1040, y: 0, w: 260, h: 180 },
      { x: 1300, y: 0, w: 260, h: 180 },
      { x: 1560, y: 0, w: 260, h: 180 },
    ],
    death: [
      { x: 0, y: 0, w: 260, h: 180 },
      { x: 260, y: 0, w: 260, h: 180 },
      { x: 520, y: 0, w: 260, h: 180 },
      { x: 780, y: 0, w: 260, h: 180 },
      { x: 1040, y: 0, w: 260, h: 180 },
      { x: 1300, y: 0, w: 260, h: 180 },
      { x: 1560, y: 0, w: 260, h: 180 },
    ],
  },
} satisfies EnemySpriteAtlas & { image: 'yellow' };

export const slackerMonsterSpriteAtlas = {
  image: 'slacker',
  fps: {
    idle: 4,
    run: 7,
    hit: 14,
    death: 8,
  },
  frames: {
    idle: [
      { x: 0, y: 0, w: 260, h: 170 },
      { x: 260, y: 0, w: 260, h: 170 },
    ],
    run: [
      { x: 0, y: 0, w: 260, h: 170 },
      { x: 260, y: 0, w: 260, h: 170 },
      { x: 520, y: 0, w: 260, h: 170 },
      { x: 780, y: 0, w: 260, h: 170 },
      { x: 1040, y: 0, w: 260, h: 170 },
      { x: 1300, y: 0, w: 260, h: 170 },
      { x: 1560, y: 0, w: 260, h: 170 },
    ],
    hit: [
      { x: 0, y: 0, w: 260, h: 170 },
      { x: 260, y: 0, w: 260, h: 170 },
      { x: 520, y: 0, w: 260, h: 170 },
      { x: 780, y: 0, w: 260, h: 170 },
      { x: 1040, y: 0, w: 260, h: 170 },
      { x: 1300, y: 0, w: 260, h: 170 },
      { x: 1560, y: 0, w: 260, h: 170 },
    ],
    death: [
      { x: 0, y: 0, w: 260, h: 170 },
      { x: 260, y: 0, w: 260, h: 170 },
      { x: 520, y: 0, w: 260, h: 170 },
      { x: 780, y: 0, w: 260, h: 170 },
      { x: 1040, y: 0, w: 260, h: 170 },
      { x: 1300, y: 0, w: 260, h: 170 },
      { x: 1560, y: 0, w: 260, h: 170 },
    ],
  },
} satisfies EnemySpriteAtlas & { image: 'slacker' };

export const machineGunSpriteConfig = {
  frameWidth: 128,
  frameHeight: 128,
  directions: {
    front_left: {
      idle: { frameStart: 0, frameCount: 5, fps: 8 },
      attack: { frameStart: 5, frameCount: 5, fps: 16 },
    },
    front: {
      idle: { frameStart: 10, frameCount: 5, fps: 8 },
      attack: { frameStart: 15, frameCount: 5, fps: 16 },
    },
    front_right: {
      idle: { frameStart: 20, frameCount: 5, fps: 8 },
      attack: { frameStart: 25, frameCount: 5, fps: 16 },
    },
  },
};

export const titles = ['人类最后防线', '工位钉子户', '加班守门员', '差一点战神', '老板克星'];
