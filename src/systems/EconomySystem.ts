export class EconomySystem {
  coins = 250;

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
