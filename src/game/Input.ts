import { DESIGN_HEIGHT, DESIGN_WIDTH, Vec2 } from './config';

export class Input {
  private rect?: DOMRect;

  constructor(private canvas: HTMLCanvasElement, private onTap: (point: Vec2) => void) {
    this.canvas.addEventListener('pointerdown', this.handlePointerDown, { passive: true });
    window.addEventListener('resize', this.measure);
    this.measure();
  }

  destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('resize', this.measure);
  }

  private measure = (): void => {
    this.rect = this.canvas.getBoundingClientRect();
  };

  private handlePointerDown = (event: PointerEvent): void => {
    this.measure();
    if (!this.rect) return;
    const x = ((event.clientX - this.rect.left) / this.rect.width) * DESIGN_WIDTH;
    const y = ((event.clientY - this.rect.top) / this.rect.height) * DESIGN_HEIGHT;
    this.onTap({ x, y });
  };
}
