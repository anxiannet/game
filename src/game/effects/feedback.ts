import { Enemy } from '../../entities/Enemy';
import { Effect } from '../../entities/Effect';
import { Tower } from '../../entities/Tower';
import { audioManager } from '../../lib/audioManager';
import { effectsConfig } from '../config/effectsConfig';
import { createExplosion, flashEntity, popText, shakeEntity } from './animation';
import { makeEffect } from './effectPool';

const MAX_MUZZLE_EFFECTS = 54;
const audioCooldowns = new Map<string, number>();

function playThrottled(soundId: string, cooldownMs: number): void {
  const now = performance.now();
  const last = audioCooldowns.get(soundId) ?? 0;
  if (now - last < cooldownMs) return;
  audioCooldowns.set(soundId, now);
  audioManager.play(soundId);
}

export function playEnemyHit(enemy: Enemy, damage: number, effects: Effect[], critical = false, showText = true): void {
  const isBoss = enemy.kind === 'boss';
  playThrottled(critical ? 'critical_hit' : damage > 35 ? 'hit_medium' : 'hit_light', 55);
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
  audioManager.play(enemy.kind === 'boss' ? 'boss_die' : 'enemy_die');
  effects.push(popText(`+${enemy.reward}`, enemy.pos.x, enemy.pos.y - enemy.radius * 1.5, {
    type: 'coin',
    color: '#facc15',
    size: 42,
  }));
}

export function playTowerAttack(tower: Tower, targetX: number, targetY: number, effects: Effect[]): void {
  if (tower.kind === 'machineGun') playThrottled('shell_drop', 140);
  if (tower.kind === 'tesla') playThrottled('wifi_shock', 120);
  if (tower.kind === 'frost') playThrottled('fan_slow', 180);
  tower.muzzleTimer = effectsConfig.muzzleFlashDuration;
  tower.attackTarget = { x: targetX, y: targetY };
  if (effects.length >= MAX_MUZZLE_EFFECTS) return;
  const colorByKind = {
    machineGun: '#facc15',
    coffee: '#f6b84a',
    frost: '#bfdbfe',
    bomb: '#fb923c',
    tesla: '#93c5fd',
  };
  effects.push(makeEffect('muzzle', tower.pos, { color: colorByKind[tower.kind], size: tower.kind === 'coffee' ? 42 : 30, maxLife: 0.14, variant: tower.kind }));
}

export function playBombExplosion(x: number, y: number, effects: Effect[]): void {
  audioManager.play('bomb_explode');
  effects.push(createExplosion(x, y, { radius: 112, color: '#fb923c', shake: true }));
}
