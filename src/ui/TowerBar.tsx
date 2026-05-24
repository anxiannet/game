import { TowerKind, towerConfigs } from '../game/config';

const towerOrder: TowerKind[] = ['machineGun', 'frost', 'bomb', 'tesla', 'flame'];
const labels: Record<TowerKind, string> = {
  machineGun: '机枪',
  frost: '冰冻',
  bomb: '炸弹',
  tesla: '电磁',
  flame: '火焰',
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
            <span className="tower-icon" style={{ ['--tower-color' as string]: cfg.color }} />
            <strong>{labels[kind]}</strong>
            <small>{cfg.price}</small>
          </button>
        );
      })}
    </div>
  );
}
