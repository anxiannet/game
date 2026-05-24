import { Enemy } from '../entities/Enemy';
import { Effect } from '../entities/Effect';
import { Projectile } from '../entities/Projectile';
import { Tower } from '../entities/Tower';
import { EconomySystem } from '../systems/EconomySystem';
import { TowerSystem } from '../systems/TowerSystem';
import { WaveSystem } from '../systems/WaveSystem';
import { buildSpots, MAX_WAVES, titles, TowerKind, towerConfigs, Vec2 } from './config';
import { GameLoop } from './GameLoop';
import { Input } from './Input';
import { Renderer } from './Renderer';

export type GamePhase = 'playing' | 'paused' | 'won' | 'lost';

export type GameStats = {
  wave: number;
  hp: number;
  coins: number;
  kills: number;
  phase: GamePhase;
  speed: number;
  selectedSpot?: number;
  selectedTower?: number;
  title?: string;
};

export type GameSnapshot = GameStats & {
  baseHp: number;
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  effects: Effect[];
  shake: number;
  bossWarning: number;
};

export class Game {
  private renderer: Renderer;
  private input: Input;
  private loop: GameLoop;
  private economy = new EconomySystem();
  private waves = new WaveSystem();
  private towerSystem = new TowerSystem();
  private towers: Tower[] = [];
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private effects: Effect[] = [];
  private selectedSpot?: number;
  private selectedTower?: number;
  private towerId = 1;
  private baseHp = 10;
  private kills = 0;
  private phase: GamePhase = 'playing';
  private speed = 1;
  private waveDelay = 0.8;
  private shake = 0;
  private slowMo = 0;
  private oneHpSlowMoUsed = false;
  private bossWarning = 0;
  private statsListener?: (stats: GameStats) => void;
  private resizeHandler: () => void;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.input = new Input(canvas, this.handleTap);
    this.loop = new GameLoop(this.tick);
    this.resizeHandler = this.renderer.resize.bind(this.renderer);
    window.addEventListener('resize', this.resizeHandler);
  }

  start(): void {
    this.waves.startNextWave();
    this.emitStats();
    this.loop.start();
  }

  destroy(): void {
    this.loop.stop();
    this.input.destroy();
    window.removeEventListener('resize', this.resizeHandler);
  }

  onStats(listener: (stats: GameStats) => void): void {
    this.statsListener = listener;
    this.emitStats();
  }

  buildTower(kind: TowerKind): void {
    if (this.phase !== 'playing' || this.selectedSpot === undefined) return;
    if (this.towers.some((tower) => tower.pos.x === buildSpots[this.selectedSpot!].x && tower.pos.y === buildSpots[this.selectedSpot!].y)) return;
    const cost = towerConfigs[kind].price;
    if (!this.economy.spend(cost)) {
      this.bumpShake(10);
      return;
    }
    this.towers.push(new Tower(this.towerId++, kind, buildSpots[this.selectedSpot]));
    this.effects.push(new Effect('coin', buildSpots[this.selectedSpot], { text: `-${cost}`, color: '#f97316' }));
    this.selectedSpot = undefined;
    this.emitStats();
  }

  upgradeSelected(): void {
    const tower = this.towers.find((item) => item.id === this.selectedTower);
    if (!tower || tower.level >= 5) return;
    if (!this.economy.spend(tower.upgradeCost)) {
      this.bumpShake(10);
      return;
    }
    tower.level += 1;
    this.effects.push(new Effect('coin', tower.pos, { text: `Lv.${tower.level}`, color: '#fbbf24' }));
    this.emitStats();
  }

  sellSelected(): void {
    const index = this.towers.findIndex((item) => item.id === this.selectedTower);
    if (index < 0) return;
    const [tower] = this.towers.splice(index, 1);
    this.economy.add(tower.sellValue);
    this.effects.push(new Effect('coin', tower.pos, { text: `+${tower.sellValue}`, color: '#facc15' }));
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
    this.economy = new EconomySystem();
    this.waves = new WaveSystem();
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
    this.selectedSpot = undefined;
    this.selectedTower = undefined;
    this.baseHp = 10;
    this.kills = 0;
    this.phase = 'playing';
    this.speed = 1;
    this.waveDelay = 0.8;
    this.shake = 0;
    this.slowMo = 0;
    this.oneHpSlowMoUsed = false;
    this.bossWarning = 0;
    this.waves.startNextWave();
    this.emitStats();
  }

  private tick = (rawDt: number): void => {
    const dt = this.phase === 'playing' ? rawDt * this.speed * (this.slowMo > 0 ? 0.28 : 1) : 0;
    if (this.phase === 'playing') this.update(dt, rawDt);
    this.renderer.render(this.snapshot());
  };

  private update(dt: number, rawDt: number): void {
    this.shake = Math.max(0, this.shake - rawDt * 32);
    this.slowMo = Math.max(0, this.slowMo - rawDt);
    this.bossWarning = Math.max(0, this.bossWarning - rawDt);

    if (this.waves.shouldAutoStart(this.enemies.length)) {
      this.waveDelay -= dt;
      if (this.waveDelay <= 0) {
        this.waves.startNextWave();
        this.waveDelay = Math.max(0.25, 0.95 - this.waves.wave * 0.02);
        if (this.waves.wave % 10 === 0) {
          this.bossWarning = 1.7;
          this.bumpShake(24);
        }
      }
    }

    this.enemies.push(...this.waves.update(dt));
    this.enemies.forEach((enemy) => enemy.update(dt));
    this.towerSystem.update(dt, this.towers, this.enemies, this.projectiles, this.effects);
    this.projectiles.forEach((projectile) => projectile.update(dt));
    this.effects.forEach((effect) => effect.update(dt));
    this.handleDeathsAndLeaks();
    this.projectiles = this.projectiles.filter((projectile) => !projectile.done);
    this.effects = this.effects.filter((effect) => !effect.done);

    if (this.baseHp <= 0) this.endGame('lost');
    if (this.waves.wave >= MAX_WAVES && !this.waves.active && this.enemies.length === 0) this.endGame('won');
    this.emitStats();
  }

  private handleDeathsAndLeaks(): void {
    const spawned: Enemy[] = [];
    for (const enemy of this.enemies) {
      if (enemy.dead && !enemy.rewardClaimed) {
        enemy.rewardClaimed = true;
        this.kills += 1;
        this.economy.add(enemy.reward);
        this.effects.push(new Effect('coin', enemy.pos, { text: `+${enemy.reward}`, color: '#facc15' }));
        if (enemy.kind === 'requirement') {
          spawned.push(new Enemy(this.waves.nextEnemyId++, 'yellow', this.waves.wave, 0));
          spawned.push(new Enemy(this.waves.nextEnemyId++, 'yellow', this.waves.wave, 18));
          spawned.forEach((child) => {
            child.pos = { ...enemy.pos };
            child.pathIndex = enemy.pathIndex;
          });
        }
        if (enemy.kind === 'boss' || enemy.radius > 30) {
          this.effects.push(new Effect('explosion', enemy.pos, { size: enemy.kind === 'boss' ? 170 : 95, color: '#f97316' }));
          this.bumpShake(enemy.kind === 'boss' ? 30 : 14);
        }
      }

      if (enemy.reachedBase) {
        this.baseHp -= enemy.damage;
        this.effects.push(new Effect('leak', enemy.pos, { color: '#ef4444', size: 90, maxLife: 0.35 }));
        this.bumpShake(28);
        if (this.baseHp === 1 && !this.oneHpSlowMoUsed) {
          this.oneHpSlowMoUsed = true;
          this.slowMo = 2;
          this.bumpShake(36);
        }
      }
    }
    this.enemies = this.enemies.filter((enemy) => !enemy.readyToRemove && !enemy.reachedBase).concat(spawned);
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
    const tower = this.towers.find((item) => Math.hypot(item.pos.x - point.x, item.pos.y - point.y) < 70);
    if (tower) {
      this.selectedTower = tower.id;
      this.selectedSpot = undefined;
      this.emitStats();
      return;
    }
    const spotIndex = buildSpots.findIndex((spot) => Math.hypot(spot.x - point.x, spot.y - point.y) < 72);
    this.selectedSpot = spotIndex >= 0 ? spotIndex : undefined;
    this.selectedTower = undefined;
    this.emitStats();
  };

  private bumpShake(amount: number): void {
    this.shake = Math.max(this.shake, amount);
  }

  private snapshot(): GameSnapshot {
    return {
      ...this.stats(),
      baseHp: this.baseHp,
      towers: this.towers,
      enemies: this.enemies,
      projectiles: this.projectiles,
      effects: this.effects,
      shake: this.shake,
      bossWarning: this.bossWarning,
    };
  }

  private stats(): GameStats {
    return {
      wave: this.waves.wave,
      hp: Math.max(this.baseHp, 0),
      coins: this.economy.coins,
      kills: this.kills,
      phase: this.phase,
      speed: this.speed,
      selectedSpot: this.selectedSpot,
      selectedTower: this.selectedTower,
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
}
