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

class HeartTree {
  constructor(context, width, height) {
    this.ctx = context;
    this.width = width;
    this.height = height;
    this.segments = [];
    this.hearts = [];
    this.totalTime = 0;
    this.running = false;
    this.startTime = 0;
    this.seed = Date.now();

    this.loop = this.loop.bind(this);
  }

  reset(seed = Date.now()) {
    this.seed = seed;
    this.segments = [];
    this.hearts = [];
    this.totalTime = 0;

    const rng = createRng(seed);
    const rootX = this.width * 0.5;
    const rootY = this.height * 0.72;

    this.buildRoots(rng, rootX, rootY);
    this.buildBranch(rng, rootX, rootY, this.height * 0.17, -Math.PI / 2, 0, 7, 520);

    this.totalTime = Math.max(
      ...this.segments.map((s) => s.start + s.duration),
      ...this.hearts.map((h) => h.start + 680)
    );
  }

  buildRoots(rng, x, y) {
    const rootCount = 9;

    for (let i = 0; i < rootCount; i += 1) {
      const direction = i < rootCount / 2 ? -1 : 1;
      const targetX = x + direction * randRange(rng, 45, 190);
      const targetY = y + randRange(rng, 34, 112);

      this.segments.push({
        x1: x + randRange(rng, -12, 12),
        y1: y,
        x2: targetX,
        y2: targetY,
        width: randRange(rng, 2.2, 5),
        color: "#5a3425",
        start: randRange(rng, 30, 280),
        duration: randRange(rng, 430, 780)
      });
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
      this.hearts.push({
        x: x2,
        y: y2,
        angle: randRange(rng, -0.4, 0.4),
        size: randRange(rng, 8.4, 12.8),
        start: segmentEnd + randRange(rng, 70, 210),
        phase: randRange(rng, 0, Math.PI * 2)
      });
      return;
    }

    const children = depth < 2 ? 2 : rng() > 0.7 ? 3 : 2;
    const spread = depth < 2 ? 0.58 : 0.85;

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
    this.drawGround();
    this.drawTree(elapsed);
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
  statusText.textContent = "Growing roots, branches, and heart leaves...";

  tree.reset(Date.now());
  tree.start();

  regrowBtn.hidden = false;

  setTimeout(() => {
    statusText.textContent = "Every leaf in this tree is a heart.";
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
  statusText.textContent = "Growing a fresh heart tree...";
  tree.reset(Date.now());
  tree.start();

  setTimeout(() => {
    statusText.textContent = "Every leaf in this tree is a heart.";
  }, Math.max(2000, tree.totalTime));
});
