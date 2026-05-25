import { TowerKind, towerConfigs } from '../game/config';

const towerOrder: TowerKind[] = ['machineGun', 'coffee', 'frost', 'bomb', 'tesla'];
const labels: Record<TowerKind, string> = {
  machineGun: '胶带',
  coffee: '咖啡',
  frost: '风扇',
  bomb: '炸弹',
  tesla: '电磁',
};

const icons: Record<TowerKind, string> = {
  machineGun: '⌖',
  coffee: '☕',
  frost: '◉',
  bomb: '●',
  tesla: '⚡',
};

type Props = {
  coins: number;
  canBuild: boolean;
  onBuild: (kind: TowerKind) => void;
};

export default function TowerBar({ coins, canBuild, onBuild }: Props) {
  return (
    <div className="tower-bar">
      {towerOrder.map((kind) => {
        const cfg = towerConfigs[kind];
        const disabled = !canBuild || coins < cfg.price;
        return (
          <button className="tower-button" disabled={disabled} key={kind} onClick={() => onBuild(kind)}>
            <span className="tower-icon" style={{ ['--tower-color' as string]: cfg.color }}>{icons[kind]}</span>
            <strong>{labels[kind]}</strong>
            <small><span>$</span>{cfg.price}</small>
          </button>
        );
      })}
    </div>
  );
}
