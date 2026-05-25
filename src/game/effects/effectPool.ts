import { Effect, type EffectKind, type EffectVariant } from '../../entities/Effect';
import type { Vec2 } from '../config';

type EffectOptions = {
  text?: string;
  color?: string;
  size?: number;
  maxLife?: number;
  variant?: EffectVariant;
  shake?: boolean;
};

const pool: Effect[] = [];
const maxPoolSize = 160;

export function makeEffect(kind: EffectKind, pos: Vec2, options: EffectOptions = {}): Effect {
  const effect = pool.pop() ?? new Effect(kind, pos, options);
  effect.reset(kind, pos, options);
  return effect;
}

export function releaseEffect(effect: Effect): void {
  if (pool.length >= maxPoolSize) return;
  pool.push(effect);
}
