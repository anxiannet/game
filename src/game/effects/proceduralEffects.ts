import type { Enemy } from '../../entities/Enemy';

export type SmokeParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  radius: number;
  life: number;
  maxLife: number;
};

export type DamageText = {
  text: string;
  x: number;
  y: number;
  vy: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
};

export function spawnSmokeParticles(particles: SmokeParticle[], enemy: Enemy): void {
  const count = enemy.kind === 'boss' ? 18 : 8;
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 28 + Math.random() * 64;
    particles.push({
      x: enemy.pos.x + (Math.random() - 0.5) * enemy.radius * 1.3,
      y: enemy.pos.y - enemy.radius * 0.15 + (Math.random() - 0.5) * enemy.radius * 0.7,
      vx: Math.cos(angle) * speed * 0.55,
      vy: Math.sin(angle) * speed * 0.35 - 38 - Math.random() * 20,
      alpha: 0.55 + Math.random() * 0.25,
      radius: enemy.radius * (0.22 + Math.random() * 0.28),
      life: 0,
      maxLife: 0.45 + Math.random() * 0.22,
    });
  }
}

export function updateParticles(particles: SmokeParticle[], dt: number): SmokeParticle[] {
  for (const particle of particles) {
    particle.life += dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 1 - Math.min(dt * 2.2, 0.8);
    particle.vy += 58 * dt;
    particle.radius += 18 * dt;
    particle.alpha = Math.max(0, 1 - particle.life / particle.maxLife);
  }
  return particles.filter((particle) => particle.life < particle.maxLife);
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: SmokeParticle[]): void {
  for (const particle of particles) {
    ctx.save();
    ctx.globalAlpha = particle.alpha * 0.62;
    ctx.fillStyle = '#94a3b8';
    ctx.shadowColor = 'rgba(251, 146, 60, 0.45)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function spawnDamageText(damageTexts: DamageText[], enemy: Enemy, damage: number, critical = false): void {
  damageTexts.push({
    text: critical ? `暴击 -${Math.round(damage)}` : `-${Math.round(damage)}`,
    x: enemy.pos.x + (Math.random() - 0.5) * enemy.radius * 0.7,
    y: enemy.pos.y - enemy.radius * 2.35,
    vy: -92,
    alpha: 1,
    life: 0,
    maxLife: 0.5,
    color: critical ? '#f97316' : '#fef2f2',
    size: critical ? 52 : 38,
  });
}

export function updateDamageTexts(damageTexts: DamageText[], dt: number): DamageText[] {
  for (const damageText of damageTexts) {
    damageText.life += dt;
    damageText.y += damageText.vy * dt;
    damageText.vy += 68 * dt;
    damageText.alpha = Math.max(0, 1 - damageText.life / damageText.maxLife);
  }
  return damageTexts.filter((damageText) => damageText.life < damageText.maxLife);
}

export function drawDamageTexts(ctx: CanvasRenderingContext2D, damageTexts: DamageText[]): void {
  for (const damageText of damageTexts) {
    const pop = damageText.life < 0.08 ? 0.75 + damageText.life / 0.08 * 0.35 : 1;
    ctx.save();
    ctx.globalAlpha = damageText.alpha;
    ctx.translate(damageText.x, damageText.y);
    ctx.scale(pop, pop);
    ctx.font = `900 ${damageText.size}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#111827';
    ctx.fillStyle = damageText.color;
    ctx.strokeText(damageText.text, 0, 0);
    ctx.fillText(damageText.text, 0, 0);
    ctx.restore();
  }
}
