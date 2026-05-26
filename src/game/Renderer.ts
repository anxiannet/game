import { Enemy } from '../entities/Enemy';
import { Effect } from '../entities/Effect';
import { HitEffect } from '../entities/HitEffect';
import { Projectile } from '../entities/Projectile';
import { Tower } from '../entities/Tower';
import { assetManifest } from '../assets/assetManifest';
import { buildSpots, DESIGN_HEIGHT, DESIGN_WIDTH, MAX_TOWER_LEVEL, pathPoints, slackerMonsterSpriteAtlas, towerConfigs, yellowMonsterSpriteAtlas } from './config';
import type { EnemySpriteAtlas, SpriteFrame } from './config';
import { drawDamageTexts } from './effects/proceduralEffects';
import type { SmokeParticle } from './effects/proceduralEffects';
import type { GameSnapshot } from './Game';

type EnemySpriteFrames = {
  run: HTMLCanvasElement[];
  hit: HTMLCanvasElement[];
  death: HTMLCanvasElement[];
};

type TowerPartKey =
  | 'base'
  | 'weapon'
  | 'muzzleFlash'
  | 'bullet'
  | 'hitEffect'
  | 'machineGunTapeBase'
  | 'machineGunTapeWeapon'
  | 'machineGunTapeMuzzleFlash'
  | 'machineGunTapeBullet'
  | 'machineGunTapeHitEffect'
  | 'machineGunTapeIcon'
  | 'machineGunTapeLevel1'
  | 'machineGunTapeLevel2'
  | 'machineGunTapeLevel3'
  | 'coffeeTowerSheet'
  | 'coffeeTowerBase'
  | 'coffeeTowerWeapon'
  | 'coffeeTowerMuzzleFlash'
  | 'coffeeTowerBullet'
  | 'coffeeTowerHitEffect'
  | 'coffeeTowerIcon'
  | 'coffeeTowerLevel1'
  | 'coffeeTowerLevel2'
  | 'coffeeTowerLevel3'
  | 'fanSlowBase'
  | 'fanSlowWeapon'
  | 'fanSlowMuzzleFlash'
  | 'fanSlowBullet'
  | 'fanSlowHitEffect'
  | 'fanSlowIcon'
  | 'fanSlowLevel1'
  | 'fanSlowLevel2'
  | 'fanSlowLevel3'
  | 'microwaveTowerLevel1'
  | 'microwaveTowerLevel2'
  | 'microwaveTowerLevel3'
  | 'wifiTowerLevel1'
  | 'wifiTowerLevel2'
  | 'wifiTowerLevel3';

