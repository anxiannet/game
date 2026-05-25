import { Enemy } from '../../entities/Enemy';
import { Effect } from '../../entities/Effect';
import { Tower } from '../../entities/Tower';
import { effectsConfig } from '../config/effectsConfig';
import { createExplosion, flashEntity, popText, shakeEntity } from './animation';
import { makeEffect } from './effectPool';

export function playEnemyHit(enemy: Enemy, damage: number, effects: Effect[], critical = false, showText = true): void {
  const isBoss = enemy.kind === 'boss';
  shakeEntity(enemy, {
    duration: isBoss ? 0.22 : effectsConfig.enemyHitShakeDuration,
    intensity: isBoss ? effectsConfig.bossHitShakeIntensity : effectsConfig.enemyHitShakeIntensity,
    rotationIntensity: isBoss ? 0.12 : 0.075,
  });
  flashEntity(enemy, { color: isBoss ? '#fff7ed' : '#ffffff' });
  if (showText) {
    const text = critical ? `暴击 -${Math.round(damage)}` : `-${Math.round(damage)}`;
    effects.push(popText(text, enemy.pos.x, enemy.pos.y - enemy.radius * 1.8, {
      type: critical ? 'critical' : 'damage',
      color: critical ? '#f97316' : '#f8fafc',
      size: critical ? 52 : 38,
    }));
  }
}

export function playEnemyDeath(enemy: Enemy, effects: Effect[]): void {
  effects.push(popText(`+${enemy.reward}`, enemy.pos.x, enemy.pos.y - enemy.radius * 1.5, {
    type: 'coin',
    color: '#facc15',
    size: 42,
  }));
}

export function playTowerAttack(tower: Tower, targetX: number, targetY: number, effects: Effect[]): void {
  tower.attackTimer = effectsConfig.towerAttackDuration;
  tower.muzzleTimer = effectsConfig.muzzleFlashDuration;
  tower.attackTarget = { x: targetX, y: targetY };
  const colorByKind = {
    machineGun: '#facc15',
    coffee: '#f6b84a',
    frost: '#bfdbfe',
    bomb: '#fb923c',
    tesla: '#c4b5fd',
  };
  effects.push(makeEffect('muzzle', tower.pos, { color: colorByKind[tower.kind], size: tower.kind === 'coffee' ? 42 : 30, maxLife: 0.14, variant: tower.kind }));
}

export function playBombExplosion(x: number, y: number, effects: Effect[]): void {
  effects.push(createExplosion(x, y, { radius: 112, color: '#fb923c', shake: true }));
}
