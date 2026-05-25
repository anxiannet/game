import { assetManifest } from '../assets/assetManifest';
import { TowerKind, towerConfigs } from '../game/config';

const towerOrder: TowerKind[] = ['machineGun', 'frost', 'bomb', 'tesla', 'coffee'];
const labels: Record<TowerKind, string> = {
  machineGun: '胶带塔',
  coffee: '咖啡塔',
  frost: '风扇塔',
  bomb: '微波塔',
  tesla: '无线塔',
};

const imageIcons: Record<TowerKind, string> = {
  machineGun: assetManifest.towers.machineGunTapeLevel1,
  frost: assetManifest.towers.fanSlowLevel1,
  bomb: assetManifest.towers.microwaveTowerLevel1,
  tesla: assetManifest.towers.wifiTowerLevel1,
  coffee: assetManifest.towers.coffeeTowerLevel1,
};

type Props = {
  coins: number;
  canBuild: boolean;
  selectedKind?: TowerKind;
  onBuild: (kind: TowerKind) => void;
};

export default function TowerBar({ coins, canBuild, selectedKind, onBuild }: Props) {
  return (
    <div className="tower-bar">
      {towerOrder.map((kind) => {
        const cfg = towerConfigs[kind];
        const disabled = !canBuild || coins < cfg.price;
        const affordable = canBuild && coins >= cfg.price;
        const buyProgress = Math.max(0, Math.min(100, (coins / cfg.price) * 100));
        return (
          <button
            className={`tower-button tower-button-${kind} ${affordable ? 'can-buy' : 'cant-buy'} ${selectedKind === kind ? 'selected-build' : ''}`}
            disabled={disabled}
            key={kind}
            onClick={() => onBuild(kind)}
            style={{ ['--tower-color' as string]: cfg.color, ['--buy-progress' as string]: `${buyProgress}%` }}
          >
            <span className="tower-icon">
              <img src={imageIcons[kind]} alt="" draggable={false} />
              {!affordable && <span className="buy-countdown" aria-hidden="true" />}
            </span>
            <strong>{labels[kind]}</strong>
            <small><span>$</span>{cfg.price}</small>
          </button>
        );
      })}
    </div>
  );
}
