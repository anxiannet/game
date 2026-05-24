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
  return (
    <>
      <div className={`hud-top ${stats.hp <= 3 ? 'danger' : ''}`}>
        <div><span>波次</span><strong>{stats.wave}/50</strong></div>
        <div><span>工位</span><strong>{stats.hp}</strong></div>
        <div><span>金币</span><strong>{stats.coins}</strong></div>
        <button onClick={onPause}>{stats.phase === 'paused' ? '继续' : '暂停'}</button>
        <button onClick={onSpeed}>{stats.speed}x</button>
      </div>
      {stats.selectedSpot !== undefined && stats.phase === 'playing' && (
        <div className="action-tip">选择炮塔，马上顶住</div>
      )}
      {showTowerActions && (
        <div className="tower-actions">
          <button onClick={onUpgrade}>升级</button>
          <button onClick={onSell}>出售</button>
        </div>
      )}
      {stats.phase === 'paused' && <div className="pause-mask">暂停中</div>}
    </>
  );
}
