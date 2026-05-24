export const DESIGN_WIDTH = 1080;
export const DESIGN_HEIGHT = 1920;
export const MAX_WAVES = 50;

export type Vec2 = { x: number; y: number };
export type TowerKind = 'machineGun' | 'frost' | 'bomb' | 'tesla' | 'flame';
export type EnemyKind = 'yellow' | 'slacker' | 'overtime' | 'requirement' | 'boss';

export const pathPoints: Vec2[] = [
  { x: 259, y: 284 },
  { x: 264, y: 350 },
  { x: 279, y: 403 },
  { x: 329, y: 428 },
  { x: 382, y: 435 },
  { x: 460, y: 437 },
  { x: 528, y: 437 },
  { x: 594, y: 438 },
  { x: 654, y: 441 },
  { x: 708, y: 460 },
  { x: 724, y: 510 },
  { x: 722, y: 553 },
  { x: 715, y: 595 },
  { x: 697, y: 626 },
  { x: 658, y: 644 },
  { x: 602, y: 649 },
  { x: 509, y: 648 },
  { x: 420, y: 649 },
  { x: 340, y: 649 },
  { x: 278, y: 663 },
  { x: 241, y: 706 },
  { x: 241, y: 756 },
  { x: 245, y: 806 },
  { x: 291, y: 840 },
  { x: 344, y: 848 },
  { x: 392, y: 850 },
  { x: 450, y: 852 },
  { x: 517, y: 855 },
  { x: 576, y: 856 },
  { x: 623, y: 856 },
  { x: 684, y: 856 },
  { x: 737, y: 857 },
  { x: 798, y: 860 },
  { x: 853, y: 877 },
  { x: 878, y: 919 },
  { x: 887, y: 979 },
  { x: 874, y: 1043 },
  { x: 828, y: 1061 },
  { x: 764, y: 1079 },
  { x: 707, y: 1080 },
  { x: 620, y: 1080 },
  { x: 550, y: 1078 },
  { x: 489, y: 1079 },
  { x: 416, y: 1077 },
  { x: 362, y: 1078 },
  { x: 310, y: 1098 },
  { x: 278, y: 1138 },
  { x: 289, y: 1186 },
  { x: 290, y: 1224 },
  { x: 305, y: 1259 },
  { x: 347, y: 1285 },
  { x: 402, y: 1288 },
  { x: 463, y: 1291 },
  { x: 510, y: 1293 },
  { x: 571, y: 1292 },
  { x: 634, y: 1293 },
  { x: 692, y: 1296 },
  { x: 753, y: 1312 },
  { x: 777, y: 1367 },
  { x: 774, y: 1422 },
  { x: 765, y: 1465 },
  { x: 736, y: 1487 },
];

export const buildSpots: Vec2[] = [
  { x: 263, y: 557 },
  { x: 482, y: 557 },
  { x: 535, y: 740 },
  { x: 758, y: 740 },
  { x: 345, y: 933 },
  { x: 636, y: 933 },
  { x: 492, y: 1210 },
  { x: 717, y: 1210 },
  { x: 894, y: 1210 },
];

export const towerConfigs = {
  machineGun: { name: '机枪塔', price: 100, range: 245, damage: 14, fireRate: 0.14, color: '#f59e0b' },
  frost: { name: '冰冻塔', price: 120, range: 235, damage: 8, fireRate: 0.75, color: '#67e8f9' },
  bomb: { name: '炸弹塔', price: 150, range: 260, damage: 40, fireRate: 1.25, color: '#fb923c' },
  tesla: { name: '电磁塔', price: 180, range: 270, damage: 22, fireRate: 0.72, color: '#a78bfa' },
  flame: { name: '火焰塔', price: 200, range: 210, damage: 8, fireRate: 0.16, color: '#ef4444' },
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
