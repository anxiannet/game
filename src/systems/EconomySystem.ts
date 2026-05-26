import { economyConfig } from '../game/config';

export class EconomySystem {
  coins = economyConfig.initialCoins;

  canAfford(cost: number): boolean {
    return this.coins >= cost;
  }

  spend(cost: number): boolean {
    if (!this.canAfford(cost)) return false;
    this.coins -= cost;
    return true;
  }

  add(amount: number): void {
    this.coins += amount;
  }
}
