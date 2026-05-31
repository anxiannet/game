import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const audioRoot = join(process.cwd(), 'public/assets/audio');
const placeholderRoot = join(audioRoot, '_placeholders');
const sourceOverridesPath = join(audioRoot, 'audio-source-overrides.json');
const sampleRate = 44100;

const groups = [
  ['ui', 'ui', [
    ['ui_click.wav', 'Button tap', 0.08, 880, 0.22],
    ['ui_confirm.wav', 'Confirm action', 0.14, 980, 0.28],
    ['ui_cancel.wav', 'Cancel action', 0.12, 360, 0.22],
    ['ui_error.wav', 'Invalid action warning', 0.18, 160, 0.28],
    ['ui_popup.wav', 'Panel popup', 0.16, 720, 0.2],
    ['ui_unlock.wav', 'Unlock reward', 0.35, 1040, 0.28],
    ['ui_upgrade.wav', 'Upgrade action', 0.28, 1180, 0.3],
    ['ui_warning.wav', 'Danger warning', 0.42, 220, 0.32],
    ['ui_tab_switch.wav', 'Tab switch', 0.09, 760, 0.18],
    ['ui_drag.wav', 'Drag start', 0.16, 520, 0.16],
    ['ui_drop.wav', 'Drop object', 0.14, 420, 0.22],
    ['ui_countdown.wav', 'Countdown tick', 0.18, 660, 0.24],
  ]],
  ['coin', 'coin', [
    ['coin_pickup_01.wav', 'Small coin pickup variant 1', 0.15, 1080, 0.28],
    ['coin_pickup_02.wav', 'Small coin pickup variant 2', 0.15, 1260, 0.28],
    ['coin_pickup_03.wav', 'Small coin pickup variant 3', 0.15, 1460, 0.28],
    ['gold_rain.wav', 'Large gold rain reward', 0.75, 1320, 0.24],
    ['reward_claim.wav', 'Reward claim', 0.36, 960, 0.28],
    ['combo_reward.wav', 'Combo reward', 0.38, 1160, 0.3],
    ['jackpot.wav', 'Jackpot payout', 0.9, 1420, 0.32],
    ['mission_complete.wav', 'Mission complete reward', 0.7, 880, 0.3],
  ]],
  ['tower/gatling', 'tower', [
    ['gatling_start.wav', 'Gatling spin up', 0.22, 260, 0.28],
    ['gatling_loop.wav', 'Gatling firing loop', 0.48, 92, 0.24, true],
    ['gatling_end.wav', 'Gatling spin down', 0.22, 190, 0.22],
    ['shell_drop.wav', 'Cartridge shell drop', 0.18, 720, 0.18],
    ['bullet_hit.wav', 'Bullet impact', 0.1, 240, 0.28],
    ['gatling_upgrade.wav', 'Gatling upgrade', 0.4, 1100, 0.28],
    ['gatling_overheat.wav', 'Gatling overheat', 0.58, 180, 0.26],
  ]],
  ['tower/wifi', 'tower', [
    ['wifi_charge.wav', 'WiFi tower charge', 0.28, 620, 0.24],
    ['wifi_shock.wav', 'WiFi electric shock', 0.16, 980, 0.3],
    ['wifi_disconnect.wav', 'WiFi disconnect gag', 0.26, 260, 0.24],
    ['wifi_interference.wav', 'WiFi interference', 0.36, 90, 0.18],
    ['wifi_static.wav', 'WiFi static burst', 0.3, 130, 0.16],
  ]],
  ['tower/fan', 'tower', [
    ['fan_spin.wav', 'Fan starts spinning', 0.28, 420, 0.2],
    ['fan_boost.wav', 'Fan boost', 0.34, 560, 0.24],
    ['fan_slow.wav', 'Slow debuff hit', 0.28, 380, 0.2],
    ['wind_loop.wav', 'Seamless wind loop', 0.8, 180, 0.16, true],
  ]],
  ['tower/ice', 'tower', [
    ['ice_cast.wav', 'Ice cast', 0.24, 760, 0.24],
    ['ice_freeze.wav', 'Enemy frozen', 0.32, 640, 0.24],
    ['ice_break.wav', 'Ice break', 0.22, 980, 0.26],
    ['ice_crystal.wav', 'Ice crystal sparkle', 0.34, 1180, 0.22],
  ]],
  ['tower/bomb', 'tower', [
    ['bomb_throw.wav', 'Bomb throw', 0.2, 300, 0.22],
    ['bomb_tick.wav', 'Bomb tick', 0.18, 780, 0.22],
    ['bomb_explode.wav', 'Bomb explosion', 0.42, 72, 0.34],
    ['big_explosion.wav', 'Large explosion', 0.72, 58, 0.34],
    ['shockwave.wav', 'Explosion shockwave', 0.4, 80, 0.28],
  ]],
  ['enemy/lazy', 'enemy', [
    ['enemy_lazy_walk.wav', 'Lazy enemy walk', 0.42, 260, 0.16, true],
    ['enemy_yawn.wav', 'Lazy enemy yawn', 0.62, 310, 0.2],
    ['enemy_phone_scroll.wav', 'Phone scrolling enemy', 0.34, 540, 0.14],
    ['enemy_hit.wav', 'Enemy hit reaction', 0.16, 220, 0.24],
    ['enemy_die.wav', 'Enemy death', 0.32, 180, 0.28],
  ]],
  ['enemy/overtime', 'enemy', [
    ['enemy_keyboard.wav', 'Keyboard enemy action', 0.3, 700, 0.16],
    ['enemy_angry.wav', 'Angry enemy bark', 0.34, 240, 0.25],
    ['enemy_rush.wav', 'Enemy rush', 0.42, 330, 0.24],
    ['enemy_stress.wav', 'Stress enemy loop', 0.46, 150, 0.2],
  ]],
  ['enemy/requirement', 'enemy', [
    ['enemy_requirement.wav', 'Requirement monster appears', 0.36, 400, 0.24],
    ['enemy_mutation.wav', 'Enemy mutation', 0.52, 120, 0.27],
    ['enemy_split.wav', 'Requirement split', 0.32, 360, 0.26],
  ]],
  ['enemy/intern', 'enemy', [
    ['enemy_annoy.wav', 'Annoying intern enemy', 0.28, 520, 0.2],
    ['enemy_confused.wav', 'Confused intern enemy', 0.34, 460, 0.2],
    ['enemy_typing_slow.wav', 'Slow typing enemy loop', 0.52, 620, 0.16, true],
    ['enemy_panic.wav', 'Panic enemy', 0.42, 760, 0.24],
  ]],
  ['boss', 'boss', [
    ['boss_spawn.wav', 'Boss spawn warning', 1.0, 82, 0.36],
    ['boss_step.wav', 'Boss footstep', 0.38, 64, 0.32],
    ['boss_roar.wav', 'Boss roar', 0.72, 150, 0.32],
    ['boss_attack.wav', 'Boss attack', 0.48, 96, 0.34],
    ['boss_phase2.wav', 'Boss phase two', 0.82, 120, 0.34],
    ['boss_die.wav', 'Boss death', 1.1, 58, 0.36],
    ['boss_laugh.wav', 'Boss laugh', 0.62, 190, 0.26],
  ]],
  ['combat', 'combat', [
    ['hit_light.wav', 'Light hit impact', 0.1, 280, 0.24],
    ['hit_medium.wav', 'Medium hit impact', 0.14, 210, 0.28],
    ['hit_heavy.wav', 'Heavy hit impact', 0.22, 120, 0.32],
    ['critical_hit.wav', 'Critical hit impact', 0.3, 760, 0.34],
    ['armor_hit.wav', 'Armored hit impact', 0.22, 170, 0.28],
    ['combo_2.wav', 'Two hit combo cue', 0.2, 760, 0.28],
    ['combo_3.wav', 'Three hit combo cue', 0.24, 880, 0.3],
    ['combo_5.wav', 'Five hit combo cue', 0.32, 1020, 0.32],
    ['combo_10.wav', 'Ten hit combo cue', 0.42, 1220, 0.34],
    ['combo_max.wav', 'Max combo cue', 0.62, 1440, 0.34],
    ['kill_01.wav', 'Enemy kill cue variant 1', 0.2, 620, 0.28],
    ['kill_02.wav', 'Enemy kill cue variant 2', 0.22, 760, 0.28],
    ['kill_streak.wav', 'Kill streak cue', 0.44, 1080, 0.32],
    ['multi_kill.wav', 'Multi kill cue', 0.5, 1220, 0.34],
  ]],
  ['skill', 'skill', [
    ['skill_cast.wav', 'Skill cast', 0.28, 920, 0.28],
    ['skill_ready.wav', 'Skill ready', 0.32, 1080, 0.28],
    ['skill_cooldown.wav', 'Skill cooldown', 0.18, 380, 0.18],
    ['skill_activate.wav', 'Skill activate', 0.42, 980, 0.3],
    ['ultimate_cast.wav', 'Ultimate cast', 0.72, 180, 0.34],
    ['ultimate_explode.wav', 'Ultimate explosion', 0.92, 62, 0.36],
  ]],
  ['ambient', 'ambient', [
    ['office_ambient.wav', 'Office ambient loop', 1.8, 120, 0.1, true],
    ['keyboard_loop.wav', 'Keyboard ambience loop', 0.9, 680, 0.1, true],
    ['printer.wav', 'Printer', 0.76, 210, 0.18],
    ['phone_ring.wav', 'Office phone ring', 0.8, 740, 0.22],
    ['air_conditioner.wav', 'Air conditioner loop', 1.6, 95, 0.09, true],
    ['mouse_clicks.wav', 'Mouse clicks', 0.28, 840, 0.15],
    ['night_office.wav', 'Night office ambience loop', 1.8, 88, 0.08, true],
    ['fluorescent_buzz.wav', 'Fluorescent buzz loop', 1.2, 100, 0.08, true],
    ['rain_window.wav', 'Rain on window loop', 1.5, 140, 0.08, true],
    ['clock_tick.wav', 'Clock tick', 0.32, 620, 0.14],
  ]],
  ['ui', 'result', [
    ['victory.wav', 'Victory result', 1.2, 880, 0.34],
    ['perfect_clear.wav', 'Perfect clear', 1.1, 1180, 0.34],
    ['new_record.wav', 'New record', 0.95, 1260, 0.34],
    ['defeat.wav', 'Defeat result', 1.0, 150, 0.3],
    ['sad_trombone.wav', 'Comedic defeat sting', 1.1, 140, 0.28],
    ['game_over.wav', 'Game over', 0.95, 120, 0.3],
  ]],
  ['bgm', 'bgm', [
    ['bgm_normal.wav', 'Normal combat BGM loop', 2.0, 220, 0.12, true],
    ['bgm_wave.wav', 'High pressure wave BGM loop', 2.0, 260, 0.13, true],
    ['bgm_boss.wav', 'Boss combat BGM loop', 2.0, 92, 0.15, true],
    ['bgm_lowhp.wav', 'Low HP panic BGM loop', 2.0, 180, 0.13, true],
  ]],
];