type EffectImageKey = keyof typeof assetManifest.effects;

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private mapImage = new Image();
  private mapReady = false;
  private enemyImages: Partial<Record<keyof typeof assetManifest.enemies, HTMLImageElement>> = {};
  private enemyReady: Partial<Record<keyof typeof assetManifest.enemies, boolean>> = {};
  private towerPartImages: Partial<Record<TowerPartKey, HTMLImageElement>> = {};
  private towerPartReady: Partial<Record<TowerPartKey, boolean>> = {};
  private effectImages: Partial<Record<EffectImageKey, HTMLImageElement>> = {};
  private effectReady: Partial<Record<EffectImageKey, boolean>> = {};
  private outlinedImageCache: Record<string, HTMLCanvasElement> = {};
  private specialTowerImages: Partial<Record<'bomb' | 'tesla', HTMLImageElement>> = {};
  private specialTowerReady: Partial<Record<'bomb' | 'tesla', boolean>> = {};
  private yellowMonsterRunFrames?: HTMLCanvasElement[];
  private yellowMonsterHitFrames?: HTMLCanvasElement[];
  private yellowMonsterDeathFrames?: HTMLCanvasElement[];
  private slackerMonsterRunFrames?: HTMLCanvasElement[];
  private slackerMonsterHitFrames?: HTMLCanvasElement[];
  private slackerMonsterDeathFrames?: HTMLCanvasElement[];
  private fps = 0;
  private fpsFrames = 0;
  private fpsLastTime = performance.now();

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.mapImage.onload = () => {
      this.mapReady = true;
    };
    this.mapImage.src = assetManifest.maps.industrial;
    this.loadEnemyImages();
    this.loadTowerPartImages();
    this.loadEffectImages();
    this.loadSpecialTowerImages();
    this.resize();
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = DESIGN_WIDTH * dpr;
    this.canvas.height = DESIGN_HEIGHT * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  render(snapshot: GameSnapshot): void {
    const { ctx } = this;
    const shake = snapshot.shake;
    const time = performance.now();
    ctx.save();
    ctx.clearRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    this.drawBackground();
    if (!this.mapReady) this.drawPath();
    this.drawBuildSpots(snapshot);
    snapshot.towers.forEach((tower) => this.drawTower(tower, time));
    snapshot.enemies.forEach((enemy) => this.drawEnemy(ctx, enemy, time));
    snapshot.projectiles.forEach((projectile) => this.drawProjectile(projectile));
    snapshot.hitEffects.forEach((effect) => this.drawHitEffect(effect));
    this.drawImageParticles(snapshot.particles);
    drawDamageTexts(ctx, snapshot.damageTexts);
    snapshot.effects.forEach((effect, index) => {
      if (this.shouldDrawEffect(effect, index, snapshot.effects.length)) {
        this.drawEffect(effect, snapshot.effects.length > 34);
      }
    });
    this.drawMonitorFps(time);
    if (snapshot.phase === 'playing') {
      snapshot.towers.forEach((tower) => {
        if (tower.level < MAX_TOWER_LEVEL && snapshot.coins >= tower.upgradeCost) this.drawTowerUpgradeHint(tower, time);
      });
    }
    if (!this.mapReady) this.drawBase(snapshot.baseHp);

    ctx.restore();
    if (snapshot.baseHp <= 3 && snapshot.phase === 'playing') this.drawAlert(snapshot.baseHp);
    if (snapshot.bossWarning > 0) this.drawBossWarning(snapshot.bossWarning);
    if (snapshot.bossIntro > 0) this.drawBossIntro(snapshot.bossIntro, snapshot.bossIntroTotal);
    this.drawBossHealth(snapshot.enemies);
  }

  private drawMonitorFps(time: number): void {
    this.fpsFrames += 1;
    const elapsed = time - this.fpsLastTime;
    if (elapsed >= 300) {
      this.fps = Math.round((this.fpsFrames * 1000) / elapsed);
      this.fpsFrames = 0;
      this.fpsLastTime = time;
    }

    const { ctx } = this;
    ctx.save();
    ctx.translate(540, 1394);
    ctx.rotate(-0.005);
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowColor = '#38d5ff';
    ctx.shadowBlur = 16;
    ctx.shadowBlur = 10;
    ctx.fillStyle = this.fps >= 50 ? '#86efac' : this.fps >= 35 ? '#fde68a' : '#fca5a5';
    ctx.font = '900 20px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this.fps} FPS`, 0, 0);
    ctx.restore();
  }

  private drawBackground(): void {
    const { ctx } = this;
    if (this.mapReady) {
      ctx.drawImage(this.mapImage, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
      ctx.fillStyle = 'rgba(5, 7, 10, 0.1)';
      ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
      return;
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
    gradient.addColorStop(0, '#1c1f26');
    gradient.addColorStop(1, '#101216');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 2;
    for (let y = 90; y < DESIGN_HEIGHT; y += 90) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(DESIGN_WIDTH, y + 30);
      ctx.stroke();
    }
    for (let x = 70; x < DESIGN_WIDTH; x += 130) {
      ctx.fillStyle = x % 260 === 70 ? 'rgba(251,146,60,0.08)' : 'rgba(148,163,184,0.06)';
      ctx.fillRect(x, 0, 4, DESIGN_HEIGHT);
    }
  }

  private drawPath(): void {
    const { ctx } = this;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 138;
    ctx.strokeStyle = '#252a32';
    this.strokePath();
    ctx.lineWidth = 104;
    ctx.strokeStyle = '#373d47';
    this.strokePath();
    ctx.lineWidth = 8;
    ctx.setLineDash([32, 28]);
    ctx.strokeStyle = 'rgba(251,191,36,0.28)';
    this.strokePath();
    ctx.setLineDash([]);
  }

  private strokePath(): void {
    const { ctx } = this;
    ctx.beginPath();
    pathPoints.forEach((point, index) => (index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
    ctx.stroke();
  }

  private drawBuildSpots(snapshot: GameSnapshot): void {
    const { ctx } = this;
    buildSpots.forEach((spot, index) => {
      const built = snapshot.towers.some((tower) => tower.pos.x === spot.x && tower.pos.y === spot.y);
      const selected = snapshot.selectedSpot === index;
      const pendingBuild = snapshot.selectedBuildKind !== undefined && !built;
      ctx.save();
      ctx.translate(spot.x, spot.y);
      ctx.fillStyle = selected ? 'rgba(251,191,36,0.32)' : pendingBuild ? 'rgba(56,213,255,0.16)' : 'rgba(15,23,42,0.2)';
      ctx.strokeStyle = built ? 'rgba(251,191,36,0.18)' : pendingBuild ? 'rgba(56,213,255,0.92)' : 'rgba(255,255,255,0.85)';
      ctx.lineWidth = selected || pendingBuild ? 8 : 5;
      ctx.setLineDash([18, 12]);
      ctx.beginPath();
      ctx.roundRect(-45, -45, 90, 90, 14);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      if (!built) {
        ctx.fillStyle = selected ? 'rgba(251,191,36,0.95)' : pendingBuild ? 'rgba(125,211,252,0.95)' : 'rgba(255,255,255,0.82)';
        ctx.fillRect(-21, -5, 42, 10);
        ctx.fillRect(-5, -21, 10, 42);
      }
      ctx.restore();
    });
  }

  private drawTower(tower: Tower, time: number): void {
    if (tower.kind === 'coffee') {
      this.drawCoffeeTower(tower);
      return;
    }
    if ((tower.kind === 'bomb' || tower.kind === 'tesla') && this.specialTowerReady[tower.kind]) {
      this.drawSpecialTower(tower, time);
      return;
    }

    const { ctx } = this;
    const cfg = towerConfigs[tower.kind];
    const idleOffsetY = Math.sin(time * 0.004 + tower.idleSeed) * 2;
    const idleScale = 1 + Math.sin(time * 0.003 + tower.idleSeed) * 0.025;
    const levelScale = this.getTowerLevelScale(tower) * this.getPartTowerVisualScale(tower);
    const attackShake = tower.state === 'attack' ? tower.recoil * 2.4 : 0;
    const shakeX = Math.sin(time * 0.075 + tower.idleSeed * 3.1) * attackShake;
    const shakeY = Math.cos(time * 0.067 + tower.idleSeed * 2.4) * attackShake;
    const baseX = tower.x + shakeX;
    const baseY = tower.y + idleOffsetY + shakeY;
    const recoilDistance = tower.recoil * 8;
    const weaponX = tower.x - Math.cos(tower.angle) * recoilDistance;
    const weaponY = tower.y + idleOffsetY - Math.sin(tower.angle) * recoilDistance;
    const jitter = tower.state === 'idle' ? Math.sin(time * 0.05 + tower.idleSeed) * 0.012 : Math.sin(time * 0.11 + tower.idleSeed) * 0.02;

    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.scale(idleScale * levelScale, idleScale * levelScale);
    if (tower.kind === 'machineGun' || tower.kind === 'frost') this.drawTowerReadabilityShadow(tower.state === 'attack' ? 0.82 : 0.72);
    this.drawTowerBase(tower);
    ctx.restore();

    ctx.save();
    ctx.translate(weaponX, weaponY);
    ctx.scale(levelScale, levelScale);
    ctx.rotate(tower.angle + jitter);
    this.drawTowerWeapon(tower);
    ctx.restore();

    this.drawMuzzleFlash(tower, idleOffsetY, levelScale);

    ctx.save();
    ctx.translate(tower.x, tower.y);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 24px system-ui';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = 5;
    ctx.strokeText(String(tower.level), 0, 62 * levelScale);
    ctx.fillText(String(tower.level), 0, 62 * levelScale);
    if (tower.level >= MAX_TOWER_LEVEL) {
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 2, levelScale * (54 + Math.sin(time * 0.006 + tower.idleSeed) * 3), 0, Math.PI * 2);
      ctx.stroke();
    }
    if (tower.coffeeBoostTimer > 0) this.drawCoffeeBoostBadge(tower, time);
    ctx.restore();
  }

  private drawTowerLevelImage(tower: Tower, time: number): boolean {
    const image = this.towerPartImages[this.getTowerLevelImageKey(tower)];
    if (!image) return false;

    const { ctx } = this;
    const cfg = towerConfigs[tower.kind];
    const ready = !!this.towerPartReady[this.getTowerLevelImageKey(tower)];
    if (!ready) return false;

    const attacking = tower.state === 'attack' || tower.recoilTime > 0;
    const levelScale = this.getTowerLevelScale(tower) * this.getPartTowerVisualScale(tower);
    const idlePulse = Math.sin(time * 0.0038 + tower.idleSeed);
    const idleBob = attacking ? 0 : idlePulse * 2.4;
    const attackKick = attacking ? Math.sin(Math.max(0, Math.min(1, 1 - tower.recoilTime / 0.16)) * Math.PI) : 0;
    const recoilX = attacking ? -Math.cos(tower.angle) * tower.recoil * 7 : 0;
    const recoilY = attacking ? -Math.sin(tower.angle) * tower.recoil * 7 : idleBob;
    const scale = levelScale * (attacking ? 1 + attackKick * 0.045 : 1 + idlePulse * 0.018);
    const drawSize = 166;

    ctx.save();
    ctx.translate(tower.x + recoilX, tower.y + recoilY);
    ctx.scale(scale, scale);
    this.drawTowerReadabilityShadow(attacking ? 0.78 : 0.66);
    ctx.shadowColor = cfg.color;
    ctx.shadowBlur = attacking ? 24 : 10 + (idlePulse + 1) * 4;
    this.drawImageWithOutline(image, -drawSize / 2, -drawSize + 58, drawSize, drawSize, 5, 0.72);

    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = attacking ? 0.22 + attackKick * 0.32 : 0.08 + (idlePulse + 1) * 0.04;
    ctx.fillStyle = cfg.color;
    ctx.beginPath();
    ctx.arc(Math.cos(tower.angle) * 26, -48 + Math.sin(tower.angle) * 16, attacking ? 34 + attackKick * 10 : 24 + idlePulse * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    this.drawMuzzleFlash(tower, idleBob, levelScale);
    this.drawTowerLevelText(tower, levelScale);

    ctx.save();
    ctx.translate(tower.x, tower.y);
    if (tower.coffeeBoostTimer > 0) this.drawCoffeeBoostBadge(tower, time);
    ctx.restore();
    return true;
  }

  private drawTowerLevelText(tower: Tower, scale = 1): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(tower.x, tower.y);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 24px system-ui';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = 5;
    ctx.strokeText(String(tower.level), 0, 62 * scale);
    ctx.fillText(String(tower.level), 0, 62 * scale);
    ctx.restore();
  }

  private drawCoffeeBoostBadge(tower: Tower, time: number): void {
    const { ctx } = this;
    const pulse = 0.7 + Math.sin(time * 0.014 + tower.id) * 0.22;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = `rgba(253,230,138,${pulse})`;
    ctx.lineWidth = 5;
    ctx.shadowColor = '#f6b84a';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, 2, 62 + Math.sin(time * 0.009 + tower.id) * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(246,184,74,${0.22 + pulse * 0.12})`;
    ctx.beginPath();
    ctx.arc(34, -44, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawTowerUpgradeHint(tower: Tower, time: number): void {
    const { ctx } = this;
    const pulse = 0.5 + Math.sin(time * 0.009 + tower.idleSeed) * 0.5;
    const y = -76 - pulse * 5;

    ctx.save();
    ctx.translate(tower.x + 48, tower.y + y);
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 14 + pulse * 10;

    ctx.fillStyle = '#050505';
    ctx.beginPath();
    ctx.roundRect(-31, -28, 62, 50, 12);
    ctx.fill();

    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(-27, -31, 54, 46, 11);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff7c2';
    ctx.beginPath();
    ctx.moveTo(0, -23);
    ctx.lineTo(18, -4);
    ctx.lineTo(8, -4);
    ctx.lineTo(8, 11);
    ctx.lineTo(-8, 11);
    ctx.lineTo(-8, -4);
    ctx.lineTo(-18, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff8e8';
    ctx.font = '900 14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeText('升级', 0, 25);
    ctx.fillText('升级', 0, 25);
    ctx.restore();
  }

  private drawSpecialTower(tower: Tower, time: number): void {
    const { ctx } = this;
    const image = tower.kind === 'bomb' || tower.kind === 'tesla' ? this.specialTowerImages[tower.kind] : undefined;
    if (!image) return;

    const cfg = towerConfigs[tower.kind];
    const idleOffsetY = Math.sin(time * 0.004 + tower.idleSeed) * 2;
    const levelScale = this.getTowerLevelScale(tower) * this.getPartTowerVisualScale(tower);
    const attackPulse = tower.state === 'attack' ? 1 + tower.recoil * 0.045 : 1;
    const attackShake = tower.state === 'attack' ? tower.recoil * 3 : 0;
    const drawSize = tower.kind === 'bomb' ? 164 : 172;

    ctx.save();
    ctx.translate(
      tower.x + Math.sin(time * 0.073 + tower.idleSeed * 3.1) * attackShake,
      tower.y + idleOffsetY + Math.cos(time * 0.061 + tower.idleSeed * 2.4) * attackShake,
    );
    ctx.scale(levelScale * attackPulse, levelScale * attackPulse);
    this.drawTowerReadabilityShadow(tower.state === 'attack' ? 0.72 : 0.62);
    ctx.shadowColor = cfg.color;
    ctx.shadowBlur = tower.state === 'attack' ? 28 : 14;
    this.drawImageWithOutline(image, -drawSize / 2, -drawSize + 58, drawSize, drawSize, 5, 0.75);
    ctx.restore();

    this.drawMuzzleFlash(tower, idleOffsetY, levelScale);
    this.drawTowerLevelText(tower, levelScale);
    ctx.save();
    ctx.translate(tower.x, tower.y);
    if (tower.coffeeBoostTimer > 0) this.drawCoffeeBoostBadge(tower, time);
    ctx.restore();
  }

  private getTowerLevelScale(tower: Tower): number {
    if (tower.level >= MAX_TOWER_LEVEL) return 0.99;
    return 0.94 + (tower.level - 1) * 0.045;
  }

  private drawTowerBase(tower: Tower): void {
    const { ctx } = this;
    const cfg = towerConfigs[tower.kind];
    const image = this.getTowerPartImage(tower, 'base');
    const ready = this.isTowerPartReady(tower, 'base');

    ctx.shadowColor = cfg.color;
    ctx.shadowBlur = tower.kind === 'machineGun' ? 4 : tower.state === 'attack' ? 20 : 12;
    if (ready && image) {
      if (tower.kind === 'machineGun') {
        this.drawImageWithOutline(image, -76, -72, 152, 124, 6, 0.72);
      } else if (tower.kind === 'frost') {
        this.drawImageWithOutline(image, -72, -58, 144, 116, 5, 0.7);
      } else {
        ctx.drawImage(image, -64, -58, 128, 116);
      }
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = tower.kind === 'machineGun' ? 0.08 : 0.28;
      ctx.fillStyle = cfg.color;
      ctx.beginPath();
      ctx.arc(0, -8, 23, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      return;
    }

    ctx.fillStyle = '#20242b';
    ctx.strokeStyle = '#05070a';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.roundRect(-50, -38, 100, 76, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = cfg.color;
    ctx.beginPath();
    ctx.arc(0, -6, tower.kind === 'bomb' ? 30 : 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  private drawTowerWeapon(tower: Tower): void {
    const { ctx } = this;
    const cfg = towerConfigs[tower.kind];
    const image = this.getTowerPartImage(tower, 'weapon');
    const ready = this.isTowerPartReady(tower, 'weapon');
    const scaleY = tower.kind === 'bomb' ? 1.18 : tower.kind === 'tesla' ? 0.9 : 1;

    ctx.shadowColor = cfg.color;
    ctx.shadowBlur = tower.kind === 'machineGun' ? 5 : tower.state === 'attack' ? 24 : 12;
    if (ready && image) {
      ctx.scale(1, scaleY);
      if (tower.kind === 'machineGun') {
        this.drawImageWithOutline(image, -50, -37, 158, 76, 5, 0.76);
      } else if (tower.kind === 'frost') {
        this.drawImageWithOutline(image, -48, -66, 148, 132, 5, 0.74);
      } else {
        ctx.drawImage(image, -30, -25, 100, 50);
      }
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = tower.kind === 'machineGun' ? 0.1 : 0.32;
      ctx.fillStyle = cfg.color;
      ctx.fillRect(16, -7, 42, 14);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      return;
    }

    ctx.fillStyle = '#111827';
    ctx.strokeStyle = '#05070a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(-22, -16, 84, 32, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = cfg.color;
    ctx.fillRect(36, -8, 30, 16);
  }

  private drawMuzzleFlash(tower: Tower, idleOffsetY: number, towerScale: number): void {
    if (tower.recoilTime <= 0) return;

    const { ctx } = this;
    const image = this.getTowerPartImage(tower, 'muzzleFlash');
    const ready = this.isTowerPartReady(tower, 'muzzleFlash');
    const weaponLength = (tower.kind === 'machineGun' ? 56 : 74) * towerScale;
    const t = 1 - tower.recoilTime / 0.08;
    const scale = 1.2 - t * 0.8;
    const alpha = 1 - t;
    const muzzleX = tower.x + Math.cos(tower.angle) * weaponLength;
    const muzzleY = tower.y + idleOffsetY + Math.sin(tower.angle) * weaponLength;

    ctx.save();
    ctx.translate(muzzleX, muzzleY);
    ctx.rotate(tower.angle);
    ctx.globalAlpha = alpha;
    ctx.scale(scale * towerScale, scale * towerScale);
    ctx.globalCompositeOperation = 'screen';
    if (ready && image) {
      if (tower.kind === 'machineGun') {
        ctx.drawImage(image, -18, -28, 66, 56);
      } else if (tower.kind === 'frost') {
        ctx.drawImage(image, -18, -38, 86, 76);
      } else {
        ctx.drawImage(image, -14, -24, 52, 48);
      }
    }
    ctx.restore();
  }

  private drawTowerReadabilityShadow(alpha: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#05070a';
    ctx.beginPath();
    ctx.ellipse(0, 28, 112, 42, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private getPartTowerVisualScale(tower: Tower): number {
    if (tower.kind === 'machineGun') return 0.84;
    if (tower.kind === 'frost') return 0.86;
    if (tower.kind === 'coffee' || tower.kind === 'bomb' || tower.kind === 'tesla') return 0.84;
    return 1;
  }

  private drawImageWithOutline(image: HTMLImageElement, x: number, y: number, width: number, height: number, outline = 6, alpha = 0.72): void {
    const { ctx } = this;
    const cached = this.getOutlinedImage(image, width, height, outline, alpha);
    if (cached) {
      const pad = Math.ceil(outline * 1.5);
      ctx.drawImage(cached, x - pad, y - pad);
      return;
    }

    const offsets = [
      [-outline, 0],
      [outline, 0],
      [0, -outline],
      [0, outline],
      [-outline * 0.7, -outline * 0.7],
      [outline * 0.7, -outline * 0.7],
      [-outline * 0.7, outline * 0.7],
      [outline * 0.7, outline * 0.7],
    ];

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.globalAlpha = alpha;
    ctx.filter = 'brightness(0) saturate(0)';
    offsets.forEach(([dx, dy]) => ctx.drawImage(image, x + dx, y + dy, width, height));
    ctx.restore();

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.drawImage(image, x, y, width, height);
    ctx.restore();
  }

  private getOutlinedImage(image: HTMLImageElement, width: number, height: number, outline: number, alpha: number): HTMLCanvasElement | undefined {
    if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) return undefined;

    const drawWidth = Math.ceil(width);
    const drawHeight = Math.ceil(height);
    const pad = Math.ceil(outline * 1.5);
    const key = `${image.src}|${drawWidth}x${drawHeight}|${outline}|${alpha}`;
    const cached = this.outlinedImageCache[key];
    if (cached) return cached;

    const canvas = document.createElement('canvas');
    canvas.width = drawWidth + pad * 2;
    canvas.height = drawHeight + pad * 2;
    const cacheCtx = canvas.getContext('2d');
    if (!cacheCtx) return undefined;

    const offsets = [
      [-outline, 0],
      [outline, 0],
      [0, -outline],
      [0, outline],
      [-outline * 0.7, -outline * 0.7],
      [outline * 0.7, -outline * 0.7],
      [-outline * 0.7, outline * 0.7],
      [outline * 0.7, outline * 0.7],
    ];

    cacheCtx.globalAlpha = alpha;
    cacheCtx.filter = 'brightness(0) saturate(0)';
    offsets.forEach(([dx, dy]) => cacheCtx.drawImage(image, pad + dx, pad + dy, drawWidth, drawHeight));
    cacheCtx.globalAlpha = 1;
    cacheCtx.filter = 'none';
    cacheCtx.drawImage(image, pad, pad, drawWidth, drawHeight);

    this.outlinedImageCache[key] = canvas;
    return canvas;
  }

  private drawCoffeeTower(tower: Tower): void {
    const { ctx } = this;
    const image = this.towerPartImages.coffeeTowerSheet;
    if (!this.towerPartReady.coffeeTowerSheet || !image) return;

    const frameWidth = image.naturalWidth / 4;
    const frameHeight = image.naturalHeight / 2;
    const attacking = tower.recoilTime > 0;
    const attackProgress = attacking ? 1 - tower.recoilTime / 0.16 : 0;
    const frame = attacking ? 4 : 0;
    const sx = (frame % 4) * frameWidth;
    const sy = Math.floor(frame / 4) * frameHeight;
    const drawHeight = 178;
    const drawWidth = drawHeight * (frameWidth / frameHeight);
    const idlePulse = Math.sin(tower.animTime * 3.2 + tower.idleSeed);
    const idleBob = attacking ? 0 : idlePulse * 2.4;
    const attackKick = Math.sin(attackProgress * Math.PI);
    const levelScale = this.getTowerLevelScale(tower) * this.getPartTowerVisualScale(tower);
    const scale = levelScale * (attacking ? 1 + attackKick * 0.045 : 1 + idlePulse * 0.018);
    const recoilX = attacking ? -Math.cos(tower.angle) * tower.recoil * 5 : 0;
    const recoilY = attacking ? -Math.sin(tower.angle) * tower.recoil * 5 : idleBob;
    const glow = attacking ? 20 : 10 + (idlePulse + 1) * 4;

    ctx.save();
    ctx.translate(tower.pos.x + recoilX, tower.pos.y + recoilY);
    ctx.scale(scale, scale);
    ctx.shadowColor = '#f6b84a';
    ctx.shadowBlur = glow;
    ctx.drawImage(image, sx, sy, frameWidth, frameHeight, -drawWidth / 2, -drawHeight + 62, drawWidth, drawHeight);
    if (attacking) {
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.28 + attackKick * 0.32;
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath();
      ctx.ellipse(Math.cos(tower.angle) * 34, -48 + Math.sin(tower.angle) * 18, 34 + attackKick * 12, 18 + attackKick * 8, tower.angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.12 + (idlePulse + 1) * 0.04;
      ctx.fillStyle = '#f6b84a';
      ctx.beginPath();
      ctx.arc(0, -52, 34 + idlePulse * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    this.drawTowerLevelText(tower, levelScale);
    if (tower.coffeeBoostTimer > 0) {
      ctx.save();
      ctx.translate(tower.x, tower.y);
      this.drawCoffeeBoostBadge(tower, performance.now());
      ctx.restore();
    }
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number): void {
    const image = this.enemyImages[enemy.kind];
    const ready = this.enemyReady[enemy.kind] && image;
    const clock = time / 1000;
    const bob = enemy.state === 'move' || enemy.state === 'hit'
      ? Math.sin(clock * 10 + enemy.id * 0.6) * (enemy.kind === 'boss' ? 2.2 : 4.2)
      : 0;
    const hitT = enemy.state === 'hit' ? 1 - enemy.hitTimer / enemy.hitDuration : 1;
    const hitPulse = enemy.state === 'hit' ? Math.sin(Math.min(Math.max(hitT, 0), 1) * Math.PI) : 0;
    const deathT = enemy.state === 'dying' || enemy.state === 'dead' ? Math.min(enemy.deathTimer / enemy.deathDuration, 1) : 0;
    const deathEase = 1 - Math.pow(1 - deathT, 3);
    const offsetX = enemy.visualOffset.x - enemy.facingX * hitPulse * 8;
    const offsetY = enemy.visualOffset.y + bob - Math.sin(deathT * Math.PI) * 22 + deathEase * 12;
    const scale = (enemy.state === 'hit' ? 1 + hitPulse * 0.05 : 1) * (deathT > 0 ? Math.max(0.18, 1 - deathEase * 0.72) : 1);
    const alpha = deathT > 0 ? Math.max(0, 1 - deathEase) : 1;
    const rotation = enemy.visualRotation - enemy.facingX * hitPulse * 0.1 - enemy.facingX * Math.sin(deathT * Math.PI) * 0.22;
    const flashWhite = enemy.flashTimer > 0 && enemy.state !== 'dying' && enemy.state !== 'dead';
    const kindScale = enemy.kind === 'boss' ? 3.9 : enemy.kind === 'slacker' ? 4.05 : 4.1;
    const drawHeight = enemy.radius * kindScale;
    const drawWidth = ready ? drawHeight * (image.naturalWidth / image.naturalHeight) : enemy.radius * 2.1;

    ctx.save();
    ctx.translate(enemy.pos.x + offsetX, enemy.pos.y - enemy.radius * 0.85 + offsetY);
    ctx.rotate(rotation);
    ctx.scale(enemy.facingX > 0 ? -scale : scale, scale);
    ctx.globalAlpha = alpha;
    ctx.shadowColor = enemy.rageFlashTimer > 0 || flashWhite ? '#fef2f2' : enemy.color;
    ctx.shadowBlur = enemy.kind === 'boss' ? 24 : flashWhite ? 18 : 8;

    if (ready) {
      ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      if (flashWhite) {
        ctx.globalAlpha = Math.min(enemy.flashAlpha || 0.7, 0.82) * alpha;
        ctx.globalCompositeOperation = 'screen';
        ctx.filter = 'brightness(3) saturate(0)';
        ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.filter = 'none';
      }
    } else {
      this.drawFallbackEnemyBody(enemy, flashWhite);
    }
    ctx.restore();

    this.drawEnemyStatus(enemy, -enemy.radius * 2.9);
  }

  private drawFallbackEnemyBody(enemy: Enemy, flashWhite: boolean): void {
    const { ctx } = this;
    ctx.fillStyle = flashWhite ? '#ffffff' : enemy.color;
    ctx.strokeStyle = '#05070a';
    ctx.lineWidth = enemy.kind === 'boss' ? 9 : 6;
    ctx.beginPath();
    ctx.roundRect(-enemy.radius, -enemy.radius * 0.82, enemy.radius * 2, enemy.radius * 1.64, enemy.radius * 0.55);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-enemy.radius * 0.32, -enemy.radius * 0.1, 4, 0, Math.PI * 2);
    ctx.arc(enemy.radius * 0.32, -enemy.radius * 0.1, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSpriteEnemy(enemy: Enemy, atlas: EnemySpriteAtlas, frameSets: Partial<EnemySpriteFrames>): void {
    if (!frameSets.run || !frameSets.hit || !frameSets.death) return;
    const { ctx } = this;
    const state = enemy.animState;
    const frames = state === 'death'
      ? frameSets.death
      : state === 'hit'
        ? frameSets.hit
        : frameSets.run;
    const fps = atlas.fps[state];
    const frameIndex = state === 'death'
      ? Math.min(Math.floor(enemy.deathTimer * fps), frames.length - 1)
      : Math.floor(enemy.animTime * fps) % frames.length;
    const frame = frames[frameIndex];
    const facingLeft = enemy.facingX < 0;
    const drawHeight = enemy.radius * (state === 'death' ? 3.25 : state === 'hit' ? 3.7 : 3.95);
    const drawWidth = drawHeight * (frame.width / frame.height);

    ctx.save();
    ctx.translate(enemy.pos.x + enemy.visualOffset.x, enemy.pos.y + enemy.visualOffset.y);
    ctx.rotate(enemy.visualRotation);
    if (facingLeft) ctx.scale(-1, 1);
    ctx.shadowColor = enemy.hitTimer > 0 ? '#fef08a' : enemy.color;
    ctx.shadowBlur = enemy.hitTimer > 0 ? 12 : 4;
    ctx.drawImage(frame, -drawWidth / 2, -drawHeight + 9, drawWidth, drawHeight);
    if (enemy.hitTimer > 0 && !enemy.dead) {
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = enemy.flashTimer > 0 ? enemy.flashAlpha : Math.min(enemy.hitTimer * 2.5, 0.22);
      ctx.fillStyle = enemy.flashTimer > 0 ? enemy.flashColor : '#fde68a';
      ctx.beginPath();
      ctx.ellipse(0, -enemy.radius * 1.2, enemy.radius * 1.45, enemy.radius * 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    this.drawEnemyStatus(enemy, -enemy.radius * 4.05);
  }

  private drawFallbackEnemy(enemy: Enemy): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(enemy.pos.x + enemy.visualOffset.x, enemy.pos.y + enemy.visualOffset.y);
    ctx.rotate(enemy.visualRotation);
    ctx.globalAlpha = enemy.dead ? Math.max(0, 1 - enemy.deathTimer * 4) : 1;
    const deathScale = enemy.dead ? Math.max(0.2, 1 - enemy.deathTimer * 2.2) : 1;
    ctx.scale(deathScale, deathScale);
    ctx.shadowColor = enemy.rageFlashTimer > 0 ? '#fef2f2' : enemy.color;
    ctx.shadowBlur = enemy.kind === 'boss' ? 28 : 10;
    ctx.fillStyle = enemy.flashTimer > 0 ? enemy.flashColor : enemy.color;
    ctx.strokeStyle = '#05070a';
    ctx.lineWidth = enemy.kind === 'boss' ? 9 : 6;
    ctx.beginPath();
    ctx.roundRect(-enemy.radius, -enemy.radius * 0.82, enemy.radius * 2, enemy.radius * 1.64, enemy.radius * 0.55);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-enemy.radius * 0.32, -enemy.radius * 0.1, 4, 0, Math.PI * 2);
    ctx.arc(enemy.radius * 0.32, -enemy.radius * 0.1, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.drawEnemyStatus(enemy, -enemy.radius - 18);
  }

  private drawEnemyStatus(enemy: Enemy, barY: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(enemy.pos.x, enemy.pos.y);
    if (enemy.slowTimer > 0 && enemy.targetable) {
      this.drawSlowStatusEffect(enemy);
    }
    if (enemy.burnTimer > 0 && enemy.targetable) {
      const boosted = enemy.burnFanTimer > 0;
      ctx.fillStyle = boosted ? 'rgba(251,146,60,0.9)' : 'rgba(239,68,68,0.74)';
      ctx.shadowColor = boosted ? '#fb923c' : '#ef4444';
      ctx.shadowBlur = boosted ? 22 : 12;
      ctx.beginPath();
      ctx.arc(0, -enemy.radius * 2.05, boosted ? 11 : 8, 0, Math.PI * 2);
      ctx.fill();
      if (boosted) {
        ctx.strokeStyle = 'rgba(255,247,237,0.78)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -enemy.radius * 2.05, 17 + Math.sin(performance.now() / 55) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    const showBar = enemy.kind !== 'boss' && enemy.targetable && (enemy.hitTimer > 0 || enemy.healthBar.showTimer > 0 || enemy.hp < enemy.maxHp);
    if (showBar) {
      const barAlpha = enemy.healthBar.showTimer > 0 ? 1 : 0.35;
      const low = enemy.healthBar.value / enemy.healthBar.maxValue < 0.3;
      ctx.globalAlpha = barAlpha * (low ? 0.65 + Math.sin(performance.now() / 70) * 0.25 : 1);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#111827';
      ctx.fillRect(-enemy.radius, barY, enemy.radius * 2, 8);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-enemy.radius, barY, enemy.radius * 2 * Math.max(enemy.healthBar.delayedValue / enemy.healthBar.maxValue, 0), 8);
      ctx.fillStyle = enemy.hp / enemy.maxHp < 0.35 ? '#ef4444' : '#22c55e';
      ctx.fillRect(-enemy.radius, barY, enemy.radius * 2 * Math.max(enemy.healthBar.value / enemy.healthBar.maxValue, 0), 8);
    }
    ctx.restore();
  }

  private drawSlowStatusEffect(enemy: Enemy): void {
    const { ctx } = this;
    const image = this.towerPartImages.fanSlowHitEffect;
    const ready = this.towerPartReady.fanSlowHitEffect && image;
    const clock = performance.now() / 1000;
    const pulse = 0.86 + Math.sin(clock * 9 + enemy.id) * 0.08;
    const size = (enemy.radius * 2.75 + 20) * pulse;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.72;
    ctx.translate(0, enemy.radius * 0.15);
    ctx.rotate(clock * 1.7 + enemy.id * 0.3);
    if (ready && image) {
      ctx.drawImage(image, -size / 2, -size / 2, size, size);
    }
    ctx.restore();

    if (ready && image) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.34;
      ctx.translate(Math.sin(clock * 3 + enemy.id) * enemy.radius * 0.18, -enemy.radius * 0.25);
      ctx.rotate(-clock * 1.1 - enemy.id * 0.2);
      ctx.drawImage(image, -size * 0.38, -size * 0.38, size * 0.76, size * 0.76);
      ctx.restore();
    }
  }

  private loadEnemyImages(): void {
    (Object.keys(assetManifest.enemies) as Array<keyof typeof assetManifest.enemies>).forEach((kind) => {
      const image = new Image();
      image.onload = () => {
        if (kind === 'yellowRun') {
          this.yellowMonsterRunFrames = yellowMonsterSpriteAtlas.frames.run.map((frame) => this.makeFrameCanvas(image, frame));
        }
        if (kind === 'yellowHit') {
          this.yellowMonsterHitFrames = yellowMonsterSpriteAtlas.frames.hit.map((frame) => this.makeFrameCanvas(image, frame));
        }
        if (kind === 'yellowDeath') {
          this.yellowMonsterDeathFrames = yellowMonsterSpriteAtlas.frames.death.map((frame) => this.makeFrameCanvas(image, frame));
        }
        if (kind === 'slackerRun') {
          this.slackerMonsterRunFrames = slackerMonsterSpriteAtlas.frames.run.map((frame) => this.makeFrameCanvas(image, frame));
        }
        if (kind === 'slackerHit') {
          this.slackerMonsterHitFrames = slackerMonsterSpriteAtlas.frames.hit.map((frame) => this.makeFrameCanvas(image, frame));
        }
        if (kind === 'slackerDeath') {
          this.slackerMonsterDeathFrames = slackerMonsterSpriteAtlas.frames.death.map((frame) => this.makeFrameCanvas(image, frame));
        }
        this.enemyReady[kind] = true;
      };
      image.src = assetManifest.enemies[kind];
      this.enemyImages[kind] = image;
    });
  }

  private loadTowerPartImages(): void {
    ([
      'base',
      'weapon',
      'muzzleFlash',
      'bullet',
      'hitEffect',
      'machineGunTapeBase',
      'machineGunTapeWeapon',
      'machineGunTapeMuzzleFlash',
      'machineGunTapeBullet',
      'machineGunTapeHitEffect',
      'machineGunTapeIcon',
      'machineGunTapeLevel1',
      'machineGunTapeLevel2',
      'machineGunTapeLevel3',
      'coffeeTowerSheet',
      'coffeeTowerBase',
      'coffeeTowerWeapon',
      'coffeeTowerMuzzleFlash',
      'coffeeTowerBullet',
      'coffeeTowerHitEffect',
      'coffeeTowerIcon',
      'coffeeTowerLevel1',
      'coffeeTowerLevel2',
      'coffeeTowerLevel3',
      'fanSlowBase',
      'fanSlowWeapon',
      'fanSlowMuzzleFlash',
      'fanSlowBullet',
      'fanSlowHitEffect',
      'fanSlowIcon',
      'fanSlowLevel1',
      'fanSlowLevel2',
      'fanSlowLevel3',
      'microwaveTowerLevel1',
      'microwaveTowerLevel2',
      'microwaveTowerLevel3',
      'wifiTowerLevel1',
      'wifiTowerLevel2',
      'wifiTowerLevel3',
    ] as TowerPartKey[]).forEach((part) => {
      const image = new Image();
      image.onload = () => {
        this.towerPartReady[part] = true;
      };
      image.src = assetManifest.towers[part];
      this.towerPartImages[part] = image;
    });
  }

  private loadEffectImages(): void {
    (Object.keys(assetManifest.effects) as EffectImageKey[]).forEach((kind) => {
      const image = new Image();
      image.onload = () => {
        this.effectReady[kind] = true;
      };
      image.src = assetManifest.effects[kind];
      this.effectImages[kind] = image;
    });
  }

  private loadSpecialTowerImages(): void {
    (['bomb', 'tesla'] as const).forEach((kind) => {
      const image = new Image();
      image.onload = () => {
        this.specialTowerReady[kind] = true;
      };
      image.src = assetManifest.towers[kind];
      this.specialTowerImages[kind] = image;
    });
  }

  private getTowerPartKey(tower: Tower, part: 'base' | 'weapon' | 'muzzleFlash' | 'bullet' | 'hitEffect'): TowerPartKey {
    if (tower.kind === 'machineGun') {
      if (part === 'base') return 'machineGunTapeBase';
      if (part === 'weapon') return 'machineGunTapeWeapon';
      if (part === 'muzzleFlash') return 'machineGunTapeMuzzleFlash';
      if (part === 'bullet') return 'machineGunTapeBullet';
      return 'machineGunTapeHitEffect';
    }
    if (tower.kind === 'coffee') {
      if (part === 'base') return 'coffeeTowerBase';
      if (part === 'weapon') return 'coffeeTowerWeapon';
      if (part === 'muzzleFlash') return 'coffeeTowerMuzzleFlash';
      if (part === 'bullet') return 'coffeeTowerBullet';
      return 'coffeeTowerHitEffect';
    }
    if (tower.kind === 'frost') {
      if (part === 'base') return 'fanSlowBase';
      if (part === 'weapon') return 'fanSlowWeapon';
      if (part === 'muzzleFlash') return 'fanSlowMuzzleFlash';
      if (part === 'bullet') return 'fanSlowBullet';
      return 'fanSlowHitEffect';
    }
    return part;
  }

  private getTowerLevelImageKey(tower: Tower): TowerPartKey {
    const level = Math.max(1, Math.min(MAX_TOWER_LEVEL, tower.level));
    if (tower.kind === 'machineGun') return `machineGunTapeLevel${level}` as TowerPartKey;
    if (tower.kind === 'coffee') return `coffeeTowerLevel${level}` as TowerPartKey;
    if (tower.kind === 'frost') return `fanSlowLevel${level}` as TowerPartKey;
    if (tower.kind === 'bomb') return `microwaveTowerLevel${level}` as TowerPartKey;
    return `wifiTowerLevel${level}` as TowerPartKey;
  }

  private getTowerPartImage(tower: Tower, part: 'base' | 'weapon' | 'muzzleFlash' | 'bullet' | 'hitEffect'): HTMLImageElement | undefined {
    return this.towerPartImages[this.getTowerPartKey(tower, part)];
  }

  private isTowerPartReady(tower: Tower, part: 'base' | 'weapon' | 'muzzleFlash' | 'bullet' | 'hitEffect'): boolean {
    return !!this.towerPartReady[this.getTowerPartKey(tower, part)];
  }

  private makeTransparentFrame(image: HTMLImageElement, frame: SpriteFrame): HTMLCanvasElement {
    const canvas = this.makeFrameCanvas(image, frame);
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const imageData = ctx.getImageData(0, 0, frame.w, frame.h);
    const { data } = imageData;
    const foreground = new Uint8Array(frame.w * frame.h);
    const keepDarkOutline = new Uint8Array(frame.w * frame.h);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturated = max - min > 26;
      const bright = max > 78;
      foreground[i / 4] = bright || saturated ? 1 : 0;
    }

    for (let y = 0; y < frame.h; y += 1) {
      for (let x = 0; x < frame.w; x += 1) {
        const index = y * frame.w + x;
        if (foreground[index]) continue;
        let touchesForeground = false;
        for (let oy = -2; oy <= 2 && !touchesForeground; oy += 1) {
          for (let ox = -2; ox <= 2; ox += 1) {
            const nx = x + ox;
            const ny = y + oy;
            if (nx < 0 || nx >= frame.w || ny < 0 || ny >= frame.h) continue;
            if (foreground[ny * frame.w + nx]) {
              touchesForeground = true;
              break;
            }
          }
        }
        keepDarkOutline[index] = touchesForeground ? 1 : 0;
      }
    }

    for (let i = 0; i < data.length; i += 4) {
      const pixelIndex = i / 4;
      if (!foreground[pixelIndex] && !keepDarkOutline[pixelIndex]) data[i + 3] = 0;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  private makeFrameCanvas(image: HTMLImageElement, frame: SpriteFrame): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    canvas.width = frame.w;
    canvas.height = frame.h;
    ctx.drawImage(image, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);
    return canvas;
  }

  private drawProjectile(projectile: Projectile): void {
    if (projectile.kind === 'coffee' && projectile.visualOnly) {
      this.drawCoffeeJet(projectile);
      return;
    }
    if (projectile.kind === 'bomb') {
      this.drawBurntEggProjectile(projectile);
      return;
    }

    const { ctx } = this;
    const image = projectile.kind === 'machineGun'
      ? this.towerPartImages.machineGunTapeBullet
      : projectile.kind === 'coffee'
        ? this.towerPartImages.coffeeTowerBullet
        : projectile.kind === 'frost'
          ? this.towerPartImages.fanSlowBullet
          : this.towerPartImages.bullet;
    const ready = projectile.kind === 'machineGun'
      ? this.towerPartReady.machineGunTapeBullet
      : projectile.kind === 'coffee'
        ? this.towerPartReady.coffeeTowerBullet
        : projectile.kind === 'frost'
          ? this.towerPartReady.fanSlowBullet
          : this.towerPartReady.bullet;
    const alpha = 1 - projectile.life / projectile.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(projectile.x, projectile.y);
    ctx.rotate(projectile.angle);
    if (ready && image) {
      const width = projectile.kind === 'machineGun' ? 54 : projectile.kind === 'frost' ? 72 : projectile.kind === 'tesla' ? 58 : 36;
      const height = projectile.kind === 'machineGun' ? 22 : projectile.kind === 'frost' ? 46 : 18;
      ctx.drawImage(image, -width / 2, -height / 2, width, height);
    }
    ctx.restore();

    if (projectile.chain) {
      let last = { x: projectile.x, y: projectile.y };
      projectile.chain.forEach((point) => {
        this.drawChainImage(last, point, projectile.life / projectile.maxLife, Math.max(0, alpha) * 0.82);
        last = point;
      });
    }
  }

  private drawBurntEggProjectile(projectile: Projectile): void {
    const progress = Math.max(0, Math.min(1, projectile.life / projectile.maxLife));
    const alpha = Math.max(0, 1 - progress * 0.35);
    const spin = projectile.spin ? projectile.life * projectile.spin : projectile.life * 8;
    const image = this.effectReady.microwaveExplosion ? this.effectImages.microwaveExplosion : this.towerPartImages.bullet;
    if (!image) return;
    if (this.effectReady.microwaveExplosion) {
      this.drawSheetImage(image, progress * 0.65, projectile.x, projectile.y, 72, alpha, projectile.angle + spin);
      return;
    }
    this.drawSimpleImage(image, projectile.x, projectile.y, 58, alpha, projectile.angle + spin);
  }

  private drawCoffeeJet(projectile: Projectile): void {
    const t = projectile.life / projectile.maxLife;
    const alpha = Math.max(0, 1 - t);
    const image = this.effectReady.coffeeSpraySteam ? this.effectImages.coffeeSpraySteam : this.towerPartImages.coffeeTowerBullet;
    if (!image) return;

    for (let i = 0; i < 3; i += 1) {
      const p = Math.min(1, t + i * 0.18);
      const x = projectile.from.x + (projectile.to.x - projectile.from.x) * p;
      const y = projectile.from.y + (projectile.to.y - projectile.from.y) * p - Math.sin(p * Math.PI) * 30;
      if (this.effectReady.coffeeSpraySteam) {
        this.drawSheetImage(image, p, x, y, 64 - i * 8, alpha * (1 - i * 0.18), projectile.angle);
      } else {
        this.drawSimpleImage(image, x, y, 44 - i * 6, alpha * (1 - i * 0.18), projectile.angle);
      }
    }
  }

  private drawChainImage(from: { x: number; y: number }, to: { x: number; y: number }, progress: number, alpha: number): void {
    const image = this.effectReady.wifiElectricArc ? this.effectImages.wifiElectricArc : this.towerPartImages.hitEffect;
    if (!image) return;

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    const x = from.x + dx * 0.5;
    const y = from.y + dy * 0.5;
    const angle = Math.atan2(dy, dx);
    this.drawSheetImage(image, progress, x, y, Math.min(230, Math.max(84, length * 0.82)), alpha, angle);
  }

  private drawHitEffect(effect: HitEffect): void {
    const { ctx } = this;
    const image = effect.kind === 'machineGun'
      ? this.towerPartImages.machineGunTapeHitEffect
      : effect.kind === 'coffee'
        ? this.towerPartImages.coffeeTowerHitEffect
        : effect.kind === 'frost'
          ? this.towerPartImages.fanSlowHitEffect
          : this.towerPartImages.hitEffect;
    const ready = effect.kind === 'machineGun'
      ? this.towerPartReady.machineGunTapeHitEffect
      : effect.kind === 'coffee'
        ? this.towerPartReady.coffeeTowerHitEffect
        : effect.kind === 'frost'
          ? this.towerPartReady.fanSlowHitEffect
          : this.towerPartReady.hitEffect;
    ctx.save();
    ctx.translate(effect.x, effect.y);
    ctx.globalAlpha = effect.alpha;
    ctx.scale(effect.scale, effect.scale);
    ctx.globalCompositeOperation = 'screen';
    if (ready && image) {
      if (effect.kind === 'machineGun') {
        ctx.drawImage(image, -36, -28, 72, 54);
      } else if (effect.kind === 'frost') {
        ctx.drawImage(image, -42, -42, 84, 84);
      } else {
        ctx.drawImage(image, -28, -28, 56, 56);
      }
    }
    ctx.restore();
  }

  private drawImageParticles(particles: SmokeParticle[]): void {
    const image = this.effectReady.coffeeSpraySteam ? this.effectImages.coffeeSpraySteam : this.effectImages.microwaveExplosion;
    if (!image) return;

    for (const particle of particles) {
      const t = particle.life / particle.maxLife;
      const size = particle.radius * 3.1;
      this.drawSheetImage(image, t, particle.x, particle.y, size, particle.alpha * 0.5, particle.vx * 0.01);
    }
  }

  private shouldDrawEffect(effect: Effect, index: number, total: number): boolean {
    if (total <= 54) return true;
    if (effect.kind === 'spark' || effect.kind === 'steam') return index % 2 === 0;
    if (total > 72 && (effect.kind === 'frostRing' || effect.kind === 'electricArc')) return index % 2 === 0;
    return true;
  }

  private drawEffect(effect: Effect, compact = false): void {
    const { ctx } = this;
    const t = effect.life / effect.maxLife;
    if (effect.kind === 'coin' || effect.kind === 'floatingText') {
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.translate(effect.pos.x, effect.pos.y);
      const pop = t < 0.2 ? 0.7 + t / 0.2 * 0.6 : t < 0.5 ? 1.3 - (t - 0.2) / 0.3 * 0.3 : 1;
      ctx.translate(effect.offsetX, -t * 80);
      ctx.scale(pop, pop);
      ctx.fillStyle = effect.color;
      ctx.font = `900 ${effect.size}px system-ui`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = effect.variant === 'warning' ? 10 : 7;
      ctx.strokeText(effect.text ?? '+金币', 0, 0);
      ctx.fillText(effect.text ?? '+金币', 0, 0);
      ctx.restore();
      return;
    }

    const alpha = Math.max(0, 1 - t);
    if (effect.kind === 'muzzle') {
      const image = this.getMuzzleImage(effect.variant);
      if (image) this.drawSimpleImage(image, effect.pos.x, effect.pos.y, effect.size * (1.9 - t * 0.45), alpha, t * 0.6);
    } else if (effect.kind === 'spark' || effect.kind === 'frostRing') {
      const image = this.getHitImage(effect.variant);
      if (image) this.drawSimpleImage(image, effect.pos.x, effect.pos.y, effect.size * (effect.kind === 'frostRing' ? 2.1 : 1.7), alpha, t * 1.2);
    } else if (effect.kind === 'coffeeSplash' || effect.kind === 'steam') {
      const image = this.effectReady.coffeeSpraySteam ? this.effectImages.coffeeSpraySteam : this.getHitImage('coffee');
      if (image) this.drawSheetImage(image, t, effect.pos.x, effect.pos.y, effect.size * (effect.kind === 'coffeeSplash' ? 1.6 : 1.35), alpha, -0.1);
    } else if (effect.kind === 'electricArc') {
      const image = this.effectReady.wifiElectricArc ? this.effectImages.wifiElectricArc : this.getHitImage('tesla');
      if (image) this.drawSheetImage(image, t, effect.pos.x, effect.pos.y, effect.size * 2.4, alpha, 0.15);
    } else if (effect.kind === 'explosion' || effect.kind === 'heatWave' || effect.kind === 'leak') {
      const image = this.effectReady.microwaveExplosion ? this.effectImages.microwaveExplosion : this.getHitImage(effect.variant);
      const size = effect.kind === 'leak' ? effect.size * 1.2 : effect.size * (compact ? 1.45 : 1.75);
      if (image) this.drawSheetImage(image, t, effect.pos.x, effect.pos.y, size, alpha, 0);
    } else {
      const image = this.getHitImage(effect.variant);
      if (image) this.drawSimpleImage(image, effect.pos.x, effect.pos.y, effect.size * 1.6, alpha, t);
    }
  }

  private drawSimpleImage(image: HTMLImageElement, x: number, y: number, size: number, alpha: number, rotation = 0): void {
    if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) return;

    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'screen';
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.drawImage(image, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  private drawSheetImage(image: HTMLImageElement, progress: number, x: number, y: number, size: number, alpha: number, rotation = 0): void {
    if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) return;

    const frameCount = 6;
    const frame = Math.min(frameCount - 1, Math.max(0, Math.floor(progress * frameCount)));
    const frameWidth = image.naturalWidth / frameCount;
    const frameHeight = image.naturalHeight;
    const drawWidth = size;
    const drawHeight = size * (frameHeight / frameWidth);

    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'screen';
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.drawImage(image, frame * frameWidth, 0, frameWidth, frameHeight, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  }

  private getMuzzleImage(variant: Effect['variant']): HTMLImageElement | undefined {
    if (variant === 'machineGun') return this.towerPartImages.machineGunTapeMuzzleFlash;
    if (variant === 'coffee') return this.towerPartImages.coffeeTowerMuzzleFlash;
    if (variant === 'frost') return this.towerPartImages.fanSlowMuzzleFlash;
    return this.towerPartImages.muzzleFlash;
  }

  private getHitImage(variant: Effect['variant']): HTMLImageElement | undefined {
    if (variant === 'machineGun') return this.towerPartImages.machineGunTapeHitEffect;
    if (variant === 'coffee') return this.towerPartImages.coffeeTowerHitEffect;
    if (variant === 'frost') return this.towerPartImages.fanSlowHitEffect;
    return this.towerPartImages.hitEffect;
  }

  private drawBossHealth(enemies: Enemy[]): void {
    const boss = enemies.find((enemy) => enemy.kind === 'boss' && enemy.targetable);
    if (!boss) return;
    const { ctx } = this;
    const ratio = Math.max(0, boss.healthBar.value / boss.healthBar.maxValue);
    const delayed = Math.max(0, boss.healthBar.delayedValue / boss.healthBar.maxValue);
    const low = ratio < 0.3;
    ctx.save();
    ctx.translate(DESIGN_WIDTH / 2, 82);
    ctx.globalAlpha = boss.healthBar.fade;
    ctx.fillStyle = 'rgba(15,23,42,0.86)';
    ctx.strokeStyle = low ? `rgba(248,113,113,${0.55 + Math.sin(performance.now() / 70) * 0.35})` : '#f97316';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(-420, -26, 840, 52, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-402, -12, 804 * delayed, 24);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-402, -12, 804 * ratio, 24);
    ctx.fillStyle = '#fef2f2';
    ctx.font = '900 28px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('老板血压', 0, -42);
    ctx.restore();
  }

  private drawBossIntro(time: number, total: number): void {
    const { ctx } = this;
    const p = 1 - time / total;
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${0.32 * Math.sin(Math.min(p, 0.8) * Math.PI)})`;
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    ctx.strokeStyle = `rgba(239,68,68,${0.85 - p * 0.35})`;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(pathPoints[0].x, pathPoints[0].y, 58 + Math.sin(performance.now() / 70) * 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = Math.min(1, p * 4) * Math.min(1, time * 2);
    ctx.fillStyle = 'rgba(15,23,42,0.5)';
    ctx.beginPath();
    ctx.ellipse(pathPoints[0].x, pathPoints[0].y + 42, 90 + p * 80, 32 + p * 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef2f2';
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 12;
    ctx.font = '900 82px system-ui';
    ctx.textAlign = 'center';
    const y = 780 + Math.sin(p * Math.PI) * -26;
    ctx.strokeText('加班暴君正在靠近！', DESIGN_WIDTH / 2, y);
    ctx.fillText('加班暴君正在靠近！', DESIGN_WIDTH / 2, y);
    ctx.restore();
  }

  private drawBase(baseHp: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(540, 1715);
    ctx.fillStyle = baseHp <= 3 ? '#7f1d1d' : '#1f2937';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.roundRect(-120, -70, 240, 140, 22);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 36px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('工位', 0, 10);
    ctx.restore();
  }

  private drawAlert(baseHp: number): void {
    const { ctx } = this;
    const alpha = 0.25 + Math.sin(performance.now() / 80) * 0.14;
    ctx.save();
    ctx.strokeStyle = `rgba(239,68,68,${alpha})`;
    ctx.lineWidth = baseHp === 1 ? 52 : 34;
    ctx.strokeRect(18, 18, DESIGN_WIDTH - 36, DESIGN_HEIGHT - 36);
    ctx.restore();
  }

  private drawBossWarning(time: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = Math.min(time * 2, 1);
    ctx.fillStyle = 'rgba(127,29,29,0.72)';
    ctx.fillRect(0, 760, DESIGN_WIDTH, 230);
    ctx.fillStyle = '#fef2f2';
    ctx.font = '900 82px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('老板来了！', DESIGN_WIDTH / 2, 900);
    ctx.restore();
  }
}
