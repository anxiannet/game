import { EnemyAnimState, EnemyKind, Vec2, enemyConfigs, pathPoints, yellowMonsterSpriteAtlas } from '../game/config';

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
  dead = false;
  slowTimer = 0;
  burnTimer = 0;
  burnDps = 0;
  pauseTimer = 0;
  progress = 0;
  animTime = 0;
  hitTimer = 0;
  deathTimer = 0;
  rewardClaimed = false;
  facingX: 1 | -1 = 1;

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
  }

  update(dt: number): void {
    if (this.reachedBase) return;
    this.animTime += dt;

    if (this.dead) {
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
      this.takeDamage(this.burnDps * dt);
      if (this.dead) return;
    }
    if (this.slowTimer > 0) this.slowTimer -= dt;
    if (this.hitTimer > 0) this.hitTimer -= dt;

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
    if (this.dead) return;
    const wasReacting = this.hitTimer > 0;
    this.hp -= amount;
    this.hitTimer = Math.max(this.hitTimer, 0.18);
    if (!wasReacting) this.animTime = 0;
    if (this.hp <= 0) {
      this.dead = true;
      this.hp = 0;
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

  get animState(): EnemyAnimState {
    if (this.dead) return 'death';
    if (this.hitTimer > 0) return 'hit';
    if (this.pauseTimer > 0) return 'idle';
    return 'run';
  }

  get readyToRemove(): boolean {
    if (!this.dead) return false;
    const deathFrames = yellowMonsterSpriteAtlas.frames.death.length;
    return this.kind !== 'yellow' || this.deathTimer >= deathFrames / yellowMonsterSpriteAtlas.fps.death;
  }
}
