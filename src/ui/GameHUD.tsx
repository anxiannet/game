import type { CSSProperties } from 'react';
import { BASE_HP } from '../game/config';
import type { GameStats } from '../game/Game';

type Props = {
  stats: GameStats;
  onPause: () => void;
  onSpeed: () => void;
  onUpgrade: () => void;
  onSell: () => void;
};

export default function GameHUD({ stats, onPause, onSpeed, onUpgrade, onSell }: Props) {
  const showTowerActions = stats.selectedTower !== undefined && stats.phase === 'playing';
  const hpRatio = Math.max(0, Math.min(stats.hp / BASE_HP, 1));
  const hpStyle = { '--hp-width': `${hpRatio * 100}%` } as CSSProperties & Record<'--hp-width', string>;
  const upgradeProgress = Math.max(0, Math.min(stats.selectedTowerUpgradeProgress ?? 0, 1));
  const upgradeProgressStyle = { '--upgrade-progress': `${upgradeProgress * 100}%` } as CSSProperties & Record<'--upgrade-progress', string>;
  const upgradeLabel = stats.selectedTowerIsMaxLevel ? '满级' : '升级';
  const upgradeHint = stats.selectedTowerIsMaxLevel ? '已满级' : `金币 ${stats.coins}/${stats.selectedTowerUpgradeCost ?? 0}`;
  return (
    <>
      <div className={`hud-top ${stats.hp <= 3 ? 'danger' : ''}`}>
        <div className="hud-plate wave-plate"><span>第{stats.wave}波</span><strong>击败{stats.kills}</strong></div>
        <div className="hud-meter hp-meter" style={hpStyle}>
          <span className="hud-icon heart" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M12 21.2 3.9 13.6C-.4 9.6 2.3 2.8 8.1 2.8c1.8 0 3.4.8 4.4 2.2 1-1.4 2.6-2.2 4.4-2.2 5.8 0 8.5 6.8 4.2 10.8L12 21.2Z" />
            </svg>
          </span>
          <strong><span className="hp-text">{stats.hp}/{BASE_HP}</span></strong>
        </div>
      </div>
      <div className={`shield-pill ${stats.shield > 0 ? 'ready' : ''}`}>
        <span>盾</span><strong>{stats.shield}/1</strong>
      </div>
      {stats.wavePreview && <div className="wave-preview">{stats.wavePreview}</div>}
      <div className="side-controls">
        <button className="square-button" onClick={onPause} aria-label={stats.phase === 'paused' ? '继续' : '暂停'}>
          <span>{stats.phase === 'paused' ? '继续' : '暂停'}</span>
        </button>
        <button className="square-button yellow" onClick={onSpeed} aria-label="加速">
          <span>{stats.speed}x</span>
        </button>
      </div>
      <div className="coin-float hud-meter coin-meter">
        <span className="hud-icon coin">$</span>
        <strong>{stats.coins}</strong>
      </div>
      {(stats.selectedSpot !== undefined || stats.selectedBuildKind !== undefined) && stats.phase === 'playing' && (
        <div className="action-tip">{stats.selectedBuildKind !== undefined ? '点空位，马上部署' : '选择炮塔，马上顶住'}</div>
      )}
      {showTowerActions && (
        <div className="tower-actions">
          <div className="upgrade-action">
            <button className="metal-button green" onClick={onUpgrade} disabled={!stats.selectedTowerCanUpgrade}>
              <span>⬆</span>{upgradeLabel}
            </button>
            <div className={`upgrade-progress ${stats.selectedTowerIsMaxLevel ? 'full' : ''}`} style={upgradeProgressStyle}>
              <span>{upgradeHint}</span>
            </div>
          </div>
          <button className="metal-button red" onClick={onSell}><span>$</span>出售</button>
        </div>
      )}
      {stats.phase === 'paused' && (
        <div className="pause-mask">
          <div className="pause-title">暂停中</div>
          <button className="metal-button yellow" onClick={onPause}><span>▶</span>继续顶住</button>
        </div>
      )}
    </>
  );
}
