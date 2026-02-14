const canvas = document.getElementById("treeCanvas");
const ctx = canvas.getContext("2d");

const prompt = document.getElementById("prompt");
const yesBtn = document.getElementById("yesBtn");
const noBtn = document.getElementById("noBtn");
const hintText = document.getElementById("hintText");
const regrowBtn = document.getElementById("regrowBtn");
const statusText = document.getElementById("statusText");

let noClicks = 0;

function createRng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function randRange(rng, min, max) {
  return min + (max - min) * rng();
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function pointOnQuadratic(p0, p1, p2, t) {
  const u = 1 - t;
  return {
    x: (u * u) * p0.x + (2 * u * t) * p1.x + (t * t) * p2.x,
    y: (u * u) * p0.y + (2 * u * t) * p1.y + (t * t) * p2.y
  };
}

function drawQuadraticUntil(ctxRef, p0, p1, p2, t) {
  const clamped = Math.max(0, Math.min(1, t));
  const a = { x: lerp(p0.x, p1.x, clamped), y: lerp(p0.y, p1.y, clamped) };
  const b = { x: lerp(p1.x, p2.x, clamped), y: lerp(p1.y, p2.y, clamped) };
  const c = { x: lerp(a.x, b.x, clamped), y: lerp(a.y, b.y, clamped) };

  ctxRef.moveTo(p0.x, p0.y);
  ctxRef.quadraticCurveTo(a.x, a.y, c.x, c.y);
}

class HeartTree {
  constructor(context, width, height) {
    this.ctx = context;
    this.width = width;
    this.height = height;
    this.segments = [];
    this.rootCurves = [];
    this.hearts = [];
    this.backgroundHearts = [];
    this.backgroundRng = createRng(Date.now() ^ 0x9e3779b9);
    this.nextBackgroundSpawn = 0;
    this.rootBase = { x: width * 0.5, y: height * 0.72 };
    this.totalTime = 0;
    this.running = false;
    this.startTime = 0;
    this.seed = Date.now();

    this.loop = this.loop.bind(this);
  }

  reset(seed = Date.now()) {
    this.seed = seed;
    this.segments = [];
    this.rootCurves = [];
    this.hearts = [];
    this.backgroundHearts = [];
    this.backgroundRng = createRng(seed ^ 0x9e3779b9);
    this.nextBackgroundSpawn = 100;
    this.totalTime = 0;

    const rng = createRng(seed);
    const rootX = this.width * 0.5;
    const rootY = this.height * 0.79;
    this.rootBase = { x: rootX, y: rootY };

    this.buildRoots(rng, rootX, rootY);
    this.buildBranch(rng, rootX, rootY, this.height * 0.17, -Math.PI / 2, 0, 8, 520);

    const growthWindows = [
      ...this.rootCurves.map((root) => root.start + root.duration),
      ...this.segments.map((segment) => segment.start + segment.duration),
      ...this.hearts.map((heart) => heart.start + 680)
    ];
    this.totalTime = Math.max(...growthWindows);
  }

  buildRoots(rng, x, y) {
    const rootCount = 8;
    const center = (rootCount - 1) / 2;

    for (let i = 0; i < rootCount; i += 1) {
      const sideFactor = (i - center) / center;
      const direction = sideFactor === 0 ? (rng() > 0.5 ? 1 : -1) : Math.sign(sideFactor);
      const bias = Math.abs(sideFactor);

      const p0 = {
        x: x + sideFactor * randRange(rng, 6, 18),
        y: y + randRange(rng, -2, 5)
      };
      const p1 = {
        x: x + direction * randRange(rng, 30, 125) * (0.7 + bias * 0.55),
        y: y + randRange(rng, 18, 84)
      };
      const p2 = {
        x: x + direction * randRange(rng, 78, 240) * (0.65 + bias * 0.45) + sideFactor * 12,
        y: y + randRange(rng, 58, 126) - bias * randRange(rng, 0, 20)
      };

      const root = {
        p0,
        p1,
        p2,
        width: randRange(rng, 3.2, 6.4) * (1.1 - bias * 0.34),
        color: "#5b3425",
        start: randRange(rng, 30, 210) + bias * 80,
        duration: randRange(rng, 520, 840)
      };

      this.rootCurves.push(root);

      const offshoots = rng() > 0.25 ? 1 : 2;
      for (let j = 0; j < offshoots; j += 1) {
        const t = randRange(rng, 0.4, 0.82);
        const anchor = pointOnQuadratic(p0, p1, p2, t);
        const offDirection = direction + randRange(rng, -0.28, 0.28);
        const offP0 = anchor;
        const offP1 = {
          x: anchor.x + offDirection * randRange(rng, 16, 56),
          y: anchor.y + randRange(rng, 8, 30)
        };
        const offP2 = {
          x: anchor.x + offDirection * randRange(rng, 28, 98),
          y: anchor.y + randRange(rng, 16, 58)
        };

        this.rootCurves.push({
          p0: offP0,
          p1: offP1,
          p2: offP2,
          width: root.width * randRange(rng, 0.45, 0.66),
          color: "#674030",
          start: root.start + randRange(rng, 110, 240) + t * 230,
          duration: randRange(rng, 280, 520)
        });
      }
    }
  }

  buildBranch(rng, x, y, length, angle, depth, maxDepth, startTime) {
    const x2 = x + Math.cos(angle) * length;
    const y2 = y + Math.sin(angle) * length;

    const width = Math.max(1.3, (maxDepth - depth + 1) * 1.25);
    const duration = Math.max(180, Math.min(760, length * 6.6));

    this.segments.push({
      x1: x,
      y1: y,
      x2,
      y2,
      width,
      color: "#4c291b",
      start: startTime,
      duration
    });

    const segmentEnd = startTime + duration;

    if (depth >= maxDepth) {
      const clusterCount = Math.floor(randRange(rng, 3, 7));
      for (let i = 0; i < clusterCount; i += 1) {
        const driftAngle = randRange(rng, -Math.PI, Math.PI);
        const driftRadius = randRange(rng, 2, 14);
        this.hearts.push({
          x: x2 + Math.cos(driftAngle) * driftRadius,
          y: y2 + Math.sin(driftAngle) * driftRadius,
          angle: randRange(rng, -0.48, 0.48),
          size: randRange(rng, 7.2, 11.6),
          start: segmentEnd + randRange(rng, 50, 260) + i * randRange(rng, 10, 35),
          phase: randRange(rng, 0, Math.PI * 2)
        });
      }
      return;
    }

    const children = depth < 2 ? 2 : depth < 6 ? (rng() > 0.45 ? 3 : 2) : (rng() > 0.8 ? 4 : 3);
    const spread = depth < 2 ? 0.62 : depth < 6 ? 0.94 : 1.08;

    for (let i = 0; i < children; i += 1) {
      const t = children === 1 ? 0.5 : i / (children - 1);
      const offset = (t - 0.5) * spread;
      const childAngle = angle + offset + randRange(rng, -0.12, 0.12);
      const childLength = length * randRange(rng, 0.66, 0.81);
      const childStart = segmentEnd - randRange(rng, 70, 170);

      this.buildBranch(rng, x2, y2, childLength, childAngle, depth + 1, maxDepth, childStart);
    }
  }

  start() {
    this.running = true;
    this.startTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
  }

  loop(now) {
    if (!this.running) {
      return;
    }

    const elapsed = now - this.startTime;
    this.render(elapsed);
    requestAnimationFrame(this.loop);
  }

  render(elapsed) {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackdrop();
    this.drawBackgroundHearts(elapsed);
    this.drawGround();
    this.drawRoots(elapsed);
    this.drawTree(elapsed);
    this.drawRootCrown(elapsed);
    this.drawHearts(elapsed);
  }

  drawBackdrop() {
    const { ctx } = this;

    const sky = ctx.createLinearGradient(0, 0, 0, this.height);
    sky.addColorStop(0, "#fff4ea");
    sky.addColorStop(0.48, "#f8ddd5");
    sky.addColorStop(1, "#efc4c1");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.height);

    const moonX = this.width * 0.82;
    const moonY = this.height * 0.17;

    ctx.fillStyle = "#f8e6bb";
    ctx.beginPath();
    ctx.arc(moonX, moonY, 52, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f6e6b04d";
    ctx.beginPath();
    ctx.arc(moonX, moonY, 82, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 30; i += 1) {
      const x = (i * 137) % this.width;
      const y = (i * 89) % (this.height * 0.35);
      ctx.fillStyle = "#f3d891";
      ctx.beginPath();
      ctx.arc(x + 24, y + 24, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawGround() {
    const { ctx } = this;

    ctx.fillStyle = "#4f2e2b24";
    ctx.beginPath();
    ctx.ellipse(this.width * 0.5, this.height * 0.9, this.width * 0.4, 70, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#c8926d";
    ctx.beginPath();
    ctx.moveTo(0, this.height * 0.88);
    ctx.bezierCurveTo(this.width * 0.2, this.height * 0.82, this.width * 0.34, this.height * 0.97, this.width * 0.54, this.height * 0.89);
    ctx.bezierCurveTo(this.width * 0.74, this.height * 0.82, this.width * 0.9, this.height * 0.98, this.width, this.height * 0.9);
    ctx.lineTo(this.width, this.height);
    ctx.lineTo(0, this.height);
    ctx.closePath();
    ctx.fill();
  }

  spawnBackgroundHeart(elapsed) {
    const rng = this.backgroundRng;
    this.backgroundHearts.push({
      start: elapsed,
      duration: randRange(rng, 5600, 9800),
      x0: randRange(rng, 28, this.width - 28),
      y0: randRange(rng, this.height * 0.86, this.height * 1.02),
      rise: randRange(rng, this.height * 0.4, this.height * 0.7),
      drift: randRange(rng, 8, 34),
      wobble: randRange(rng, 1.1, 2.8),
      phase: randRange(rng, 0, Math.PI * 2),
      size: randRange(rng, 4.8, 9.4),
      angle: randRange(rng, -0.6, 0.6)
    });
  }

  drawBackgroundHearts(elapsed) {
    const rng = this.backgroundRng;

    while (elapsed >= this.nextBackgroundSpawn) {
      const batchCount = Math.floor(randRange(rng, 1, 4));
      for (let i = 0; i < batchCount; i += 1) {
        this.spawnBackgroundHeart(elapsed + i * randRange(rng, 15, 70));
      }
      this.nextBackgroundSpawn += randRange(rng, 120, 520);
    }

    const alive = [];

    this.backgroundHearts.forEach((heart) => {
      const life = (elapsed - heart.start) / heart.duration;
      if (life <= 0) {
        alive.push(heart);
        return;
      }
      if (life >= 1) {
        return;
      }

      const riseProgress = easeOutCubic(life);
      const x = heart.x0 + Math.sin(life * Math.PI * 2 * heart.wobble + heart.phase) * heart.drift;
      const y = heart.y0 - heart.rise * riseProgress;
      const size = heart.size * (0.65 + riseProgress * 0.55);
      const alphaIn = Math.min(1, life / 0.16);
      const alphaOut = Math.min(1, (1 - life) / 0.24);
      const alpha = 0.28 * Math.min(alphaIn, alphaOut);
      const angle = heart.angle + Math.sin(life * Math.PI * 2 + heart.phase) * 0.14;

      this.drawSoftHeart(x, y, size, angle, alpha);
      alive.push(heart);
    });

    this.backgroundHearts = alive;
  }

  drawSoftHeart(x, y, size, angle, alpha) {
    const { ctx } = this;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ff8fb4";
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.22);
    ctx.bezierCurveTo(-size * 0.88, -size, -size * 1.36, -size * 0.06, 0, size);
    ctx.bezierCurveTo(size * 1.36, -size * 0.06, size * 0.88, -size, 0, -size * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawRoots(elapsed) {
    const { ctx } = this;

    this.rootCurves.forEach((root) => {
      if (elapsed < root.start) {
        return;
      }

      const raw = Math.min(1, (elapsed - root.start) / root.duration);
      const t = easeOutCubic(raw);
      const taper = 1 - t * 0.22;

      ctx.strokeStyle = root.color;
      ctx.lineWidth = Math.max(1, root.width * taper);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = 0.94;
      ctx.beginPath();
      drawQuadraticUntil(ctx, root.p0, root.p1, root.p2, t);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
  }

  drawTree(elapsed) {
    const { ctx } = this;

    this.segments.forEach((segment) => {
      if (elapsed < segment.start) {
        return;
      }

      const raw = Math.min(1, (elapsed - segment.start) / segment.duration);
      const t = easeOutCubic(raw);
      const x = segment.x1 + (segment.x2 - segment.x1) * t;
      const y = segment.y1 + (segment.y2 - segment.y1) * t;

      ctx.strokeStyle = segment.color;
      ctx.lineWidth = segment.width;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(segment.x1, segment.y1);
      ctx.lineTo(x, y);
      ctx.stroke();
    });
  }

  drawRootCrown(elapsed) {
    const { ctx } = this;
    const appear = Math.min(1, Math.max(0, elapsed / 650));
    if (appear <= 0) {
      return;
    }

    const { x, y } = this.rootBase;

    ctx.save();
    ctx.globalAlpha = 0.25 + appear * 0.7;

    ctx.fillStyle = "#5b3425";
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 18 * appear, 8 * appear, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#603828";
    ctx.lineWidth = 6.5 * appear;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y - 8);
    ctx.quadraticCurveTo(x - 15, y + 1, x - 24, y + 14);
    ctx.moveTo(x, y - 8);
    ctx.quadraticCurveTo(x + 15, y + 1, x + 24, y + 14);
    ctx.stroke();

    ctx.restore();
  }

  drawHearts(elapsed) {
    const { ctx } = this;

    this.hearts.forEach((heart) => {
      if (elapsed < heart.start) {
        return;
      }

      const t = Math.min(1, (elapsed - heart.start) / 540);
      const bloom = easeOutBack(t);
      const pulse = 1 + Math.sin(elapsed / 520 + heart.phase) * 0.045;
      const size = heart.size * bloom * pulse;
      const sway = Math.sin(elapsed / 850 + heart.phase) * 0.16;

      this.drawHeart(heart.x, heart.y, size, heart.angle + sway);
    });
  }

  drawHeart(x, y, size, angle) {
    const { ctx } = this;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const fill = ctx.createRadialGradient(-size * 0.25, -size * 0.35, size * 0.2, 0, 0, size * 1.2);
    fill.addColorStop(0, "#ffd6e2");
    fill.addColorStop(1, "#ff4d86");

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.25);
    ctx.bezierCurveTo(-size * 0.95, -size * 1.05, -size * 1.48, -size * 0.08, 0, size);
    ctx.bezierCurveTo(size * 1.48, -size * 0.08, size * 0.95, -size * 1.05, 0, -size * 0.25);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

const tree = new HeartTree(ctx, canvas.width, canvas.height);

tree.render(0);

function hidePromptAndGrow() {
  prompt.classList.add("hidden");
  statusText.textContent = "For you, my love, I am growing a tree of hearts...";

  tree.reset(Date.now());
  tree.start();

  regrowBtn.hidden = false;

  setTimeout(() => {
    statusText.textContent = "Every heart on this tree whispers how deeply I love you.";
  }, Math.max(2000, tree.totalTime));
}

function dodgeNoButton() {
  noClicks += 1;

  const panel = prompt.getBoundingClientRect();
  const maxX = panel.width * 0.3;
  const maxY = panel.height * 0.2;

  noBtn.style.transform = `translate(${(Math.random() * 2 - 1) * maxX}px, ${(Math.random() * 2 - 1) * maxY}px)`;

  if (noClicks === 1) {
    hintText.textContent = "That button gets nervous around your smile.";
  } else if (noClicks === 2) {
    hintText.textContent = "Still shy. My answer is still yes.";
  } else {
    hintText.textContent = "No rush. I will keep growing love anyway.";
  }
}

yesBtn.addEventListener("click", hidePromptAndGrow);
noBtn.addEventListener("click", dodgeNoButton);
regrowBtn.addEventListener("click", () => {
  statusText.textContent = "Once more, for you, my heart blooms again...";
  tree.reset(Date.now());
  tree.start();

  setTimeout(() => {
    statusText.textContent = "Every heart on this tree whispers how deeply I love you.";
  }, Math.max(2000, tree.totalTime));
});
