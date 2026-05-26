import { useState } from 'react';
import type { GameStats } from '../game/Game';

type Props = {
  stats: GameStats;
  onRetryCurrent: () => void;
  onRestart: () => void;
};

export default function ResultScreen({ stats, onRetryCurrent, onRestart }: Props) {
  const [shareStatus, setShareStatus] = useState('');
  const stressAge = stats.completedWaves;
  const report = getStressAgeReport(stressAge);
  const percent = Math.min(99, Math.max(12, Math.round(stressAge * 3.2 + stats.kills * 0.08 + stats.shield * 3)));

  if (stats.phase !== 'won' && stats.phase !== 'lost') return null;
  const won = stats.phase === 'won';
  const shareTitle = `我的抗压年龄 ${stressAge} 岁`;
  const shareText = [
    `我在《顶不住了》测出抗压年龄 ${stressAge} 岁，你敢测吗？`,
    `${report.title}：通过${stressAge}波，击败${stats.kills}个，超过${percent}%玩家。`,
    won ? '老板今天没能突破我的工位。' : stats.lastFailReason ?? '这波需要换阵，不是硬扛。',
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
        <p>{won ? '抗压通关报告' : '抗压年龄报告'}</p>
        <h1>你的抗压年龄：{stressAge}岁</h1>
        <h2>{report.title}</h2>
        <div className="result-grid">
          <div><span>通过</span><strong>{stressAge} 波</strong></div>
          <div><span>击败</span><strong>{stats.kills}</strong></div>
          <div><span>护盾</span><strong>{stats.shield}</strong></div>
          <div><span>超过</span><strong>{percent}%</strong></div>
        </div>
        <h2>{won ? report.description : stats.lastFailReason ?? report.description}</h2>
        <div className="result-actions">
          <button className="metal-button yellow" onClick={handleShare}><span>{won ? '★' : '!'}</span>分享报告</button>
          {!won && <button className="metal-button" onClick={onRetryCurrent}><span>▶</span>重挑第{stats.challengeWave}波</button>}
          <button className="metal-button" onClick={onRestart}><span>↺</span>从头开始</button>
        </div>
        {shareStatus && <div className="share-status">{shareStatus}</div>}
      </div>
    </div>
  );
}

function getStressAgeReport(waves: number): { title: string; description: string } {
  if (waves <= 1) return { title: '宝宝抗压选手', description: '你还在熟悉工位，先别急着硬扛。' };
  if (waves === 2) return { title: '幼儿园小班抗压选手', description: '第2波已经开始验阵，塔位要重新想。' };
  if (waves === 3) return { title: '幼儿园大班抗压选手', description: '你已经不能和小班宝宝一起玩了。' };
  if (waves === 4) return { title: '小学生抗压选手', description: '小怪成群没把你冲散，阵型有点东西。' };
  if (waves === 5) return { title: '初中生抗压选手', description: 'Boss 检定过了，护盾就是你的奖状。' };
  if (waves <= 7) return { title: '高中生抗压选手', description: '你开始理解什么叫每波都要换阵。' };
  if (waves <= 9) return { title: '大学生抗压选手', description: '出口补刀和弯道火力，你都吃过亏了。' };
  if (waves <= 12) return { title: '实习牛马抗压选手', description: '你已经能在高压阵型考试里活很久。' };
  if (waves <= 15) return { title: '成熟打工人抗压选手', description: '老板的节奏被你摸透了一半。' };
  if (waves <= 18) return { title: '中年顶梁柱抗压选手', description: '你不是在守基地，你是在扛部门。' };
  return { title: '退休老干部抗压选手', description: '你已经看淡漏怪，只相信阵型。' };
}
