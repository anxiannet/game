import { useEffect, useMemo, useRef, useState } from 'react';
import { assetManifest } from '../assets/assetManifest';
import { DESIGN_HEIGHT, DESIGN_WIDTH, Vec2 } from '../game/config';

const STORAGE_KEY = 'dingbuzhule:path-points';
const BUILD_STORAGE_KEY = 'dingbuzhule:build-spots';

type ToolMode = 'path' | 'build';

function loadPoints(storageKey: string): Vec2[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Vec2[];
    return parsed.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  } catch {
    return [];
  }
}

function formatPoints(points: Vec2[], mode: ToolMode): string {
  const lines = points.map((point) => `  { x: ${Math.round(point.x)}, y: ${Math.round(point.y)} },`);
  const name = mode === 'build' ? 'buildSpots' : 'pathPoints';
  return `export const ${name}: Vec2[] = [\n${lines.join('\n')}\n];`;
}

type Props = {
  mode?: ToolMode;
};

export default function PathPointTool({ mode = 'path' }: Props) {
  const storageKey = mode === 'build' ? BUILD_STORAGE_KEY : STORAGE_KEY;
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [points, setPoints] = useState<Vec2[]>(() => loadPoints(storageKey));
  const [copied, setCopied] = useState(false);
  const output = useMemo(() => formatPoints(points, mode), [mode, points]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('reset') !== '1') return;
    localStorage.removeItem(storageKey);
    setPoints([]);
  }, [storageKey]);

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
  const title = mode === 'build' ? '建筑位置标点' : '路径标点';

  return (
    <main className="tool-shell">
      <div ref={frameRef} className="path-tool-frame" onPointerDown={addPoint}>
        <img className="path-tool-map" src={assetManifest.maps.industrial} alt="地图标点" draggable={false} />
        <svg className="path-tool-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
          {mode === 'path' && points.length > 1 && <polyline points={polyline} fill="none" stroke="#facc15" strokeWidth="0.45" />}
        </svg>
        {points.map((point, index) => (
          <span
            className={mode === 'build' ? 'path-point build-point' : 'path-point'}
            key={`${point.x}-${point.y}-${index}`}
            style={{ left: `${(point.x / DESIGN_WIDTH) * 100}%`, top: `${(point.y / DESIGN_HEIGHT) * 100}%` }}
          >
            {index + 1}
          </span>
        ))}
      </div>
      <section className="path-tool-panel">
        <div className="path-tool-title">
          <strong>{title}</strong>
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
