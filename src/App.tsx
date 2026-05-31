import { useEffect, useRef, useState } from 'react';
import { BASE_HP, economyConfig } from './game/config';
import { Game, GameStats } from './game/Game';
import { audioManager } from './lib/audioManager';
import AudioManagerPage from './ui/AudioManagerPage';
import GameHUD from './ui/GameHUD';
import PathPointTool from './ui/PathPointTool';
import ResultScreen from './ui/ResultScreen';
import TowerBar from './ui/TowerBar';

const initialStats: GameStats = {
  wave: 0,
  hp: BASE_HP,
  coins: economyConfig.initialCoins,
  kills: 0,
  phase: 'playing',
  speed: 1,
  shield: 0,
  completedWaves: 0,
  challengeWave: 1,
  wavePreview: '',
  towerLayout: [],
};

export default function App() {
  const tool = new URLSearchParams(window.location.search).get('tool');
  const isPathTool = tool === 'path' || tool === 'build';
  const isAudioTool = tool === 'audio';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const [stats, setStats] = useState<GameStats>(initialStats);

  useEffect(() => {
    if (isPathTool || isAudioTool) return;
    if (!canvasRef.current) return;
    void audioManager.preload();
    const game = new Game(canvasRef.current);
    gameRef.current = game;
    game.onStats(setStats);
    game.start();
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, [isPathTool, isAudioTool]);

  if (isPathTool) return <PathPointTool mode={tool === 'build' ? 'build' : 'path'} />;
  if (isAudioTool) return <AudioManagerPage />;

  const playClick = () => audioManager.play('ui_click');

  return (
    <main className="app-shell">
      <div className="game-frame">
        <canvas ref={canvasRef} className="game-canvas" aria-label="顶不住了游戏画布" />
        <GameHUD
          stats={stats}
          onPause={() => {
            playClick();
            gameRef.current?.togglePause();
          }}
          onSpeed={() => {
            playClick();
            gameRef.current?.toggleSpeed();
          }}
          onUpgrade={() => {
            playClick();
            gameRef.current?.upgradeSelected();
          }}
          onSell={() => {
            playClick();
            gameRef.current?.sellSelected();
          }}
        />
        <TowerBar
          coins={stats.coins}
          canBuild={stats.phase === 'playing'}
          selectedKind={stats.selectedBuildKind}
          onBuild={(kind) => {
            playClick();
            gameRef.current?.buildTower(kind);
          }}
        />
        <ResultScreen
          stats={stats}
          onRetryCurrent={() => {
            playClick();
            gameRef.current?.retryCurrentWave();
          }}
          onRestart={() => {
            playClick();
            gameRef.current?.restart();
          }}
        />
      </div>
    </main>
  );
}
