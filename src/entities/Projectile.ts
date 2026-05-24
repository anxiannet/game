import { TowerKind, Vec2 } from '../game/config';

export class Projectile {
  kind: TowerKind;
  from: Vec2;
  to: Vec2;
  life = 0;
  maxLife: number;
  color: string;
  chain?: Vec2[];

  constructor(kind: TowerKind, from: Vec2, to: Vec2, color: string, maxLife = 0.18, chain?: Vec2[]) {
    this.kind = kind;
    this.from = { ...from };
    this.to = { ...to };
    this.color = color;
    this.maxLife = maxLife;
    this.chain = chain;
  }

  update(dt: number): void {
    this.life += dt;
  }

  get done(): boolean {
    return this.life >= this.maxLife;
  }
}
