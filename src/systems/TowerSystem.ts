import { Enemy } from '../entities/Enemy';
import { Effect } from '../entities/Effect';
import { HitEffect } from '../entities/HitEffect';
import { Projectile } from '../entities/Projectile';
import { Tower } from '../entities/Tower';
import { towerConfigs } from '../game/config';
import { makeEffect } from '../game/effects/effectPool';
import { playBombExplosion, playEnemyHit, playTowerAttack } from '../game/effects/feedback';
import { spawnDamageText, type DamageText } from '../game/effects/proceduralEffects';
import { distance, inRange } from './CollisionSystem';

export class TowerSystem {
  update(dt: number, towers: Tower[], enemies: Enemy[], projectiles: Projectile[], effects: Effect[], damageTexts: DamageText[], hitEffects: HitEffect[]): void {
    this.updateTowers(dt, towers, enemies, projectiles, effects, damageTexts);
    this.updateBullets(dt, projectiles, enemies, hitEffects);
    this.updateHitEffects(dt, hitEffects);
  }

  updateTowers(dt: number, towers: Tower[], enemies: Enemy[], projectiles: Projectile[], effects: Effect[], damageTexts: DamageText[]): void {
    for (const tower of towers) {
      tower.updateAnimation(dt);

      if (tower.kind === 'coffee') {
        this.updateCoffeeTower(dt, tower, towers, projectiles, effects);
        continue;
      }

      const target = this.pickTarget(tower, enemies);
      if (!target) {
        tower.target = null;
        tower.attackTarget = undefined;
        tower.easeHome(dt);
        continue;
      }

      tower.target = target;
      tower.aimAt(target.pos);
      tower.attackTarget = { ...target.pos };
      if (tower.attackTimer > 0) continue;

      tower.attackTimer = tower.fireRate;
      tower.recoil = 1;
      tower.recoilTime = 0.08;
      tower.muzzleTimer = 0.08;
      tower.state = 'attack';
      playTowerAttack(tower, target.pos.x, target.pos.y, effects);
      this.fireBullet(tower, target, enemies, projectiles, effects, damageTexts);
    }
  }

  updateBullets(dt: number, projectiles: Projectile[], enemies: Enemy[], hitEffects: HitEffect[]): void {
    for (const projectile of projectiles) {
      projectile.update(dt);
      if (projectile.done) continue;
      if (projectile.visualOnly) continue;

      const hitTarget = this.findBulletHit(projectile, enemies);
      if (!hitTarget) continue;

      projectile.done = true;
      projectile.hit?.(hitTarget);
      this.createHitEffect(hitEffects, { x: projectile.x, y: projectile.y }, projectile.kind);
    }
  }

  updateHitEffects(dt: number, hitEffects: HitEffect[]): void {
    hitEffects.forEach((effect) => effect.update(dt));
  }

  private pickTarget(tower: Tower, enemies: Enemy[]): Enemy | undefined {
    return enemies
      .filter((enemy) => enemy.targetable && inRange(tower.pos, enemy.pos, tower.range))
      .sort((a, b) => b.progress - a.progress)[0];
  }

  private updateCoffeeTower(dt: number, tower: Tower, towers: Tower[], projectiles: Projectile[], effects: Effect[]): void {
    const boostTargets = towers
      .filter((candidate) => candidate.id !== tower.id && candidate.kind !== 'coffee' && inRange(tower.pos, candidate.pos, tower.range))
      .sort((a, b) => distance(a.pos, tower.pos) - distance(b.pos, tower.pos))
      .slice(0, tower.level >= 3 ? 4 : 3);

    if (boostTargets.length === 0) {
      tower.target = null;
      tower.attackTarget = undefined;
      tower.easeHome(dt);
      return;
    }

    const primary = boostTargets[0];
    tower.target = null;
    tower.aimAt(primary.pos);
    tower.attackTarget = { ...primary.pos };
    if (tower.attackTimer > 0) return;

    tower.attackTimer = tower.fireRate;
    tower.recoil = 1;
    tower.recoilTime = 0.16;
    tower.muzzleTimer = 0.16;
    tower.state = 'attack';
    effects.push(makeEffect('coffeeSplash', tower.pos, { color: '#f6b84a', size: tower.range * 0.32, maxLife: 0.55, variant: 'coffee' }));

    boostTargets.forEach((target, index) => {
      target.coffeeBoostTimer = Math.max(target.coffeeBoostTimer, 1.55 + tower.level * 0.18);
      target.coffeeBoostStrength = Math.max(target.coffeeBoostStrength, 0.2 + tower.level * 0.035);
      effects.push(makeEffect('steam', target.pos, { color: '#fde68a', size: 48 + target.level * 5, maxLife: 0.68, variant: 'coffee' }));
      const from = {
        x: tower.x + Math.cos(tower.angle) * 54,
        y: tower.y + Math.sin(tower.angle) * 54,
      };
      projectiles.push(new Projectile('coffee', from, target.pos, '#f6b84a', 0.34 + index * 0.04, undefined, {
        angle: Math.atan2(target.y - tower.y, target.x - tower.x),
        speed: 0,
        visualOnly: true,
      }));
    });
  }

