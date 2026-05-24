import { Vec2 } from '../game/config';

export type EffectKind = 'explosion' | 'muzzle' | 'coin' | 'leak' | 'bossWarning';

export class Effect {
  kind: EffectKind;
  pos: Vec2;
  life = 0;
  maxLife: number;
  text?: string;
  color: string;
  size: number;

  constructor(kind: EffectKind, pos: Vec2, options: { text?: string; color?: string; size?: number; maxLife?: number } = {}) {
    this.kind = kind;
    this.pos = { ...pos };
    this.text = options.text;
    this.color = options.color ?? '#fbbf24';
    this.size = options.size ?? 42;
    this.maxLife = options.maxLife ?? 0.55;
  }

  update(dt: number): void {
    this.life += dt;
    if (this.kind === 'coin') this.pos.y -= 95 * dt;
  }

  get done(): boolean {
    return this.life >= this.maxLife;
  }
}
