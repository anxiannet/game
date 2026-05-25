import { assetManifest } from '../assets/assetManifest';
import { TowerKind, towerConfigs } from '../game/config';

const towerOrder: TowerKind[] = ['machineGun', 'frost', 'bomb', 'tesla', 'coffee'];
const labels: Record<TowerKind, string> = {
  machineGun: '胶带',
  coffee: '咖啡',
  frost: '风扇',
  bomb: '微波',
  tesla: 'WiFi',
};

const icons: Record<TowerKind, string> = {
  machineGun: '⌖',
  coffee: '☕',
  frost: '◉',
  bomb: '▣',
  tesla: '⚡',
};

const imageIcons: Partial<Record<TowerKind, string>> = {
  bomb: assetManifest.towers.microwaveIcon,
  tesla: assetManifest.towers.wifiIcon,
  coffee: assetManifest.towers.coffeeIcon,
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
            <span className="tower-icon" style={{ ['--tower-color' as string]: cfg.color }}>
              {imageIcons[kind] ? <img src={imageIcons[kind]} alt="" draggable={false} /> : icons[kind]}
            </span>
            <strong>{labels[kind]}</strong>
            <small><span>$</span>{cfg.price}</small>
          </button>
        );
      })}
    </div>
  );
}
