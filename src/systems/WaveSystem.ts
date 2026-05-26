import { buildSpots, EnemyKind, enemyConfigs, MAX_WAVES, pathPoints, towerConfigs, Vec2 } from '../game/config';
import { Enemy } from '../entities/Enemy';

export type PressureType = 'highSpeed' | 'tank' | 'swarm' | 'chainPack' | 'mixed' | 'bossMix';

export type WavePressure = {
  label: string;
  hint: string;
  primary: PressureType;
  secondary: PressureType;
  testGoal: string;
  plan: Partial<Record<EnemyKind, number>>;
  spawnInterval: number;
  burstEvery: number;
  burstSize: number;
  instantHpPerSecond: number;
  expectedConcurrentEnemies: number;
};

type WaveSpawn = {
  kind: EnemyKind;
  delay: number;
};

type CoverageProfile = {
  pathLength: number;
  bestCoverage: number;
  averageCoverage: number;
  exitCoverage: number;
  machineGunDps: number;
  machineGunKillsPerSecondVsYellow: number;
};

const spawnOrders: Record<PressureType, EnemyKind[]> = {
  highSpeed: ['slacker', 'slacker', 'yellow', 'slacker', 'yellow'],
  tank: ['overtime', 'requirement', 'overtime', 'yellow'],
  swarm: ['yellow', 'yellow', 'yellow', 'slacker', 'yellow', 'yellow'],
  chainPack: ['requirement', 'yellow', 'slacker', 'requirement', 'yellow'],
  mixed: ['yellow', 'slacker', 'overtime', 'requirement', 'yellow', 'slacker'],
  bossMix: ['yellow', 'boss', 'slacker', 'yellow', 'overtime', 'requirement', 'yellow', 'slacker'],
};

const pressureSequence: Array<[PressureType, PressureType]> = [
  ['swarm', 'mixed'],
  ['highSpeed', 'mixed'],
  ['tank', 'chainPack'],
  ['swarm', 'highSpeed'],
  ['bossMix', 'swarm'],
  ['highSpeed', 'swarm'],
  ['tank', 'mixed'],
  ['chainPack', 'swarm'],
  ['highSpeed', 'tank'],
  ['bossMix', 'chainPack'],
  ['highSpeed', 'mixed'],
  ['tank', 'swarm'],
  ['swarm', 'chainPack'],
  ['chainPack', 'highSpeed'],
  ['bossMix', 'mixed'],
  ['highSpeed', 'swarm'],
  ['tank', 'chainPack'],
  ['highSpeed', 'tank'],
  ['swarm', 'mixed'],
  ['bossMix', 'swarm'],
];

function getPathLength(): number {
  let length = 0;
  for (let index = 0; index < pathPoints.length - 1; index += 1) {
    length += Math.hypot(pathPoints[index + 1].x - pathPoints[index].x, pathPoints[index + 1].y - pathPoints[index].y);
  }
  return length;
}

function getCoveredPathLength(spot: Vec2, range: number): number {
  let length = 0;
  const sampleStep = 8;
  for (let index = 0; index < pathPoints.length - 1; index += 1) {
    const a = pathPoints[index];
    const b = pathPoints[index + 1];
    const segmentLength = Math.hypot(b.x - a.x, b.y - a.y);
    const samples = Math.max(1, Math.ceil(segmentLength / sampleStep));
    for (let sample = 0; sample < samples; sample += 1) {
      const t = (sample + 0.5) / samples;
      const point = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      if (Math.hypot(point.x - spot.x, point.y - spot.y) <= range) {
        length += segmentLength / samples;
      }
    }
  }
  return length;
}

function makeCoverageProfile(): CoverageProfile {
  const machineGunRange = towerConfigs.machineGun.range;
  const coverage = buildSpots.map((spot) => getCoveredPathLength(spot, machineGunRange));
  const pathLength = getPathLength();
  return {
    pathLength,
    bestCoverage: Math.max(...coverage),
    averageCoverage: coverage.reduce((sum, item) => sum + item, 0) / coverage.length,
    exitCoverage: coverage[coverage.length - 1],
    machineGunDps: towerConfigs.machineGun.damage / towerConfigs.machineGun.fireRate,
    machineGunKillsPerSecondVsYellow: 1 / towerConfigs.machineGun.fireRate,
  };
}

const coverageProfile = makeCoverageProfile();

