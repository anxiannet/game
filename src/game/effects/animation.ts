import { Effect } from '../../entities/Effect';
import { effectsConfig } from '../config/effectsConfig';
import type { Vec2 } from '../config';
import { makeEffect } from './effectPool';

export type VisualEntity = {
  pos: Vec2;
  visualOffset?: Vec2;
  visualRotation?: number;
  shakeTimer?: number;
  shakeDuration?: number;
  shakeIntensity?: number;
  rotationIntensity?: number;
  flashTimer?: number;
  flashDuration?: number;
  flashColor?: string;
  flashAlpha?: number;
};

export type HealthBarState = {
  value: number;
  delayedValue: number;
  maxValue: number;
  showTimer: number;
  fade: number;
};

export function shakeEntity(
  entity: VisualEntity,
  options: { duration?: number; intensity?: number; rotationIntensity?: number; onComplete?: () => void } = {},
): void {
  entity.visualOffset ??= { x: 0, y: 0 };
  entity.visualRotation ??= 0;
  entity.shakeTimer = Math.max(entity.shakeTimer ?? 0, options.duration ?? effectsConfig.enemyHitShakeDuration);
  entity.shakeDuration = Math.max(entity.shakeDuration ?? 0, options.duration ?? effectsConfig.enemyHitShakeDuration);
  entity.shakeIntensity = Math.max(entity.shakeIntensity ?? 0, options.intensity ?? effectsConfig.enemyHitShakeIntensity);
  entity.rotationIntensity = Math.max(entity.rotationIntensity ?? 0, options.rotationIntensity ?? 0.08);
  if (options.onComplete) {
    window.setTimeout(options.onComplete, (options.duration ?? effectsConfig.enemyHitShakeDuration) * 1000);
  }
}

export function flashEntity(
  entity: VisualEntity,
  options: { duration?: number; color?: string; alpha?: number } = {},
): void {
  entity.flashTimer = Math.max(entity.flashTimer ?? 0, options.duration ?? effectsConfig.enemyFlashDuration);
  entity.flashDuration = Math.max(entity.flashDuration ?? 0, options.duration ?? effectsConfig.enemyFlashDuration);
  entity.flashColor = options.color ?? '#ffffff';
  entity.flashAlpha = options.alpha ?? effectsConfig.enemyFlashAlpha;
}

export function updateEntityFeedback(entity: VisualEntity, dt: number, phase = 0): void {
  entity.visualOffset ??= { x: 0, y: 0 };
  entity.visualRotation ??= 0;
  const idleY = Math.sin(phase) * 2.8;
  const idleX = Math.cos(phase * 0.7) * 1.4;
  const idleRotation = Math.sin(phase * 0.85) * 0.025;

  if ((entity.shakeTimer ?? 0) > 0) {
    entity.shakeTimer = Math.max(0, (entity.shakeTimer ?? 0) - dt);
    const duration = entity.shakeDuration || 0.001;
    const power = Math.min(entity.shakeTimer / duration, 1);
    entity.visualOffset.x = idleX + (Math.random() - 0.5) * (entity.shakeIntensity ?? 0) * power;
    entity.visualOffset.y = idleY + (Math.random() - 0.5) * (entity.shakeIntensity ?? 0) * 0.45 * power;
    entity.visualRotation = idleRotation + (Math.random() - 0.5) * (entity.rotationIntensity ?? 0) * power;
  } else {
    entity.shakeIntensity = 0;
    entity.rotationIntensity = 0;
    entity.visualOffset.x = idleX;
    entity.visualOffset.y = idleY;
    entity.visualRotation = idleRotation;
  }

  if ((entity.flashTimer ?? 0) > 0) entity.flashTimer = Math.max(0, (entity.flashTimer ?? 0) - dt);
}

export function popText(
  text: string,
  x: number,
  y: number,
  options: { type?: 'damage' | 'critical' | 'coin' | 'warning'; color?: string; size?: number } = {},
): Effect {
  return makeEffect('floatingText', { x, y }, {
    text,
    color: options.color,
    size: options.size,
    variant: options.type ?? 'damage',
    maxLife: effectsConfig.floatingTextDuration,
  });
}

export function createExplosion(
  x: number,
  y: number,
  options: { radius?: number; color?: string; duration?: number; shake?: boolean } = {},
): Effect {
  return makeEffect('explosion', { x, y }, {
    color: options.color ?? '#fb923c',
    size: options.radius ?? 100,
    maxLife: options.duration ?? effectsConfig.explosionDuration,
    shake: options.shake,
  });
}

export function animateHealthBar(healthBar: HealthBarState, oldValue: number, newValue: number, maxValue: number): void {
  healthBar.value = Math.max(0, newValue);
  healthBar.delayedValue = Math.max(healthBar.delayedValue || oldValue, oldValue, newValue);
  healthBar.maxValue = maxValue;
  healthBar.showTimer = 1;
  healthBar.fade = newValue <= 0 ? 0 : 1;
}

export function updateHealthBar(healthBar: HealthBarState, dt: number): void {
  const chase = dt / Math.max(effectsConfig.healthBarDelay, 0.01);
  healthBar.delayedValue += (healthBar.value - healthBar.delayedValue) * Math.min(chase, 1);
  healthBar.showTimer = Math.max(0, healthBar.showTimer - dt);
  if (healthBar.value <= 0) healthBar.fade = Math.max(0, healthBar.fade - dt * 3);
}

export class ScreenShake {
  private timer = 0;
  private duration = 0;
  private intensity = 0;

  screenShake(options: { duration?: number; intensity?: number } = {}): void {
    const duration = Math.min(options.duration ?? 0.16, 0.2);
    this.timer = Math.max(this.timer, duration);
    this.duration = Math.max(this.duration, duration);
    this.intensity = Math.max(this.intensity, options.intensity ?? effectsConfig.screenShakeIntensity);
  }

  update(dt: number): number {
    if (this.timer <= 0) {
      this.intensity = 0;
      this.duration = 0;
      return 0;
    }
    this.timer = Math.max(0, this.timer - dt);
    const power = this.duration > 0 ? this.timer / this.duration : 0;
    if (this.timer <= 0) this.intensity = 0;
    return this.intensity * power;
  }
}
