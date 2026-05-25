import { EnemyKind, MAX_WAVES } from '../game/config';
import { Enemy } from '../entities/Enemy';

const wavePlans: Array<Partial<Record<EnemyKind, number>>> = [
  { yellow: 8 },
  { yellow: 11 },
  { yellow: 14 },
  { yellow: 14, slacker: 4 },
  { yellow: 15, slacker: 5, overtime: 1 },
  { yellow: 20, slacker: 8, overtime: 2 },
  { yellow: 18, slacker: 10, overtime: 4 },
  { yellow: 18, slacker: 10, overtime: 5, requirement: 2 },
  { yellow: 20, slacker: 12, overtime: 5, requirement: 3 },
  { boss: 1, yellow: 16, slacker: 10, overtime: 4, requirement: 2 },
  { yellow: 25, slacker: 16, overtime: 10, requirement: 6 },
  { yellow: 26, slacker: 18, overtime: 12, requirement: 7 },
  { yellow: 26, slacker: 20, overtime: 13, requirement: 8 },
  { yellow: 28, slacker: 20, overtime: 14, requirement: 9 },
  { boss: 1, yellow: 22, slacker: 16, overtime: 12, requirement: 8 },
  { yellow: 30, slacker: 22, overtime: 16, requirement: 12 },
  { yellow: 34, slacker: 24, overtime: 18, requirement: 13 },
  { yellow: 38, slacker: 26, overtime: 20, requirement: 14 },
  { yellow: 40, slacker: 28, overtime: 22, requirement: 16 },
  { boss: 2, yellow: 36, slacker: 28, overtime: 22, requirement: 18 },
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
    const pressure = this.wave >= 10 ? 0.46 : this.wave >= 4 ? 0.58 : 0.82;
    this.spawnTimer = Math.max(0.13, pressure - this.wave * 0.009);
    if (this.spawnQueue.length === 0) this.active = false;
    return [enemy];
  }

  shouldAutoStart(enemiesAlive: number): boolean {
    return !this.active && enemiesAlive === 0 && !this.completed;
  }

  private makeWave(wave: number): EnemyKind[] {
    const plan = wavePlans[wave - 1] ?? wavePlans[wavePlans.length - 1];
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
