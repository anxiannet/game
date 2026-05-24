import { Enemy } from '../entities/Enemy';
import { Effect } from '../entities/Effect';
import { Projectile } from '../entities/Projectile';
import { Tower } from '../entities/Tower';
import { towerConfigs } from '../game/config';
import { distance, inRange } from './CollisionSystem';

export class TowerSystem {
  update(dt: number, towers: Tower[], enemies: Enemy[], projectiles: Projectile[], effects: Effect[]): void {
    for (const tower of towers) {
      tower.cooldown -= dt;
      tower.updateAnimation(dt);
      if (tower.cooldown > 0) continue;

      const target = this.pickTarget(tower, enemies);
      if (!target) continue;

      tower.aimAt(target.pos);
      tower.cooldown = tower.fireRate;
      this.fire(tower, target, enemies, projectiles, effects);
    }
  }

  private pickTarget(tower: Tower, enemies: Enemy[]): Enemy | undefined {
    return enemies
      .filter((enemy) => !enemy.dead && !enemy.reachedBase && inRange(tower.pos, enemy.pos, tower.range))
      .sort((a, b) => b.progress - a.progress)[0];
  }

  private fire(tower: Tower, target: Enemy, enemies: Enemy[], projectiles: Projectile[], effects: Effect[]): void {
    const cfg = towerConfigs[tower.kind];
    projectiles.push(new Projectile(tower.kind, tower.pos, target.pos, cfg.color));
    effects.push(new Effect('muzzle', tower.pos, { color: cfg.color, size: 28, maxLife: 0.12 }));

    if (tower.kind === 'frost') {
      target.takeDamage(tower.damage);
      enemies.forEach((enemy) => {
        if (distance(enemy.pos, target.pos) < 95) enemy.applySlow(1.45);
      });
    } else if (tower.kind === 'bomb') {
      effects.push(new Effect('explosion', target.pos, { color: '#fb923c', size: 98, maxLife: 0.42 }));
      enemies.forEach((enemy) => {
        if (distance(enemy.pos, target.pos) < 118) enemy.takeDamage(tower.damage);
      });
    } else if (tower.kind === 'tesla') {
      const chain = enemies
        .filter((enemy) => !enemy.dead && distance(enemy.pos, target.pos) < 210)
        .sort((a, b) => distance(a.pos, target.pos) - distance(b.pos, target.pos))
        .slice(0, 4);
      projectiles[projectiles.length - 1].chain = chain.map((enemy) => enemy.pos);
      chain.forEach((enemy, index) => enemy.takeDamage(tower.damage * (1 - index * 0.18)));
    } else if (tower.kind === 'flame') {
      enemies.forEach((enemy) => {
        const aligned = Math.abs(enemy.pos.y - tower.pos.y) < 85 && Math.abs(enemy.pos.x - tower.pos.x) < tower.range;
        if (aligned || distance(enemy.pos, target.pos) < 90) {
          enemy.takeDamage(tower.damage);
          enemy.applyBurn(tower.damage * 1.6, 1.8);
        }
      });
    } else {
      target.takeDamage(tower.damage);
    }
  }
}
