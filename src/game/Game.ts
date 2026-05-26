import { Enemy } from '../entities/Enemy';
import { Effect } from '../entities/Effect';
import { HitEffect } from '../entities/HitEffect';
import { Projectile } from '../entities/Projectile';
import { Tower } from '../entities/Tower';
import { EconomySystem } from '../systems/EconomySystem';
import { TowerSystem } from '../systems/TowerSystem';
import { WaveSystem } from '../systems/WaveSystem';
import {
  BASE_HP,
  buildSpots,
  economyConfig,
  MAX_TOWER_LEVEL,
  MAX_WAVES,
  shieldConfig,
  titles,
  TowerKind,
  towerConfigs,
  Vec2,
} from './config';
import { effectsConfig } from './config/effectsConfig';
import { ScreenShake, createExplosion, popText } from './effects/animation';
import { makeEffect, releaseEffect } from './effects/effectPool';
import { playEnemyDeath, playEnemyHit, playTowerAttack } from './effects/feedback';
import {
  spawnDamageText,
  spawnSmokeParticles,
  updateDamageTexts,
  updateParticles,
  type DamageText,
  type SmokeParticle,
} from './effects/proceduralEffects';
import { GameLoop } from './GameLoop';
import { Input } from './Input';
import { Renderer } from './Renderer';
import { loadCurrentWave, resetCurrentWave, saveCurrentWave } from './progressStore';

export type GamePhase = 'playing' | 'paused' | 'won' | 'lost';

export type TowerLayoutItem = {
  kind: TowerKind;
  level: number;
  spot: number;
  x: number;
  y: number;
};

export type GameStats = {
  wave: number;
  hp: number;
  coins: number;
  kills: number;
  phase: GamePhase;
  speed: number;
  towerLayout: TowerLayoutItem[];
  selectedTowerCanUpgrade?: boolean;
  selectedTowerIsMaxLevel?: boolean;
  selectedTowerUpgradeCost?: number;
  selectedTowerUpgradeProgress?: number;
  selectedBuildKind?: TowerKind;
  selectedSpot?: number;
  selectedTower?: number;
  title?: string;
  shield: number;
  completedWaves: number;
  challengeWave: number;
  wavePreview: string;
  lastFailReason?: string;
};

export type GameSnapshot = GameStats & {
  baseHp: number;
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  hitEffects: HitEffect[];
  effects: Effect[];
  particles: SmokeParticle[];
  damageTexts: DamageText[];
  shake: number;
  bossWarning: number;
  bossIntro: number;
  bossIntroTotal: number;
};

