import { Vec2 } from '../game/config';

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function inRange(a: Vec2, b: Vec2, range: number): boolean {
  return distance(a, b) <= range;
}