function getPlan(primary: PressureType, secondary: PressureType, wave: number): Partial<Record<EnemyKind, number>> {
  const tier = Math.floor((wave - 1) / 5);
  const pressureScale = 1 + tier * 0.16;
  const fastCoverageSeconds = coverageProfile.exitCoverage / enemyConfigs.slacker.speed;
  const swarmOverload = Math.ceil(coverageProfile.machineGunKillsPerSecondVsYellow * (1.75 + tier * 0.22));

  switch (primary) {
    case 'highSpeed':
      return {
        slacker: Math.round((10 + fastCoverageSeconds * 2.4 + tier * 3) * pressureScale),
        yellow: Math.round(6 + tier * 3),
      };
    case 'tank':
      return {
        overtime: Math.round(4 + tier * 1.6),
        requirement: Math.round(3 + tier * 1.2),
        yellow: Math.round(secondary === 'swarm' ? 10 + tier * 3 : 4 + tier),
      };
    case 'swarm':
      return {
        yellow: Math.round(swarmOverload * (3.6 + tier * 0.35)),
        slacker: Math.round(secondary === 'highSpeed' ? 8 + tier * 2 : 3 + tier),
      };
    case 'chainPack':
      return {
        requirement: Math.round(8 + tier * 2),
        yellow: Math.round(10 + tier * 3),
        slacker: Math.round(secondary === 'highSpeed' ? 8 + tier * 2 : 4 + tier),
      };
    case 'mixed':
      return {
        yellow: Math.round(12 + tier * 4),
        slacker: Math.round(7 + tier * 2),
        overtime: Math.round(3 + tier),
        requirement: Math.round(4 + tier),
      };
    case 'bossMix':
      return {
        boss: 1,
        yellow: Math.round(18 + tier * 5),
        slacker: Math.round(8 + tier * 2),
        overtime: Math.round(2 + tier),
        requirement: Math.round(3 + tier),
      };
  }
}

function getSpawnInterval(primary: PressureType, wave: number): number {
  const tier = Math.floor((wave - 1) / 5);
  const averageCoverageSeconds = coverageProfile.averageCoverage / enemyConfigs.yellow.speed;
  const base = {
    highSpeed: 0.18,
    tank: 0.58,
    swarm: 0.09,
    chainPack: 0.22,
    mixed: 0.28,
    bossMix: 0.18,
  }[primary];
  const coverageAdjustment = Math.max(0.78, Math.min(1.12, averageCoverageSeconds / 5.05));
  return Math.max(0.045, +(base * coverageAdjustment - tier * 0.012).toFixed(3));
}

function getBurst(primary: PressureType, wave: number): Pick<WavePressure, 'burstEvery' | 'burstSize'> {
  const tier = Math.floor((wave - 1) / 5);
  if (primary === 'swarm') return { burstEvery: Math.max(5, 7 - tier), burstSize: 3 + Math.min(tier, 2) };
  if (primary === 'highSpeed') return { burstEvery: 6, burstSize: 2 + Math.min(tier, 2) };
  if (primary === 'bossMix') return { burstEvery: 8, burstSize: 3 };
  if (primary === 'chainPack') return { burstEvery: 7, burstSize: 2 };
  return { burstEvery: 0, burstSize: 1 };
}

function getPressureCopy(primary: PressureType, secondary: PressureType): Pick<WavePressure, 'label' | 'hint' | 'testGoal'> {
  if (primary === 'highSpeed') return { label: '高速冲锋', hint: '入口减速，出口补刀', testGoal: '测试减速覆盖和终点补刀' };
  if (primary === 'tank') return { label: '肉盾压线', hint: '刮痧和纯 AOE 都会被顶穿', testGoal: '测试高单发持续输出' };
  if (primary === 'swarm') return { label: '怪海爆仓', hint: '单点塔会疯狂浪费火力', testGoal: '测试弯道 AOE 清场' };
  if (primary === 'chainPack') return { label: '中量群怪', hint: '分散站位不如电链吃香', testGoal: '测试电链覆盖和中密度清怪' };
  if (primary === 'bossMix') return { label: 'Boss 混编', hint: 'Boss 后面还跟着小怪', testGoal: '测试 AOE、单体、减速、补刀是否齐全' };
  return {
    label: '混合压力',
    hint: secondary === 'swarm' ? '没有清场会突然漏一串' : '阵型偏科会被抓短板',
    testGoal: '测试阵型平衡',
  };
}

