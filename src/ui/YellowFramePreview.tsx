import { useEffect, useRef } from 'react';
import { assetManifest } from '../assets/assetManifest';
import { SpriteFrame, slackerMonsterSpriteAtlas, yellowMonsterSpriteAtlas } from '../game/config';

const originalRunFrames: SpriteFrame[] = [
  { x: 28, y: 302, w: 170, h: 122 },
  { x: 230, y: 299, w: 151, h: 120 },
  { x: 423, y: 299, w: 148, h: 119 },
  { x: 603, y: 298, w: 148, h: 120 },
  { x: 778, y: 298, w: 157, h: 120 },
  { x: 970, y: 299, w: 150, h: 119 },
  { x: 1155, y: 298, w: 156, h: 121 },
  { x: 1341, y: 298, w: 151, h: 121 },
];

function drawFrame(canvas: HTMLCanvasElement, image: HTMLImageElement, frame: SpriteFrame): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const scale = Math.min((canvas.width - 16) / frame.w, (canvas.height - 16) / frame.h);
  const width = frame.w * scale;
  const height = frame.h * scale;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#1c1f26';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, frame.x, frame.y, frame.w, frame.h, (canvas.width - width) / 2, canvas.height - height - 5, width, height);
}

type FrameStripProps = {
  frames: SpriteFrame[];
  label: string;
  src?: string;
};

function FrameStrip({ frames, label, src = assetManifest.enemies.yellow }: FrameStripProps) {
  const refs = useRef<Array<HTMLCanvasElement | null>>([]);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      refs.current.forEach((canvas, index) => {
        if (!canvas) return;
        drawFrame(canvas, image, frames[index]);
      });
    };
    image.src = src;
  }, [frames, src]);

  return (
    <section className="yellow-frame-strip">
      <strong>{label}</strong>
      <div className="yellow-frame-list">
        {frames.map((frame, index) => (
          <figure className="yellow-frame-card" key={`${label}-${frame.x}-${index}`}>
            <canvas
              ref={(node) => {
                refs.current[index] = node;
              }}
              width={104}
              height={84}
            />
            <figcaption>{index + 1}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export default function YellowFramePreview() {
  return (
    <aside className="yellow-frame-preview">
      <FrameStrip label="原始 8 帧" frames={originalRunFrames} />
      <FrameStrip label="跑动 7 帧" frames={yellowMonsterSpriteAtlas.frames.run} src={assetManifest.enemies.yellowRun} />
      <FrameStrip label="受击 7 帧" frames={yellowMonsterSpriteAtlas.frames.hit} src={assetManifest.enemies.yellowHit} />
      <FrameStrip label="死亡 7 帧" frames={yellowMonsterSpriteAtlas.frames.death} src={assetManifest.enemies.yellowDeath} />
      <FrameStrip label="摸鱼跑动 7 帧" frames={slackerMonsterSpriteAtlas.frames.run} src={assetManifest.enemies.slackerRun} />
      <FrameStrip label="摸鱼受击 7 帧" frames={slackerMonsterSpriteAtlas.frames.hit} src={assetManifest.enemies.slackerHit} />
      <FrameStrip label="摸鱼死亡 7 帧" frames={slackerMonsterSpriteAtlas.frames.death} src={assetManifest.enemies.slackerDeath} />
    </aside>
  );
}