  fireBullet(tower: Tower, target: Enemy, enemies: Enemy[], projectiles: Projectile[], effects: Effect[], damageTexts: DamageText[]): void {
    const cfg = towerConfigs[tower.kind];
    const weaponLength = 74;
    const muzzle = {
      x: tower.x + Math.cos(tower.angle) * weaponLength,
      y: tower.y + Math.sin(tower.angle) * weaponLength,
    };
    const maxLife = tower.kind === 'bomb' ? 0.92 : tower.kind === 'coffee' ? 0.55 : 0.62;
    const speed = tower.kind === 'bomb' ? 430 : tower.kind === 'frost' ? 460 : 620;
    const bullet = new Projectile(tower.kind, muzzle, target.pos, cfg.color, maxLife, undefined, {
      angle: tower.angle,
      damage: tower.damage,
      speed,
      target,
      hit: (hitTarget) => this.applyBulletHit(tower, hitTarget, enemies, effects, damageTexts),
    });

    if (tower.kind === 'tesla') {
      const chain = enemies
        .filter((enemy) => enemy.targetable && distance(enemy.pos, target.pos) < 230)
        .sort((a, b) => distance(a.pos, target.pos) - distance(b.pos, target.pos))
        .slice(0, tower.level >= 3 ? 5 : 4);
      bullet.chain = chain.map((enemy) => enemy.pos);
    }
    projectiles.push(bullet);
  }

  createHitEffect(hitEffects: HitEffect[], pos: { x: number; y: number }, kind?: Tower['kind']): void {
    hitEffects.push(new HitEffect(pos, 0.25, kind));
  }

  private findBulletHit(projectile: Projectile, enemies: Enemy[]): Enemy | undefined {
    if (projectile.target?.targetable && distance({ x: projectile.x, y: projectile.y }, projectile.target.pos) <= projectile.target.radius + 16) {
      return projectile.target;
    }
    return enemies.find((enemy) => enemy.targetable && distance({ x: projectile.x, y: projectile.y }, enemy.pos) <= enemy.radius + 12);
  }

  private applyBulletHit(tower: Tower, target: Enemy, enemies: Enemy[], effects: Effect[], damageTexts: DamageText[]): void {
    if (tower.kind === 'frost') {
      this.damageEnemy(target, tower.damage, effects, damageTexts);
      enemies.forEach((enemy) => {
        if (enemy.targetable && distance(enemy.pos, target.pos) < 95) {
          enemy.applySlow(1.45);
          effects.push(makeEffect('frostRing', enemy.pos, { color: '#67e8f9', size: enemy.radius + 16, maxLife: 0.38, variant: 'frost' }));
        }
      });
    } else if (tower.kind === 'bomb') {
      playBombExplosion(target.pos.x, target.pos.y, effects);
      effects.push(makeEffect('heatWave', target.pos, { color: '#fed7aa', size: 138, maxLife: 0.52, variant: 'bomb', shake: tower.level >= 3 }));
      enemies.forEach((enemy) => {
        if (enemy.targetable && distance(enemy.pos, target.pos) < 126) this.damageEnemy(enemy, tower.damage, effects, damageTexts, tower.level >= 3);
      });
    } else if (tower.kind === 'tesla') {
      const chain = enemies
        .filter((enemy) => enemy.targetable && distance(enemy.pos, target.pos) < 230)
        .sort((a, b) => distance(a.pos, target.pos) - distance(b.pos, target.pos))
        .slice(0, tower.level >= 3 ? 5 : 4);
      chain.forEach((enemy, index) => {
        this.damageEnemy(enemy, tower.damage * (1 - index * 0.16), effects, damageTexts);
        effects.push(makeEffect('electricArc', enemy.pos, { color: '#93c5fd', size: enemy.radius + 28, maxLife: 0.18 + index * 0.03, variant: 'tesla' }));
      });
    } else {
      this.damageEnemy(target, tower.damage, effects, damageTexts, Math.random() < 0.08);
      effects.push(makeEffect('spark', target.pos, { color: '#fde68a', size: 20, maxLife: 0.18, variant: 'machineGun' }));
    }
  }

  private damageEnemy(enemy: Enemy, damage: number, effects: Effect[], damageTexts: DamageText[], critical = false): void {
    if (!enemy.targetable) return;
    enemy.takeDamage(damage);
    spawnDamageText(damageTexts, enemy, damage, critical);
    playEnemyHit(enemy, damage, effects, critical, false);
  }
}
