import { Vec2 } from '../game/config';

export type EffectKind = 'explosion' | 'muzzle' | 'coin' | 'leak' | 'bossWarning' | 'floatingText' | 'spark' | 'frostRing' | 'coffeeSplash';
export type EffectVariant = 'damage' | 'critical' | 'coin' | 'warning' | 'machineGun' | 'coffee' | 'frost' | 'bomb' | 'tesla';

export class Effect {
  kind!: EffectKind;
  pos!: Vec2;
  life = 0;
  maxLife!: number;
  text?: string;
  color!: string;
  size!: number;
  variant?: EffectVariant;
  shake?: boolean;
  shakeApplied = false;
  offsetX = 0;

  constructor(kind: EffectKind, pos: Vec2, options: { text?: string; color?: string; size?: number; maxLife?: number; variant?: EffectVariant; shake?: boolean } = {}) {
    this.reset(kind, pos, options);
  }

  reset(kind: EffectKind, pos: Vec2, options: { text?: string; color?: string; size?: number; maxLife?: number; variant?: EffectVariant; shake?: boolean } = {}): void {
    this.kind = kind;
    this.pos = { ...pos };
    this.life = 0;
    this.text = options.text;
    this.color = options.color ?? '#fbbf24';
    this.size = options.size ?? 42;
    this.maxLife = options.maxLife ?? 0.55;
    this.variant = options.variant;
    this.shake = options.shake;
    this.shakeApplied = false;
    this.offsetX = (Math.random() - 0.5) * 54;
  }

  update(dt: number): void {
    this.life += dt;
    if (this.kind === 'coin' || this.kind === 'floatingText') this.pos.y -= 95 * dt;
  }

  get done(): boolean {
    return this.life >= this.maxLife;
  }
}
