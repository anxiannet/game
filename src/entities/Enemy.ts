import { EnemyAnimState, EnemyKind, Vec2, enemyConfigs, pathPoints } from '../game/config';
import { animateHealthBar, updateEntityFeedback, updateHealthBar, type HealthBarState } from '../game/effects/animation';

export type EnemyState = 'move' | 'hit' | 'dying' | 'dead';

export class Enemy {
  id: number;
  kind: EnemyKind;
  pos: Vec2;
  hp: number;
  maxHp: number;
  speed: number;
  reward: number;
  damage: number;
  radius: number;
  color: string;
  pathIndex = 0;
  reachedBase = false;
  state: EnemyState = 'move';
  slowTimer = 0;
  burnTimer = 0;
  burnDps = 0;
  burnFanTimer = 0;
  burnFanMultiplier = 1;
  pauseTimer = 0;
  progress = 0;
  animTime = 0;
  hitTimer = 0;
  deathTimer = 0;
  rewardClaimed = false;
  facingX: 1 | -1 = 1;
  visualOffset: Vec2 = { x: 0, y: 0 };
  visualRotation = 0;
  shakeTimer = 0;
  shakeDuration = 0;
  shakeIntensity = 0;
  rotationIntensity = 0;
  flashTimer = 0;
  flashDuration = 0;
  flashColor = '#ffffff';
  flashAlpha = 0;
  healthBar: HealthBarState;
  rageFlashTimer = 0;
  smokeSpawned = false;
  readonly hitDuration = 0.12;
  readonly deathDuration = 0.45;
  private nextRageRatio = 0.8;

  constructor(id: number, kind: EnemyKind, wave: number, spawnOffset = 0) {
    const cfg = enemyConfigs[kind];
    const scale = 1 + wave * 0.08;
    this.id = id;
    this.kind = kind;
    this.pos = { x: pathPoints[0].x - spawnOffset, y: pathPoints[0].y };
    this.hp = Math.round(cfg.hp * scale);
    this.maxHp = this.hp;
    this.speed = cfg.speed * (1 + Math.min(wave, 35) * 0.01);
    this.reward = cfg.reward;
    this.damage = cfg.damage;
    this.radius = cfg.radius;
    this.color = cfg.color;
    this.healthBar = { value: this.hp, delayedValue: this.hp, maxValue: this.maxHp, showTimer: 0, fade: 1 };
  }

  update(dt: number): void {
    if (this.reachedBase) return;
    this.animTime += dt;
    updateEntityFeedback(this, dt, this.animTime * 6 + this.id * 1.73);
    updateHealthBar(this.healthBar, dt);
    if (this.rageFlashTimer > 0) this.rageFlashTimer -= dt;

    if (this.state === 'dying') {
      this.deathTimer += dt;
      if (this.deathTimer >= this.deathDuration) {
        this.state = 'dead';
        this.deathTimer = this.deathDuration;
      }
      return;
    }

    if (this.state === 'dead') {
      this.deathTimer += dt;
      return;
    }

    if (this.kind === 'slacker' && this.pauseTimer <= 0 && Math.random() < dt * 0.16) {
      this.pauseTimer = 0.45;
    }
    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      return;
    }

    if (this.burnTimer > 0) {
      this.burnTimer -= dt;
      this.takeDamage(this.burnDps * (this.burnFanTimer > 0 ? this.burnFanMultiplier : 1) * dt);
      if (this.hp <= 0) return;
    }
    if (this.burnFanTimer > 0) this.burnFanTimer -= dt;
    if (this.slowTimer > 0) this.slowTimer -= dt;
    if (this.hitTimer > 0) {
      this.hitTimer = Math.max(0, this.hitTimer - dt);
      if (this.hitTimer === 0 && this.state === 'hit') this.state = this.hp > 0 ? 'move' : 'dying';
    }

    const target = pathPoints[this.pathIndex + 1];
    if (!target) {
      this.reachedBase = true;
      return;
    }

    const dx = target.x - this.pos.x;
    const dy = target.y - this.pos.y;
    const dist = Math.hypot(dx, dy);
    if (Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy) * 0.55) {
      this.facingX = dx < 0 ? -1 : 1;
    }
    const moveSpeed = this.speed * (this.slowTimer > 0 ? 0.45 : 1);
    const step = moveSpeed * dt;
    if (step >= dist) {
      this.pos = { ...target };
      this.pathIndex += 1;
    } else {
      this.pos.x += (dx / dist) * step;
      this.pos.y += (dy / dist) * step;
    }
    const segmentLength = Math.hypot(target.x - pathPoints[this.pathIndex].x, target.y - pathPoints[this.pathIndex].y);
    const segmentProgress = segmentLength > 0 ? 1 - Math.min(dist / segmentLength, 1) : 0;
    this.progress = this.pathIndex + segmentProgress;
  }

  takeDamage(amount: number): void {
    if (this.state === 'dying' || this.state === 'dead') return;
    const wasReacting = this.hitTimer > 0;
    const oldHp = this.hp;
    this.hp -= amount;
    this.hitTimer = this.hitDuration;
    this.state = 'hit';
    animateHealthBar(this.healthBar, oldHp, Math.max(this.hp, 0), this.maxHp);
    if (!wasReacting) this.animTime = 0;
    if (this.kind === 'boss' && this.hp / this.maxHp <= this.nextRageRatio) {
      this.rageFlashTimer = 0.32;
      this.nextRageRatio -= 0.2;
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'dying';
      this.hitTimer = 0;
      this.animTime = 0;
      this.deathTimer = 0;
    }
  }

  applySlow(seconds: number): void {
    this.slowTimer = Math.max(this.slowTimer, seconds);
  }

  applyBurn(dps: number, seconds: number): void {
    this.burnDps = Math.max(this.burnDps, dps);
    this.burnTimer = Math.max(this.burnTimer, seconds);
  }

  fanTheFlames(seconds: number, multiplier: number): void {
    if (this.burnTimer <= 0) return;
    this.burnFanTimer = Math.max(this.burnFanTimer, seconds);
    this.burnFanMultiplier = Math.max(this.burnFanMultiplier, multiplier);
    this.burnTimer = Math.max(this.burnTimer, seconds);
  }

  get animState(): EnemyAnimState {
    if (this.state === 'dying' || this.state === 'dead') return 'death';
    if (this.state === 'hit') return 'hit';
    if (this.pauseTimer > 0) return 'idle';
    return 'run';
  }

  get dead(): boolean {
    return this.state === 'dead';
  }

  get targetable(): boolean {
    return this.state !== 'dying' && this.state !== 'dead' && !this.reachedBase;
  }

  get readyToRemove(): boolean {
    return this.state === 'dead';
  }
}
