import { Enemy } from '../entities/Enemy';
import { Effect } from '../entities/Effect';
import { HitEffect } from '../entities/HitEffect';
import { Projectile } from '../entities/Projectile';
import { Tower } from '../entities/Tower';
import { assetManifest } from '../assets/assetManifest';
import { buildSpots, DESIGN_HEIGHT, DESIGN_WIDTH, MAX_TOWER_LEVEL, pathPoints, slackerMonsterSpriteAtlas, towerConfigs, yellowMonsterSpriteAtlas } from './config';
import type { EnemySpriteAtlas, SpriteFrame } from './config';
import { drawDamageTexts, drawParticles } from './effects/proceduralEffects';
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

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private mapImage = new Image();
  private mapReady = false;
  private enemyImages: Partial<Record<keyof typeof assetManifest.enemies, HTMLImageElement>> = {};
  private enemyReady: Partial<Record<keyof typeof assetManifest.enemies, boolean>> = {};
  private towerPartImages: Partial<Record<TowerPartKey, HTMLImageElement>> = {};
  private towerPartReady: Partial<Record<TowerPartKey, boolean>> = {};
  private specialTowerImages: Partial<Record<'bomb' | 'tesla', HTMLImageElement>> = {};
  private specialTowerReady: Partial<Record<'bomb' | 'tesla', boolean>> = {};
  private yellowMonsterRunFrames?: HTMLCanvasElement[];
  private yellowMonsterHitFrames?: HTMLCanvasElement[];
  private yellowMonsterDeathFrames?: HTMLCanvasElement[];
  private slackerMonsterRunFrames?: HTMLCanvasElement[];
  private slackerMonsterHitFrames?: HTMLCanvasElement[];
  private slackerMonsterDeathFrames?: HTMLCanvasElement[];

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
    drawParticles(ctx, snapshot.particles);
    drawDamageTexts(ctx, snapshot.damageTexts);
    snapshot.effects.forEach((effect) => this.drawEffect(effect));
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
      ctx.save();
      ctx.translate(spot.x, spot.y);
      ctx.fillStyle = snapshot.selectedSpot === index ? 'rgba(251,191,36,0.32)' : 'rgba(15,23,42,0.2)';
      ctx.strokeStyle = built ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.85)';
      ctx.lineWidth = snapshot.selectedSpot === index ? 8 : 5;
      ctx.setLineDash([18, 12]);
      ctx.beginPath();
      ctx.roundRect(-45, -45, 90, 90, 14);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      if (!built) {
        ctx.fillStyle = snapshot.selectedSpot === index ? 'rgba(251,191,36,0.95)' : 'rgba(255,255,255,0.82)';
        ctx.fillRect(-21, -5, 42, 10);
        ctx.fillRect(-5, -21, 10, 42);
      }
      ctx.restore();
    });
  }

  private drawTower(tower: Tower, time: number): void {
    if (this.drawTowerLevelImage(tower, time)) return;
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
    const levelScale = this.getTowerLevelScale(tower);
    const attackShake = tower.state === 'attack' ? tower.recoil * 2.4 : 0;
    const baseX = tower.x + (Math.random() - 0.5) * attackShake;
    const baseY = tower.y + idleOffsetY + (Math.random() - 0.5) * attackShake;
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
    const levelScale = this.getTowerLevelScale(tower);
    const idlePulse = Math.sin(time * 0.0038 + tower.idleSeed);
    const idleBob = attacking ? 0 : idlePulse * 2.4;
    const attackKick = attacking ? Math.sin(Math.max(0, Math.min(1, 1 - tower.recoilTime / 0.16)) * Math.PI) : 0;
    const recoilX = attacking ? -Math.cos(tower.angle) * tower.recoil * 7 : 0;
    const recoilY = attacking ? -Math.sin(tower.angle) * tower.recoil * 7 : idleBob;
    const scale = levelScale * (attacking ? 1 + attackKick * 0.045 : 1 + idlePulse * 0.018);
    const drawSize = tower.kind === 'machineGun' || tower.kind === 'frost' ? 154 : 166;

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

    ctx.save();
    ctx.translate(tower.x, tower.y);
    if (tower.coffeeBoostTimer > 0) this.drawCoffeeBoostBadge(tower, time);
    ctx.restore();
    return true;
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
    ctx.strokeText('可升', 0, 25);
    ctx.fillText('可升', 0, 25);
    ctx.restore();
  }

  private drawSpecialTower(tower: Tower, time: number): void {
    const { ctx } = this;
    const image = tower.kind === 'bomb' || tower.kind === 'tesla' ? this.specialTowerImages[tower.kind] : undefined;
    if (!image) return;

    const cfg = towerConfigs[tower.kind];
    const idleOffsetY = Math.sin(time * 0.004 + tower.idleSeed) * 2;
    const levelScale = this.getTowerLevelScale(tower);
    const attackPulse = tower.state === 'attack' ? 1 + tower.recoil * 0.045 : 1;
    const attackShake = tower.state === 'attack' ? tower.recoil * 3 : 0;
    const drawSize = tower.kind === 'bomb' ? 164 : 172;

    ctx.save();
    ctx.translate(
      tower.x + (Math.random() - 0.5) * attackShake,
      tower.y + idleOffsetY + (Math.random() - 0.5) * attackShake,
    );
    ctx.scale(levelScale * attackPulse, levelScale * attackPulse);
    this.drawTowerReadabilityShadow(tower.state === 'attack' ? 0.72 : 0.62);
    ctx.shadowColor = cfg.color;
    ctx.shadowBlur = tower.state === 'attack' ? 28 : 14;
    this.drawImageWithOutline(image, -drawSize / 2, -drawSize + 58, drawSize, drawSize, 5, 0.75);
    ctx.restore();

    this.drawMuzzleFlash(tower, idleOffsetY, levelScale);

    ctx.save();
    ctx.translate(tower.x, tower.y);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 24px system-ui';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = 5;
    ctx.strokeText(String(tower.level), 0, 62 * levelScale);
    ctx.fillText(String(tower.level), 0, 62 * levelScale);
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
    } else {
      const gradient = ctx.createRadialGradient(8, 0, 0, 8, 0, 32);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.36, 'rgba(253,230,138,0.95)');
      gradient.addColorStop(1, 'rgba(249,115,22,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(-4, -14);
      ctx.lineTo(46, 0);
      ctx.lineTo(-4, 14);
      ctx.closePath();
      ctx.fill();
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

  private drawImageWithOutline(image: HTMLImageElement, x: number, y: number, width: number, height: number, outline = 6, alpha = 0.72): void {
    const { ctx } = this;
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
    const scale = attacking ? 1 + attackKick * 0.045 : 1 + idlePulse * 0.018;
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
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 24px system-ui';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = 5;
    ctx.strokeText(String(tower.level), 0, 62);
    ctx.fillText(String(tower.level), 0, 62);
    if (tower.coffeeBoostTimer > 0) this.drawCoffeeBoostBadge(tower, performance.now());
    ctx.restore();
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
      ctx.fillStyle = 'rgba(239,68,68,0.74)';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, -enemy.radius * 2.05, 8, 0, Math.PI * 2);
      ctx.fill();
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
    ctx.shadowColor = '#38d5ff';
    ctx.shadowBlur = 16;
    if (ready && image) {
      ctx.drawImage(image, -size / 2, -size / 2, size, size);
    } else {
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.5);
      gradient.addColorStop(0, 'rgba(255,255,255,0.55)');
      gradient.addColorStop(0.42, 'rgba(56,213,255,0.35)');
      gradient.addColorStop(1, 'rgba(56,213,255,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineCap = 'round';
    ctx.shadowColor = '#67e8f9';
    ctx.shadowBlur = 10;
    for (let i = 0; i < 4; i += 1) {
      const phase = (clock * 2.4 + i * 0.25 + enemy.id * 0.07) % 1;
      const y = -enemy.radius * 0.9 + i * enemy.radius * 0.42 + Math.sin(clock * 5 + i) * 5;
      const startX = -enemy.radius * (1.45 + phase * 0.55);
      const endX = enemy.radius * (0.8 + phase * 0.65);
      ctx.globalAlpha = (1 - phase) * 0.52;
      ctx.strokeStyle = i % 2 === 0 ? '#dffbff' : '#38d5ff';
      ctx.lineWidth = 4 - phase * 1.8;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.bezierCurveTo(-enemy.radius * 0.55, y - 12, enemy.radius * 0.18, y + 12, endX, y - 4);
      ctx.stroke();
    }
    ctx.fillStyle = '#d9f99d';
    ctx.globalAlpha = 0.55 + Math.sin(clock * 8 + enemy.id) * 0.18;
    for (let i = 0; i < 3; i += 1) {
      const angle = clock * 3.8 + i * 2.1 + enemy.id;
      const x = Math.cos(angle) * enemy.radius * 1.15;
      const y = Math.sin(angle * 0.8) * enemy.radius * 0.65 - enemy.radius * 0.2;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
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
    ctx.shadowColor = projectile.color;
    ctx.shadowBlur = 18;

    ctx.translate(projectile.x, projectile.y);
    ctx.rotate(projectile.angle);
    if (ready && image) {
      const width = projectile.kind === 'machineGun' ? 54 : projectile.kind === 'frost' ? 72 : projectile.kind === 'bomb' ? 46 : projectile.kind === 'tesla' ? 58 : 36;
      const height = projectile.kind === 'machineGun' ? 22 : projectile.kind === 'frost' ? 46 : projectile.kind === 'bomb' ? 32 : 18;
      ctx.drawImage(image, -width / 2, -height / 2, width, height);
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = Math.max(0, alpha) * 0.55;
      ctx.fillStyle = projectile.color;
      ctx.fillRect(-width * 0.24, -height * 0.25, width * 0.7, height * 0.5);
    } else {
      const length = projectile.kind === 'tesla' ? 42 : projectile.kind === 'bomb' ? 24 : 34;
      ctx.strokeStyle = projectile.color;
      ctx.lineWidth = projectile.kind === 'tesla' ? 10 : projectile.kind === 'machineGun' ? 5 : 7;
      ctx.beginPath();
      ctx.moveTo(-length, 0);
      ctx.lineTo(length * 0.25, 0);
      ctx.stroke();
      ctx.fillStyle = '#fff7ad';
      ctx.beginPath();
      ctx.arc(length * 0.28, 0, projectile.kind === 'bomb' ? 12 : 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (projectile.chain) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha) * 0.75;
      ctx.strokeStyle = projectile.color;
      ctx.lineWidth = 8;
      ctx.shadowColor = projectile.color;
      ctx.shadowBlur = 18;
      let last = { x: projectile.x, y: projectile.y };
      projectile.chain.forEach((point) => {
        this.drawJaggedLine(last, point, 11, 18);
        last = point;
      });
      ctx.globalAlpha = Math.max(0, alpha) * 0.95;
      ctx.strokeStyle = '#dbeafe';
      ctx.lineWidth = 3;
      last = { x: projectile.x, y: projectile.y };
      projectile.chain.forEach((point) => {
        this.drawJaggedLine(last, point, 7, 10);
        last = point;
      });
      ctx.restore();
    }
  }

  private drawCoffeeJet(projectile: Projectile): void {
    const { ctx } = this;
    const t = projectile.life / projectile.maxLife;
    const alpha = Math.max(0, 1 - t);
    const midX = (projectile.from.x + projectile.to.x) / 2;
    const midY = (projectile.from.y + projectile.to.y) / 2 - 34 - Math.sin(t * Math.PI) * 20;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = '#f6b84a';
    ctx.lineWidth = 14 * (1 - t * 0.55);
    ctx.lineCap = 'round';
    ctx.shadowColor = '#f6b84a';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(projectile.from.x, projectile.from.y);
    ctx.quadraticCurveTo(midX, midY, projectile.to.x, projectile.to.y);
    ctx.stroke();
    ctx.strokeStyle = '#fff3b0';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(projectile.from.x, projectile.from.y - 4);
    ctx.quadraticCurveTo(midX, midY - 12, projectile.to.x, projectile.to.y - 5);
    ctx.stroke();
    ctx.restore();
  }

  private drawJaggedLine(from: { x: number; y: number }, to: { x: number; y: number }, steps: number, jitter: number): void {
    const { ctx } = this;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    for (let i = 1; i < steps; i += 1) {
      const p = i / steps;
      const wave = Math.sin((performance.now() * 0.035 + i * 2.7) * (i % 2 ? 1 : -1));
      const offset = wave * jitter * (0.35 + Math.random() * 0.65);
      ctx.lineTo(from.x + dx * p + nx * offset, from.y + dy * p + ny * offset);
    }
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
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
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 18;
    if (ready && image) {
      if (effect.kind === 'machineGun') {
        ctx.drawImage(image, -36, -28, 72, 54);
      } else if (effect.kind === 'frost') {
        ctx.drawImage(image, -42, -42, 84, 84);
      } else {
        ctx.drawImage(image, -28, -28, 56, 56);
      }
    } else {
      ctx.fillStyle = '#fff7ad';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 5;
      for (let i = 0; i < 6; i += 1) {
        const angle = i * Math.PI / 3 + effect.time * 18;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 8, Math.sin(angle) * 8);
        ctx.lineTo(Math.cos(angle) * 26, Math.sin(angle) * 26);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private drawEffect(effect: Effect): void {
    const { ctx } = this;
    const t = effect.life / effect.maxLife;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.translate(effect.pos.x, effect.pos.y);
    if (effect.kind === 'coin' || effect.kind === 'floatingText') {
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
    } else if (effect.kind === 'spark') {
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 5;
      for (let i = 0; i < 5; i += 1) {
        const angle = i * 1.26 + t * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 5, Math.sin(angle) * 5);
        ctx.lineTo(Math.cos(angle) * effect.size * (1 + t), Math.sin(angle) * effect.size * (1 + t));
        ctx.stroke();
      }
    } else if (effect.kind === 'frostRing') {
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, effect.size * (0.65 + t * 0.6), 0, Math.PI * 2);
      ctx.stroke();
    } else if (effect.kind === 'coffeeSplash') {
      const radius = effect.size * (0.25 + t * 0.9);
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 7 * (1 - t);
      ctx.shadowColor = '#f6b84a';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(92,46,18,0.5)';
      ctx.beginPath();
      ctx.ellipse(0, 8, radius * 0.78, radius * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3b0';
      for (let i = 0; i < 5; i += 1) {
        const angle = i * 1.25 + t * 1.8;
        const sparkleX = Math.cos(angle) * radius * 0.72;
        const sparkleY = Math.sin(angle) * radius * 0.5 - 16;
        ctx.beginPath();
        ctx.moveTo(sparkleX, sparkleY - 9);
        ctx.lineTo(sparkleX + 6, sparkleY);
        ctx.lineTo(sparkleX, sparkleY + 9);
        ctx.lineTo(sparkleX - 6, sparkleY);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,225,148,0.9)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 20 - t * 45);
      ctx.lineTo(0, -16 - t * 65);
      ctx.moveTo(-18, 2 - t * 42);
      ctx.lineTo(-18, -30 - t * 58);
      ctx.moveTo(18, 4 - t * 40);
      ctx.lineTo(18, -26 - t * 56);
      ctx.stroke();
    } else if (effect.kind === 'heatWave') {
      const radius = effect.size * (0.2 + t * 1.05);
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = `rgba(254,215,170,${0.9 - t * 0.65})`;
      ctx.lineWidth = 10 * (1 - t);
      ctx.shadowColor = '#fb923c';
      ctx.shadowBlur = 30;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * (1 + i * 0.18), radius * (0.48 + i * 0.12), Math.sin(t * 5 + i) * 0.12, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = `rgba(255,247,237,${0.38 - t * 0.25})`;
      ctx.lineWidth = 5;
      for (let i = 0; i < 7; i += 1) {
        const x = (i - 3) * radius * 0.24;
        ctx.beginPath();
        ctx.moveTo(x, radius * 0.28);
        ctx.bezierCurveTo(x + 14, radius * 0.05, x - 18, -radius * 0.12, x + 10, -radius * 0.32);
        ctx.stroke();
      }
    } else if (effect.kind === 'steam') {
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = `rgba(254,243,199,${0.68 - t * 0.42})`;
      ctx.lineWidth = 7 * (1 - t * 0.35);
      ctx.lineCap = 'round';
      ctx.shadowColor = '#fde68a';
      ctx.shadowBlur = 15;
      for (let i = 0; i < 4; i += 1) {
        const x = (i - 1.5) * 18;
        ctx.beginPath();
        ctx.moveTo(x, 16 - t * 20);
        ctx.bezierCurveTo(x - 18, -8 - t * 28, x + 22, -28 - t * 38, x + Math.sin(t * 6 + i) * 14, -58 - t * 44);
        ctx.stroke();
      }
    } else if (effect.kind === 'electricArc') {
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 5;
      ctx.shadowColor = '#60a5fa';
      ctx.shadowBlur = 20;
      for (let i = 0; i < 5; i += 1) {
        const angle = i * 1.26 + t * 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * effect.size * 0.2, Math.sin(angle) * effect.size * 0.2);
        ctx.lineTo(Math.cos(angle + 0.22) * effect.size, Math.sin(angle + 0.22) * effect.size);
        ctx.lineTo(Math.cos(angle + 0.55) * effect.size * 0.62, Math.sin(angle + 0.55) * effect.size * 0.62);
        ctx.stroke();
      }
      ctx.fillStyle = '#dbeafe';
      ctx.beginPath();
      ctx.arc(0, 0, effect.size * 0.16, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const radius = effect.size * (0.1 + t);
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      gradient.addColorStop(0, 'rgba(255,255,255,0.92)');
      gradient.addColorStop(0.28, effect.color);
      gradient.addColorStop(1, 'rgba(15,23,42,0)');
      ctx.fillStyle = gradient;
      ctx.shadowColor = effect.color;
      ctx.shadowBlur = 28;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.35, 0, Math.PI * 2);
      ctx.stroke();
      if (effect.kind === 'explosion') {
        ctx.globalAlpha = (1 - t) * 0.34;
        ctx.fillStyle = 'rgba(71,85,105,0.62)';
        ctx.beginPath();
        ctx.ellipse(-radius * 0.25, radius * 0.18, radius * 0.75, radius * 0.34, -0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
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
