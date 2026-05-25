import { useState } from 'react';
import type { GameStats } from '../game/Game';

type Props = {
  stats: GameStats;
  onRestart: () => void;
};

export default function ResultScreen({ stats, onRestart }: Props) {
  const [shareStatus, setShareStatus] = useState('');
  const percent = Math.min(99, Math.max(12, Math.round(stats.wave * 1.7 + stats.kills * 0.09 + stats.hp * 2)));

  if (stats.phase !== 'won' && stats.phase !== 'lost') return null;
  const won = stats.phase === 'won';
  const shareTitle = won ? '我守住了老板的加班潮' : '这波我真的顶不住了';
  const shareText = [
    `《顶不住了》${won ? '通关炫耀' : '求助战报'}`,
    `${stats.title}：守到第${stats.wave}波，击败${stats.kills}个，剩余血量${stats.hp}，超过${percent}%玩家。`,
    won ? '老板今天没能突破我的工位。' : '差一点就守住，真的就差一点。',
  ].join('\n');

  const handleShare = async () => {
    setShareStatus('');
    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: shareText });
        setShareStatus('已打开分享');
        return;
      }
      await navigator.clipboard.writeText(shareText);
      setShareStatus('文案已复制');
    } catch {
      try {
        await navigator.clipboard.writeText(shareText);
        setShareStatus('文案已复制');
      } catch {
        setShareStatus('复制失败，长按战报');
      }
    }
  };

  return (
    <div className="result-screen">
      <div className="result-panel">
        <p>{won ? '守住了' : '顶不住了'}</p>
        <h1>{stats.title}</h1>
        <div className="result-grid">
          <div><span>守到</span><strong>第 {stats.wave} 波</strong></div>
          <div><span>击败</span><strong>{stats.kills}</strong></div>
          <div><span>血量</span><strong>{stats.hp}</strong></div>
          <div><span>超过</span><strong>{percent}%</strong></div>
        </div>
        <h2>{won ? '发朋友圈炫耀：老板今天没能突破你的工位。' : '发朋友圈求助：差一点就守住，真的就差一点。'}</h2>
        <div className="result-actions">
          <button className="metal-button yellow" onClick={handleShare}><span>{won ? '★' : '!'}</span>{won ? '朋友圈炫耀' : '朋友圈求助'}</button>
          <button className="metal-button" onClick={onRestart}><span>▶</span>再顶一局</button>
        </div>
        {shareStatus && <div className="share-status">{shareStatus}</div>}
      </div>
    </div>
  );
}
