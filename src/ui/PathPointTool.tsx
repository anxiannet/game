import { useMemo, useRef, useState } from 'react';
import { assetManifest } from '../assets/assetManifest';
import { DESIGN_HEIGHT, DESIGN_WIDTH, Vec2 } from '../game/config';

const STORAGE_KEY = 'dingbuzhule:path-points';

function loadPoints(): Vec2[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Vec2[];
    return parsed.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  } catch {
    return [];
  }
}

function formatPoints(points: Vec2[]): string {
  const lines = points.map((point) => `  { x: ${Math.round(point.x)}, y: ${Math.round(point.y)} },`);
  return `export const pathPoints: Vec2[] = [\n${lines.join('\n')}\n];`;
}

export default function PathPointTool() {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [points, setPoints] = useState<Vec2[]>(loadPoints);
  const [copied, setCopied] = useState(false);
  const output = useMemo(() => formatPoints(points), [points]);

  const savePoints = (next: Vec2[]) => {
    setPoints(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setCopied(false);
  };

  const addPoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((event.clientX - rect.left) / rect.width) * DESIGN_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * DESIGN_HEIGHT;
    savePoints([...points, { x: Math.round(x), y: Math.round(y) }]);
  };

  const undo = () => savePoints(points.slice(0, -1));
  const clear = () => savePoints([]);
  const copy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
  };

  const polyline = points.map((point) => `${(point.x / DESIGN_WIDTH) * 100},${(point.y / DESIGN_HEIGHT) * 100}`).join(' ');

  return (
    <main className="tool-shell">
      <div ref={frameRef} className="path-tool-frame" onPointerDown={addPoint}>
        <img className="path-tool-map" src={assetManifest.maps.industrial} alt="地图标点" draggable={false} />
        <svg className="path-tool-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
          {points.length > 1 && <polyline points={polyline} fill="none" stroke="#facc15" strokeWidth="0.45" />}
        </svg>
        {points.map((point, index) => (
          <span
            className="path-point"
            key={`${point.x}-${point.y}-${index}`}
            style={{ left: `${(point.x / DESIGN_WIDTH) * 100}%`, top: `${(point.y / DESIGN_HEIGHT) * 100}%` }}
          >
            {index + 1}
          </span>
        ))}
      </div>
      <section className="path-tool-panel">
        <div className="path-tool-title">
          <strong>路径标点</strong>
          <span>{points.length} 点</span>
        </div>
        <div className="path-tool-actions">
          <button disabled={points.length === 0} onClick={undo}>撤销</button>
          <button disabled={points.length === 0} onClick={clear}>清空</button>
          <button disabled={points.length === 0} onClick={copy}>{copied ? '已复制' : '复制'}</button>
        </div>
        <textarea readOnly value={output} />
      </section>
    </main>
  );
}
