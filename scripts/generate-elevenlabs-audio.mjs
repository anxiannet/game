import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const audioRoot = join(process.cwd(), 'public/assets/audio');
const manifestPath = join(audioRoot, 'audio-manifest.json');
const promptPath = join(audioRoot, 'AI_SOUND_PROMPTS.md');
const apiKey = process.env.ELEVENLABS_API_KEY;
const endpoint = 'https://api.elevenlabs.io/v1/sound-generation';

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, value = 'true'] = arg.split('=');
  return [key.replace(/^--/, ''), value];
}));

if (!apiKey) {
  console.error('Missing ELEVENLABS_API_KEY. Run: ELEVENLABS_API_KEY=... node scripts/generate-elevenlabs-audio.mjs --ids=ui_click,boss_spawn');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const prompts = parsePromptMarkdown(readFileSync(promptPath, 'utf8'));
const ids = selectIds();
const duration = Number(args.get('duration') ?? '2');
const promptInfluence = Number(args.get('promptInfluence') ?? '0.45');
const outputFormat = args.get('outputFormat') ?? 'mp3_44100_128';

for (const id of ids) {
  const entry = manifest[id];
  const prompt = prompts[id];
  if (!entry || !prompt) {
    console.warn(`skip ${id}: missing manifest entry or prompt`);
    continue;
  }
  const outputFile = outputFileFor(id, entry);
  const outputPath = join(audioRoot, outputFile);
  mkdirSync(join(audioRoot, outputFile.split('/').slice(0, -1).join('/')), { recursive: true });
  console.log(`generating ${id} -> ${outputFile}`);
  const audio = await generateSound(prompt, entry.loop);
  writeFileSync(outputPath, audio);
}

spawnSync(process.execPath, ['scripts/process-audio.mjs', '--write-manifest', '--write-docs'], { stdio: 'inherit' });

function selectIds() {
  if (args.has('ids')) {
    return args.get('ids').split(',').map((id) => id.trim()).filter(Boolean);
  }
  if (args.has('category')) {
    const category = args.get('category');
    return Object.entries(manifest).filter(([, entry]) => entry.category === category).map(([id]) => id);
  }
  if (args.has('all')) return Object.keys(manifest);
  console.error('Choose --ids=ui_click,boss_spawn, --category=ui, or --all');
  process.exit(1);
}

function outputFileFor(id, entry) {
  const folder = entry.path.split('/').slice(3, -1).join('/');
  return `${folder}/${id}.mp3`;
}

async function generateSound(text, loop) {
  const response = await fetch(`${endpoint}?output_format=${encodeURIComponent(outputFormat)}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      duration_seconds: duration,
      prompt_influence: promptInfluence,
      loop,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`ElevenLabs failed ${response.status}: ${detail}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function parsePromptMarkdown(markdown) {
  const prompts = {};
  const blocks = markdown.split(/\n## /u);
  blocks.forEach((block) => {
    const lines = block.trim().split('\n').filter(Boolean);
    const id = lines[0]?.replace(/^##\s*/u, '').trim();
    const quoted = lines.slice(1).join('\n').match(/"([\s\S]+)"/u)?.[1];
    if (id && quoted) prompts[id] = quoted.trim();
  });
  return prompts;
}
