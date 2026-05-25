import { TowerKind, Vec2 } from '../game/config';

export class HitEffect {
  x: number;
  y: number;
  time = 0;
  duration: number;
  scale: number;
  alpha = 1;
  kind?: TowerKind;

  constructor(pos: Vec2, duration = 0.25, kind?: TowerKind) {
    this.x = pos.x;
    this.y = pos.y;
    this.duration = duration;
    this.scale = 1;
    this.kind = kind;
  }

  update(dt: number): void {
    this.time += dt;
    const t = Math.min(this.time / this.duration, 1);
    this.scale = 0.65 + t * 1.4;
    this.alpha = 1 - t;
  }

  get done(): boolean {
    return this.time >= this.duration;
  }
}
