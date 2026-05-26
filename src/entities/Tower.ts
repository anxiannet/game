import { Enemy } from './Enemy';
import { MAX_TOWER_LEVEL, TowerKind, Vec2, machineGunSpriteConfig, sellConfig, towerConfigs } from '../game/config';

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
  attackTimer = 0;
  target: Enemy | null = null;
  angle = -Math.PI / 2;
  recoil = 0;
  recoilTime = 0;
  idleTime = 0;
  idleSeed: number;
  state: 'idle' | 'attack' = 'idle';
  muzzleTimer = 0;
  attackTarget?: Vec2;
  coffeeBoostTimer = 0;
  coffeeBoostStrength = 0;

  constructor(id: number, kind: TowerKind, pos: Vec2) {
    this.id = id;
    this.kind = kind;
    this.pos = pos;
    this.attackTimer = Math.random() * this.fireRate;
    this.idleSeed = id * 1.917 + pos.x * 0.013 + pos.y * 0.007;
  }

  get x(): number {
    return this.pos.x;
  }

  get y(): number {
    return this.pos.y;
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
    const levelRate = towerConfigs[this.kind].fireRate * Math.max(0.72, 1 - (this.level - 1) * 0.08);
    return levelRate * (this.coffeeBoostTimer > 0 ? Math.max(0.52, 1 - this.coffeeBoostStrength) : 1);
  }

  get upgradeCost(): number {
    if (this.level >= MAX_TOWER_LEVEL) return Infinity;
    return Math.round(this.price * (0.72 + this.level * 0.42));
  }

  get sellValue(): number {
    let spent = this.price;
    if (sellConfig.includeUpgradeCost) {
      for (let level = 1; level < this.level; level += 1) {
        spent += Math.round(this.price * (0.72 + level * 0.42));
      }
    }
    return Math.round(spent * sellConfig.refundRate);
  }

  updateAnimation(dt: number): void {
    this.animTime += dt;
    this.idleTime += dt;
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.muzzleTimer = Math.max(0, this.muzzleTimer - dt);
    this.recoilTime = Math.max(0, this.recoilTime - dt);
    this.coffeeBoostTimer = Math.max(0, this.coffeeBoostTimer - dt);
    if (this.coffeeBoostTimer <= 0) this.coffeeBoostStrength = 0;
    this.recoil = Math.max(0, this.recoil - dt * 12);
    this.state = this.recoil > 0.04 || this.recoilTime > 0 ? 'attack' : 'idle';
    this.animState = this.state;
  }

  aimAt(target: Vec2): void {
    const dx = target.x - this.pos.x;
    const dy = target.y - this.pos.y;
    this.angle = Math.atan2(dy, dx);
    if (dx < -55) this.direction = 'front_left';
    else if (dx > 55) this.direction = 'front_right';
    else this.direction = 'front';
  }

  easeHome(dt: number): void {
    const defaultAngle = -Math.PI / 2;
    const diff = Math.atan2(Math.sin(defaultAngle - this.angle), Math.cos(defaultAngle - this.angle));
    this.angle += diff * Math.min(1, dt * 1.8);
  }

  getMachineGunFrame(): number {
    const dir = machineGunSpriteConfig.directions[this.direction];
    const anim = dir[this.animState === 'attack' ? 'attack' : 'idle'];
    const frame = Math.floor(this.animTime * anim.fps) % anim.frameCount;
    return anim.frameStart + frame;
  }
}