const promptByName = {
  gatling_loop: 'Cartoon tower defense gatling gun loop, rapid mechanical firing, playful arcade style, short seamless loop, no music, no voice.',
  boss_spawn: 'Funny office boss monster spawn sound, dramatic but comedic, cartoon game style, short impact, no music.',
};

function entries() {
  return groups.flatMap(([folder, category, items]) =>
    items.map(([file, usage, seconds, frequency, volume, loop = false]) => {
      const id = file.replace(/\.(wav|mp3|ogg)$/u, '');
      return {
        id,
        file,
        folder,
        category,
        usage,
        seconds,
        frequency,
        volume,
        loop,
        path: `/assets/audio/${folder}/${file}`,
      };
    }),
  );
}

function ensureDirs() {
  const dirs = [
    'ui',
    'coin',
    'tower/gatling',
    'tower/wifi',
    'tower/fan',
    'tower/ice',
    'tower/bomb',
    'enemy/lazy',
    'enemy/overtime',
    'enemy/requirement',
    'enemy/intern',
    'boss',
    'combat',
    'skill',
    'voice',
    'ambient',
    'bgm',
    '_placeholders',
  ];
  dirs.forEach((dir) => mkdirSync(join(audioRoot, dir), { recursive: true }));
}

function writeWav(filePath, seconds, frequency, gain, loop) {
  const samples = Math.max(1, Math.floor(sampleRate * seconds));
  const dataBytes = samples * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);

  for (let i = 0; i < samples; i += 1) {
    const t = i / sampleRate;
    const progress = i / samples;
    const envelope = loop ? 1 : Math.sin(Math.PI * progress);
    const noise = ((Math.sin(i * 12.9898) * 43758.5453) % 1) * 0.18;
    const tone = Math.sin(2 * Math.PI * frequency * t) * 0.72 + Math.sin(2 * Math.PI * frequency * 1.51 * t) * 0.2 + noise;
    buffer.writeInt16LE(Math.max(-1, Math.min(1, tone * envelope * gain)) * 32767, 44 + i * 2);
  }
  writeFileSync(filePath, buffer);
}

