import { useEffect, useMemo, useState } from 'react';
import { audioManager, type AudioManifest } from '../lib/audioManager';

type PlayMode = 'one-shot' | 'loop';
type PromptMap = Record<string, string>;
type UploadedAudio = {
  id: string;
  file: File;
  url: string;
  size: number;
  updatedAt: number;
};

const DB_NAME = 'dingbuzhule-audio-uploads';
const STORE_NAME = 'files';

const categoryLabels: Record<string, string> = {
  ui: '界面',
  coin: '金币',
  tower: '炮塔',
  enemy: '怪物',
  boss: 'Boss',
  combat: '战斗',
  skill: '技能',
  ambient: '环境',
  result: '结算',
  bgm: 'BGM',
};

export default function AudioManagerPage() {
  const [manifest, setManifest] = useState<AudioManifest>({});
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [playingLoop, setPlayingLoop] = useState<string | null>(null);
  const [playMode, setPlayMode] = useState<PlayMode>('one-shot');
  const [prompts, setPrompts] = useState<PromptMap>({});
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Record<string, UploadedAudio>>({});
  const [uploadMessage, setUploadMessage] = useState('等待上传 AI 生成音频');
  const entries = useMemo(() => Object.entries(manifest), [manifest]);
  const categories = useMemo(() => ['all', ...Array.from(new Set(entries.map(([, item]) => item.category))).sort()], [entries]);
  const replacedCount = entries.filter(([id, item]) => item.replacementReady || uploads[id]).length;

  useEffect(() => {
    void audioManager.loadManifest().then(setManifest);
    void fetch('/assets/audio/AI_SOUND_PROMPTS.md')
      .then((response) => response.text())
      .then((text) => setPrompts(parsePromptMarkdown(text)));
    void loadStoredUploads().then((stored) => {
      const next = Object.fromEntries(stored.map((item) => [item.id, makeUploadedAudio(item.id, item.file, item.updatedAt)]));
      Object.values(next).forEach((item) => audioManager.setSourceOverride(item.id, item.url));
      setUploads(next);
      if (stored.length > 0) setUploadMessage(`已载入 ${stored.length} 个本地上传音频`);
    });
    return () => {
      audioManager.stopAllLoops();
      Object.values(uploads).forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, []);

  const filtered = entries.filter(([id, item]) => {
    const keyword = `${id} ${item.category} ${item.usage} ${item.path}`.toLowerCase();
    return (category === 'all' || item.category === category) && keyword.includes(query.trim().toLowerCase());
  });

  const play = (id: string) => {
    if (playMode === 'loop') {
      if (playingLoop && playingLoop !== id) audioManager.stop(playingLoop);
      audioManager.loop(id);
      setPlayingLoop(id);
      return;
    }
    audioManager.play(id);
  };

  const stopLoop = () => {
    if (playingLoop) audioManager.stop(playingLoop);
    setPlayingLoop(null);
  };

  const copyPrompt = async (id: string) => {
    const prompt = prompts[id];
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setExpandedPrompt(id);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files) return;
    const byFileName = makeFileNameMap(manifest);
    const matched: UploadedAudio[] = [];
    const unmatched: string[] = [];
    for (const file of Array.from(files)) {
      const id = byFileName.get(file.name.toLowerCase());
      if (!id || !isAudioFile(file)) {
        unmatched.push(file.name);
        continue;
      }
      const item = makeUploadedAudio(id, file, Date.now());
      await saveStoredUpload(id, file, item.updatedAt);
      audioManager.setSourceOverride(id, item.url);
      matched.push(item);
    }
    setUploads((current) => {
      const next = { ...current };
      matched.forEach((item) => {
        if (next[item.id]) URL.revokeObjectURL(next[item.id].url);
        next[item.id] = item;
      });
      return next;
    });
    setUploadMessage(`上传匹配 ${matched.length} 个${unmatched.length ? `，未匹配 ${unmatched.length} 个` : ''}`);
  };

  const clearUpload = async (id: string) => {
    await deleteStoredUpload(id);
    audioManager.clearSourceOverride(id);
    setUploads((current) => {
      const next = { ...current };
      if (next[id]) URL.revokeObjectURL(next[id].url);
      delete next[id];
      return next;
    });
    setUploadMessage(`已移除 ${id} 的本地上传音频`);
  };

  return (
    <main className="audio-tool-shell">
      <header className="audio-tool-header">
        <div>
          <p>顶不住了</p>
          <h1>音频管理</h1>
        </div>
        <div className="audio-tool-stats">
          <strong>{entries.length}</strong>
          <span>已登记 · 已替换 {replacedCount}</span>
        </div>
      </header>

      <section className="audio-tool-controls">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 sound id / 用途 / 路径" />
        <div className="audio-tool-tabs">
          {categories.map((item) => (
            <button className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>
              {item === 'all' ? '全部' : categoryLabels[item] ?? item}
            </button>
          ))}
        </div>
        <div className="audio-tool-mode">
          <label className="audio-upload-button">
            上传AI音频
            <input type="file" accept="audio/*" multiple onChange={(event) => void handleUpload(event.target.files)} />
          </label>
          <button className={playMode === 'one-shot' ? 'active' : ''} onClick={() => setPlayMode('one-shot')}>单次</button>
          <button className={playMode === 'loop' ? 'active' : ''} onClick={() => setPlayMode('loop')}>循环</button>
          <button className={expandedPrompt === 'all' ? 'active' : ''} onClick={() => setExpandedPrompt(expandedPrompt === 'all' ? null : 'all')}>AI提示词</button>
          <button disabled={!playingLoop} onClick={stopLoop}>停止循环</button>
        </div>
        <div className="audio-upload-status">
          <strong>{Object.keys(uploads).length}</strong>
          <span>{uploadMessage}</span>
        </div>
      </section>

      <section className="audio-tool-list">
        {filtered.map(([id, item]) => {
          const prompt = prompts[id];
          const showPrompt = expandedPrompt === 'all' || expandedPrompt === id;
          const upload = uploads[id];
          const replaced = item.replacementReady || Boolean(upload);
          return (
            <article className={`${playingLoop === id ? 'audio-row looping' : 'audio-row'} ${replaced ? 'uploaded' : ''}`} key={id}>
              <button className="audio-play-button" onClick={() => play(id)}>{playingLoop === id ? '停' : '播'}</button>
              <div className="audio-row-main">
                <strong>{id}</strong>
                <span>{item.usage}</span>
                <code>{item.path}</code>
                <small className="audio-target-file">正式文件名: {item.targetFileName ?? `${id}.${item.category === 'bgm' ? 'mp3' : 'wav'}`}</small>
                {upload && <small className="audio-uploaded-file">AI上传: {upload.file.name} · {formatBytes(upload.size)}</small>}
                {showPrompt && prompt && <p className="audio-prompt">{prompt}</p>}
              </div>
              <div className="audio-row-meta">
                <span>{categoryLabels[item.category] ?? item.category}</span>
                <span className={replaced ? 'ready' : 'placeholder'}>{replaced ? '已替换' : '占位中'}</span>
                <span>{item.loop ? 'loop' : 'shot'}</span>
                <span>{Math.round(item.volume * 100)}%</span>
                <button disabled={!prompt} onClick={() => setExpandedPrompt(showPrompt ? null : id)}>提示词</button>
                <button disabled={!prompt} onClick={() => void copyPrompt(id)}>复制</button>
                <button disabled={!upload} onClick={() => void clearUpload(id)}>移除</button>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

function makeUploadedAudio(id: string, file: File, updatedAt: number): UploadedAudio {
  return {
    id,
    file,
    url: URL.createObjectURL(file),
    size: file.size,
    updatedAt,
  };
}

function makeFileNameMap(manifest: AudioManifest): Map<string, string> {
  const map = new Map<string, string>();
  Object.entries(manifest).forEach(([id, item]) => {
    const fileName = item.path.split('/').pop()?.toLowerCase();
    if (fileName) map.set(fileName, id);
    map.set(`${id}.wav`, id);
    map.set(`${id}.ogg`, id);
    map.set(`${id}.mp3`, id);
    map.set(`${id}.m4a`, id);
  });
  return map;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isAudioFile(file: File): boolean {
  return file.type.startsWith('audio/') || /\.(wav|ogg|mp3|m4a|aac|flac)$/iu.test(file.name);
}

type StoredUpload = {
  id: string;
  file: File;
  updatedAt: number;
};

function openUploadDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadStoredUploads(): Promise<StoredUpload[]> {
  const db = await openUploadDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as StoredUpload[]);
    request.onerror = () => reject(request.error);
  });
}

async function saveStoredUpload(id: string, file: File, updatedAt: number): Promise<void> {
  const db = await openUploadDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put({ id, file, updatedAt });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function deleteStoredUpload(id: string): Promise<void> {
  const db = await openUploadDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function parsePromptMarkdown(markdown: string): PromptMap {
  const prompts: PromptMap = {};
  const blocks = markdown.split(/\n## /u);
  blocks.forEach((block) => {
    const lines = block.trim().split('\n').filter(Boolean);
    const id = lines[0]?.replace(/^##\s*/u, '').trim();
    const quoted = lines.slice(1).join('\n').match(/"([\s\S]+)"/u)?.[1];
    if (id && quoted) prompts[id] = quoted.trim();
  });
  return prompts;
}