export class Game {
  private renderer: Renderer;
  private input: Input;
  private loop: GameLoop;
  private economy = new EconomySystem();
  private waves = new WaveSystem();
  private towerSystem = new TowerSystem();
  private screenShake = new ScreenShake();
  private towers: Tower[] = [];
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private hitEffects: HitEffect[] = [];
  private effects: Effect[] = [];
  private particles: SmokeParticle[] = [];
  private damageTexts: DamageText[] = [];
  private selectedSpot?: number;
  private selectedTower?: number;
  private selectedBuildKind?: TowerKind;
  private towerId = 1;
  private baseHp = BASE_HP;
  private shield = 0;
  private completedWaves = 0;
  private challengeWave = 1;
  private kills = 0;
  private phase: GamePhase = 'playing';
  private speed = 1;
  private waveDelay = 0.8;
  private shake = 0;
  private slowMo = 0;
  private oneHpSlowMoUsed = false;
  private bossWarning = 0;
  private bossIntro = 0;
  private bossIntroTotal = effectsConfig.bossIntroDuration;
  private bossIntroWave?: number;
  private lastFailReason?: string;
  private shieldClearedWave?: number;
  private debugEffects = false;
  private statsListener?: (stats: GameStats) => void;
  private resizeHandler: () => void;
  private keyHandler: (event: KeyboardEvent) => void;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.input = new Input(canvas, this.handleTap);
    this.loop = new GameLoop(this.tick);
    this.resizeHandler = this.renderer.resize.bind(this.renderer);
    this.keyHandler = this.handleKey;
    window.addEventListener('resize', this.resizeHandler);
    window.addEventListener('keydown', this.keyHandler);
    this.debugEffects = new URLSearchParams(window.location.search).get('debugEffects') === '1';
  }

  start(): void {
    this.startChallenge(loadCurrentWave(), false);
    this.emitStats();
    this.loop.start();
  }

  destroy(): void {
    this.loop.stop();
    this.input.destroy();
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('keydown', this.keyHandler);
  }

  onStats(listener: (stats: GameStats) => void): void {
    this.statsListener = listener;
    this.emitStats();
  }

  buildTower(kind: TowerKind): void {
    if (this.phase !== 'playing') return;
    if (this.selectedSpot === undefined) {
      if (this.economy.coins < towerConfigs[kind].price) {
        this.bumpShake(10);
        return;
      }
      this.selectedBuildKind = kind;
      this.selectedTower = undefined;
      this.emitStats();
      return;
    }
    this.deployTower(kind, this.selectedSpot);
  }

  private deployTower(kind: TowerKind, spotIndex: number): boolean {
    if (this.towers.some((tower) => tower.pos.x === buildSpots[spotIndex].x && tower.pos.y === buildSpots[spotIndex].y)) return false;
    const cost = towerConfigs[kind].price;
    if (!this.economy.spend(cost)) {
      this.bumpShake(10);
      return false;
    }
    this.towers.push(new Tower(this.towerId++, kind, buildSpots[spotIndex]));
    this.effects.push(makeEffect('coin', buildSpots[spotIndex], { text: `-${cost}`, color: '#f97316' }));
    this.selectedSpot = undefined;
    this.selectedBuildKind = undefined;
    this.emitStats();
    return true;
  }

  upgradeSelected(): void {
    const tower = this.towers.find((item) => item.id === this.selectedTower);
    if (!tower) return;
    this.upgradeTower(tower);
  }

  private upgradeTower(tower: Tower): boolean {
    if (tower.level >= MAX_TOWER_LEVEL) return false;
    if (!this.economy.spend(tower.upgradeCost)) {
      this.bumpShake(10);
      return false;
    }
    tower.level += 1;
    this.effects.push(makeEffect('coin', tower.pos, { text: `Lv.${tower.level}`, color: '#fbbf24' }));
    this.selectedTower = tower.id;
    this.selectedSpot = undefined;
    this.emitStats();
    return true;
  }

  sellSelected(): void {
    const index = this.towers.findIndex((item) => item.id === this.selectedTower);
    if (index < 0) return;
    const [tower] = this.towers.splice(index, 1);
    this.economy.add(tower.sellValue);
    this.effects.push(makeEffect('coin', tower.pos, { text: `+${tower.sellValue}`, color: '#facc15' }));
    this.selectedTower = undefined;
    this.emitStats();
  }

  togglePause(): void {
    if (this.phase === 'playing') this.phase = 'paused';
    else if (this.phase === 'paused') this.phase = 'playing';
    this.emitStats();
  }

  toggleSpeed(): void {
    this.speed = this.speed === 1 ? 2 : 1;
    this.emitStats();
  }

  restart(): void {
    resetCurrentWave();
    this.startChallenge(1, false);
  }

  retryCurrentWave(): void {
    this.startChallenge(this.challengeWave, false);
  }

  private startChallenge(wave: number, persist: boolean): void {
    const challengeWave = Math.max(1, Math.min(MAX_WAVES, Math.floor(wave)));
    this.waves = new WaveSystem();
    this.economy = new EconomySystem();
    this.economy.coins = this.getStartingCoinsForWave(challengeWave);
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.hitEffects = [];
    this.effects = [];
    this.particles = [];
    this.damageTexts = [];
    this.selectedSpot = undefined;
    this.selectedTower = undefined;
    this.selectedBuildKind = undefined;
    this.baseHp = BASE_HP;
    this.shield = 0;
    this.completedWaves = challengeWave - 1;
    this.challengeWave = challengeWave;
    this.kills = 0;
    this.phase = 'playing';
    this.speed = 1;
    this.waveDelay = 0.8;
    this.shake = 0;
    this.screenShake = new ScreenShake();
    this.slowMo = 0;
    this.oneHpSlowMoUsed = false;
    this.bossWarning = 0;
    this.bossIntro = 0;
    this.bossIntroWave = undefined;
    this.lastFailReason = undefined;
    this.shieldClearedWave = undefined;
    if (persist) saveCurrentWave(challengeWave);
    this.waves.startAtWave(challengeWave);
    this.emitStats();
  }

  private getStartingCoinsForWave(wave: number): number {
    let coins = economyConfig.initialCoins;
    for (let completedWave = 1; completedWave < wave; completedWave += 1) {
      coins += this.waves.isBossWave(completedWave) ? economyConfig.bossClearReward : economyConfig.waveClearReward;
    }
    return coins;
  }

  private tick = (rawDt: number): void => {
    const dt = this.phase === 'playing' ? rawDt * this.speed * (this.slowMo > 0 ? 0.28 : 1) : 0;
    if (this.phase === 'playing') this.update(dt, rawDt);
    this.renderer.render(this.snapshot());
  };

  private update(dt: number, rawDt: number): void {
    this.shake = this.screenShake.update(rawDt);
    this.slowMo = Math.max(0, this.slowMo - rawDt);
    this.bossWarning = Math.max(0, this.bossWarning - rawDt);
    if (this.bossIntro > 0) {
      this.bossIntro = Math.max(0, this.bossIntro - rawDt);
      if (this.bossIntro === 0 && this.bossIntroWave !== undefined) {
        this.waves.startNextWave();
        this.bossIntroWave = undefined;
      }
    }

    if (this.phase === 'playing' && this.bossIntro <= 0 && this.waves.shouldAutoStart(this.enemies.length)) {
      this.waveDelay -= dt;
      if (this.waveDelay <= 0) {
        const nextWave = this.waves.wave + 1;
        if (this.waves.isBossWave(nextWave)) {
          this.playBossIntro(nextWave);
          this.waveDelay = 0.8;
          return;
        }
        this.waves.startNextWave();
        this.waveDelay = Math.max(0.25, 0.95 - this.waves.wave * 0.02);
      }
    }

    this.enemies.push(...this.waves.update(dt));
    this.enemies.forEach((enemy) => enemy.update(dt));
    this.towerSystem.update(dt, this.towers, this.enemies, this.projectiles, this.effects, this.damageTexts, this.hitEffects);
    this.effects.forEach((effect) => effect.update(dt));
    this.particles = updateParticles(this.particles, dt);
    this.damageTexts = updateDamageTexts(this.damageTexts, dt);
    this.effects.forEach((effect) => {
      if (effect.shake && !effect.shakeApplied) {
        effect.shakeApplied = true;
        this.screenShake.screenShake({ duration: 0.12, intensity: 12 });
      }
    });
    this.handleDeathsAndLeaks();
    this.handleWaveCleared();
    this.projectiles = this.projectiles.filter((projectile) => !projectile.done);
    this.hitEffects = this.hitEffects.filter((effect) => !effect.done);
    this.effects = this.effects.filter((effect) => {
      if (!effect.done) return true;
      releaseEffect(effect);
      return false;
    });

    if (this.baseHp <= 0) this.endGame('lost');
    if (this.waves.wave >= MAX_WAVES && !this.waves.active && this.enemies.length === 0) this.endGame('won');
    this.emitStats();
  }

  private handleDeathsAndLeaks(): void {
    const spawned: Enemy[] = [];
    let shieldTriggered = false;
    for (const enemy of this.enemies) {
      if (enemy.dead && !enemy.rewardClaimed) {
        enemy.rewardClaimed = true;
        this.kills += 1;
        if (!enemy.smokeSpawned) {
          enemy.smokeSpawned = true;
          spawnSmokeParticles(this.particles, enemy);
        }
        playEnemyDeath(enemy, this.effects);
        if (enemy.kind === 'requirement') {
          spawned.push(new Enemy(this.waves.nextEnemyId++, 'yellow', this.waves.wave, 0));
          spawned.push(new Enemy(this.waves.nextEnemyId++, 'yellow', this.waves.wave, 18));
          spawned.forEach((child) => {
            child.pos = { ...enemy.pos };
            child.pathIndex = enemy.pathIndex;
          });
        }
        if (enemy.kind === 'boss' || enemy.radius > 30) {
          this.effects.push(createExplosion(enemy.pos.x, enemy.pos.y, { radius: enemy.kind === 'boss' ? 170 : 95, color: '#f97316', shake: true }));
          this.screenShake.screenShake({ duration: 0.18, intensity: enemy.kind === 'boss' ? 30 : 14 });
        }
      }

      if (enemy.reachedBase) {
        this.effects.push(makeEffect('leak', enemy.pos, { color: '#ef4444', size: 90, maxLife: 0.35 }));
        this.screenShake.screenShake({ duration: 0.16, intensity: 24 });
        if (shieldConfig.triggerOnLeak && this.shield > 0) {
          this.triggerShield(enemy.pos);
          shieldTriggered = true;
          break;
        }
        this.baseHp = 0;
        this.lastFailReason = this.makeFailReason();
        if (!this.oneHpSlowMoUsed) {
          this.oneHpSlowMoUsed = true;
          this.slowMo = 1.25;
          this.screenShake.screenShake({ duration: 0.22, intensity: 38 });
        }
      }
    }
    if (shieldTriggered) return;
    this.enemies = this.enemies.filter((enemy) => !enemy.readyToRemove && !enemy.reachedBase).concat(spawned);
  }

  private triggerShield(pos: Vec2): void {
    this.shield = 0;
    this.shieldClearedWave = this.waves.wave;
    this.slowMo = 1.15;
    this.screenShake.screenShake({ duration: 0.28, intensity: 42 });
    this.effects.push(createExplosion(pos.x, pos.y, { radius: 210, color: '#60a5fa', shake: true }));
    this.effects.push(popText('护盾清屏！', 540, 760, { type: 'warning', color: '#dbeafe', size: 70 }));
    if (shieldConfig.clearScreenOnTrigger) {
      this.enemies.forEach((item) => {
        item.reachedBase = false;
      });
      this.enemies = [];
      this.projectiles = [];
      this.waves.forceCompleteCurrentWave();
    }
  }

  private handleWaveCleared(): void {
    if (this.phase !== 'playing' || this.baseHp <= 0) return;
    if (this.waves.active || this.enemies.length > 0 || this.waves.wave <= this.completedWaves) return;

    this.completedWaves = this.waves.wave;
    this.challengeWave = Math.min(MAX_WAVES, this.completedWaves + 1);
    saveCurrentWave(this.challengeWave);
    const bossCleared = this.waves.isBossWave(this.completedWaves);
    const reward = bossCleared ? economyConfig.bossClearReward : economyConfig.waveClearReward;
    this.economy.add(reward);
    this.effects.push(popText(`预算 +${reward}`, 540, 460, { type: 'coin', color: '#fde68a', size: 42 }));

    if (bossCleared && shieldConfig.gainAfterBossWave && this.shieldClearedWave !== this.completedWaves) {
      this.shield = Math.min(shieldConfig.max, this.shield + 1);
      this.effects.push(popText('获得护盾', 540, 540, { type: 'warning', color: '#bfdbfe', size: 48 }));
    }
  }

  private endGame(phase: 'won' | 'lost'): void {
    if (this.phase === 'won' || this.phase === 'lost') return;
    this.phase = phase;
    this.selectedSpot = undefined;
    this.selectedTower = undefined;
    this.emitStats();
  }

  private handleTap = (point: Vec2): void => {
    if (this.phase !== 'playing') return;
    const upgradeTower = this.towers.find((item) => this.canUpgradeNow(item) && this.isUpgradeTap(point, item));
    if (upgradeTower) {
      this.upgradeTower(upgradeTower);
      return;
    }

    const tower = this.towers.find((item) => Math.hypot(item.pos.x - point.x, item.pos.y - point.y) < 70);
    if (tower) {
      this.selectedTower = tower.id;
      this.selectedSpot = undefined;
      this.selectedBuildKind = undefined;
      this.emitStats();
      return;
    }
    const spotIndex = buildSpots.findIndex((spot) => Math.hypot(spot.x - point.x, spot.y - point.y) < 72);
    if (spotIndex >= 0 && this.selectedBuildKind !== undefined) {
      this.deployTower(this.selectedBuildKind, spotIndex);
      return;
    }
    this.selectedSpot = spotIndex >= 0 ? spotIndex : undefined;
    this.selectedTower = undefined;
    if (spotIndex < 0) this.selectedBuildKind = undefined;
    this.emitStats();
  };

  private canUpgradeNow(tower: Tower): boolean {
    return tower.level < MAX_TOWER_LEVEL && this.economy.coins >= tower.upgradeCost;
  }

  private isUpgradeTap(point: Vec2, tower: Tower): boolean {
    const onTower = Math.hypot(tower.pos.x - point.x, tower.pos.y - point.y) < 70;
    const hintCenter = { x: tower.x + 48, y: tower.y - 78 };
    const onHint = Math.abs(point.x - hintCenter.x) <= 44 && Math.abs(point.y - hintCenter.y) <= 42;
    return onTower || onHint;
  }

  private bumpShake(amount: number): void {
    this.screenShake.screenShake({ duration: 0.14, intensity: amount });
  }

  private playBossIntro(nextWave: number): void {
    if (this.bossIntroWave === nextWave) return;
    this.bossIntroWave = nextWave;
    this.bossIntroTotal = effectsConfig.bossIntroDuration;
    this.bossIntro = this.bossIntroTotal;
    this.bossWarning = this.bossIntroTotal;
    this.effects.push(popText('老板来了！', 540, 780, { type: 'warning', color: '#fef2f2', size: 82 }));
    this.screenShake.screenShake({ duration: 0.2, intensity: 26 });
  }

  private handleKey = (event: KeyboardEvent): void => {
    if (event.key.toLowerCase() === 'd') {
      this.debugEffects = !this.debugEffects;
      this.effects.push(popText(this.debugEffects ? '特效调试 ON' : '特效调试 OFF', 540, 460, { type: 'warning', color: '#facc15', size: 48 }));
      return;
    }
    if (!this.debugEffects) return;
    if (event.key === '1') this.debugEnemyHit();
    if (event.key === '2') this.debugTowerAttack();
    if (event.key === '3') this.effects.push(createExplosion(540, 900, { radius: 150, color: '#fb923c', shake: true }));
    if (event.key === '4') this.screenShake.screenShake({ duration: 0.2, intensity: 28 });
    if (event.key === '5') this.playBossIntro(this.waves.wave + 1);
    if (event.key === '6') this.effects.push(popText('暴击 -120', 540, 860, { type: 'critical', color: '#f97316', size: 58 }));
    if (event.key === '7') this.debugHealthBar();
  };

  private debugEnemyHit(): void {
    let enemy = this.enemies.find((item) => item.targetable);
    if (!enemy) {
      enemy = new Enemy(this.waves.nextEnemyId++, 'yellow', Math.max(this.waves.wave, 1), 0);
      enemy.pos = { x: 540, y: 850 };
      this.enemies.push(enemy);
    }
    const damage = Math.min(35, enemy.hp);
    enemy.takeDamage(damage);
    spawnDamageText(this.damageTexts, enemy, damage);
    playEnemyHit(enemy, damage, this.effects, false, false);
  }

  private debugTowerAttack(): void {
    const tower = this.towers[0] ?? new Tower(this.towerId++, 'machineGun', buildSpots[0]);
    if (!this.towers.includes(tower)) this.towers.push(tower);
    playTowerAttack(tower, 540, 850, this.effects);
    this.projectiles.push(new Projectile(tower.kind, tower.pos, { x: 540, y: 850 }, towerConfigs[tower.kind].color));
  }

  private debugHealthBar(): void {
    let enemy = this.enemies.find((item) => item.targetable) ?? new Enemy(this.waves.nextEnemyId++, 'boss', Math.max(this.waves.wave, 10), 0);
    if (!this.enemies.includes(enemy)) {
      enemy.pos = { x: 540, y: 840 };
      this.enemies.push(enemy);
    }
    const damage = Math.max(20, enemy.maxHp * 0.18);
    enemy.takeDamage(damage);
    spawnDamageText(this.damageTexts, enemy, damage, true);
    playEnemyHit(enemy, damage, this.effects, true, false);
  }

  private snapshot(): GameSnapshot {
    return {
      ...this.stats(),
      baseHp: this.baseHp,
      towers: this.towers,
      enemies: this.enemies,
      projectiles: this.projectiles,
      hitEffects: this.hitEffects,
      effects: this.effects,
      particles: this.particles,
      damageTexts: this.damageTexts,
      shake: this.shake,
      bossWarning: this.bossWarning,
      bossIntro: this.bossIntro,
      bossIntroTotal: this.bossIntroTotal,
    };
  }

  private stats(): GameStats {
    const selectedTower = this.towers.find((tower) => tower.id === this.selectedTower);
    return {
      wave: this.waves.wave,
      hp: Math.max(this.baseHp, 0),
      coins: this.economy.coins,
      kills: this.kills,
      phase: this.phase,
      speed: this.speed,
      shield: this.shield,
      completedWaves: this.completedWaves,
      challengeWave: this.challengeWave,
      wavePreview: this.makeWavePreview(),
      lastFailReason: this.lastFailReason,
      towerLayout: this.towers.map((tower) => ({
        kind: tower.kind,
        level: tower.level,
        spot: buildSpots.findIndex((spot) => Math.hypot(spot.x - tower.x, spot.y - tower.y) < 2) + 1,
        x: tower.x,
        y: tower.y,
      })),
      selectedSpot: this.selectedSpot,
      selectedTower: this.selectedTower,
      selectedBuildKind: this.selectedBuildKind,
      selectedTowerCanUpgrade: selectedTower ? this.canUpgradeNow(selectedTower) : undefined,
      selectedTowerIsMaxLevel: selectedTower ? selectedTower.level >= MAX_TOWER_LEVEL : undefined,
      selectedTowerUpgradeCost: selectedTower && selectedTower.level < MAX_TOWER_LEVEL ? selectedTower.upgradeCost : undefined,
      selectedTowerUpgradeProgress: selectedTower
        ? selectedTower.level >= MAX_TOWER_LEVEL
          ? 1
          : Math.min(this.economy.coins / selectedTower.upgradeCost, 1)
        : undefined,
      title: this.makeTitle(),
    };
  }

  private emitStats(): void {
    this.statsListener?.(this.stats());
  }

  private makeTitle(): string {
    if (this.phase === 'won') return '人类最后防线';
    if (this.kills > 220) return '老板克星';
    if (this.baseHp <= 1) return '差一点战神';
    if (this.waves.wave >= 20) return '工位钉子户';
    return titles[this.waves.wave % titles.length];
  }

  private makeWavePreview(): string {
    if (this.phase !== 'playing' && this.phase !== 'paused') return '';
    const wave = this.waves.active || this.enemies.length > 0 ? this.waves.wave : Math.min(this.waves.wave + 1, MAX_WAVES);
    return this.waves.getWaveBrief(Math.max(1, wave));
  }

  private makeFailReason(): string {
    const reasons = [
      '不是怪太强，是你阵型没想明白',
      `第${Math.max(this.waves.wave, 1)}波就噶？建议重新规划塔位`,
      '你不是输给怪，是输给了摆放位置',
      '这波需要换阵，不是硬扛',
    ];
    return reasons[Math.max(0, this.waves.wave - 1) % reasons.length];
  }
}
