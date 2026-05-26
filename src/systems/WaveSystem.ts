import { EnemyKind, MAX_WAVES } from '../game/config';
import { Enemy } from '../entities/Enemy';

export type WavePressure = {
  label: string;
  hint: string;
  plan: Partial<Record<EnemyKind, number>>;
  spacing: number;
};

const wavePlans: WavePressure[] = [
  { label: '教学放水', hint: '先摆基础阵，看看怪从哪来', plan: { yellow: 7 }, spacing: 0.72 },
  { label: '高速冲脸', hint: '出口守不住就会噶', plan: { slacker: 12, yellow: 8 }, spacing: 0.34 },
  { label: '肉盾压线', hint: '刮痧阵型等死', plan: { overtime: 5, requirement: 3, yellow: 6 }, spacing: 0.52 },
  { label: '小怪成群', hint: '单点输出会崩', plan: { yellow: 34, slacker: 4 }, spacing: 0.24 },
  { label: 'Boss 检定', hint: '撑过去拿护盾', plan: { boss: 1, overtime: 3, slacker: 8, yellow: 10 }, spacing: 0.42 },
  { label: '高速密集', hint: '入口减速，出口补刀', plan: { slacker: 14, yellow: 20 }, spacing: 0.27 },
  { label: '肉盾带小怪', hint: '中段输出不够就穿线', plan: { overtime: 5, yellow: 18, requirement: 3 }, spacing: 0.44 },
  { label: '需求分裂', hint: '弯道要能炸开', plan: { requirement: 9, slacker: 8, yellow: 8 }, spacing: 0.38 },
  { label: '出口冲击', hint: '最后一段没补刀会被偷家', plan: { slacker: 16, overtime: 3, requirement: 4 }, spacing: 0.31 },
  { label: 'Boss 检定', hint: '过考就补一层护盾', plan: { boss: 1, overtime: 4, requirement: 5, slacker: 10 }, spacing: 0.4 },
  { label: '高速冲脸', hint: '慢不下来就直接结束', plan: { slacker: 15, yellow: 18 }, spacing: 0.27 },
  { label: '肉盾压线', hint: '主输出位置要够贪', plan: { overtime: 6, requirement: 4, yellow: 8 }, spacing: 0.46 },
  { label: '小怪成群', hint: 'AOE 放错位置会漏一串', plan: { yellow: 38, slacker: 6 }, spacing: 0.23 },
  { label: '需求分裂', hint: '别让分裂怪死在出口前', plan: { requirement: 10, yellow: 12, slacker: 6 }, spacing: 0.36 },
  { label: 'Boss 检定', hint: '阵型不对，护盾也救不了下一波', plan: { boss: 1, overtime: 5, requirement: 5, slacker: 12 }, spacing: 0.38 },
  { label: '高速密集', hint: '减速覆盖要吃满弯道', plan: { slacker: 16, yellow: 22 }, spacing: 0.25 },
  { label: '肉盾带小怪', hint: '肉盾会挡住后排压力', plan: { overtime: 6, yellow: 22, requirement: 4 }, spacing: 0.42 },
  { label: '出口冲击', hint: '补刀塔现在就是命', plan: { slacker: 18, overtime: 4, requirement: 5 }, spacing: 0.29 },
  { label: '小怪成群', hint: '清场速度不够就满屏漏', plan: { yellow: 42, requirement: 6 }, spacing: 0.22 },
  { label: 'Boss 检定', hint: '最后一次阵型考试', plan: { boss: 1, overtime: 6, requirement: 6, slacker: 12, yellow: 12 }, spacing: 0.36 },
];

const spawnOrder: EnemyKind[] = ['yellow', 'slacker', 'yellow', 'overtime', 'yellow', 'requirement', 'slacker', 'yellow'];

export class WaveSystem {
  wave = 0;
  spawnQueue: EnemyKind[] = [];
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

    const kind = this.spawnQueue.shift()!;
    const enemy = new Enemy(this.nextEnemyId++, kind, this.wave, Math.random() * 28);
    this.spawnTimer = Math.max(0.12, this.getWavePressure(this.wave).spacing);
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

  private makeWave(wave: number): EnemyKind[] {
    const plan = this.getWavePressure(wave).plan;
    const remaining = { ...plan };
    const enemies: EnemyKind[] = [];

    for (let i = 0; i < (plan.boss ?? 0); i += 1) {
      enemies.push('boss');
    }
    remaining.boss = 0;

    while (Object.values(remaining).some((count) => (count ?? 0) > 0)) {
      for (const kind of spawnOrder) {
        if ((remaining[kind] ?? 0) <= 0) continue;
        enemies.push(kind);
        remaining[kind] = (remaining[kind] ?? 0) - 1;
      }
    }
    return enemies;
  }
}