function writeAudioFiles() {
  ensureDirs();
  for (const item of entries()) {
    const finalPath = join(audioRoot, item.folder, item.file);
    const placeholderPath = join(placeholderRoot, item.file);
    if (item.file.endsWith('.mp3')) {
      const tmpWav = join(placeholderRoot, `${item.id}.wav`);
      writeWav(tmpWav, item.seconds, item.frequency, item.volume, item.loop);
      const converted = spawnSync('afconvert', [tmpWav, finalPath, '-f', 'MPG3', '-d', '.mp3'], { stdio: 'ignore' });
      if (converted.status !== 0) writeFileSync(finalPath, readFileSync(tmpWav));
      writeFileSync(placeholderPath, readFileSync(finalPath));
    } else {
      writeWav(finalPath, item.seconds, item.frequency, item.volume, item.loop);
      writeWav(placeholderPath, item.seconds, item.frequency, item.volume, item.loop);
    }
  }
}

function manifest() {
  return Object.fromEntries(entries().map((item) => [
    item.id,
    manifestEntry(item),
  ]));
}

function manifestEntry(item) {
  const targetFormat = item.category === 'bgm' ? 'mp3' : 'wav';
  const targetFileName = `${item.id}.${targetFormat}`;
  const replacement = findReplacement(item);
  const sourceOverride = sourceOverrides()[item.id];
  const hasReplacement = Boolean(replacement || sourceOverride);
  return {
    path: replacement?.path ?? item.path,
    category: item.category,
    usage: usageChinese(item),
    loop: item.loop,
    volume: volumeFor(item),
    source: sourceOverride?.source ?? (hasReplacement ? 'Local AI generated replacement file' : 'In-project procedural placeholder'),
    license: sourceOverride?.license ?? (hasReplacement ? 'TODO: record source license' : 'Project-owned placeholder; replace before production release'),
    author: sourceOverride?.author ?? (hasReplacement ? 'TODO' : 'Codex generated placeholder'),
    url: sourceOverride?.url ?? '',
    sourceFile: sourceOverride?.sourceFile ?? replacement?.file ?? '',
    attributionRequired: sourceOverride?.attributionRequired ?? false,
    replacementReady: hasReplacement,
    targetFormat,
    targetFileName,
  };
}

