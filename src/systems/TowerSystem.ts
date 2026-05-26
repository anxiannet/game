import { Enemy } from '../entities/Enemy';
import { Effect, type EffectKind, type EffectVariant } from '../entities/Effect';
import { HitEffect } from '../entities/HitEffect';
import { Projectile } from '../entities/Projectile';
import { Tower } from '../entities/Tower';
import { towerConfigs } from '../game/config';
import { makeEffect } from '../game/effects/effectPool';
import { playBombExplosion, playEnemyHit, playTowerAttack } from '../game/effects/feedback';
import { spawnDamageText, type DamageText } from '../game/effects/proceduralEffects';
import { distance, inRange } from './CollisionSystem';

type AttackEffectOptions = {
  color?: string;
  size?: number;
  maxLife?: number;
  variant?: EffectVariant;
  shake?: boolean;
};

const MAX_ATTACK_EFFECTS = 46;
const MAX_HIT_EFFECTS = 34;
const SECONDARY_EFFECT_KINDS = new Set<EffectKind>(['spark', 'frostRing', 'steam', 'electricArc']);

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
      if (projectile.visualOnly) continue;

      const hitTarget = this.findBulletHit(projectile, enemies);
      if (!hitTarget) {
        if (projectile.done && projectile.kind === 'bomb' && projectile.target) projectile.hit?.(projectile.target);
        continue;
      }

      projectile.done = true;
      projectile.hit?.(hitTarget);
      if (projectile.kind !== 'bomb') {
        this.createHitEffect(hitEffects, { x: projectile.x, y: projectile.y }, projectile.kind);
      }
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
    this.addAttackEffect(effects, 'coffeeSplash', tower.pos, { color: '#f6b84a', size: tower.range * 0.32, maxLife: 0.42, variant: 'coffee' }, true);

    boostTargets.forEach((target, index) => {
      target.coffeeBoostTimer = Math.max(target.coffeeBoostTimer, 1.55 + tower.level * 0.18);
      target.coffeeBoostStrength = Math.max(target.coffeeBoostStrength, 0.2 + tower.level * 0.035);
      if (index < 3) {
        this.addAttackEffect(effects, 'steam', target.pos, { color: '#fde68a', size: 48 + target.level * 5, maxLife: 0.45, variant: 'coffee' });
      }
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
    const maxLife = tower.kind === 'bomb' ? 0.72 : tower.kind === 'coffee' ? 0.55 : 0.62;
    const speed = tower.kind === 'bomb' ? 0 : tower.kind === 'frost' ? 460 : 620;
    const bullet = new Projectile(tower.kind, muzzle, target.pos, cfg.color, maxLife, undefined, {
      angle: tower.angle,
      arcHeight: tower.kind === 'bomb' ? 138 : 0,
      damage: tower.damage,
      spin: tower.kind === 'bomb' ? (Math.random() > 0.5 ? 1 : -1) * (8 + Math.random() * 3) : 0,
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
    if (hitEffects.length >= MAX_HIT_EFFECTS && kind !== 'bomb') return;
    hitEffects.push(new HitEffect(pos, kind === 'machineGun' ? 0.18 : 0.22, kind));
  }

  private findBulletHit(projectile: Projectile, enemies: Enemy[]): Enemy | undefined {
    if (projectile.kind === 'bomb' && projectile.target?.targetable && projectile.life / projectile.maxLife >= 0.82) {
      if (distance(projectile.to, projectile.target.pos) <= projectile.target.radius + 92) return projectile.target;
    }
    if (projectile.target?.targetable && distance({ x: projectile.x, y: projectile.y }, projectile.target.pos) <= projectile.target.radius + 16) {
      return projectile.target;
    }
    return enemies.find((enemy) => enemy.targetable && distance({ x: projectile.x, y: projectile.y }, enemy.pos) <= enemy.radius + 12);
  }

  private applyBulletHit(tower: Tower, target: Enemy, enemies: Enemy[], effects: Effect[], damageTexts: DamageText[]): void {
    if (tower.kind === 'frost') {
      const fannedFire = target.burnTimer > 0;
      if (fannedFire) {
        target.fanTheFlames(1.65, 1.8);
        this.addAttackEffect(effects, 'heatWave', target.pos, { color: '#fb923c', size: target.radius + 44, maxLife: 0.28, variant: 'bomb' });
      }
      this.damageEnemy(target, tower.damage * (fannedFire ? 1.75 : 1), effects, damageTexts, fannedFire);
      let frostRings = 0;
      enemies.forEach((enemy) => {
        if (enemy.targetable && distance(enemy.pos, target.pos) < 95) {
          enemy.applySlow(1.45);
          if (enemy.burnTimer > 0) {
            enemy.fanTheFlames(1.45, 1.55);
            this.addAttackEffect(effects, 'heatWave', enemy.pos, { color: '#fb923c', size: enemy.radius + 28, maxLife: 0.22, variant: 'bomb' });
          }
          if (frostRings < 3) {
            frostRings += 1;
            this.addAttackEffect(effects, 'frostRing', enemy.pos, { color: '#67e8f9', size: enemy.radius + 16, maxLife: 0.3, variant: 'frost' });
          }
        }
      });
    } else if (tower.kind === 'bomb') {
      playBombExplosion(target.pos.x, target.pos.y, effects);
      this.addAttackEffect(effects, 'heatWave', target.pos, { color: '#fed7aa', size: 138, maxLife: 0.42, variant: 'bomb', shake: tower.level >= 3 }, true);
      let sparks = 0;
      enemies.forEach((enemy) => {
        if (enemy.targetable && distance(enemy.pos, target.pos) < 126) {
          this.damageEnemy(enemy, tower.damage, effects, damageTexts, tower.level >= 3);
          enemy.applyBurn(7 + tower.level * 2.5, 3.2 + tower.level * 0.45);
          if (sparks < 4) {
            sparks += 1;
            this.addAttackEffect(effects, 'spark', enemy.pos, { color: '#fb923c', size: enemy.radius + 14, maxLife: 0.2, variant: 'bomb' });
          }
        }
      });
    } else if (tower.kind === 'tesla') {
      const chain = enemies
        .filter((enemy) => enemy.targetable && distance(enemy.pos, target.pos) < 230)
        .sort((a, b) => distance(a.pos, target.pos) - distance(b.pos, target.pos))
        .slice(0, tower.level >= 3 ? 5 : 4);
      chain.forEach((enemy, index) => {
        this.damageEnemy(enemy, tower.damage * (1 - index * 0.16), effects, damageTexts);
        if (index < 3) {
          this.addAttackEffect(effects, 'electricArc', enemy.pos, { color: '#93c5fd', size: enemy.radius + 28, maxLife: 0.14 + index * 0.02, variant: 'tesla' });
        }
      });
    } else {
      this.damageEnemy(target, tower.damage, effects, damageTexts, Math.random() < 0.08);
      this.addAttackEffect(effects, 'spark', target.pos, { color: '#fde68a', size: 20, maxLife: 0.14, variant: 'machineGun' });
    }
  }

  private damageEnemy(enemy: Enemy, damage: number, effects: Effect[], damageTexts: DamageText[], critical = false): void {
    if (!enemy.targetable) return;
    enemy.takeDamage(damage);
    spawnDamageText(damageTexts, enemy, damage, critical);
    playEnemyHit(enemy, damage, effects, critical, false);
  }

  private addAttackEffect(effects: Effect[], kind: EffectKind, pos: { x: number; y: number }, options: AttackEffectOptions, important = false): void {
    const overBudget = effects.length >= MAX_ATTACK_EFFECTS;
    if (overBudget && !important) return;
    if (effects.length >= MAX_ATTACK_EFFECTS * 1.35 && SECONDARY_EFFECT_KINDS.has(kind)) return;
    effects.push(makeEffect(kind, pos, options));
  }
}
