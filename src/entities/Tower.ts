import { TowerKind, Vec2, machineGunSpriteConfig, towerConfigs } from '../game/config';

export type TowerDirection = 'front_left' | 'front' | 'front_right';
export type TowerAnimState = 'idle' | 'attack' | 'hit' | 'destroy';

export class Tower {
  id: number;
  kind: TowerKind;
  pos: Vec2;
  level = 1;
  cooldown = 0;
  direction: TowerDirection = 'front';
  animState: TowerAnimState = 'idle';
  animTime = 0;

  constructor(id: number, kind: TowerKind, pos: Vec2) {
    this.id = id;
    this.kind = kind;
    this.pos = pos;
  }

  get price(): number {
    return towerConfigs[this.kind].price;
  }

  get range(): number {
    return towerConfigs[this.kind].range * (1 + (this.level - 1) * 0.12);
  }

  get damage(): number {
    return towerConfigs[this.kind].damage * (1 + (this.level - 1) * 0.42);
  }

  get fireRate(): number {
    return towerConfigs[this.kind].fireRate * Math.max(0.72, 1 - (this.level - 1) * 0.08);
  }

  get upgradeCost(): number {
    return Math.round(this.price * (0.72 + this.level * 0.42));
  }

  get sellValue(): number {
    return Math.round(this.price * 0.65 + (this.level - 1) * this.price * 0.26);
  }

  updateAnimation(dt: number): void {
    this.animTime += dt;
    if (this.cooldown > this.fireRate * 0.55) this.animState = 'attack';
    else this.animState = 'idle';
  }

  aimAt(target: Vec2): void {
    const dx = target.x - this.pos.x;
    if (dx < -55) this.direction = 'front_left';
    else if (dx > 55) this.direction = 'front_right';
    else this.direction = 'front';
  }

  getMachineGunFrame(): number {
    const dir = machineGunSpriteConfig.directions[this.direction];
    const anim = dir[this.animState === 'attack' ? 'attack' : 'idle'];
    const frame = Math.floor(this.animTime * anim.fps) % anim.frameCount;
    return anim.frameStart + frame;
  }
}