function getInstantHpPerSecond(plan: Partial<Record<EnemyKind, number>>, spawnInterval: number): number {
  const totalCount = Object.values(plan).reduce((sum, count) => sum + (count ?? 0), 0);
  if (totalCount === 0) return 0;
  const averageHp = Object.entries(plan).reduce((sum, [kind, count]) => sum + enemyConfigs[kind as EnemyKind].hp * (count ?? 0), 0) / totalCount;
  return Math.round(averageHp / spawnInterval);
}

function getExpectedConcurrentEnemies(plan: Partial<Record<EnemyKind, number>>, spawnInterval: number): number {
  const totalCount = Object.values(plan).reduce((sum, count) => sum + (count ?? 0), 0);
  if (totalCount === 0) return 0;
  const averageSpeed = Object.entries(plan).reduce((sum, [kind, count]) => sum + enemyConfigs[kind as EnemyKind].speed * (count ?? 0), 0) / totalCount;
  const travelSeconds = coverageProfile.pathLength / averageSpeed;
  return Math.round(Math.min(totalCount, travelSeconds / spawnInterval));
}

function makeWavePlan(wave: number): WavePressure {
  const [primary, secondary] = pressureSequence[Math.max(0, Math.min(wave - 1, pressureSequence.length - 1))];
  const plan = getPlan(primary, secondary, wave);
  const spawnInterval = getSpawnInterval(primary, wave);
  return {
    ...getPressureCopy(primary, secondary),
    primary,
    secondary,
    plan,
    spawnInterval,
    ...getBurst(primary, wave),
    instantHpPerSecond: getInstantHpPerSecond(plan, spawnInterval),
    expectedConcurrentEnemies: getExpectedConcurrentEnemies(plan, spawnInterval),
  };
}

const wavePlans: WavePressure[] = Array.from({ length: MAX_WAVES }, (_, index) => makeWavePlan(index + 1));

export class WaveSystem {
  wave = 0;
  spawnQueue: WaveSpawn[] = [];
  spawnTimer = 0;
  nextEnemyId = 1;
  active = false;
  completed = false;

  startNextWave(): void {
    if (this.wave >= MAX_WAVES) {
      this.completed = true;
      return;
    }
    this.wave += 1;
    this.active = true;
    this.spawnQueue = this.makeWave(this.wave);
    this.spawnTimer = 0.1;
  }

  update(dt: number): Enemy[] {
    if (!this.active) return [];
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0 || this.spawnQueue.length === 0) return [];

    const spawn = this.spawnQueue.shift()!;
    const kind = spawn.kind;
    const enemy = new Enemy(this.nextEnemyId++, kind, this.wave, Math.random() * 28);
    this.spawnTimer = spawn.delay;
    if (this.spawnQueue.length === 0) this.active = false;
    return [enemy];
  }

  shouldAutoStart(enemiesAlive: number): boolean {
    return !this.active && enemiesAlive === 0 && !this.completed;
  }

  forceCompleteCurrentWave(): void {
    this.spawnQueue = [];
    this.active = false;
  }

  isBossWave(wave = this.wave): boolean {
    return (this.getWavePressure(wave).plan.boss ?? 0) > 0;
  }

  getWavePressure(wave: number): WavePressure {
    return wavePlans[Math.max(0, Math.min(wave - 1, wavePlans.length - 1))];
  }

  getWaveBrief(wave: number): string {
    const pressure = this.getWavePressure(wave);
    return `第${wave}波：${pressure.label}，${pressure.hint}`;
  }

  private makeWave(wave: number): WaveSpawn[] {
    const pressure = this.getWavePressure(wave);
    const plan = pressure.plan;
    const remaining = { ...plan };
    const enemies: WaveSpawn[] = [];
    const order = spawnOrders[pressure.primary];
    let spawned = 0;

    while (Object.values(remaining).some((count) => (count ?? 0) > 0)) {
      for (const kind of order) {
        if ((remaining[kind] ?? 0) <= 0) continue;
        enemies.push({ kind, delay: this.getSpawnDelay(pressure, spawned) });
        remaining[kind] = (remaining[kind] ?? 0) - 1;
        spawned += 1;
      }
    }
    return enemies;
  }

  private getSpawnDelay(pressure: WavePressure, spawned: number): number {
    if (pressure.burstEvery > 0 && spawned > 0 && spawned % pressure.burstEvery < pressure.burstSize - 1) {
      return Math.max(0.035, pressure.spawnInterval * 0.42);
    }
    return pressure.spawnInterval;
  }
}
