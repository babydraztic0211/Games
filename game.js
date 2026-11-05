/* =========================================================
   RIFT SWARM — neon arena survival
   A complete, dependency-free canvas game.
   ========================================================= */
(() => {
  'use strict';

  /* ---------------------------------------------------------
     helpers
     --------------------------------------------------------- */
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rndInt = (a, b) => Math.floor(rnd(a, b + 1));
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const dist2 = (ax, ay, bx, by) => {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  };
  const angleDelta = (a, b) => ((a - b + Math.PI) % TAU + TAU) % TAU - Math.PI;
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const padScore = (n) => String(Math.max(0, Math.floor(n))).padStart(6, '0');
  const formatTime = (t) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };
  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  const $ = (id) => document.getElementById(id);

  /* ---------------------------------------------------------
     palette
     --------------------------------------------------------- */
  const C = {
    cyan: '#45f4ff',
    cyanSoft: '#a9fbff',
    magenta: '#ff3fa4',
    violet: '#a77bff',
    green: '#57ffb0',
    amber: '#ffc857',
    red: '#ff5470',
    orange: '#ff8a3d',
    white: '#ffffff',
    ink: '#05060f',
  };

  /* ---------------------------------------------------------
     canvas + background
     --------------------------------------------------------- */
  const canvas = $('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const bgCanvas = document.createElement('canvas');
  const bgx = bgCanvas.getContext('2d');
  let W = 0;
  let H = 0;
  let DPR = 1;
  let stars = [];

  const glowCache = new Map();
  function glowSprite(color) {
    let sprite = glowCache.get(color);
    if (sprite) return sprite;
    const size = 96;
    sprite = document.createElement('canvas');
    sprite.width = sprite.height = size;
    const g = sprite.getContext('2d');
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, rgba(color, 1));
    grad.addColorStop(0.16, rgba(color, 0.85));
    grad.addColorStop(0.42, rgba(color, 0.26));
    grad.addColorStop(1, rgba(color, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    glowCache.set(color, sprite);
    return sprite;
  }
  function drawGlow(x, y, radius, color, alpha) {
    const sprite = glowSprite(color);
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
    ctx.globalAlpha = 1;
  }

  function buildBackground() {
    bgCanvas.width = Math.max(1, Math.round(W * DPR));
    bgCanvas.height = Math.max(1, Math.round(H * DPR));
    bgx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const base = bgx.createLinearGradient(0, 0, W * 0.6, H);
    base.addColorStop(0, '#04050d');
    base.addColorStop(0.55, '#070a19');
    base.addColorStop(1, '#05060f');
    bgx.fillStyle = base;
    bgx.fillRect(0, 0, W, H);

    const nebula = (x, y, r, color) => {
      const g = bgx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      bgx.fillStyle = g;
      bgx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    nebula(W * 0.16, H * 0.18, Math.max(W, H) * 0.62, 'rgba(38,86,190,0.13)');
    nebula(W * 0.86, H * 0.84, Math.max(W, H) * 0.6, 'rgba(150,24,112,0.11)');
    nebula(W * 0.5, H * 0.52, Math.max(W, H) * 0.48, 'rgba(28,128,160,0.055)');

    const step = Math.max(48, Math.round(Math.min(W, H) / 14));
    bgx.lineWidth = 1;
    let col = 0;
    for (let x = 0.5; x <= W; x += step) {
      bgx.strokeStyle = col % 4 === 0 ? 'rgba(94,178,225,0.075)' : 'rgba(90,140,200,0.032)';
      bgx.beginPath();
      bgx.moveTo(x, 0);
      bgx.lineTo(x, H);
      bgx.stroke();
      col++;
    }
    let row = 0;
    for (let y = 0.5; y <= H; y += step) {
      bgx.strokeStyle = row % 4 === 0 ? 'rgba(94,178,225,0.075)' : 'rgba(90,140,200,0.032)';
      bgx.beginPath();
      bgx.moveTo(0, y);
      bgx.lineTo(W, y);
      bgx.stroke();
      row++;
    }

    const horizon = bgx.createLinearGradient(0, H * 0.7, 0, H);
    horizon.addColorStop(0, 'rgba(20,120,170,0)');
    horizon.addColorStop(1, 'rgba(20,120,170,0.07)');
    bgx.fillStyle = horizon;
    bgx.fillRect(0, H * 0.7, W, H * 0.3);

    const vignette = bgx.createRadialGradient(
      W / 2, H * 0.48, Math.min(W, H) * 0.26,
      W / 2, H * 0.48, Math.max(W, H) * 0.78
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(0.58, 'rgba(0,0,0,0.16)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.62)');
    bgx.fillStyle = vignette;
    bgx.fillRect(0, 0, W, H);

    bgx.fillStyle = 'rgba(255,255,255,0.02)';
    for (let y = 0; y < H; y += 3) bgx.fillRect(0, y, W, 1);
  }

  function buildStars() {
    const count = Math.round(clamp((W * H) / 15000, 46, 130));
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: rnd(0, W),
        y: rnd(0, H),
        r: rnd(0.6, 1.9),
        a: rnd(0.14, 0.55),
        tw: rnd(0.5, 1.7),
        ph: rnd(0, TAU),
        vx: rnd(-3, 3),
        vy: rnd(-2, 2),
      });
    }
  }

  function resize() {
    W = Math.max(320, window.innerWidth);
    H = Math.max(320, window.innerHeight);
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    buildBackground();
    buildStars();
    if (G.player) {
      G.player.x = clamp(G.player.x, 30, W - 30);
      G.player.y = clamp(G.player.y, 30, H - 30);
    }
    for (const e of G.enemies) {
      if (e.active) {
        e.x = clamp(e.x, 16, W - 16);
        e.y = clamp(e.y, 16, H - 16);
      }
    }
  }

  /* ---------------------------------------------------------
     state + persistence
     --------------------------------------------------------- */
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (err) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        /* storage unavailable — best score is optional */
      }
    },
  };

  const G = {
    mode: 'title',
    player: null,
    enemies: [],
    bullets: [],
    ebullets: [],
    orbs: [],
    particles: [],
    rings: [],
    bolts: [],
    texts: [],
    boss: null,
    wave: 1,
    waveTime: 0,
    spawnTimer: 0,
    banner: null,
    score: 0,
    kills: 0,
    combo: 0,
    comboTimer: 0,
    level: 1,
    xp: 0,
    xpNext: 8,
    pendingLevels: 0,
    time: 0,
    shake: 0,
    flash: 0,
    ambient: 0,
    mouse: { x: 0, y: 0 },
    mouseActive: false,
    upgrades: {},
    choices: [],
    nextId: 1,
    best: 0,
    bestWave: 0,
    isTouch: false,
    stick: { x: 0, y: 0, active: false, id: null },
  };

  G.best = Number(store.get('riftSwarm.best', 0)) || 0;
  G.bestWave = Number(store.get('riftSwarm.bestWave', 0)) || 0;

  /* ---------------------------------------------------------
     audio — tiny synthesizer, no assets
     --------------------------------------------------------- */
  const Sound = {
    ac: null,
    master: null,
    noiseBuf: null,
    enabled: true,
    lastShoot: 0,
    lastHit: 0,
    lastKill: 0,
    lastPick: 0,
    init() {
      if (this.ac) {
        if (this.ac.state === 'suspended') this.ac.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ac = new AC();
      this.master = this.ac.createGain();
      this.master.gain.value = 0.24;
      this.master.connect(this.ac.destination);
      const len = Math.floor(this.ac.sampleRate * 1);
      const buf = this.ac.createBuffer(1, len, this.ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
    },
    tone(freq, dur, type, vol, slide, delay) {
      if (!this.ac || !this.enabled) return;
      const t0 = this.ac.currentTime + (delay || 0);
      const osc = this.ac.createOscillator();
      const gain = this.ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(Math.max(20, freq), t0);
      if (slide) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
      }
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol || 0.05), t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    },
    noise(dur, vol, freq, q, delay) {
      if (!this.ac || !this.enabled || !this.noiseBuf) return;
      const t0 = this.ac.currentTime + (delay || 0);
      const src = this.ac.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const filter = this.ac.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq || 800, t0);
      filter.Q.value = q || 1;
      const gain = this.ac.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol || 0.1), t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start(t0);
      src.stop(t0 + dur + 0.03);
    },
    shoot() {
      const t = performance.now();
      if (t - this.lastShoot < 28) return;
      this.lastShoot = t;
      this.tone(rnd(660, 780), 0.045, 'square', 0.04, -260);
    },
    hit() {
      const t = performance.now();
      if (t - this.lastHit < 40) return;
      this.lastHit = t;
      this.tone(rnd(200, 280), 0.05, 'triangle', 0.045, -90);
    },
    kill() {
      const t = performance.now();
      if (t - this.lastKill < 38) return;
      this.lastKill = t;
      this.noise(0.2, 0.12, rnd(700, 1100), 0.8);
      this.tone(rnd(120, 170), 0.16, 'sawtooth', 0.04, -90);
    },
    bossKill() {
      this.noise(0.8, 0.24, 420, 0.7);
      this.tone(110, 0.6, 'sawtooth', 0.1, -80);
      [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.055, 0, 0.12 + i * 0.09));
    },
    hurt() {
      this.tone(150, 0.28, 'sawtooth', 0.14, -110);
      this.noise(0.22, 0.1, 300, 1);
    },
    pickup() {
      const t = performance.now();
      if (t - this.lastPick < 42) return;
      this.lastPick = t;
      this.tone(rnd(880, 1020), 0.06, 'sine', 0.03, 240);
    },
    heal() {
      this.tone(523, 0.12, 'sine', 0.05, 180);
      this.tone(784, 0.16, 'sine', 0.04, 120, 0.07);
    },
    levelup() {
      [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.26, 'triangle', 0.055, 0, i * 0.075));
    },
    upgrade() {
      this.tone(784, 0.1, 'sine', 0.06, 160);
      this.tone(1174, 0.16, 'sine', 0.045, 120, 0.07);
    },
    dash() {
      this.noise(0.16, 0.09, 1500, 0.6);
      this.tone(420, 0.1, 'sine', 0.03, -160);
    },
    wave() {
      this.tone(330, 0.18, 'triangle', 0.045, 0);
      this.tone(494, 0.22, 'triangle', 0.04, 0, 0.1);
    },
    bossWarn() {
      this.tone(110, 0.5, 'sawtooth', 0.08, 30);
      this.tone(165, 0.5, 'sawtooth', 0.06, 20, 0.1);
    },
    gameover() {
      [440, 349, 262, 196].forEach((f, i) => this.tone(f, 0.42, 'triangle', 0.075, 0, i * 0.14));
      this.noise(0.9, 0.1, 220, 0.8);
    },
  };

  /* ---------------------------------------------------------
     input
     --------------------------------------------------------- */
  const keys = Object.create(null);

  function keyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    keys[e.code] = true;

    if (e.code === 'KeyM') toggleMute();
    if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
    if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') tryDash();

    if (G.mode === 'levelup') {
      const index = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code];
      if (index != null) chooseByIndex(index);
    }
    if ((G.mode === 'title' || G.mode === 'gameover') && (e.code === 'Enter' || e.code === 'Space')) {
      startGame();
    }
  }
  function keyUp(e) {
    keys[e.code] = false;
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', () => {
    for (const k in keys) keys[k] = false;
    if (G.mode === 'playing') pauseGame();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    G.mouse.x = e.clientX;
    G.mouse.y = e.clientY;
    G.mouseActive = true;
  });
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;
    G.mouse.x = e.clientX;
    G.mouse.y = e.clientY;
    G.mouseActive = true;
    Sound.init();
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  const stickEl = $('joystick');
  const knobEl = $('stick-knob');
  const stick = G.stick;
  const STICK_RADIUS = 42;

  function updateStick(e) {
    const rect = stickEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const len = Math.hypot(dx, dy) || 1;
    const max = Math.min(STICK_RADIUS, rect.width * 0.32);
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    knobEl.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;
    let nx = dx / max;
    let ny = dy / max;
    const nlen = Math.hypot(nx, ny);
    const dead = 0.14;
    if (nlen < dead) {
      stick.x = 0;
      stick.y = 0;
    } else {
      const k = (nlen - dead) / (1 - dead) / nlen;
      stick.x = clamp(nx * k, -1, 1);
      stick.y = clamp(ny * k, -1, 1);
    }
  }
  function endStick() {
    stick.active = false;
    stick.x = 0;
    stick.y = 0;
    knobEl.style.transform = 'translate(-50%, -50%)';
  }
  if (stickEl) {
    stickEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      stick.active = true;
      stick.id = e.pointerId;
      try {
        stickEl.setPointerCapture(e.pointerId);
      } catch (err) {
        /* ignore */
      }
      updateStick(e);
    });
    stickEl.addEventListener('pointermove', (e) => {
      if (stick.active && e.pointerId === stick.id) updateStick(e);
    });
    stickEl.addEventListener('pointerup', endStick);
    stickEl.addEventListener('pointercancel', endStick);
    stickEl.addEventListener('lostpointercapture', endStick);
  }

  $('dash-btn').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    tryDash();
  });

  $('play-btn').addEventListener('click', startGame);
  $('again-btn').addEventListener('click', startGame);
  $('menu-btn').addEventListener('click', goTitle);
  $('resume-btn').addEventListener('click', resumeGame);
  $('restart-btn').addEventListener('click', startGame);
  $('quit-btn').addEventListener('click', goTitle);
  $('pause-btn').addEventListener('click', pauseGame);
  $('mute-btn').addEventListener('click', toggleMute);
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.mode === 'playing') pauseGame();
  });
  window.addEventListener('pointerdown', () => Sound.init(), { once: true });

  /* ---------------------------------------------------------
     run flow
     --------------------------------------------------------- */
  const WAVE_TIME = 22;
  let hudLast = {};
  let lastHudAt = 0;

  const ENEMY_TYPES = {
    drifter: { hp: 22, speed: 96, r: 14, dmg: 9, score: 10, xp: 1, color: C.magenta, shape: 'diamond', spawnT: 0.6 },
    weaver: { hp: 16, speed: 158, r: 12, dmg: 8, score: 14, xp: 1, color: C.amber, shape: 'tri', spawnT: 0.55 },
    spitter: { hp: 38, speed: 72, r: 16, dmg: 10, score: 22, xp: 2, color: C.violet, shape: 'hex', spawnT: 0.7 },
    brute: { hp: 160, speed: 52, r: 27, dmg: 18, score: 45, xp: 3, color: C.orange, shape: 'square', spawnT: 0.9 },
    boss: { hp: 680, speed: 50, r: 54, dmg: 26, score: 600, xp: 18, color: C.red, shape: 'hex', spawnT: 1.3 },
  };

  function makePlayer() {
    return {
      x: W / 2,
      y: H / 2,
      vx: 0,
      vy: 0,
      r: 14,
      hp: 100,
      maxHp: 100,
      speed: 250,
      angle: -Math.PI / 2,
      aimAngle: -Math.PI / 2,
      fireCd: 0,
      fireRate: 0.15,
      damage: 10,
      bulletSpeed: 780,
      split: 0,
      pierce: 0,
      ricochet: 0,
      crit: 0,
      dashCd: 0,
      dashMax: 1.25,
      dashTime: 0,
      dashX: 0,
      dashY: 1,
      invuln: 0,
      magnet: 95,
      chain: 0,
      lifesteal: 0,
      droneCount: 0,
      droneCd: [],
      droneAngle: 0,
      trailT: 0,
      dead: false,
    };
  }

  function startGame() {
    Sound.init();
    G.mode = 'playing';
    G.player = makePlayer();
    G.enemies.length = 0;
    G.bullets.length = 0;
    G.ebullets.length = 0;
    G.orbs.length = 0;
    G.particles.length = 0;
    G.rings.length = 0;
    G.bolts.length = 0;
    G.texts.length = 0;
    G.boss = null;
    G.wave = 1;
    G.waveTime = WAVE_TIME;
    G.spawnTimer = 0.8;
    G.banner = null;
    G.score = 0;
    G.kills = 0;
    G.combo = 0;
    G.comboTimer = 0;
    G.level = 1;
    G.xp = 0;
    G.xpNext = 8;
    G.pendingLevels = 0;
    G.time = 0;
    G.shake = 0;
    G.flash = 0;
    G.mouseActive = false;
    G.upgrades = {};
    G.choices = [];
    hudLast = {};

    $('title-screen').classList.add('hidden');
    $('pause-screen').classList.add('hidden');
    $('levelup-screen').classList.add('hidden');
    $('gameover-screen').classList.add('hidden');
    $('hud').classList.remove('hidden');
    $('boss-wrap').classList.add('hidden');
    $('combo').classList.add('hidden');

    const p = G.player;
    startWave(1);
    const count = G.isTouch ? 4 : 7;
    const base = Math.min(W, H);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + rnd(-0.2, 0.2);
      const d = rnd(base * 0.3, base * 0.45);
      spawnEnemy('drifter', clamp(p.x + Math.cos(a) * d, 40, W - 40), clamp(p.y + Math.sin(a) * d, 40, H - 40), 0.12);
    }
    for (let i = 0; i < 18; i++) {
      addParticle(p.x, p.y, i % 3 === 0 ? C.white : C.cyan, rnd(1, 3), rnd(80, 240), rnd(0.3, 0.7));
    }
    refreshTouch();
    updateHud(true);
  }

  function goTitle() {
    G.mode = 'title';
    G.player = null;
    G.enemies.length = 0;
    G.bullets.length = 0;
    G.ebullets.length = 0;
    G.orbs.length = 0;
    G.particles.length = 0;
    G.rings.length = 0;
    G.bolts.length = 0;
    G.texts.length = 0;
    G.boss = null;
    G.pendingLevels = 0;
    G.banner = null;
    G.shake = 0;
    G.flash = 0;
    $('hud').classList.add('hidden');
    $('pause-screen').classList.add('hidden');
    $('levelup-screen').classList.add('hidden');
    $('gameover-screen').classList.add('hidden');
    $('title-screen').classList.remove('hidden');
    $('touch-controls').classList.add('hidden');
    updateTitleBest();
  }

  function pauseGame() {
    if (G.mode !== 'playing') return;
    G.mode = 'paused';
    $('pause-wave').textContent = String(G.wave);
    $('pause-score').textContent = fmt(G.score);
    $('pause-level').textContent = String(G.level);
    $('pause-screen').classList.remove('hidden');
    $('touch-controls').classList.add('hidden');
  }

  function resumeGame() {
    if (G.mode !== 'paused') return;
    G.mode = 'playing';
    $('pause-screen').classList.add('hidden');
    refreshTouch();
  }

  function togglePause() {
    if (G.mode === 'playing') pauseGame();
    else if (G.mode === 'paused') resumeGame();
  }

  function toggleMute() {
    Sound.enabled = !Sound.enabled;
    const btn = $('mute-btn');
    btn.textContent = Sound.enabled ? '\u266A' : '\u2715';
    btn.classList.toggle('muted', !Sound.enabled);
    if (Sound.enabled) Sound.tone(660, 0.08, 'sine', 0.05);
  }

  function refreshTouch() {
    const show = G.isTouch && G.mode === 'playing';
    $('touch-controls').classList.toggle('hidden', !show);
  }

  function updateTitleBest() {
    $('title-best').textContent = fmt(G.best);
    $('title-best-wave').textContent = String(G.bestWave);
  }

  /* ---------------------------------------------------------
     waves + spawning
     --------------------------------------------------------- */
  function startWave(n) {
    G.wave = n;
    G.waveTime = WAVE_TIME;
    G.spawnTimer = 0.75;
    const bossWave = n % 5 === 0;
    G.banner = {
      t: bossWave ? 3 : 2.6,
      max: bossWave ? 3 : 2.6,
      text: bossWave ? 'RIFT WARDEN' : 'WAVE ' + n,
      sub: bossWave ? 'DESTROY THE CORE' : 'HOSTILES INBOUND',
    };
    if (bossWave && !G.boss) spawnBoss(n);
    Sound.wave();
  }

  function nextWave() {
    if (G.mode !== 'playing') return;
    const p = G.player;
    G.score += G.wave * 25;
    const heal = Math.min(12, p.maxHp - p.hp);
    if (heal > 0) {
      p.hp += heal;
      addText(p.x, p.y - 30, '+' + Math.round(heal) + ' HULL', C.green, 1.1, 15);
    }
    addText(p.x, p.y - 54, 'WAVE CLEAR +' + G.wave * 25, C.amber, 1.3, 15);
    startWave(G.wave + 1);
  }

  function updateSpawns(dt) {
    if (G.boss) {
      G.waveTime = Math.max(G.waveTime, 1);
    } else {
      G.waveTime -= dt;
    }
    G.spawnTimer -= dt;
    const cap = G.isTouch ? 62 : 92;
    if (G.spawnTimer <= 0 && G.enemies.length < cap) {
      const base = Math.max(0.26, 1.02 - (G.wave - 1) * 0.055);
      G.spawnTimer = base * rnd(0.72, 1.28) * (G.boss ? 1.9 : 1);
      let count = 1;
      if (G.wave >= 6 && Math.random() < 0.45) count++;
      if (G.wave >= 12 && Math.random() < 0.3) count++;
      for (let i = 0; i < count; i++) spawnEnemy(randomType());
    }
    if (G.waveTime <= 0 && !G.boss) nextWave();
  }

  function edgePos() {
    const pad = 54;
    const side = rndInt(0, 3);
    if (side === 0) return { x: rnd(0, W), y: -pad };
    if (side === 1) return { x: W + pad, y: rnd(0, H) };
    if (side === 2) return { x: rnd(0, W), y: H + pad };
    return { x: -pad, y: rnd(0, H) };
  }

  function randomType() {
    const weights = [['drifter', 10]];
    if (G.wave >= 2) weights.push(['weaver', 6]);
    if (G.wave >= 3) weights.push(['spitter', 4.5]);
    if (G.wave >= 4) weights.push(['brute', 2.2]);
    if (G.wave >= 8) weights.push(['drifter', 4]);
    let total = 0;
    for (const w of weights) total += w[1];
    let roll = Math.random() * total;
    for (const w of weights) {
      roll -= w[1];
      if (roll <= 0) return w[0];
    }
    return 'drifter';
  }

  function spawnEnemy(type, x, y, spawnT) {
    const def = ENEMY_TYPES[type];
    if (x == null) {
      const pos = edgePos();
      x = pos.x;
      y = pos.y;
    }
    const scale = 1 + (G.wave - 1) * 0.2;
    const st = spawnT == null ? def.spawnT : spawnT;
    const e = {
      id: ++G.nextId,
      type,
      x,
      y,
      r: def.r,
      hp: def.hp * scale,
      maxHp: def.hp * scale,
      speed: def.speed * (1 + Math.min(0.5, (G.wave - 1) * 0.02)),
      dmg: def.dmg * (1 + (G.wave - 1) * 0.055),
      score: def.score,
      xp: def.xp,
      color: def.color,
      shape: def.shape,
      rot: rnd(0, TAU),
      age: rnd(0, 2),
      spawnT: st,
      spawnMax: st,
      active: false,
      hitFlash: 0,
      kx: 0,
      ky: 0,
      fireCd: rnd(1.4, 2.4),
      phase: rnd(0, TAU),
      atk1: 2.4,
      atk2: 4.2,
      atk3: 6.2,
      raged: false,
      dead: false,
    };
    if (type === 'boss') e.fireCd = 99;
    G.enemies.push(e);
    addRing(x, y, def.r * 3.2, def.r, def.color, 0.55, 2);
    return e;
  }

  function spawnBoss(n) {
    const e = spawnEnemy('boss', W / 2, clamp(H * 0.26, 190, 230), 1.1);
    G.boss = e;
    $('boss-name').textContent = 'RIFT WARDEN // MK ' + Math.ceil(n / 5);
    $('boss-wrap').classList.remove('hidden');
    G.banner = { t: 3, max: 3, text: 'RIFT WARDEN', sub: 'DESTROY THE CORE' };
    Sound.bossWarn();
  }

  /* ---------------------------------------------------------
     player
     --------------------------------------------------------- */
  function nearestEnemy(x, y, maxDist, exclude) {
    let best = null;
    let bd = (maxDist == null ? Infinity : maxDist) ** 2;
    for (const e of G.enemies) {
      if (!e.active || e.dead || e === exclude) continue;
      const d = dist2(x, y, e.x, e.y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  function tryDash() {
    if (G.mode !== 'playing') return;
    const p = G.player;
    if (!p || p.dead || p.dashCd > 0 || p.dashTime > 0) return;
    let dx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + stick.x;
    let dy = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0) + stick.y;
    if (Math.hypot(dx, dy) < 0.25) {
      dx = Math.cos(p.aimAngle);
      dy = Math.sin(p.aimAngle);
    }
    const len = Math.hypot(dx, dy) || 1;
    p.dashX = dx / len;
    p.dashY = dy / len;
    p.dashTime = 0.16;
    p.dashCd = p.dashMax;
    p.invuln = Math.max(p.invuln, 0.3);
    G.shake = Math.min(16, G.shake + 4);
    addRing(p.x, p.y, 12, 58, C.cyan, 0.4, 2);
    for (let i = 0; i < 12; i++) {
      addParticle(p.x, p.y, i % 3 === 0 ? C.white : C.cyan, rnd(1.5, 3.5), rnd(40, 180), rnd(0.25, 0.55));
    }
    Sound.dash();
  }

  function fire() {
    const p = G.player;
    const count = 1 + p.split;
    const spread = count > 1 ? Math.min(0.58, 0.11 * (count - 1)) : 0;
    for (let i = 0; i < count; i++) {
      const off = count === 1 ? 0 : -spread / 2 + spread * (i / (count - 1));
      const a = p.aimAngle + off + rnd(-0.012, 0.012);
      const speed = p.bulletSpeed * rnd(0.97, 1.03);
      const crit = Math.random() < p.crit;
      G.bullets.push({
        x: p.x + Math.cos(a) * 17,
        y: p.y + Math.sin(a) * 17,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        r: crit ? 4.6 : 3.4,
        dmg: p.damage * (crit ? 2 : 1),
        pierce: p.pierce,
        ricochet: p.ricochet,
        life: 1.7,
        dead: false,
        hits: [],
        color: crit ? C.amber : C.cyan,
        crit,
      });
    }
    for (let i = 0; i < 3; i++) {
      addParticle(
        p.x + Math.cos(p.aimAngle) * 20,
        p.y + Math.sin(p.aimAngle) * 20,
        i === 0 ? C.white : C.cyan,
        rnd(1, 2.5),
        rnd(30, 90),
        0.18
      );
    }
    G.shake = Math.max(G.shake, 1.4);
    Sound.shoot();
  }

  function updatePlayer(dt) {
    const p = G.player;
    if (!p || p.dead) return;

    let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    let iy = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
    ix += stick.x;
    iy += stick.y;
    const ilen = Math.hypot(ix, iy);
    if (ilen > 1) {
      ix /= ilen;
      iy /= ilen;
    }

    const target = nearestEnemy(p.x, p.y, 1500);
    let aimA;
    if (G.isTouch || !G.mouseActive) {
      aimA = target ? Math.atan2(target.y - p.y, target.x - p.x) : p.angle;
    } else {
      aimA = Math.atan2(G.mouse.y - p.y, G.mouse.x - p.x);
      if (target) {
        const ta = Math.atan2(target.y - p.y, target.x - p.x);
        if (Math.abs(angleDelta(ta, aimA)) < 0.15) aimA = ta;
      }
    }
    p.aimAngle = aimA;
    p.angle += angleDelta(aimA, p.angle) * Math.min(1, dt * 16);

    if (p.dashTime > 0) {
      p.dashTime -= dt;
      p.x += p.dashX * 760 * dt;
      p.y += p.dashY * 760 * dt;
      p.invuln = Math.max(p.invuln, 0.05);
      if (Math.random() < dt * 80) {
        addParticle(p.x, p.y, C.cyan, rnd(1.5, 3.5), rnd(20, 70), 0.3);
      }
    } else {
      p.vx += (ix * p.speed - p.vx) * Math.min(1, dt * 14);
      p.vy += (iy * p.speed - p.vy) * Math.min(1, dt * 14);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    p.x = clamp(p.x, p.r + 6, W - p.r - 6);
    p.y = clamp(p.y, p.r + 6, H - p.r - 6);
    if (p.x <= p.r + 6 || p.x >= W - p.r - 6) p.vx = 0;
    if (p.y <= p.r + 6 || p.y >= H - p.r - 6) p.vy = 0;

    p.dashCd = Math.max(0, p.dashCd - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.fireCd -= dt;

    const spd = Math.hypot(p.vx, p.vy);
    if (spd > 45) {
      p.trailT -= dt;
      if (p.trailT <= 0) {
        p.trailT = 0.035;
        addParticle(
          p.x - Math.cos(p.angle) * 11,
          p.y - Math.sin(p.angle) * 11,
          C.cyan,
          rnd(1.2, 3),
          rnd(8, 32),
          0.3,
          -p.vx * 0.12,
          -p.vy * 0.12
        );
      }
    }

    if (p.fireCd <= 0 && target) {
      fire();
      p.fireCd = p.fireRate;
    }

    updateDrones(dt);
  }

  function updateDrones(dt) {
    const p = G.player;
    if (!p.droneCount) return;
    p.droneAngle += dt * 2.2;
    for (let i = 0; i < p.droneCount; i++) {
      if (p.droneCd[i] == null) p.droneCd[i] = 0;
      p.droneCd[i] -= dt;
      if (p.droneCd[i] > 0) continue;
      const a = p.droneAngle + (i * TAU) / p.droneCount;
      const dx = p.x + Math.cos(a) * 54;
      const dy = p.y + Math.sin(a) * 54;
      const target = nearestEnemy(dx, dy, 520);
      if (!target) {
        p.droneCd[i] = 0.2;
        continue;
      }
      p.droneCd[i] = 0.55;
      const ang = Math.atan2(target.y - dy, target.x - dx);
      G.bullets.push({
        x: dx,
        y: dy,
        vx: Math.cos(ang) * 700,
        vy: Math.sin(ang) * 700,
        r: 2.6,
        dmg: 6 + p.damage * 0.25,
        pierce: 0,
        ricochet: 0,
        life: 1.3,
        dead: false,
        hits: [],
        color: C.green,
        crit: false,
      });
      addParticle(dx, dy, C.green, 1.6, 50, 0.18);
      Sound.shoot();
    }
  }

  /* ---------------------------------------------------------
     enemies
     --------------------------------------------------------- */
  function updateEnemies(dt) {
    const p = G.player;
    if (!p) return;

    for (const e of G.enemies) {
      if (e.dead) continue;
      e.age += dt;
      e.rot += dt * (e.type === 'boss' ? 0.45 : e.type === 'brute' ? 0.7 : 1.25);
      if (e.spawnT > 0) {
        e.spawnT -= dt;
        if (e.spawnT <= 0) {
          e.active = true;
          addRing(e.x, e.y, e.r * 2.4, e.r, e.color, 0.32, 1.5);
        }
        continue;
      }
      e.hitFlash = Math.max(0, e.hitFlash - dt);

      e.x += e.kx * dt;
      e.y += e.ky * dt;
      const damp = Math.pow(0.02, dt);
      e.kx *= damp;
      e.ky *= damp;

      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const nx = dx / d;
      const ny = dy / d;

      if (e.type === 'drifter') {
        const wob = Math.sin(e.age * 3 + e.phase) * 0.35;
        const ax = nx * Math.cos(wob) - ny * Math.sin(wob);
        const ay = nx * Math.sin(wob) + ny * Math.cos(wob);
        e.x += ax * e.speed * dt;
        e.y += ay * e.speed * dt;
      } else if (e.type === 'weaver') {
        const wob = Math.sin(e.age * 6 + e.phase) * 0.95;
        const ax = nx * Math.cos(wob) - ny * Math.sin(wob);
        const ay = nx * Math.sin(wob) + ny * Math.cos(wob);
        e.x += ax * e.speed * dt;
        e.y += ay * e.speed * dt;
      } else if (e.type === 'spitter') {
        let mx = 0;
        let my = 0;
        if (d > 300) {
          mx = nx;
          my = ny;
        } else if (d < 220) {
          mx = -nx;
          my = -ny;
        }
        const strafe = Math.sin(e.age * 1.5 + e.phase) * 0.75;
        mx += -ny * strafe;
        my += nx * strafe;
        e.x += mx * e.speed * dt;
        e.y += my * e.speed * dt;
        e.fireCd -= dt;
        if (e.fireCd <= 0 && d < 560) {
          e.fireCd = rnd(1.5, 2.4);
          const aim = Math.atan2(dy, dx) + rnd(-0.06, 0.06);
          fireEnemyBullet(e.x, e.y, aim, 205, e.dmg * 0.8, C.violet, 5.5);
        }
      } else if (e.type === 'brute') {
        e.x += nx * e.speed * dt;
        e.y += ny * e.speed * dt;
      } else if (e.type === 'boss') {
        updateBoss(e, dt, nx, ny, d);
      }
    }

    // keep the swarm from stacking into a single point
    for (let i = 0; i < G.enemies.length; i++) {
      const a = G.enemies[i];
      if (!a.active || a.dead) continue;
      for (let j = i + 1; j < G.enemies.length; j++) {
        const b = G.enemies[j];
        if (!b.active || b.dead) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const min = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.01 && d2 < min * min) {
          const d = Math.sqrt(d2);
          const push = (min - d) * 0.45;
          const nx = dx / d;
          const ny = dy / d;
          if (a.type !== 'boss') {
            a.x -= nx * push;
            a.y -= ny * push;
          }
          if (b.type !== 'boss') {
            b.x += nx * push;
            b.y += ny * push;
          }
        }
      }
    }

    for (const e of G.enemies) {
      if (!e.active || e.dead) continue;
      const rr = p.r + e.r * 0.82;
      if (dist2(p.x, p.y, e.x, e.y) < rr * rr) {
        damagePlayer(e.dmg);
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        p.x += Math.cos(a) * 16;
        p.y += Math.sin(a) * 16;
        e.kx -= Math.cos(a) * 150;
        e.ky -= Math.sin(a) * 150;
        e.hitFlash = 0.1;
      }
    }

    G.enemies = G.enemies.filter((e) => !e.dead);
  }

  function updateBoss(e, dt, nx, ny, d) {
    const p = G.player;
    if (!e.raged && e.hp < e.maxHp * 0.5) {
      e.raged = true;
      e.color = C.orange;
      addRing(e.x, e.y, e.r * 1.1, e.r * 3.4, C.orange, 0.6, 3);
      addText(e.x, e.y - e.r - 42, 'WARDEN ENRAGED', C.orange, 1.6, 18);
      G.shake = Math.min(22, G.shake + 8);
      Sound.bossWarn();
    }

    const orbit = e.age * (e.raged ? 0.5 : 0.35);
    const tx = p.x + Math.cos(orbit) * 300;
    const ty = p.y + Math.sin(orbit) * 300;
    const dx = tx - e.x;
    const dy = ty - e.y;
    const td = Math.hypot(dx, dy) || 1;
    const sp = e.speed * (e.raged ? 1.4 : 1);
    e.x += (dx / td) * sp * dt;
    e.y += (dy / td) * sp * dt;

    e.atk1 -= dt;
    if (e.atk1 <= 0) {
      e.atk1 = e.raged ? 1.9 : 2.8;
      const n = e.raged ? 18 : 12;
      const off = rnd(0, TAU);
      for (let i = 0; i < n; i++) {
        fireEnemyBullet(e.x, e.y, off + (i * TAU) / n, e.raged ? 200 : 165, e.dmg * 0.42, C.red, 6);
      }
      addRing(e.x, e.y, e.r * 1.1, e.r * 2.6, C.red, 0.45, 2.5);
      G.shake = Math.min(18, G.shake + 3);
      Sound.tone(90, 0.22, 'sawtooth', 0.05, -30);
    }

    e.atk2 -= dt;
    if (e.atk2 <= 0) {
      e.atk2 = e.raged ? 3 : 4.5;
      const aim = Math.atan2(p.y - e.y, p.x - e.x);
      for (let i = -1; i <= 1; i++) {
        fireEnemyBullet(e.x, e.y, aim + i * 0.15, 255, e.dmg * 0.5, C.amber, 5);
      }
      Sound.tone(220, 0.14, 'square', 0.04, -60);
    }

    e.atk3 -= dt;
    if (e.atk3 <= 0) {
      e.atk3 = e.raged ? 5.5 : 7;
      for (let i = 0; i < 2; i++) {
        spawnEnemy(Math.random() < 0.5 ? 'drifter' : 'weaver', e.x + rnd(-60, 60), e.y + rnd(-60, 60), 0.55);
      }
      addRing(e.x, e.y, e.r * 1.4, e.r * 3, C.magenta, 0.5, 2);
    }
  }

  function fireEnemyBullet(x, y, angle, speed, dmg, color, r) {
    if (G.ebullets.length > 420) return;
    G.ebullets.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: r || 5,
      dmg,
      life: 6,
      color: color || C.magenta,
      trailT: 0,
      dead: false,
    });
    addParticle(x, y, color || C.magenta, (r || 5) * 0.7, 60, 0.22);
  }

  /* ---------------------------------------------------------
     effects
     --------------------------------------------------------- */
  const flashEl = $('damage-flash');
  let lastFlashOpacity = -1;

  function addParticle(x, y, color, size, speed, life, vx, vy) {
    if (G.particles.length > 760) G.particles.splice(0, 30);
    const a = rnd(0, TAU);
    const sp = speed * Math.random();
    G.particles.push({
      x,
      y,
      vx: (vx || 0) + Math.cos(a) * sp,
      vy: (vy || 0) + Math.sin(a) * sp,
      size,
      life,
      maxLife: life,
      color,
      drag: rnd(1.4, 3.2),
    });
  }

  function addRing(x, y, r0, r1, color, life, width) {
    G.rings.push({ x, y, r0, r1, color, life, maxLife: life, width: width || 2 });
  }

  function addText(x, y, text, color, life, size) {
    G.texts.push({ x, y, text, color, life: life || 1, maxLife: life || 1, size: size || 15, vy: -32 });
  }

  function zap(x1, y1, x2, y2, color) {
    const pts = [{ x: x1, y: y1 }];
    const n = 5;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      pts.push({ x: lerp(x1, x2, t) + rnd(-11, 11), y: lerp(y1, y2, t) + rnd(-11, 11) });
    }
    pts.push({ x: x2, y: y2 });
    G.bolts.push({ pts, life: 0.16, maxLife: 0.16, color: color || C.cyan });
  }

  function explode(x, y, color, radius) {
    const n = clamp(Math.round(radius * 0.9), 8, 44);
    for (let i = 0; i < n; i++) {
      addParticle(x, y, color, rnd(1.4, 4), rnd(50, 300), rnd(0.3, 0.85));
    }
    for (let i = 0; i < 4; i++) {
      addParticle(x, y, C.white, rnd(1, 2.4), rnd(80, 240), rnd(0.2, 0.5));
    }
    addRing(x, y, radius * 0.4, radius * 3.2, color, 0.55, 2);
    G.flash = Math.min(0.4, G.flash + 0.035);
    G.shake = Math.min(20, G.shake + clamp(radius * 0.18, 1, 8));
  }

  /* ---------------------------------------------------------
     combat
     --------------------------------------------------------- */
  function comboMult() {
    return Math.min(8, 1 + Math.floor(G.combo / 4));
  }

  function damagePlayer(dmg) {
    const p = G.player;
    if (!p || p.dead || G.mode !== 'playing' || p.invuln > 0) return;
    p.hp -= dmg;
    p.invuln = 0.9;
    G.flash = Math.min(1, G.flash + 0.7);
    G.shake = Math.min(22, G.shake + 10);
    G.combo = 0;
    G.comboTimer = 0;
    addRing(p.x, p.y, 10, 52, C.red, 0.45, 2.5);
    for (let i = 0; i < 14; i++) {
      addParticle(p.x, p.y, i % 4 === 0 ? C.white : C.red, rnd(1.5, 3.6), rnd(60, 260), rnd(0.3, 0.6));
    }
    Sound.hurt();
    updateHud(true);
    if (p.hp <= 0) {
      p.hp = 0;
      gameOver();
    }
  }

  function gameOver() {
    if (G.mode === 'gameover') return;
    G.mode = 'gameover';
    const p = G.player;
    p.dead = true;
    explode(p.x, p.y, C.cyan, 30);
    explode(p.x, p.y, C.white, 16);
    explode(p.x, p.y, C.magenta, 20);
    G.flash = 1;
    G.shake = 24;
    Sound.gameover();

    const isBest = G.score > G.best;
    if (isBest) {
      G.best = Math.floor(G.score);
      store.set('riftSwarm.best', G.best);
    }
    if (G.wave > G.bestWave) {
      G.bestWave = G.wave;
      store.set('riftSwarm.bestWave', G.bestWave);
    }

    $('final-score').textContent = fmt(G.score);
    $('final-wave').textContent = String(G.wave);
    $('final-kills').textContent = String(G.kills);
    $('final-time').textContent = formatTime(G.time);
    $('final-level').textContent = String(G.level);
    $('new-best').classList.toggle('hidden', !isBest);
    $('hud').classList.add('hidden');
    $('touch-controls').classList.add('hidden');
    $('gameover-screen').classList.remove('hidden');
    updateTitleBest();
  }

  function hitEnemy(e, dmg, fx, fy, crit, noChain) {
    if (!e || e.dead || !e.active) return;
    e.hp -= dmg;
    e.hitFlash = 0.1;
    const a = Math.atan2(e.y - fy, e.x - fx);
    e.kx += Math.cos(a) * 70;
    e.ky += Math.sin(a) * 70;
    for (let i = 0; i < 3; i++) {
      addParticle(e.x, e.y, crit ? C.amber : C.white, rnd(0.8, 2), rnd(30, 140), rnd(0.15, 0.35));
    }
    Sound.hit();
    const p = G.player;
    if (!noChain && p && p.chain > 0 && Math.random() < p.chain) {
      const t = nearestEnemy(e.x, e.y, 240, e);
      if (t) {
        zap(e.x, e.y, t.x, t.y, C.cyan);
        hitEnemy(t, dmg * 0.6, e.x, e.y, false, true);
      }
    }
    if (e.hp <= 0) killEnemy(e);
  }

  function killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    G.kills++;
    G.combo++;
    G.comboTimer = 3.2;
    const mult = comboMult();
    G.score += Math.round(e.score * mult);
    explode(e.x, e.y, e.color, e.r);
    Sound.kill();

    if (e.type === 'brute') {
      for (let i = 0; i < 2; i++) {
        spawnEnemy('drifter', e.x + rnd(-26, 26), e.y + rnd(-26, 26), 0.3);
      }
    }

    if (e.type === 'boss') bossDeath(e);

    for (let i = 0; i < e.xp; i++) {
      spawnOrb(e.x + rnd(-e.r, e.r), e.y + rnd(-e.r, e.r), 1, 'xp');
    }
    if (Math.random() < (e.type === 'boss' ? 1 : 0.05)) {
      spawnOrb(e.x, e.y, 1, 'hp');
    }

    const p = G.player;
    if (p && p.lifesteal > 0 && Math.random() < p.lifesteal) {
      p.hp = Math.min(p.maxHp, p.hp + 3);
      addText(e.x, e.y - 16, '+3', C.green, 0.8, 13);
      for (let i = 0; i < 5; i++) {
        addParticle(e.x, e.y, C.green, rnd(1, 2.5), rnd(30, 110), rnd(0.2, 0.45));
      }
    }
  }

  function bossDeath(e) {
    G.boss = null;
    $('boss-wrap').classList.add('hidden');
    explode(e.x, e.y, C.red, 46);
    explode(e.x, e.y, C.orange, 30);
    explode(e.x, e.y, C.white, 22);
    addRing(e.x, e.y, 20, 360, C.amber, 0.9, 3);
    G.flash = 0.9;
    G.shake = 24;
    Sound.bossKill();
    addText(e.x, e.y - 70, 'WARDEN DOWN', C.amber, 2, 24);
    const p = G.player;
    if (p) {
      p.hp = Math.min(p.maxHp, p.hp + 25);
      addText(e.x, e.y - 40, '+25 HULL', C.green, 1.5, 15);
    }
    G.score += 250;
    G.waveTime = Math.min(G.waveTime, 1.2);
  }

  function updateBullets(dt) {
    for (const b of G.bullets) {
      if (b.dead) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) {
        b.dead = true;
        continue;
      }
      if (b.x < 0) {
        if (b.ricochet > 0) {
          b.ricochet--;
          b.vx = Math.abs(b.vx);
          b.x = 0;
        } else b.dead = true;
      } else if (b.x > W) {
        if (b.ricochet > 0) {
          b.ricochet--;
          b.vx = -Math.abs(b.vx);
          b.x = W;
        } else b.dead = true;
      }
      if (b.y < 0) {
        if (b.ricochet > 0) {
          b.ricochet--;
          b.vy = Math.abs(b.vy);
          b.y = 0;
        } else b.dead = true;
      } else if (b.y > H) {
        if (b.ricochet > 0) {
          b.ricochet--;
          b.vy = -Math.abs(b.vy);
          b.y = H;
        } else b.dead = true;
      }
      if (b.dead) continue;

      for (const e of G.enemies) {
        if (!e.active || e.dead || b.hits.includes(e.id)) continue;
        const rr = e.r + b.r;
        if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
          b.hits.push(e.id);
          hitEnemy(e, b.dmg, b.x - b.vx * 0.01, b.y - b.vy * 0.01, b.crit);
          if (b.pierce > 0) b.pierce--;
          else {
            b.dead = true;
            break;
          }
        }
      }
    }
    G.bullets = G.bullets.filter((b) => !b.dead);
  }

  function updateEnemyBullets(dt) {
    const p = G.player;
    for (const b of G.ebullets) {
      if (b.dead) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -60 || b.x > W + 60 || b.y < -60 || b.y > H + 60) {
        b.dead = true;
        continue;
      }
      b.trailT -= dt;
      if (b.trailT <= 0) {
        b.trailT = 0.05;
        addParticle(b.x, b.y, b.color, b.r * 0.5, 20, 0.24);
      }
      if (p && !p.dead) {
        const rr = p.r + b.r;
        if (dist2(b.x, b.y, p.x, p.y) < rr * rr) {
          b.dead = true;
          if (p.invuln <= 0) {
            damagePlayer(b.dmg);
            for (let i = 0; i < 8; i++) {
              addParticle(b.x, b.y, b.color, rnd(1.5, 3), rnd(40, 180), rnd(0.2, 0.5));
            }
          }
        }
      }
    }
    G.ebullets = G.ebullets.filter((b) => !b.dead);
  }

  /* ---------------------------------------------------------
     xp orbs
     --------------------------------------------------------- */
  function spawnOrb(x, y, value, type) {
    const a = rnd(0, TAU);
    const sp = rnd(20, 120);
    G.orbs.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      value,
      type,
      age: 0,
      r: type === 'hp' ? 9 : 5,
      dead: false,
    });
  }

  function updateOrbs(dt) {
    const p = G.player;
    if (!p) return;
    for (const o of G.orbs) {
      if (o.dead) continue;
      o.age += dt;
      const dx = p.x - o.x;
      const dy = p.y - o.y;
      const d = Math.hypot(dx, dy) || 1;
      const range = o.type === 'hp' ? p.magnet * 1.15 : p.magnet;
      if (d < range) {
        const acc = 520 + 1600 * (1 - d / range);
        o.vx += (dx / d) * acc * dt;
        o.vy += (dy / d) * acc * dt;
      }
      const drag = Math.pow(0.12, dt);
      o.vx *= drag;
      o.vy *= drag;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      if (d < 24) {
        o.dead = true;
        if (o.type === 'hp') {
          p.hp = Math.min(p.maxHp, p.hp + 20);
          addText(p.x, p.y - 28, '+20 HULL', C.green, 1, 14);
          for (let i = 0; i < 10; i++) {
            addParticle(p.x, p.y, C.green, rnd(1.2, 3), rnd(40, 150), rnd(0.25, 0.55));
          }
          Sound.heal();
        } else {
          addXp(o.value);
          Sound.pickup();
          for (let i = 0; i < 4; i++) {
            addParticle(p.x, p.y, C.violet, rnd(1, 2.2), rnd(30, 100), rnd(0.15, 0.35));
          }
        }
      }
    }
    G.orbs = G.orbs.filter((o) => !o.dead);
  }

  function addXp(n) {
    G.xp += n;
    let leveled = false;
    while (G.xp >= G.xpNext) {
      G.xp -= G.xpNext;
      G.level++;
      G.xpNext = Math.round(8 + (G.level - 1) * 6);
      G.pendingLevels++;
      leveled = true;
    }
    if (leveled) {
      const p = G.player;
      addText(p.x, p.y - 34, 'LEVEL UP', C.violet, 1.2, 20);
      addRing(p.x, p.y, 12, 90, C.violet, 0.6, 2);
      if (G.mode === 'playing') openLevelUp();
    }
  }

  /* ---------------------------------------------------------
     upgrades
     --------------------------------------------------------- */
  const UPGRADES = [
    {
      id: 'rapid',
      name: 'OVERCLOCK',
      icon: '\u2301',
      color: C.cyan,
      max: 5,
      desc: () => 'Fire rate <b>+18%</b>',
      apply: (p) => {
        p.fireRate = Math.max(0.05, p.fireRate * 0.82);
      },
    },
    {
      id: 'damage',
      name: 'HEAVY ROUNDS',
      icon: '\u25C8',
      color: C.amber,
      max: 5,
      desc: () => 'Pulse damage <b>+4</b>',
      apply: (p) => {
        p.damage += 4;
      },
    },
    {
      id: 'split',
      name: 'SPLIT BEAM',
      icon: '\u22C4',
      color: C.green,
      max: 3,
      desc: () => '<b>+1</b> projectile per shot',
      apply: (p) => {
        p.split += 1;
      },
    },
    {
      id: 'pierce',
      name: 'PIERCE',
      icon: '\u21E2',
      color: C.violet,
      max: 3,
      desc: () => 'Shots pierce <b>+1</b> enemy',
      apply: (p) => {
        p.pierce += 1;
      },
    },
    {
      id: 'thrust',
      name: 'AFTERBURN',
      icon: '\u25B2',
      color: C.cyan,
      max: 4,
      desc: () => 'Move speed <b>+9%</b>',
      apply: (p) => {
        p.speed *= 1.09;
      },
    },
    {
      id: 'dash',
      name: 'PHASE DRIVE',
      icon: '\u27EA',
      color: C.magenta,
      max: 3,
      desc: () => 'Dash cooldown <b>-20%</b>',
      apply: (p) => {
        p.dashMax *= 0.8;
      },
    },
    {
      id: 'hull',
      name: 'HULL PLATING',
      icon: '\u2B21',
      color: C.green,
      max: 4,
      desc: () => 'Max hull <b>+30</b>, repair 30',
      apply: (p) => {
        p.maxHp += 30;
        p.hp = Math.min(p.maxHp, p.hp + 30);
      },
    },
    {
      id: 'magnet',
      name: 'TRACTOR FIELD',
      icon: '\u25CE',
      color: C.violet,
      max: 3,
      desc: () => 'Pickup range <b>+40%</b>',
      apply: (p) => {
        p.magnet *= 1.4;
      },
    },
    {
      id: 'drone',
      name: 'ORBITAL DRONE',
      icon: '\u2726',
      color: C.green,
      max: 3,
      desc: () => 'Deploy <b>+1</b> attack drone',
      apply: (p) => {
        p.droneCount += 1;
        p.droneCd.push(0);
      },
    },
    {
      id: 'leech',
      name: 'NANO LEECH',
      icon: '\u271A',
      color: C.green,
      max: 3,
      desc: () => '<b>10%</b> chance to repair 3 on kill',
      apply: (p) => {
        p.lifesteal += 0.1;
      },
    },
    {
      id: 'chain',
      name: 'ARC COIL',
      icon: '\u21AF',
      color: C.cyan,
      max: 3,
      desc: () => '<b>18%</b> chance to chain lightning',
      apply: (p) => {
        p.chain += 0.18;
      },
    },
    {
      id: 'ricochet',
      name: 'RICOCHET',
      icon: '\u27F2',
      color: C.amber,
      max: 2,
      desc: () => 'Shots bounce off walls <b>+1</b>',
      apply: (p) => {
        p.ricochet += 1;
      },
    },
    {
      id: 'crit',
      name: 'CRIT CORE',
      icon: '\u2727',
      color: C.magenta,
      max: 4,
      desc: () => '<b>8%</b> chance for double damage',
      apply: (p) => {
        p.crit += 0.08;
      },
    },
  ];

  const REPAIR = {
    id: 'repair',
    name: 'HULL PATCH',
    icon: '\u271A',
    color: C.green,
    max: 999,
    desc: () => 'Repair <b>30</b> hull',
    apply: (p) => {
      p.hp = Math.min(p.maxHp, p.hp + 30);
    },
  };

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function openLevelUp() {
    if (G.pendingLevels <= 0) return;
    G.mode = 'levelup';
    $('levelup-num').textContent = String(G.level);
    renderUpgradeCards();
    $('levelup-screen').classList.remove('hidden');
    $('touch-controls').classList.add('hidden');
    Sound.levelup();
  }

  function renderUpgradeCards() {
    const available = shuffle(UPGRADES.filter((u) => (G.upgrades[u.id] || 0) < u.max));
    const choices = available.slice(0, 3);
    while (choices.length < 3) choices.push(REPAIR);
    G.choices = choices;

    const wrap = $('upgrade-cards');
    wrap.innerHTML = '';
    choices.forEach((u, i) => {
      const lvl = G.upgrades[u.id] || 0;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'upgrade-card';
      btn.style.setProperty('--c', u.color);
      const pips =
        u.max <= 8
          ? `<span class="card-pips">${Array.from({ length: u.max }, (_, k) => `<i class="${k < lvl ? 'on' : ''}"></i>`).join('')}</span>`
          : '';
      btn.innerHTML = `
        <span class="card-tier">${u.max <= 8 ? `${Math.min(lvl + 1, u.max)}/${u.max}` : 'SUPPLY'}</span>
        <span class="card-icon">${u.icon}</span>
        <span class="card-copy">
          <span class="card-name">${u.name}</span>
          <span class="card-desc">${u.desc()}</span>
        </span>
        ${pips}
        <span class="card-key">${i + 1}</span>`;
      btn.addEventListener('click', () => chooseUpgrade(u.id));
      wrap.appendChild(btn);
    });
  }

  function chooseByIndex(index) {
    if (G.mode !== 'levelup') return;
    const choice = G.choices[index];
    if (choice) chooseUpgrade(choice.id);
  }

  function chooseUpgrade(id) {
    if (G.mode !== 'levelup') return;
    const u = G.choices.find((choice) => choice.id === id);
    if (!u) return;
    const p = G.player;
    u.apply(p);
    G.upgrades[u.id] = (G.upgrades[u.id] || 0) + 1;
    G.pendingLevels = Math.max(0, G.pendingLevels - 1);
    p.invuln = Math.max(p.invuln, 0.8);
    Sound.upgrade();
    addRing(p.x, p.y, 12, 90, C.violet, 0.55, 2);
    for (let i = 0; i < 18; i++) {
      addParticle(p.x, p.y, u.color, rnd(1, 3), rnd(50, 220), rnd(0.3, 0.7));
    }
    if (G.pendingLevels > 0) {
      renderUpgradeCards();
    } else {
      $('levelup-screen').classList.add('hidden');
      G.mode = 'playing';
      refreshTouch();
    }
    updateHud(true);
  }

  /* ---------------------------------------------------------
     ambient + HUD
     --------------------------------------------------------- */
  function updateFx(dt) {
    G.ambient += dt;
    if (G.banner) {
      G.banner.t -= dt;
      if (G.banner.t <= 0) G.banner = null;
    }

    for (const s of stars) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.x < -4) s.x = W + 4;
      if (s.x > W + 4) s.x = -4;
      if (s.y < -4) s.y = H + 4;
      if (s.y > H + 4) s.y = -4;
    }

    for (const p of G.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const drag = Math.pow(0.12, dt * p.drag);
      p.vx *= drag;
      p.vy *= drag;
      p.life -= dt;
    }
    G.particles = G.particles.filter((p) => p.life > 0);

    for (const r of G.rings) r.life -= dt;
    G.rings = G.rings.filter((r) => r.life > 0);

    for (const b of G.bolts) b.life -= dt;
    G.bolts = G.bolts.filter((b) => b.life > 0);

    for (const t of G.texts) {
      t.y += t.vy * dt;
      t.vy *= Math.pow(0.2, dt);
      t.life -= dt;
    }
    G.texts = G.texts.filter((t) => t.life > 0);

    if (G.mode === 'title' && Math.random() < dt * 5) {
      addParticle(rnd(0, W), H + 8, Math.random() < 0.5 ? C.cyan : C.magenta, rnd(0.8, 2.2), rnd(8, 35), rnd(2.6, 5));
    }

    G.shake = Math.max(0, G.shake - dt * 30);
    G.flash = Math.max(0, G.flash - dt * 2.2);

    const p = G.player;
    let low = 0;
    if (G.mode === 'playing' && p && !p.dead && p.hp / p.maxHp < 0.3) {
      low = (0.18 + 0.12 * Math.sin(G.ambient * 7)) * (1 - p.hp / p.maxHp);
    }
    const opacity = clamp(Math.max(G.flash, low), 0, 1);
    const visible = opacity > 0.004;
    const shown = flashEl.style.display === 'block';
    if (visible !== shown) flashEl.style.display = visible ? 'block' : 'none';
    if (visible && Math.abs(opacity - lastFlashOpacity) > 0.008) {
      flashEl.style.opacity = opacity.toFixed(3);
      lastFlashOpacity = opacity;
    }
  }

  const HUD = {
    hpText: $('hp-text'),
    hpFill: $('hp-fill'),
    xpFill: $('xp-fill'),
    lvl: $('lvl-badge'),
    score: $('score'),
    wave: $('wave-label'),
    combo: $('combo'),
    best: $('best-inline'),
    dashFill: $('dash-fill'),
    dashBtn: $('dash-btn'),
    bossWrap: $('boss-wrap'),
    bossFill: $('boss-fill'),
  };

  function setText(el, text) {
    if (el && el.textContent !== text) el.textContent = text;
  }

  function updateHud(force) {
    const p = G.player;
    if (!p) return;
    const now = performance.now();
    if (!force && now - lastHudAt < 90) return;
    lastHudAt = now;
    const hpPct = clamp(p.hp / p.maxHp, 0, 1);
    setText(HUD.hpText, String(Math.max(0, Math.ceil(p.hp))));
    if (force || hudLast.hp !== hpPct) {
      HUD.hpFill.style.width = (hpPct * 100).toFixed(1) + '%';
      HUD.hpFill.classList.toggle('low', hpPct < 0.3);
      hudLast.hp = hpPct;
    }
    const xpPct = clamp(G.xp / G.xpNext, 0, 1);
    if (force || hudLast.xp !== xpPct) {
      HUD.xpFill.style.width = (xpPct * 100).toFixed(1) + '%';
      hudLast.xp = xpPct;
    }
    const scoreText = fmt(G.score);
    if (force || hudLast.score !== scoreText) {
      setText(HUD.score, scoreText);
      hudLast.score = scoreText;
    }
    const lvlText = 'LV ' + G.level;
    if (force || hudLast.lvl !== lvlText) {
      setText(HUD.lvl, lvlText);
      hudLast.lvl = lvlText;
    }
    const waveText = 'WAVE ' + G.wave;
    if (force || hudLast.wave !== waveText) {
      setText(HUD.wave, waveText);
      hudLast.wave = waveText;
    }
    const bestText = 'BEST ' + fmt(G.best);
    if (force || hudLast.best !== bestText) {
      setText(HUD.best, bestText);
      hudLast.best = bestText;
    }

    const mult = comboMult();
    const showCombo = mult > 1;
    if (force || hudLast.showCombo !== showCombo) {
      HUD.combo.classList.toggle('hidden', !showCombo);
      hudLast.showCombo = showCombo;
    }
    if (showCombo) {
      const comboText = '\u00D7' + mult;
      if (force || hudLast.combo !== comboText) {
        HUD.combo.textContent = comboText;
        hudLast.combo = comboText;
        HUD.combo.style.animation = 'none';
        void HUD.combo.offsetWidth;
        HUD.combo.style.animation = '';
      }
    }

    const boss = G.boss;
    if (boss) {
      if (force || hudLast.bossShown !== true) {
        HUD.bossWrap.classList.remove('hidden');
        hudLast.bossShown = true;
      }
      const bossWidth = (clamp(boss.hp / boss.maxHp, 0, 1) * 100).toFixed(1) + '%';
      if (force || hudLast.bossWidth !== bossWidth) {
        HUD.bossFill.style.width = bossWidth;
        hudLast.bossWidth = bossWidth;
      }
    } else if (force || hudLast.bossShown !== false) {
      HUD.bossWrap.classList.add('hidden');
      hudLast.bossShown = false;
    }

    const dashPct = p.dashCd > 0 ? clamp(1 - p.dashCd / p.dashMax, 0, 1) : 1;
    const dashWidth = (dashPct * 100).toFixed(1) + '%';
    if (force || hudLast.dashWidth !== dashWidth) {
      HUD.dashFill.style.width = dashWidth;
      hudLast.dashWidth = dashWidth;
    }
    const dashButtonPct = Math.round(dashPct * 100) + '%';
    if (force || hudLast.dashButtonPct !== dashButtonPct) {
      HUD.dashBtn.style.setProperty('--p', dashButtonPct);
      hudLast.dashButtonPct = dashButtonPct;
    }
    HUD.dashBtn.classList.toggle('cooling', dashPct < 1);
  }

  function updateGame(dt) {
    G.time += dt;
    updateSpawns(dt);
    updatePlayer(dt);
    updateEnemies(dt);
    updateBullets(dt);
    updateEnemyBullets(dt);
    updateOrbs(dt);
    if (G.comboTimer > 0) {
      G.comboTimer -= dt;
      if (G.comboTimer <= 0) G.combo = 0;
    }
    updateHud(false);
  }

  /* ---------------------------------------------------------
     render
     --------------------------------------------------------- */
  function traceShape(shape, r) {
    ctx.beginPath();
    if (shape === 'diamond') {
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.82, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r * 0.82, 0);
      ctx.closePath();
    } else if (shape === 'tri') {
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.92, r * 0.72);
      ctx.lineTo(-r * 0.92, r * 0.72);
      ctx.closePath();
    } else if (shape === 'square') {
      const s = r * 0.8;
      ctx.moveTo(-s, -s);
      ctx.lineTo(s, -s);
      ctx.lineTo(s, s);
      ctx.lineTo(-s, s);
      ctx.closePath();
    } else {
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i * TAU) / 6;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
  }

  function drawStars() {
    ctx.save();
    for (const s of stars) {
      const tw = 0.55 + 0.45 * Math.sin(G.ambient * s.tw + s.ph);
      ctx.globalAlpha = s.a * tw;
      ctx.fillStyle = '#c9f6ff';
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.restore();
  }

  function drawRift() {
    const cx = W / 2;
    const cy = H * 0.5;
    const t = G.ambient;
    const base = Math.min(W, H);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(0, 0, base * 0.2, C.violet, 0.2);
    for (let i = 0; i < 3; i++) {
      const radius = base * (0.17 + i * 0.06) + Math.sin(t * 0.6 + i) * 7;
      ctx.strokeStyle = i === 0 ? rgba(C.cyan, 0.3) : i === 1 ? rgba(C.magenta, 0.22) : rgba(C.violet, 0.16);
      ctx.lineWidth = i === 0 ? 1.6 : 1;
      ctx.setLineDash(i === 1 ? [10, 18] : i === 2 ? [2, 14] : []);
      ctx.beginPath();
      ctx.arc(0, 0, radius, t * (0.18 + i * 0.12), t * (0.18 + i * 0.12) + Math.PI * 1.42);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    for (let i = 0; i < 16; i++) {
      const a = t * 0.35 + (i * TAU) / 16;
      const radius = base * (0.22 + (i % 3) * 0.026);
      drawGlow(Math.cos(a) * radius, Math.sin(a) * radius, 6, i % 2 ? C.magenta : C.cyan, 0.5);
    }
    ctx.restore();
  }

  function drawPlayer() {
    const p = G.player;
    if (!p || p.dead) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(0, 0, 54, C.cyan, 0.34);
    if (p.invuln > 0) {
      ctx.globalAlpha = 0.3 + 0.25 * Math.sin(G.ambient * 30);
      ctx.strokeStyle = C.cyanSoft;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, p.r + 11, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.rotate(p.angle);
    const thrust = Math.min(1, Math.hypot(p.vx, p.vy) / p.speed);
    if (thrust > 0.04) {
      ctx.beginPath();
      ctx.moveTo(-10, -4);
      ctx.lineTo(-10 - 16 * thrust, 0);
      ctx.lineTo(-10, 4);
      ctx.closePath();
      ctx.fillStyle = rgba(C.cyan, 0.55);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-11, 10);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-11, -10);
    ctx.closePath();
    const grad = ctx.createLinearGradient(-12, 0, 18, 0);
    grad.addColorStop(0, '#0a4a66');
    grad.addColorStop(0.55, '#37d6f0');
    grad.addColorStop(1, '#eaffff');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = C.cyanSoft;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(1, 0, 3.2, 0, TAU);
    ctx.fillStyle = C.white;
    ctx.fill();
    ctx.restore();
  }

  function drawDrones() {
    const p = G.player;
    if (!p || !p.droneCount) return;
    for (let i = 0; i < p.droneCount; i++) {
      const a = p.droneAngle + (i * TAU) / p.droneCount;
      const x = p.x + Math.cos(a) * 54;
      const y = p.y + Math.sin(a) * 54;
      ctx.save();
      ctx.translate(x, y);
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(0, 0, 18, C.green, 0.4);
      ctx.globalCompositeOperation = 'source-over';
      ctx.rotate(G.ambient * 2 + i);
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(6, 0);
      ctx.lineTo(0, 7);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fillStyle = rgba(C.green, 0.18);
      ctx.fill();
      ctx.strokeStyle = C.green;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawEnemies() {
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (!e.active) {
        const t = 1 - clamp(e.spawnT / e.spawnMax, 0, 1);
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = rgba(e.color, 0.7);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, e.r * (2.4 - 1.4 * t), 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 0.2 + 0.25 * t;
        traceShape(e.shape, e.r);
        ctx.stroke();
        ctx.restore();
      }
      const alpha = e.active ? 1 : clamp(1 - e.spawnT / e.spawnMax, 0.15, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(e.x, e.y);
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(0, 0, e.r * (e.type === 'boss' ? 5 : 3.4), e.color, e.type === 'boss' ? 0.42 : 0.27);
      ctx.globalCompositeOperation = 'source-over';
      ctx.rotate(e.rot);
      const col = e.hitFlash > 0 ? C.white : e.color;
      traceShape(e.shape, e.r);
      ctx.fillStyle = rgba(col, 0.12);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = e.type === 'boss' ? 2.6 : 1.8;
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.7;
      traceShape(e.shape, e.r * 0.5);
      ctx.strokeStyle = rgba(col, 0.85);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1.5, e.r * 0.14), 0, TAU);
      ctx.fillStyle = col;
      ctx.fill();
      if (e.type === 'boss') {
        ctx.globalAlpha = alpha * 0.5;
        ctx.setLineDash([6, 12]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(C.amber, 0.55);
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 1.55, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.rotate(-e.rot * 2.4);
        ctx.strokeStyle = rgba(C.white, 0.4);
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.78, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();

      if (e.type === 'boss' && e.active) {
        const w = e.r * 2.6;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(e.x - w / 2, e.y - e.r - 28, w, 4);
        ctx.fillStyle = C.red;
        ctx.fillRect(e.x - w / 2, e.y - e.r - 28, w * clamp(e.hp / e.maxHp, 0, 1), 4);
      }
    }
  }

  function drawBullets() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of G.bullets) {
      if (b.dead) continue;
      const tx = b.x - b.vx * 0.022;
      const ty = b.y - b.vy * 0.022;
      ctx.strokeStyle = rgba(b.color, 0.85);
      ctx.lineWidth = b.r * 1.25;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      drawGlow(b.x, b.y, b.r * 6, b.color, 0.6);
      ctx.fillStyle = C.white;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.55, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawEnemyBullets() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of G.ebullets) {
      if (b.dead) continue;
      drawGlow(b.x, b.y, b.r * 5.2, b.color, 0.55);
      ctx.fillStyle = rgba(b.color, 0.9);
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = C.white;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.34, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawOrbs() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const o of G.orbs) {
      if (o.dead) continue;
      const color = o.type === 'hp' ? C.green : C.violet;
      const pulse = 0.72 + 0.28 * Math.sin(G.ambient * 5 + o.age * 3);
      drawGlow(o.x, o.y, o.r * 4.6, color, 0.42 * pulse);
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.rotate(G.ambient * 1.6 + o.age);
      if (o.type === 'hp') {
        ctx.fillStyle = rgba(C.green, 0.3);
        ctx.strokeStyle = C.green;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.lineTo(5, 0);
        ctx.moveTo(0, -5);
        ctx.lineTo(0, 5);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(5, 0);
        ctx.lineTo(0, 6);
        ctx.lineTo(-5, 0);
        ctx.closePath();
        ctx.fillStyle = rgba(C.violet, 0.35);
        ctx.fill();
        ctx.strokeStyle = C.violet;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawParticles() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of G.particles) {
      const t = clamp(p.life / p.maxLife, 0, 1);
      const size = Math.max(2, p.size * (0.5 + 0.9 * t) * 3.4);
      ctx.globalAlpha = Math.min(1, t * 1.5);
      const sprite = glowSprite(p.color);
      ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawRings() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const r of G.rings) {
      const t = 1 - r.life / r.maxLife;
      const radius = lerp(r.r0, r.r1, t);
      ctx.globalAlpha = clamp(r.life / r.maxLife, 0, 1) * 0.9;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = Math.max(0.5, r.width * (1 - t * 0.6));
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawBolts() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of G.bolts) {
      const a = clamp(b.life / b.maxLife, 0, 1);
      ctx.strokeStyle = rgba(b.color, a);
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      b.pts.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
      ctx.stroke();
      ctx.strokeStyle = rgba(C.white, a * 0.85);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawTexts() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of G.texts) {
      const a = clamp(t.life / t.maxLife, 0, 1);
      ctx.globalAlpha = Math.min(1, a * 1.7);
      ctx.font = `700 ${t.size}px Rajdhani, sans-serif`;
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 10;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }

  function drawBanner() {
    const b = G.banner;
    if (!b) return;
    let a = 1;
    if (b.t > b.max - 0.28) a = (b.max - b.t) / 0.28;
    if (b.t < 0.7) a = Math.min(a, b.t / 0.7);
    a = clamp(a, 0, 1);
    const boss = b.sub === 'DESTROY THE CORE';
    const size = clamp(W * 0.05, 30, 58);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${size}px Orbitron, sans-serif`;
    ctx.letterSpacing = Math.round(size * 0.16) + 'px';
    ctx.fillStyle = boss ? '#ffd9e1' : '#eaffff';
    ctx.shadowColor = boss ? 'rgba(255,84,112,0.8)' : 'rgba(69,244,255,0.7)';
    ctx.shadowBlur = 26;
    ctx.fillText(b.text, W / 2, H * 0.22);
    ctx.shadowBlur = 0;
    ctx.letterSpacing = '0px';
    ctx.font = `600 ${clamp(size * 0.24, 10, 14)}px Rajdhani, sans-serif`;
    ctx.fillStyle = boss ? 'rgba(255,160,175,0.85)' : 'rgba(165,225,245,0.78)';
    ctx.fillText(b.sub, W / 2, H * 0.22 + size * 0.75);
    ctx.restore();
  }

  function drawReticle() {
    if (G.mode !== 'playing' || G.isTouch || !G.mouseActive) return;
    ctx.save();
    ctx.translate(G.mouse.x, G.mouse.y);
    ctx.rotate(G.ambient * 1.2);
    ctx.strokeStyle = rgba(C.cyan, 0.8);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = (i * TAU) / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 13, Math.sin(a) * 13);
      ctx.lineTo(Math.cos(a) * 19, Math.sin(a) * 19);
      ctx.stroke();
    }
    ctx.fillStyle = C.cyan;
    ctx.beginPath();
    ctx.arc(0, 0, 1.6, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(bgCanvas, 0, 0, W, H);
    drawStars();
    if (G.mode === 'title') drawRift();

    const shake = G.shake;
    const ox = shake > 0.2 ? rnd(-shake, shake) * 0.5 : 0;
    const oy = shake > 0.2 ? rnd(-shake, shake) * 0.5 : 0;
    ctx.save();
    ctx.translate(ox, oy);
    drawOrbs();
    drawRings();
    drawEnemies();
    drawDrones();
    if (G.player && !G.player.dead) drawPlayer();
    drawBullets();
    drawEnemyBullets();
    drawParticles();
    drawBolts();
    drawTexts();
    ctx.restore();

    drawBanner();
    drawReticle();
  }

  /* ---------------------------------------------------------
     boot
     --------------------------------------------------------- */
  G.isTouch = (navigator.maxTouchPoints || 0) > 0 || window.matchMedia('(pointer: coarse)').matches;
  if (G.isTouch) document.body.classList.add('is-touch');

  resize();
  updateTitleBest();
  refreshTouch();

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (G.mode === 'playing') updateGame(dt);
    updateFx(dt);
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Small debug surface used by the smoke tests and curious players.
  window.RiftSwarm = {
    get state() {
      return {
        mode: G.mode,
        wave: G.wave,
        score: G.score,
        kills: G.kills,
        level: G.level,
        hp: G.player ? Math.round(G.player.hp) : null,
        enemies: G.enemies.length,
        boss: !!G.boss,
        bossHp: G.boss ? Math.round(G.boss.hp) : null,
        bossMaxHp: G.boss ? Math.round(G.boss.maxHp) : null,
        time: Number(G.time.toFixed(1)),
      };
    },
    start: startGame,
    pause: pauseGame,
    resume: resumeGame,
    title: goTitle,
    addXp: (n) => addXp(n),
    hurt: (n) => {
      if (G.player) G.player.invuln = 0;
      damagePlayer(n || 10);
    },
    setWave: (n) => startWave(n),
    spawnBoss: () => spawnBoss(G.wave),
    spawn: (type) => spawnEnemy(type || 'drifter'),
  };
})();
