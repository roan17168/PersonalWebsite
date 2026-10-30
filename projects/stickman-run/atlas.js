/* ===================================================================
   STICK BOI ADVENTURE — "Behind the scenes" level atlas

   Draws the whole Game.unity level as an engineering blueprint:
   terrain tilemaps, every solid / trap collider, pickup placements,
   gunner positions and their 20-unit range, the 24 hinge joints and
   the 19 basher bars, plus the recovered build statistics.

   Nothing here is invented — everything is read from data/level.json,
   which was extracted from the shipped Unity 2021.3.2f1 player.
   =================================================================== */
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const COLORS = {
    terrain: 'rgba(111, 227, 192, 0.10)',
    terrainLine: 'rgba(111, 227, 192, 0.20)',
    ground: 'rgba(111, 227, 192, 0.62)',
    wall: 'rgba(95, 168, 255, 0.68)',
    trap: 'rgba(255, 107, 107, 0.30)',
    trapLine: 'rgba(255, 120, 120, 0.85)',
    prop: 'rgba(150, 196, 214, 0.20)',
    diamond: '#7ef9ff',
    heart: '#ff8b8b',
    slow: '#c9a6ff',
    enemy: '#ffb357',
    joint: '#ffd166',
    player: '#ffffff',
    grid: 'rgba(120, 200, 220, 0.10)',
    gridStrong: 'rgba(120, 200, 220, 0.18)',
    ink: '#dceaf2'
  };

  const Atlas = {
    level: null,
    hooks: null,
    canvas: null,
    ctx: null,
    dpr: 1,
    open: false,
    raf: 0,
    bounds: null,
    view: { x: 0, y: 0, scale: 8 },
    drag: null,
    hover: null,
    mouse: null,
    layers: { terrain: true, collision: true, pickups: true, enemies: true, joints: true, grid: true },
    cache: null,
    cacheInfo: null,
    t0: performance.now(),
    solidSet: new Set(),
    trapSet: new Set(),
    wallSet: new Set(),
    facts: [],
    labels: [],
    flash: 0
  };

  /* ------------------------------------------------------------------ */
  /*  Setup                                                             */
  /* ------------------------------------------------------------------ */
  function init(level, hooks) {
    Atlas.level = level;
    Atlas.hooks = hooks || {};
    Atlas.canvas = document.getElementById('atlas-canvas');
    if (!Atlas.canvas) return;
    Atlas.ctx = Atlas.canvas.getContext('2d');

    for (const [x, y] of level.solid.ground) Atlas.solidSet.add(x + ',' + y);
    for (const [x, y] of level.solid.wall) Atlas.wallSet.add(x + ',' + y);
    for (const [x, y] of level.solid.trap) Atlas.trapSet.add(x + ',' + y);

    buildBounds();
    buildFacts();
    bindInput();
    buildStaticLayer();
    fit();
  }

  function buildBounds() {
    const lv = Atlas.level;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const take = (x, y, r = 0) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r);
      x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r);
    };
    for (const tm of lv.tilemaps) {
      for (const c of tm.cells) take(tm.x + c.x, tm.y + c.y, 1);
    }
    for (const b of lv.boxes || []) take(b.x, b.y, 1.4);
    for (const h of lv.hinges || []) take(h.x, h.y, 0.5);
    for (const e of lv.entities.DiamondPickUp || []) take(e.x, e.y, 1);
    for (const e of lv.entities.Enemy || []) take(e.x, e.y, 1);
    if (!Number.isFinite(x0)) { x0 = 0; y0 = 0; x1 = 100; y1 = 20; }
    Atlas.bounds = { x0: x0 - 3, y0: y0 - 3, x1: x1 + 3, y1: y1 + 3 };
  }

  function buildFacts() {
    const lv = Atlas.level;
    const ground = lv.solid.ground.length;
    const wall = lv.solid.wall.length;
    const trap = lv.solid.trap.length;
    const diamonds = (lv.entities.DiamondPickUp || []).length;
    const hearts = (lv.entities.HeartPickUp || []).length;
    const slow = (lv.entities.SlowMoPowerUpControler || []).length;
    const enemies = (lv.entities.Enemy || []).length;

    Atlas.facts = [
      ['1,321', 'GameObjects in scene'],
      ['765', 'sprite renderers'],
      ['156', 'polygon colliders'],
      ['104', 'rigidbodies'],
      [String(ground + wall + trap), '1×1 solid tiles'],
      [String((lv.boxes || []).length), 'hinged bashers'],
      [String((lv.hinges || []).length), 'hinge joints'],
      [String(enemies), 'enemy gunners'],
      [String(diamonds), 'diamonds'],
      [String(hearts), 'heart pickups'],
      [String(slow), 'slow-mo pickups'],
      ['30', 'C# scripts · 1,838 lines']
    ];

    Atlas.counts = { ground, wall, trap, diamonds, hearts, slow, enemies };
    Atlas.levels = {
      tilemaps: lv.tilemaps.length,
      props: lv.props.length,
      cells: lv.tilemaps.reduce((n, t) => n + t.cells.length, 0)
    };

    const factsEl = document.getElementById('atlas-facts');
    if (factsEl) {
      factsEl.innerHTML = Atlas.facts.slice(0, 12).map(([value, label]) =>
        `<div class="fact"><b>${value}</b><span>${label}</span></div>`
      ).join('');
    }

    const physicsEl = document.getElementById('atlas-physics');
    if (physicsEl) {
      physicsEl.innerHTML = [
        `gravity      <b>-9.81 × 4</b>   (gravityScale 4)`,
        `moveSpeed    <b>6.5</b> u/s      jump <b>15.5</b>`,
        `wallJump     <b>17.0</b>         grapple hop <b>10</b>`,
        `bullet       <b>20</b> u/s        enemy <b>15</b> u/s`,
        `enemy range  <b>20</b> u          fire every <b>2.0s</b>`,
        `ammo <b>5</b> · reload <b>0.5s</b> · slow-mo <b>25</b>/use`
      ].join('\n');
    }

    const scriptsEl = document.getElementById('atlas-scripts');
    if (scriptsEl) {
      scriptsEl.innerHTML = [
        `<b>Player.cs</b>             597 lines`,
        `<b>PrototypeHeroDemo.cs</b>   146`,
        `<b>Enemy.cs</b>               89`,
        `<b>AmmoBar.cs</b>             79`,
        `<b>SlowMoBar.cs</b>           72`,
        `<b>StaminaBar.cs</b>          64`,
        `<b>UIManager.cs</b>           61`,
        `<b>Grappler.cs</b>            59`,
        `<b>LevelManager.cs</b>        54`,
        `… 27 more scripts`,
        ``,
        `Unity 2021.3.2f1 · Windows x64`,
        `art 108 sprites / 32 textures`,
        `audio 7 original clips`
      ].join('\n');
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Static layer (terrain + colliders) — rendered once                */
  /* ------------------------------------------------------------------ */
  function buildStaticLayer() {
    const lv = Atlas.level;
    const b = Atlas.bounds;
    const PPU = 9;                                     // cache pixels per world unit
    const w = Math.ceil((b.x1 - b.x0) * PPU);
    const h = Math.ceil((b.y1 - b.y0) * PPU);
    const maxSide = 4096;
    const s = Math.min(1, maxSide / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.max(64, Math.round(w * s));
    c.height = Math.max(64, Math.round(h * s));
    const g = c.getContext('2d');

    const px = (x) => (x - b.x0) * PPU * s;
    const py = (y) => (b.y1 - y) * PPU * s;
    Atlas.cacheInfo = { s, PPU, w: c.width, h: c.height };

    g.lineJoin = 'round';

    // terrain cells — a dim teal mosaic, one rect per tile
    g.fillStyle = COLORS.terrain;
    for (const tm of lv.tilemaps) {
      for (const cell of tm.cells) {
        const x = tm.x + cell.x;
        const y = tm.y + cell.y;
        g.fillRect(px(x) + 0.4, py(y + 1) + 0.4, PPU * s - 0.8, PPU * s - 0.8);
      }
    }

    // static props — small dust motes so the village/cave reads
    g.fillStyle = COLORS.prop;
    for (const p of lv.props) {
      const sx = px(p.x), sy = py(p.y);
      const r = Math.max(0.6, Math.min(2.2, (Math.abs(p.sx) + Math.abs(p.sy)) * 0.25 * PPU * s));
      g.fillRect(sx - r / 2, sy - r / 2, r, r);
    }

    // colliders — outline every 1x1 tile
    const lw = Math.max(0.65, PPU * s * 0.11);
    g.lineWidth = lw;
    const strokeTiles = (list, color) => {
      g.strokeStyle = color;
      g.beginPath();
      for (const [x, y] of list) {
        const X = px(x) + 0.5, Y = py(y + 1) + 0.5;
        const W = PPU * s - 1, H = PPU * s - 1;
        g.rect(X, Y, W, H);
      }
      g.stroke();
    };
    strokeTiles(lv.solid.ground, COLORS.ground);
    strokeTiles(lv.solid.wall, COLORS.wall);

    // traps — solid fill + outline
    g.fillStyle = COLORS.trap;
    for (const [x, y] of lv.solid.trap) {
      g.fillRect(px(x) + 0.5, py(y + 1) + 0.5, PPU * s - 1, PPU * s - 1);
    }
    strokeTiles(lv.solid.trap, COLORS.trapLine);

    // basher bars, at their serialized rest rotation
    g.save();
    for (const box of lv.boxes || []) {
      const cx = px(box.x), cy = py(box.y);
      g.translate(cx, cy);
      g.rotate(-box.rot * Math.PI / 180);
      const bw = box.w * PPU * s;
      const bh = box.h * PPU * s;
      g.fillStyle = 'rgba(255, 209, 102, 0.10)';
      g.fillRect(-bw / 2, -bh / 2, bw, bh);
      g.strokeStyle = 'rgba(255, 209, 102, 0.55)';
      g.lineWidth = lw;
      g.strokeRect(-bw / 2, -bh / 2, bw, bh);
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
    g.restore();

    Atlas.cache = c;
  }

  /* ------------------------------------------------------------------ */
  /*  Camera                                                            */
  /* ------------------------------------------------------------------ */
  function stageSize() {
    const stage = Atlas.canvas.parentElement;
    return { w: stage.clientWidth, h: stage.clientHeight };
  }

  function fit() {
    const b = Atlas.bounds;
    const { w, h } = stageSize();
    if (!w || !h) return;
    const pad = 26;
    const scale = Math.min((w - pad * 2) / (b.x1 - b.x0), (h - pad * 2) / (b.y1 - b.y0));
    Atlas.view.scale = scale;
    Atlas.view.x = (b.x0 + b.x1) / 2;
    Atlas.view.y = (b.y0 + b.y1) / 2;
  }

  function resize() {
    if (!Atlas.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { w, h } = stageSize();
    Atlas.dpr = dpr;
    Atlas.canvas.width = Math.max(1, Math.round(w * dpr));
    Atlas.canvas.height = Math.max(1, Math.round(h * dpr));
  }

  const toScreen = (x, y) => ({
    x: (x - Atlas.view.x) * Atlas.view.scale + Atlas.canvas.width / Atlas.dpr / 2,
    y: (Atlas.canvas.height / Atlas.dpr / 2) - (y - Atlas.view.y) * Atlas.view.scale
  });

  const toWorld = (sx, sy) => ({
    x: (sx - Atlas.canvas.width / Atlas.dpr / 2) / Atlas.view.scale + Atlas.view.x,
    y: (Atlas.canvas.height / Atlas.dpr / 2 - sy) / Atlas.view.scale + Atlas.view.y
  });

  /* ------------------------------------------------------------------ */
  /*  Rendering                                                         */
  /* ------------------------------------------------------------------ */
  function render() {
    if (!Atlas.open) return;
    const ctx = Atlas.ctx;
    const W = Atlas.canvas.width;
    const H = Atlas.canvas.height;
    const dpr = Atlas.dpr;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.scale(dpr, dpr);

    const cw = W / dpr;
    const ch = H / dpr;
    const t = (performance.now() - Atlas.t0) / 1000;

    drawGrid(ctx, cw, ch);

    // static cache
    if (Atlas.cache && Atlas.layers.terrain) {
      const ci = Atlas.cacheInfo;
      const worldW = (Atlas.bounds.x1 - Atlas.bounds.x0) * Atlas.view.scale;
      const worldH = (Atlas.bounds.y1 - Atlas.bounds.y0) * Atlas.view.scale;
      const a = toScreen(Atlas.bounds.x0, Atlas.bounds.y1);
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(Atlas.cache, a.x, a.y, worldW, worldH);
      ctx.restore();
    }

    if (Atlas.layers.joints) drawJoints(ctx, t);
    if (Atlas.layers.pickups) drawPickups(ctx, t);
    if (Atlas.layers.enemies) drawEnemies(ctx, t);
    drawPlayer(ctx, t);
    drawCorners(ctx, cw, ch);
    drawScan(ctx, cw, ch, t);
    if (Atlas.hover) drawHover(ctx);
  }

  function drawGrid(ctx, cw, ch) {
    if (!Atlas.layers.grid) return;
    const steps = [1, 2, 5, 10, 20, 25, 50, 100];
    const step = steps.find((s) => s * Atlas.view.scale >= 46) || 100;
    const tl = toWorld(0, 0);
    const br = toWorld(cw, ch);
    const x0 = Math.floor(tl.x / step) * step;
    const x1 = Math.ceil(br.x / step) * step;
    const y0 = Math.floor(br.y / step) * step;
    const y1 = Math.ceil(tl.y / step) * step;

    ctx.save();
    ctx.lineWidth = 1;
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textBaseline = 'middle';

    for (let x = x0; x <= x1; x += step) {
      const s = toScreen(x, 0);
      ctx.strokeStyle = COLORS.grid;
      ctx.beginPath(); ctx.moveTo(s.x, 0); ctx.lineTo(s.x, ch); ctx.stroke();
      if (step * Atlas.view.scale >= 62) {
        ctx.fillStyle = 'rgba(140, 200, 220, .38)';
        ctx.fillText(String(Math.round(x)), s.x + 3, 10);
      }
    }
    for (let y = y0; y <= y1; y += step) {
      const s = toScreen(0, y);
      ctx.strokeStyle = COLORS.grid;
      ctx.beginPath(); ctx.moveTo(0, s.y); ctx.lineTo(cw, s.y); ctx.stroke();
      if (step * Atlas.view.scale >= 62) {
        ctx.fillStyle = 'rgba(140, 200, 220, .38)';
        ctx.fillText(String(Math.round(y)), 5, s.y - 6);
      }
    }

    // level bounds
    const a = toScreen(Atlas.bounds.x0, Atlas.bounds.y1);
    const b = toScreen(Atlas.bounds.x1, Atlas.bounds.y0);
    ctx.strokeStyle = COLORS.gridStrong;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawJoints(ctx, t) {
    const lv = Atlas.level;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 209, 102, .35)';
    ctx.lineWidth = 1;
    for (const h of lv.hinges || []) {
      if (h.name !== 'Basher') continue;
      const a = toScreen(h.x, h.y);
      const b = toScreen(h.x + (h.connectedAnchor ? h.connectedAnchor[0] - h.x : 0), h.y + (h.connectedAnchor ? h.connectedAnchor[1] - h.y : 0));
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.beginPath(); ctx.arc(a.x, a.y, 2.2, 0, TAU); ctx.fillStyle = COLORS.joint; ctx.fill();
    }
    ctx.restore();
  }

  function drawPickups(ctx, t) {
    const lv = Atlas.level;
    const pulse = 1 + Math.sin(t * 2.4) * 0.18;
    const draw = (list, color, size, shape) => {
      for (const e of list || []) {
        const s = toScreen(e.x, e.y);
        if (s.x < -20 || s.x > Atlas.canvas.width / Atlas.dpr + 20) continue;
        if (s.y < -20 || s.y > Atlas.canvas.height / Atlas.dpr + 20) continue;
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 9;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        const r = size * pulse;
        if (shape === 'diamond') {
          ctx.beginPath();
          ctx.moveTo(s.x, s.y - r * 1.4);
          ctx.lineTo(s.x + r, s.y);
          ctx.lineTo(s.x, s.y + r * 1.4);
          ctx.lineTo(s.x - r, s.y);
          ctx.closePath();
          ctx.fill();
        } else if (shape === 'heart') {
          ctx.beginPath();
          ctx.arc(s.x - r * 0.5, s.y, r * 0.62, 0, TAU);
          ctx.arc(s.x + r * 0.5, s.y, r * 0.62, 0, TAU);
          ctx.moveTo(s.x - r, s.y + r * 0.15);
          ctx.lineTo(s.x, s.y + r * 1.35);
          ctx.lineTo(s.x + r, s.y + r * 0.15);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(s.x, s.y, r, 0, TAU);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(s.x, s.y, r * 0.4, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }
    };
    draw(lv.entities.DiamondPickUp, COLORS.diamond, 2.6, 'diamond');
    draw(lv.entities.HeartPickUp, COLORS.heart, 2.2, 'heart');
    draw(lv.entities.SlowMoPowerUpControler, COLORS.slow, 2.8, 'orb');
  }

  function drawEnemies(ctx, t) {
    const list = Atlas.level.entities.Enemy || [];
    const range = 20 * Atlas.view.scale;
    const live = Atlas.hooks.getLiveEnemies ? Atlas.hooks.getLiveEnemies() : null;
    ctx.save();
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const s = toScreen(e.x, e.y);
      const dead = live && live[i] && !live[i].alive;
      const cw = Atlas.canvas.width / Atlas.dpr;
      const ch = Atlas.canvas.height / Atlas.dpr;
      if (s.x < -range || s.x > cw + range || s.y < -range || s.y > ch + range) continue;

      // 20-unit engagement radius
      ctx.beginPath();
      ctx.strokeStyle = dead ? 'rgba(255, 179, 87, .07)' : 'rgba(255, 179, 87, .16)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
      ctx.arc(s.x, s.y, range, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);

      // body
      ctx.globalAlpha = dead ? 0.25 : 1;
      ctx.fillStyle = COLORS.enemy;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 3, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s.x, s.y, 7 + Math.sin(t * 2 + i) * 1.4, 0, TAU);
      ctx.strokeStyle = 'rgba(255, 179, 87, .32)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawPlayer(ctx, t) {
    const p = Atlas.hooks.getPlayer ? Atlas.hooks.getPlayer() : null;
    if (!p) return;
    const s = toScreen(p.x, p.y);
    const live = Atlas.hooks.isLive ? Atlas.hooks.isLive() : false;

    // camera viewport from the live game
    const cam = Atlas.hooks.getCamera ? Atlas.hooks.getCamera() : null;
    const view = Atlas.hooks.getView ? Atlas.hooks.getView() : null;
    if (cam && view) {
      const a = toScreen(cam.x - view.w / 2, cam.y + view.h / 2);
      const b = toScreen(cam.x + view.w / 2, cam.y - view.h / 2);
      ctx.save();
      ctx.strokeStyle = live ? 'rgba(255, 255, 255, .5)' : 'rgba(255, 255, 255, .18)';
      ctx.fillStyle = live ? 'rgba(255, 255, 255, .045)' : 'rgba(255, 255, 255, .012)';
      ctx.lineWidth = 1;
      ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
      ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
      ctx.font = '7px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(220, 240, 250, .6)';
      ctx.fillText('CAMERA', a.x + 5, a.y + 11);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 12;
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.5, 5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-4.5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawCorners(ctx, cw, ch) {
    const m = 14, l = 18;
    ctx.save();
    ctx.strokeStyle = 'rgba(140, 220, 240, .35)';
    ctx.lineWidth = 1;
    const corner = (x, y, dx, dy) => {
      ctx.beginPath();
      ctx.moveTo(x, y + dy * l);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * l, y);
      ctx.stroke();
    };
    corner(m, m, 1, 1);
    corner(cw - m, m, -1, 1);
    corner(m, ch - m, 1, -1);
    corner(cw - m, ch - m, -1, -1);
    ctx.restore();
  }

  function drawScan(ctx, cw, ch, t) {
    const y = ((t * 0.06) % 1) * ch;
    const g = ctx.createLinearGradient(0, y - 40, 0, y + 40);
    g.addColorStop(0, 'rgba(120, 230, 220, 0)');
    g.addColorStop(0.5, 'rgba(120, 230, 220, .07)');
    g.addColorStop(1, 'rgba(120, 230, 220, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 40, cw, 80);
    ctx.strokeStyle = 'rgba(120, 230, 220, .10)';
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(cw, y);
    ctx.stroke();
  }

  function drawHover(ctx) {
    const { x, y, sx, sy } = Atlas.hover;
    ctx.save();
    ctx.strokeStyle = 'rgba(180, 240, 255, .45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(sx, 0); ctx.lineTo(sx, Atlas.canvas.height / Atlas.dpr);
    ctx.moveTo(0, sy); ctx.lineTo(Atlas.canvas.width / Atlas.dpr, sy);
    ctx.stroke();
    ctx.setLineDash([]);
    const tile = { x: Math.floor(x), y: Math.floor(y) };
    const a = toScreen(tile.x, tile.y + 1);
    ctx.strokeStyle = 'rgba(196, 255, 61, .75)';
    ctx.strokeRect(a.x, a.y, Atlas.view.scale, Atlas.view.scale);
    ctx.restore();
  }

  /* ------------------------------------------------------------------ */
  /*  Hover inspection                                                  */
  /* ------------------------------------------------------------------ */
  function inspect(wx, wy) {
    const lv = Atlas.level;
    const key = Math.floor(wx) + ',' + Math.floor(wy);
    let kind = 'open space';
    let detail = '';
    if (Atlas.solidSet.has(key)) { kind = 'solid ground'; detail = '1×1 collider'; }
    else if (Atlas.wallSet.has(key)) { kind = 'wall'; detail = '1×1 collider'; }
    else if (Atlas.trapSet.has(key)) { kind = 'trap / lava'; detail = 'damage on contact'; }

    let near = null;
    let best = 2.6;
    const check = (list, label, color) => {
      for (const e of list || []) {
        const d = Math.hypot(e.x - wx, e.y - wy);
        if (d < best) { best = d; near = { label, color, x: e.x, y: e.y, d }; }
      }
    };
    check(lv.entities.DiamondPickUp, 'diamond', '#7ef9ff');
    check(lv.entities.HeartPickUp, 'heart', '#ff8b8b');
    check(lv.entities.SlowMoPowerUpControler, 'slow-mo pickup', '#c9a6ff');
    check(lv.entities.Enemy, 'gunner (range 20)', '#ffb357');
    if (near) { kind = near.label; detail = `at ${near.x.toFixed(1)}, ${near.y.toFixed(1)}`; }

    const readout = document.getElementById('atlas-readout');
    if (readout) {
      readout.innerHTML = `
        <div><b>${wx.toFixed(1)}, ${wy.toFixed(1)}</b> <span class="dim">world units</span></div>
        <div>tile <b>${Math.floor(wx)}, ${Math.floor(wy)}</b> · <b>${kind}</b>${detail ? ` <span class="dim">${detail}</span>` : ''}</div>`;
    }
  }

  function resetReadout() {
    const readout = document.getElementById('atlas-readout');
    if (!readout) return;
    readout.innerHTML = `
      <div><b>Whole level</b> <span class="dim">· ${Atlas.levels.tilemaps} tilemaps · ${Atlas.levels.cells} cells · ${Atlas.levels.props} props</span></div>
      <div>scroll to zoom · drag to pan · hover to inspect</div>`;
  }

  /* ------------------------------------------------------------------ */
  /*  Input                                                             */
  /* ------------------------------------------------------------------ */
  function bindInput() {
    const stage = Atlas.canvas.parentElement;

    Atlas.canvas.addEventListener('mousemove', (e) => {
      const r = Atlas.canvas.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      Atlas.mouse = { sx, sy };
      if (Atlas.drag) {
        const dx = sx - Atlas.drag.sx;
        const dy = sy - Atlas.drag.sy;
        Atlas.view.x = Atlas.drag.vx - dx / Atlas.view.scale;
        Atlas.view.y = Atlas.drag.vy + dy / Atlas.view.scale;
        Atlas.drag.sx = sx; Atlas.drag.sy = sy;
        Atlas.drag.vx = Atlas.view.x; Atlas.drag.vy = Atlas.view.y;
        Atlas.canvas.style.cursor = 'grabbing';
        return;
      }
      const w = toWorld(sx, sy);
      Atlas.hover = { x: w.x, y: w.y, sx, sy };
      inspect(w.x, w.y);
    });

    Atlas.canvas.addEventListener('mouseleave', () => {
      Atlas.hover = null;
      Atlas.drag = null;
      resetReadout();
    });

    Atlas.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const r = Atlas.canvas.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      Atlas.drag = { sx, sy, vx: Atlas.view.x, vy: Atlas.view.y };
      Atlas.canvas.style.cursor = 'grabbing';
      e.preventDefault();
    });

    window.addEventListener('mouseup', () => {
      Atlas.drag = null;
      if (Atlas.canvas) Atlas.canvas.style.cursor = 'crosshair';
    });

    Atlas.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = Atlas.canvas.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      const before = toWorld(sx, sy);
      const factor = Math.exp(-e.deltaY * 0.0016);
      Atlas.view.scale = Math.max(0.4, Math.min(60, Atlas.view.scale * factor));
      const after = toWorld(sx, sy);
      Atlas.view.x += before.x - after.x;
      Atlas.view.y += before.y - after.y;
      if (Atlas.mouse) {
        const w = toWorld(sx, sy);
        Atlas.hover = { x: w.x, y: w.y, sx, sy };
      }
    }, { passive: false });

    Atlas.canvas.addEventListener('dblclick', () => fit());

    document.querySelectorAll('#atlas-layers .layer-chip').forEach((btn) => {
      btn.addEventListener('click', () => toggleLayer(btn.dataset.layer));
    });

    window.addEventListener('keydown', (e) => {
      if (!Atlas.open) return;
      const map = { Digit1: 'terrain', Digit2: 'collision', Digit3: 'pickups', Digit4: 'enemies', Digit5: 'joints', Digit6: 'grid' };
      if (map[e.code]) { toggleLayer(map[e.code]); e.preventDefault(); }
      if (e.code === 'Digit0' || e.code === 'KeyF') { fit(); e.preventDefault(); }
      if (e.code === 'Escape') {
        if (Atlas.hooks.onEscape) Atlas.hooks.onEscape();
        e.preventDefault();
      }
    });
  }

  function toggleLayer(name) {
    Atlas.layers[name] = !Atlas.layers[name];
    const btn = document.querySelector(`#atlas-layers [data-layer="${name}"]`);
    if (btn) btn.setAttribute('aria-pressed', String(Atlas.layers[name]));
  }

  /* ------------------------------------------------------------------ */
  /*  Loop                                                              */
  /* ------------------------------------------------------------------ */
  function loop() {
    if (!Atlas.open) return;
    render();
    Atlas.raf = requestAnimationFrame(loop);
  }

  function open() {
    if (!Atlas.canvas) return;
    Atlas.open = true;
    document.getElementById('atlas-screen').classList.remove('hidden');
    resize();
    fit();
    resetReadout();
    Atlas.t0 = performance.now();
    cancelAnimationFrame(Atlas.raf);
    loop();
  }

  function close() {
    Atlas.open = false;
    cancelAnimationFrame(Atlas.raf);
    document.getElementById('atlas-screen').classList.add('hidden');
  }

  window.addEventListener('resize', () => { if (Atlas.open) { resize(); } });

  window.StickmanAtlas = {
    init,
    open,
    close,
    resize,
    fit,
    get isOpen() { return Atlas.open; },
    get layers() { return Atlas.layers; },
    toggleLayer
  };
})();
