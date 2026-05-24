import { Enemy } from '../entities/Enemy';
import { Effect } from '../entities/Effect';
import { Projectile } from '../entities/Projectile';
import { Tower } from '../entities/Tower';
import { assetManifest } from '../assets/assetManifest';
import { buildSpots, DESIGN_HEIGHT, DESIGN_WIDTH, pathPoints, towerConfigs } from './config';
import type { GameSnapshot } from './Game';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private mapImage = new Image();
  private mapReady = false;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.mapImage.onload = () => {
      this.mapReady = true;
    };
    this.mapImage.src = assetManifest.maps.industrial;
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
    ctx.save();
    ctx.clearRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    this.drawBackground();
    if (!this.mapReady) this.drawPath();
    this.drawBuildSpots(snapshot);
    snapshot.projectiles.forEach((projectile) => this.drawProjectile(projectile));
    snapshot.towers.forEach((tower) => this.drawTower(tower));
    snapshot.enemies.forEach((enemy) => this.drawEnemy(enemy));
    snapshot.effects.forEach((effect) => this.drawEffect(effect));
    if (!this.mapReady) this.drawBase(snapshot.baseHp);

    ctx.restore();
    if (snapshot.baseHp <= 3 && snapshot.phase === 'playing') this.drawAlert(snapshot.baseHp);
    if (snapshot.bossWarning > 0) this.drawBossWarning(snapshot.bossWarning);
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
      ctx.roundRect(-54, -54, 108, 108, 16);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      if (!built) {
        ctx.fillStyle = snapshot.selectedSpot === index ? 'rgba(251,191,36,0.95)' : 'rgba(255,255,255,0.82)';
        ctx.fillRect(-25, -5, 50, 10);
        ctx.fillRect(-5, -25, 10, 50);
      }
      ctx.restore();
    });
  }

  private drawTower(tower: Tower): void {
    const { ctx } = this;
    const cfg = towerConfigs[tower.kind];
    ctx.save();
    ctx.translate(tower.pos.x, tower.pos.y);
    ctx.shadowColor = cfg.color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#20242b';
    ctx.strokeStyle = '#05070a';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.roundRect(-48, -38, 96, 76, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = cfg.color;
    ctx.beginPath();
    ctx.arc(0, -6, tower.kind === 'bomb' ? 30 : 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.rotate(tower.direction === 'front_left' ? -0.55 : tower.direction === 'front_right' ? 0.55 : 0);
    ctx.fillStyle = '#111827';
    ctx.fillRect(-11, -78, 22, 58);
    ctx.fillStyle = cfg.color;
    ctx.fillRect(-7, -86, 14, 18);
    ctx.rotate(0);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 24px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(String(tower.level), 0, 54);
    ctx.restore();
  }

  private drawEnemy(enemy: Enemy): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(enemy.pos.x, enemy.pos.y);
    ctx.shadowColor = enemy.color;
    ctx.shadowBlur = enemy.kind === 'boss' ? 28 : 10;
    ctx.fillStyle = enemy.color;
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
    if (enemy.slowTimer > 0) {
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius + 9, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (enemy.burnTimer > 0) {
      ctx.fillStyle = 'rgba(239,68,68,0.7)';
      ctx.beginPath();
      ctx.arc(0, -enemy.radius - 9, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#111827';
    ctx.fillRect(-enemy.radius, -enemy.radius - 18, enemy.radius * 2, 8);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(-enemy.radius, -enemy.radius - 18, enemy.radius * 2 * Math.max(enemy.hp / enemy.maxHp, 0), 8);
    ctx.restore();
  }

  private drawProjectile(projectile: Projectile): void {
    const { ctx } = this;
    const alpha = 1 - projectile.life / projectile.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = projectile.color;
    ctx.lineWidth = projectile.kind === 'tesla' ? 10 : 7;
    ctx.shadowColor = projectile.color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(projectile.from.x, projectile.from.y - 40);
    ctx.lineTo(projectile.to.x, projectile.to.y);
    ctx.stroke();
    if (projectile.chain) {
      ctx.beginPath();
      let last = projectile.to;
      projectile.chain.forEach((point) => {
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(point.x, point.y);
        last = point;
      });
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawEffect(effect: Effect): void {
    const { ctx } = this;
    const t = effect.life / effect.maxLife;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.translate(effect.pos.x, effect.pos.y);
    if (effect.kind === 'coin') {
      ctx.fillStyle = effect.color;
      ctx.font = '900 42px system-ui';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 7;
      ctx.strokeText(effect.text ?? '+金币', 0, 0);
      ctx.fillText(effect.text ?? '+金币', 0, 0);
    } else {
      const radius = effect.size * (0.45 + t);
      ctx.fillStyle = effect.color;
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
    }
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
