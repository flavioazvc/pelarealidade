const canvas = document.getElementById('storm-canvas');
const context = canvas?.getContext('2d', { alpha: false, desynchronized: true });

if (canvas && context) {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mode = root.dataset.atmosphere === 'rift' ? 'rift' : 'veil';
  const palettes = {
    veil: {
      base: ['#080a11', '#0d0b13', '#080a10'],
      fog: [[69, 112, 183], [41, 150, 158], [134, 73, 170], [174, 59, 99], [180, 112, 59], [97, 91, 143]],
      glow: 'rgba(115, 154, 255, .75)',
      flash: 'rgba(213, 224, 255, .8)'
    },
    rift: {
      base: ['#090910', '#110b14', '#080a10'],
      fog: [[112, 79, 181], [39, 123, 159], [186, 59, 76], [193, 111, 50], [128, 74, 133], [119, 143, 158]],
      glow: 'rgba(227, 124, 179, .7)',
      flash: 'rgba(255, 220, 231, .82)'
    }
  };
  const palette = palettes[mode];
  const random = Math.random;
  const clouds = Array.from({ length: 15 }, (_, index) => ({
    x: ((index % 5) + 0.2 + random() * 0.6) / 5,
    y: (Math.floor(index / 5) + 0.2 + random() * 0.6) / 3,
    width: 0.24 + random() * 0.19,
    height: 0.22 + random() * 0.19,
    phase: random() * Math.PI * 2,
    speed: 0.1 + random() * 0.15,
    rotation: (random() - 0.5) * 0.65,
    strength: 0.64 + random() * 0.44,
    color: palette.fog[(index + Math.floor(random() * palette.fog.length)) % palette.fog.length]
  }));

  const FRAME_INTERVAL = 1000 / 18;
  const MAX_BACKING_PIXELS = 700_000;
  let width = 1;
  let height = 1;
  let frameScale = 1;
  let lastFrame = 0;
  let rafId = 0;
  let resizeTimer = 0;
  let strike = null;
  let nextStrikeAt = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width || window.innerWidth);
    height = Math.max(1, rect.height || window.innerHeight);
    const deviceScale = Math.min(window.devicePixelRatio || 1, 1.4) * 0.62;
    const pixelCap = Math.sqrt(MAX_BACKING_PIXELS / (width * height));
    frameScale = Math.min(deviceScale, pixelCap);
    canvas.width = Math.max(1, Math.round(width * frameScale));
    canvas.height = Math.max(1, Math.round(height * frameScale));
    context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    paint(0, 0, false);
  }

  function rgba(color, alpha) {
    return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
  }

  function drawFog(time) {
    const base = context.createLinearGradient(0, 0, width, height);
    base.addColorStop(0, palette.base[0]);
    base.addColorStop(0.52, palette.base[1]);
    base.addColorStop(1, palette.base[2]);
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    context.fillStyle = base;
    context.fillRect(0, 0, width, height);

    context.globalCompositeOperation = 'screen';
    for (const cloud of clouds) {
      const driftX = Math.sin(time * cloud.speed + cloud.phase) * width * 0.16;
      const driftY = Math.cos(time * cloud.speed * 0.76 + cloud.phase) * height * 0.14;
      const ripple = Math.sin(time * 0.21 + cloud.phase) * 0.12;
      const x = cloud.x * width + driftX;
      const y = cloud.y * height + driftY;
      const rx = width * cloud.width * (1 + ripple);
      const ry = height * cloud.height * (1 - ripple * 0.5);
      const alpha = cloud.strength * (0.75 + 0.25 * Math.sin(time * 0.16 + cloud.phase));

      context.save();
      context.translate(x, y);
      context.rotate(cloud.rotation + Math.sin(time * 0.035 + cloud.phase) * 0.18);
      context.scale(rx, ry);
      const mist = context.createRadialGradient(0, 0, 0, 0, 0, 1);
      mist.addColorStop(0, rgba(cloud.color, 0.31 * alpha));
      mist.addColorStop(0.26, rgba(cloud.color, 0.2 * alpha));
      mist.addColorStop(0.62, rgba(cloud.color, 0.07 * alpha));
      mist.addColorStop(1, rgba(cloud.color, 0));
      context.fillStyle = mist;
      context.fillRect(-1, -1, 2, 2);
      context.restore();
    }
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
  }

  function makePolyline(start, end, count, spreadX, spreadY) {
    const points = [start];
    for (let step = 1; step <= count; step += 1) {
      const progress = step / count;
      points.push({
        x: start.x + (end.x - start.x) * progress + (random() - 0.5) * spreadX,
        y: start.y + (end.y - start.y) * progress + (random() - 0.5) * spreadY
      });
    }
    return points;
  }

  function createStrike(now) {
    const start = { x: width * (0.12 + random() * 0.76), y: -height * 0.025 };
    const end = { x: start.x + (random() - 0.5) * width * 0.32, y: height * (0.68 + random() * 0.28) };
    const main = makePolyline(start, end, 16, width * 0.048, height * 0.018);
    const paths = [{ points: main, strength: 1 }];
    const branchCount = 2 + Math.floor(random() * 2);

    for (let branch = 0; branch < branchCount; branch += 1) {
      const anchorIndex = 3 + Math.floor(random() * 9);
      const anchor = main[anchorIndex];
      const direction = random() < 0.5 ? -1 : 1;
      const branchEnd = {
        x: anchor.x + direction * width * (0.07 + random() * 0.1),
        y: anchor.y + height * (0.1 + random() * 0.17)
      };
      paths.push({
        points: makePolyline(anchor, branchEnd, 5, width * 0.024, height * 0.02),
        strength: 0.58
      });
    }

    return { paths, startedAt: now, duration: 1_100 };
  }

  function strokeBolt(points, widthPx, color, alpha) {
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
      context.lineTo(points[index].x, points[index].y);
    }
    context.strokeStyle = color;
    context.lineWidth = widthPx;
    context.globalAlpha = alpha;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.stroke();
  }

  function drawLightning(now) {
    if (!strike) {
      if (now >= nextStrikeAt) {
        strike = createStrike(now);
        nextStrikeAt = now + 4_200 + random() * 3_200;
      } else {
        return;
      }
    }

    const age = now - strike.startedAt;
    if (age > strike.duration) {
      strike = null;
      return;
    }

    const pulse = (center, spread, strength) => {
      const normalized = (age - center) / spread;
      return strength * Math.exp(-(normalized * normalized));
    };
    const flash = Math.min(1, pulse(80, 72, 0.98) + pulse(270, 88, 0.66) + pulse(670, 100, 0.34));
    if (flash < 0.012) return;

    context.globalCompositeOperation = 'screen';
    context.fillStyle = palette.flash;
    context.globalAlpha = flash * 0.11;
    context.fillRect(0, 0, width, height);

    for (const path of strike.paths) {
      strokeBolt(path.points, 10, palette.glow, flash * 0.32 * path.strength);
      strokeBolt(path.points, 2.8, '#f7f8ff', flash * 0.98 * path.strength);
    }
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
  }

  function paint(time, now, animate) {
    drawFog(time);
    if (animate) drawLightning(now);
  }

  function frame(now) {
    rafId = 0;
    if (document.hidden || reducedMotion.matches) return;
    if (now - lastFrame >= FRAME_INTERVAL) {
      lastFrame = now;
      paint(now / 1000, now, true);
    }
    rafId = window.requestAnimationFrame(frame);
  }

  function start() {
    if (reducedMotion.matches || document.hidden || rafId) return;
    lastFrame = 0;
    nextStrikeAt = performance.now() + 1_600 + random() * 2_200;
    rafId = window.requestAnimationFrame(frame);
  }

  function stop() {
    if (rafId) window.cancelAnimationFrame(rafId);
    rafId = 0;
  }

  resize();
  if (!reducedMotion.matches) start();
  reducedMotion.addEventListener?.('change', () => {
    stop();
    strike = null;
    if (reducedMotion.matches) paint(0, 0, false);
    else start();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 140);
  }, { passive: true });
  window.addEventListener('pagehide', stop, { once: true });
}
