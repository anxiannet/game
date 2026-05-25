import { Enemy } from './Enemy';
import { TowerKind, Vec2 } from '../game/config';

export class Projectile {
  kind: TowerKind;
  from: Vec2;
  to: Vec2;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  damage: number;
  target: Enemy | null;
  life = 0;
  maxLife: number;
  color: string;
  chain?: Vec2[];
  visualOnly = false;
  hit?: (enemy: Enemy) => void;
  done = false;

  constructor(
    kind: TowerKind,
    from: Vec2,
    to: Vec2,
    color: string,
    maxLife = 0.18,
    chain?: Vec2[],
    options: { angle?: number; damage?: number; speed?: number; target?: Enemy; hit?: (enemy: Enemy) => void; visualOnly?: boolean } = {},
  ) {
    this.kind = kind;
    this.from = { ...from };
    this.to = { ...to };
    this.x = from.x;
    this.y = from.y;
    this.angle = options.angle ?? Math.atan2(to.y - from.y, to.x - from.x);
    const speed = options.speed ?? 0;
    this.vx = Math.cos(this.angle) * speed;
    this.vy = Math.sin(this.angle) * speed;
    this.damage = options.damage ?? 0;
    this.target = options.target ?? null;
    this.color = color;
    this.maxLife = maxLife;
    this.chain = chain;
    this.hit = options.hit;
    this.visualOnly = options.visualOnly ?? false;
  }

  update(dt: number): void {
    this.life += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.life >= this.maxLife) this.done = true;
  }
}
