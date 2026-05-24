import type { GameStats } from '../game/Game';

type Props = {
  stats: GameStats;
  onRestart: () => void;
};

export default function ResultScreen({ stats, onRestart }: Props) {
  if (stats.phase !== 'won' && stats.phase !== 'lost') return null;
  const percent = Math.min(99, Math.max(12, Math.round(stats.wave * 1.7 + stats.kills * 0.09 + stats.hp * 2)));
  return (
    <div className="result-screen">
      <div className="result-panel">
        <p>{stats.phase === 'won' ? '守住了' : '顶不住了'}</p>
        <h1>{stats.title}</h1>
        <div className="result-grid">
          <div><span>守到</span><strong>第 {stats.wave} 波</strong></div>
          <div><span>击败</span><strong>{stats.kills}</strong></div>
          <div><span>血量</span><strong>{stats.hp}</strong></div>
          <div><span>超过</span><strong>{percent}%</strong></div>
        </div>
        <h2>{stats.phase === 'won' ? '老板今天没能突破你的工位。' : '差一点就守住，真的就差一点。'}</h2>
        <button onClick={onRestart}>再顶一局</button>
      </div>
    </div>
  );
}
