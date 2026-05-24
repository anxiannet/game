import { useEffect, useRef, useState } from 'react';
import { Game, GameStats } from './game/Game';
import GameHUD from './ui/GameHUD';
import PathPointTool from './ui/PathPointTool';
import ResultScreen from './ui/ResultScreen';
import TowerBar from './ui/TowerBar';

const initialStats: GameStats = {
  wave: 0,
  hp: 10,
  coins: 250,
  kills: 0,
  phase: 'playing',
  speed: 1,
};

export default function App() {
  const tool = new URLSearchParams(window.location.search).get('tool');
  const isPathTool = tool === 'path' || tool === 'build';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const [stats, setStats] = useState<GameStats>(initialStats);

  useEffect(() => {
    if (isPathTool) return;
    if (!canvasRef.current) return;
    const game = new Game(canvasRef.current);
    gameRef.current = game;
    game.onStats(setStats);
    game.start();
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, [isPathTool]);

  if (isPathTool) return <PathPointTool mode={tool === 'build' ? 'build' : 'path'} />;

  return (
    <main className="app-shell">
      <div className="game-frame">
        <canvas ref={canvasRef} className="game-canvas" aria-label="顶不住了游戏画布" />
        <GameHUD
          stats={stats}
          onPause={() => gameRef.current?.togglePause()}
          onSpeed={() => gameRef.current?.toggleSpeed()}
          onUpgrade={() => gameRef.current?.upgradeSelected()}
          onSell={() => gameRef.current?.sellSelected()}
        />
        <TowerBar
          coins={stats.coins}
          canBuild={stats.selectedSpot !== undefined && stats.phase === 'playing'}
          onBuild={(kind) => gameRef.current?.buildTower(kind)}
        />
        <ResultScreen stats={stats} onRestart={() => gameRef.current?.restart()} />
      </div>
    </main>
  );
}
