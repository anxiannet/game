export type AudioManifestEntry = {
  path: string;
  category: string;
  usage: string;
  loop: boolean;
  volume: number;
  source: string;
  license: string;
  author: string;
  url: string;
  sourceFile?: string;
  attributionRequired?: boolean;
  replacementReady?: boolean;
  targetFormat?: string;
  targetFileName?: string;
};

export type AudioManifest = Record<string, AudioManifestEntry>;

class AudioManager {
  private manifest: AudioManifest = {};
  private buffers = new Map<string, HTMLAudioElement>();
  private sourceOverrides = new Map<string, string>();
  private activeLoops = new Map<string, HTMLAudioElement>();
  private loading?: Promise<AudioManifest>;
  private masterVolume = 1;
  private muted = false;

  async loadManifest(url = '/assets/audio/audio-manifest.json'): Promise<AudioManifest> {
    if (!this.loading) {
      this.loading = fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error(`Audio manifest failed: ${response.status}`);
          return response.json() as Promise<AudioManifest>;
        })
        .then((manifest) => {
          this.manifest = manifest;
          return manifest;
        })
        .catch((error) => {
          console.warn(error);
          this.manifest = {};
          return this.manifest;
        });
    }
    return this.loading;
  }

  async preload(soundIds?: string[]): Promise<void> {
    await this.loadManifest();
    const ids = soundIds ?? Object.keys(this.manifest);
    ids.forEach((id) => this.getAudio(id));
  }

  play(soundId: string): void {
    if (!this.manifest[soundId]) {
      void this.loadManifest().then(() => {
        if (this.manifest[soundId]) this.play(soundId);
      });
      return;
    }
    const source = this.getAudio(soundId);
    if (!source) return;
    const audio = source.cloneNode(true) as HTMLAudioElement;
    audio.loop = false;
    audio.volume = this.entryVolume(soundId);
    audio.muted = this.muted;
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }

  playRandom(soundIds: string[]): void {
    if (soundIds.length === 0) return;
    const index = Math.floor(Math.random() * soundIds.length);
    this.play(soundIds[index]);
  }

  loop(soundId: string): void {
    if (!this.manifest[soundId]) {
      void this.loadManifest().then(() => {
        if (this.manifest[soundId]) this.loop(soundId);
      });
      return;
    }
    const active = this.activeLoops.get(soundId);
    if (active) {
      active.volume = this.entryVolume(soundId);
      active.muted = this.muted;
      return;
    }
    const source = this.getAudio(soundId);
    if (!source) return;
    const audio = source.cloneNode(true) as HTMLAudioElement;
    audio.loop = true;
    audio.volume = this.entryVolume(soundId);
    audio.muted = this.muted;
    this.activeLoops.set(soundId, audio);
    void audio.play().catch(() => undefined);
  }

  stop(soundId: string): void {
    const audio = this.activeLoops.get(soundId);
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    this.activeLoops.delete(soundId);
  }

  stopAllLoops(): void {
    Array.from(this.activeLoops.keys()).forEach((id) => this.stop(id));
  }

  setSourceOverride(soundId: string, url: string): void {
    this.stop(soundId);
    this.buffers.delete(soundId);
    this.sourceOverrides.set(soundId, url);
  }

  clearSourceOverride(soundId: string): void {
    this.stop(soundId);
    this.buffers.delete(soundId);
    this.sourceOverrides.delete(soundId);
  }

  setMasterVolume(value: number): void {
    this.masterVolume = Math.max(0, Math.min(value, 1));
    this.refreshLoopVolumes();
  }

  mute(): void {
    this.muted = true;
    this.refreshLoopVolumes();
  }

  unmute(): void {
    this.muted = false;
    this.refreshLoopVolumes();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    this.refreshLoopVolumes();
    return this.muted;
  }

  private getAudio(soundId: string): HTMLAudioElement | undefined {
    if (!this.manifest[soundId]) return undefined;
    const cached = this.buffers.get(soundId);
    if (cached) return cached;
    const audio = new Audio(this.sourceOverrides.get(soundId) ?? this.manifest[soundId].path);
    audio.preload = 'auto';
    audio.loop = this.manifest[soundId].loop;
    audio.volume = this.entryVolume(soundId);
    audio.muted = this.muted;
    this.buffers.set(soundId, audio);
    return audio;
  }

  private entryVolume(soundId: string): number {
    return Math.max(0, Math.min((this.manifest[soundId]?.volume ?? 1) * this.masterVolume, 1));
  }

  private refreshLoopVolumes(): void {
    this.activeLoops.forEach((audio, id) => {
      audio.volume = this.entryVolume(id);
      audio.muted = this.muted;
    });
  }
}

export const audioManager = new AudioManager();