let cachedSourceOverrides;

function sourceOverrides() {
  if (cachedSourceOverrides) return cachedSourceOverrides;
  if (!existsSync(sourceOverridesPath)) {
    cachedSourceOverrides = {};
    return cachedSourceOverrides;
  }
  cachedSourceOverrides = JSON.parse(readFileSync(sourceOverridesPath, 'utf8'));
  return cachedSourceOverrides;
}

function findReplacement(item) {
  const candidates = item.category === 'bgm'
    ? [`${item.id}.mp3`, `${item.id}.ogg`, `${item.id}.wav`, item.file]
    : [`${item.id}.wav`, `${item.id}.mp3`, `${item.id}.ogg`, item.file];
  const seen = new Set();
  for (const file of candidates) {
    if (seen.has(file)) continue;
    seen.add(file);
    const diskPath = join(audioRoot, item.folder, file);
    if (existsSync(diskPath) && file !== basename(item.path)) {
      return { file, path: `/assets/audio/${item.folder}/${file}` };
    }
  }
  const targetFormat = item.category === 'bgm' ? 'mp3' : 'wav';
  const targetFileName = `${item.id}.${targetFormat}`;
  const targetPath = join(audioRoot, item.folder, targetFileName);
  if (targetFileName !== item.file && existsSync(targetPath)) return { file: targetFileName, path: `/assets/audio/${item.folder}/${targetFileName}` };
  return undefined;
}

function usageChinese(item) {
  const map = {
    ui: '界面反馈',
    coin: '金币奖励',
    tower: '炮塔反馈',
    enemy: '怪物反馈',
    boss: 'Boss反馈',
    skill: '技能反馈',
    combat: '战斗反馈',
    ambient: '办公室环境音',
    result: '胜负结算',
    bgm: '战斗音乐',
  };
  return `${map[item.category] ?? item.category}: ${item.usage}`;
}

function volumeFor(item) {
  if (item.category === 'bgm') return 0.38;
  if (item.loop) return 0.32;
  if (item.category === 'ui') return 0.6;
  if (item.category === 'boss') return 0.75;
  return 0.65;
}

