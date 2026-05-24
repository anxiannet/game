import { EnemyKind, MAX_WAVES } from '../game/config';
import { Enemy } from '../entities/Enemy';

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
    const enemies: EnemyKind[] = [];
    const count = wave <= 3 ? 6 + wave * 2 : 10 + wave * 3;
    if (wave % 10 === 0) enemies.push('boss');

    for (let i = 0; i < count; i += 1) {
      if (wave <= 3) enemies.push('yellow');
      else if (wave < 8) enemies.push(i % 4 === 0 ? 'slacker' : 'yellow');
      else if (wave < 15) enemies.push(i % 5 === 0 ? 'overtime' : i % 3 === 0 ? 'slacker' : 'yellow');
      else enemies.push(i % 6 === 0 ? 'requirement' : i % 5 === 0 ? 'overtime' : i % 2 === 0 ? 'slacker' : 'yellow');
    }
    return enemies;
  }
}