function writeManifestAndDocs() {
  mkdirSync(audioRoot, { recursive: true });
  const all = entries();
  const currentManifest = manifest();
  writeFileSync(join(audioRoot, 'audio-manifest.json'), `${JSON.stringify(currentManifest, null, 2)}\n`);

  const credits = [
    '# Audio Credits',
    '',
    'Current audio files are procedurally generated placeholders created inside this project. They are safe for development builds, but should be replaced with verified CC0/royalty-free/no-attribution production assets before public release.',
    '',
    '| 文件名 | 用途 | 来源 | 作者 | 许可证 | 链接 | 是否需要署名 |',
    '|---|---|---|---|---|---|---|',
    ...all.map((item) => {
      const entry = currentManifest[item.id];
      const fileName = entry.path.split('/').pop() ?? item.file;
      return `| ${fileName} | ${entry.usage} | ${entry.source}${entry.sourceFile ? ` (${entry.sourceFile})` : ''} | ${entry.author} | ${entry.license} | ${entry.url} | ${entry.attributionRequired ? 'Yes' : 'No'} |`;
    }),
    '',
  ];
  writeFileSync(join(audioRoot, 'AUDIO_CREDITS.md'), credits.join('\n'));

  const todo = [
    '# Audio TODO',
    '',
    'All listed files currently use procedural placeholder audio. Replace only with assets whose page/license explicitly allows commercial game use. Preferred sources: Kenney CC0 packs, Pixabay Sound Effects with license page recorded, OpenGameArt items with verified per-asset license, Freesound CC0 only.',
    '',
    '| 文件名 | 需要的音效描述 | 推荐搜索关键词 | 推荐生成提示词 |',
    '|---|---|---|---|',
    ...all.map((item) => `| ${item.file} | ${usageChinese(item)} | ${keywords(item)} | ${prompt(item)} |`),
    '',
  ];
  writeFileSync(join(audioRoot, 'AUDIO_TODO.md'), todo.join('\n'));

  const prompts = [
    '# AI Sound Prompts',
    '',
    'Use these prompts only with a sound model or library workflow that grants commercial rights. No music or recognizable brand/platform sounds unless explicitly requested and licensed.',
    '',
    ...all.map((item) => `## ${item.id}\n"${prompt(item)}"\n`),
  ];
  writeFileSync(join(audioRoot, 'AI_SOUND_PROMPTS.md'), prompts.join('\n'));
}

function keywords(item) {
  return [
    'cartoon game sfx',
    item.category,
    item.id.replaceAll('_', ' '),
    item.loop ? 'seamless loop' : 'short impact',
    'royalty free CC0',
  ].join(', ');
}

function prompt(item) {
  if (promptByName[item.id]) return promptByName[item.id];
  const loopText = item.loop ? 'short seamless loop' : 'short one-shot sound effect';
  return `Cartoon office tower defense game sound for ${item.usage.toLowerCase()}, playful and punchy, ${loopText}, mobile arcade style, no music, no voice, no recognizable brand sound.`;
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return fullPath;
  });
}

function check() {
  const all = entries();
  const missing = all.filter((item) => !existsSync(join(audioRoot, item.folder, item.file)));
  const badNames = walk(audioRoot)
    .filter((file) => ['.wav', '.ogg', '.mp3'].includes(extname(file)))
    .map((file) => relative(audioRoot, file))
    .filter((file) => !/^[a-z0-9_/-]+\.(wav|ogg|mp3)$/u.test(file));
  console.log(`Expected sounds: ${all.length}`);
  console.log(`Missing sounds: ${missing.length}`);
  missing.forEach((item) => console.log(`missing ${item.path}`));
  console.log(`Bad file names: ${badNames.length}`);
  badNames.forEach((file) => console.log(`bad-name ${file}`));
}

function convertOgg() {
  const ffmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  if (ffmpeg.status !== 0) {
    console.log('ffmpeg not found; skipping ogg conversion.');
    return;
  }
  for (const file of walk(audioRoot).filter((item) => item.endsWith('.wav'))) {
    const output = file.replace(/\.wav$/u, '.ogg');
    spawnSync('ffmpeg', ['-y', '-i', file, '-c:a', 'libvorbis', '-q:a', '4', output], { stdio: 'ignore' });
  }
}

if (process.argv.includes('--write-placeholders')) writeAudioFiles();
if (process.argv.includes('--write-manifest') || process.argv.includes('--write-docs')) writeManifestAndDocs();
if (process.argv.includes('--ogg')) convertOgg();
check();
