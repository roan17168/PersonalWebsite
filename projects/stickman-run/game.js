/* ===================================================================
   STICKMAN RUN — browser port of the original Unity 2021 prototype
   ("Grapple Up", Unity 2021.3.2f1)

   Level art, props, audio and physics constants were extracted from the
   original Windows build. Gameplay values below are the serialized values
   from the scene (Player / Grappler / Enemy / AmmoBar / SlowMoBar).
   =================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  Constants (recovered from the Unity scene)                        */
  /* ------------------------------------------------------------------ */
  const VIEW_HEIGHT = 11.547;      // perspective cam, FOV 60 at 10 units
  const GRAVITY = -9.81 * 4;       // Rigidbody2D.gravityScale = 4
  const STEP = 1 / 120;

  const MOVE_SPEED = 6.5;
  const JUMP_FORCE = 15.5;
  const WALL_JUMP_FORCE = 17;
  const MAX_HEALTH = 15;
  const START_HEALTH = 10;
  const FALL_DAMAGE_VELOCITY = -25;
  const CROUCH_COST = 40;
  const SLIDE_COST = 20;
  const CROUCH_SCALE = 0.5;
  const CROUCH_SPEED_CHANGE = 3;
  const CROUCH_JUMP_CHANGE = 3;
  const GUN_SPEED_CHANGE = 1;
  const GUN_RECOIL = 5;

  const AMMO_MAX = 5;
  const SLOW_MAX = 100;
  const SLOW_COST = 25;
  const GRAPPLE_HOP = 10;

  const ENEMY_HEALTH = 40;
  const ENEMY_RANGE = 20;
  const ENEMY_SHOOT_INTERVAL = 1.5;
  const ENEMY_BULLET_SPEED = 15;
  const ENEMY_KNOCKBACK = 6;

  const BULLET_SPEED = 20;
  const BULLET_DAMAGE = 20;
  const PUNCH_DAMAGE = 10;
  const PUNCH_RANGE = 0.85;
  const PUNCH_COOLDOWN = 0.1;

  const PLAYER_HALF_W = 0.301;
  const PLAYER_HALF_H = 0.8085;
  const PLAYER_COLLIDER_Y = -0.198;

  const DEATH_Y = -45;
  const TOTAL_DIAMONDS = 25;

  /* ------------------------------------------------------------------ */
  /*  DOM                                                               */
  /* ------------------------------------------------------------------ */
  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d', { alpha: false });

  const ui = {
    hud: $('hud'),
    healthFill: $('health-fill'),
    healthVal: $('health-val'),
    staminaFill: $('stamina-fill'),
    slowFill: $('slow-fill'),
    ammoPips: $('ammo-pips'),
    diamondCount: $('diamond-count'),
    pauseBtn: $('pause-btn'),
    helpBtn: $('help-btn'),
    toast: $('toast'),

    loading: $('loading-screen'),
    loadingFill: $('loading-fill'),
    loadingLabel: $('loading-label'),

    menu: $('menu-screen'),
    menuPlay: $('menu-play'),
    menuSettings: $('menu-settings'),
    menuObserve: $('menu-observe'),
    menuExit: $('menu-exit'),

    settings: $('settings-screen'),
    settingsBack: $('settings-back'),
    fullscreen: $('set-fullscreen'),
    quality: $('set-quality'),
    volume: $('set-volume'),
    volumeOut: $('volume-out'),
    settingsControls: $('settings-controls'),

    controls: $('controls-screen'),
    controlsBack: $('controls-back'),
    controlsList: $('controls-list'),

    atlas: $('atlas-screen'),
    atlasClose: $('atlas-close'),
    atlasPlay: $('atlas-play'),
    pauseAtlasBtn: $('pause-atlas-btn'),

    pause: $('pause-overlay'),
    resumeBtn: $('resume-btn'),
    pauseControlsBtn: $('pause-controls-btn'),
    restartBtn: $('restart-btn'),
    pauseMenuBtn: $('pause-menu-btn'),

    death: $('death-overlay'),
    retryBtn: $('retry-btn'),
    deathMenuBtn: $('death-menu-btn'),

    win: $('win-overlay'),
    winAgainBtn: $('win-again-btn'),
    winMenuBtn: $('win-menu-btn'),

    pauseDiamonds: $('pause-diamonds'),
    pauseHealth: $('pause-health'),
    pauseEnemies: $('pause-enemies'),
    deathDiamonds: $('death-diamonds'),
    deathKills: $('death-kills'),
    winTime: $('win-time'),
    winKills: $('win-kills'),
    winDeaths: $('win-deaths')
  };

  /* Controls, as found in the decompiled C# (Player.cs / Grappler.cs / AmmoBar.cs) */
  const CONTROLS = [
    ['A', 'D', 'Run left / right', 'Player.cs'],
    ['SPACE', '', 'Jump · wall-jump', 'Player.cs'],
    ['LMB', '', 'Hold to grapple to the cursor', 'Grappler.cs'],
    ['LMB', '', 'Shoot when the pistol is out', 'Player.cs'],
    ['LMB', '', 'Punch when holstered', 'Player.cs'],
    ['Q', '', 'Draw / holster the pistol', 'Player.cs'],
    ['R', '', 'Reload one round at a time', 'AmmoBar.cs'],
    ['SHIFT', '', 'Crouch · slide', 'Player.cs'],
    ['W', '', 'Slow motion · grapple hop', 'SlowMoBar.cs'],
    ['ESC', '', 'Pause · resume', 'UIManager.cs']
  ];

  /* ------------------------------------------------------------------ */
  /*  Runtime state                                                     */
  /* ------------------------------------------------------------------ */
  const state = {
    mode: 'loading',            // loading | menu | playing | paused | dead | won
    level: null,
    images: new Map(),
    pxPerUnit: 60,
    cam: { x: -5, y: 6.5 },
    shake: 0,
    flash: 0,
    timeScale: 1,
    stats: { diamonds: 0, kills: 0, deaths: 0, time: 0 },
    quality: 'normal',
    masterVolume: 0.7,
    cameFrom: 'menu',
    musicName: null,
    accumulator: 0,
    elapsed: 0
  };

  const input = {
    left: false, right: false, up: false, down: false,
    jump: false, jumpPressed: false,
    mouseX: 0, mouseY: 0, mouseDown: false, mousePressed: false,
    gunToggle: false, reload: false, crouch: false, slow: false
  };

  let player = null;
  let enemies = [];
  let pickups = [];
  let bullets = [];
  let enemyBullets = [];
  let particles = [];
  let floaters = [];

  let solidRects = [];
  const solidHash = new Map();
  const HASH_BUCKET = 2;
  let bounds = { minX: -10, maxX: 100, minY: -31, maxY: 44 };

  /* ------------------------------------------------------------------ */
  /*  Utilities                                                         */
  /* ------------------------------------------------------------------ */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rad = (d) => (d * Math.PI) / 180;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const key = (x, y) => x + ',' + y;
  const clampToArena = (v, lo, hi, fallback) => (hi > lo ? clamp(v, lo, hi) : fallback);

  /* ------------------------------------------------------------------ */
  /*  Level loading                                                     */
  /* ------------------------------------------------------------------ */
  async function boot() {
    resize();
    window.addEventListener('resize', resize);

    try {
      const res = await fetch('data/level.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      state.level = await res.json();
    } catch (err) {
      console.error('[Stickman Run] could not load level', err);
      if (ui.loadingLabel) ui.loadingLabel.textContent = 'Could not load the level data';
      showToast('Could not load the level data');
      return;
    }

    await preloadImages();
    buildWorld();
    bindInput();
    bindUI();
    renderControlLists();
    restoreSettings();
    resetRun();

    if (window.StickmanAtlas) {
      window.StickmanAtlas.init(state.level, {
        getPlayer: () => player,
        getCamera: () => state.cam,
        getView: () => viewSize(),
        isLive: () => state.mode === 'playing' || state.mode === 'paused',
        getLiveEnemies: () => enemies,
        onEscape: () => closeAtlas()
      });
    }

    if (ui.loading) ui.loading.classList.add('hidden');
    setMode('menu');

    requestAnimationFrame(frame);
    window.__STICKMAN.ready = true;
  }

  async function preloadImages() {
    const entries = Object.entries(state.level.textures);
    let done = 0;
    await Promise.all(entries.map(([name, info]) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        state.images.set(name, img);
        done++;
        updateLoadProgress(done, entries.length);
        resolve();
      };
      img.onerror = () => {
        console.warn('[Stickman Run] missing texture', name, info.file);
        done++;
        updateLoadProgress(done, entries.length);
        resolve();
      };
      img.src = info.file;
    })));
  }

  function updateLoadProgress(done, total) {
    if (ui.loadingFill) {
      ui.loadingFill.style.width = Math.round((done / total) * 100) + '%';
    }
  }

  function buildWorld() {
    const lv = state.level;
    solidRects = [];
    solidHash.clear();

    const addRect = (x, y, w, h, trap) => {
      const rect = { x, y, w, h, trap: !!trap };
      solidRects.push(rect);
      const bx0 = Math.floor(x / HASH_BUCKET), bx1 = Math.floor((x + w - 1e-6) / HASH_BUCKET);
      const by0 = Math.floor(y / HASH_BUCKET), by1 = Math.floor((y + h - 1e-6) / HASH_BUCKET);
      for (let bx = bx0; bx <= bx1; bx++) {
        for (let by = by0; by <= by1; by++) {
          const k = bx + ',' + by;
          let list = solidHash.get(k);
          if (!list) { list = []; solidHash.set(k, list); }
          list.push(rect);
        }
      }
    };

    for (const [x, y] of lv.solid.ground) addRect(x, y, 1, 1, false);
    for (const [x, y] of lv.solid.wall) addRect(x, y, 1, 1, false);
    for (const [x, y] of lv.solid.trap) addRect(x, y, 1, 1, true);

    const xs = lv.solid.ground.map((c) => c[0]);
    const ys = lv.solid.ground.map((c) => c[1]);
    bounds = {
      minX: Math.min(...xs), maxX: Math.max(...xs) + 1,
      minY: Math.min(...ys), maxY: Math.max(...ys) + 1
    };

    // invisibly fence the arena so a grapple cannot fling the player out sideways
    addRect(bounds.minX - 3, bounds.minY - 20, 2, 120, false);
    addRect(bounds.maxX + 1, bounds.minY - 20, 2, 120, false);
  }

  function rectsInBox(x0, y0, x1, y1, out) {
    const bx0 = Math.floor(x0 / HASH_BUCKET), bx1 = Math.floor(x1 / HASH_BUCKET);
    const by0 = Math.floor(y0 / HASH_BUCKET), by1 = Math.floor(y1 / HASH_BUCKET);
    out.length = 0;
    for (let bx = bx0; bx <= bx1; bx++) {
      for (let by = by0; by <= by1; by++) {
        const list = solidHash.get(bx + ',' + by);
        if (!list) continue;
        for (const r of list) {
          if (r.x < x1 && r.x + r.w > x0 && r.y < y1 && r.y + r.h > y0) {
            if (!out.includes(r)) out.push(r);
          }
        }
      }
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /*  Input                                                             */
  /* ------------------------------------------------------------------ */
  function bindInput() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) {
        if (['Space', 'KeyW', 'ShiftLeft'].includes(e.code)) e.preventDefault();
        return;
      }
      switch (e.code) {
        case 'KeyA': case 'ArrowLeft': input.left = true; break;
        case 'KeyD': case 'ArrowRight': input.right = true; break;
        case 'Space': input.jump = true; input.jumpPressed = true; e.preventDefault(); break;
        case 'KeyQ': input.gunToggle = true; break;
        case 'KeyR': input.reload = true; break;
        case 'ShiftLeft': case 'ShiftRight': input.crouch = true; break;
        case 'KeyW': case 'ArrowUp': input.slow = true; input.up = true; break;
        case 'Escape': case 'KeyP':
          if (state.mode === 'playing') setMode('paused');
          else if (state.mode === 'paused') setMode('playing');
          else if (state.mode === 'settings' || state.mode === 'controls') comeBack();
          break;
        default: break;
      }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      primeMenuMusic();
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyA': case 'ArrowLeft': input.left = false; break;
        case 'KeyD': case 'ArrowRight': input.right = false; break;
        case 'Space': input.jump = false; break;
        case 'ShiftLeft': case 'ShiftRight': input.crouch = false; break;
        case 'KeyW': case 'ArrowUp': input.slow = false; input.up = false; break;
        default: break;
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      input.mouseX = e.clientX - r.left;
      input.mouseY = e.clientY - r.top;
    });

    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      input.mouseDown = true;
      input.mousePressed = true;
      e.preventDefault();
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button !== 0) return;
      input.mouseDown = false;
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('blur', () => {
      input.left = input.right = input.jump = input.mouseDown = input.crouch = input.slow = false;
      if (state.mode === 'playing') setMode('paused');
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state.mode === 'playing') setMode('paused');
    });
  }

  function bindUI() {
    /* ---- menu ---- */
    ui.menuPlay.addEventListener('click', () => beginRun());
    ui.menuSettings.addEventListener('click', () => openSettings('menu'));
    ui.menuObserve.addEventListener('click', () => openAtlas());
    ui.menuExit.addEventListener('click', () => exitToPortfolio());

    /* ---- settings ---- */
    ui.settingsBack.addEventListener('click', () => comeBack());
    ui.fullscreen.addEventListener('click', toggleFullscreen);
    ui.quality.addEventListener('change', () => applyQuality(ui.quality.value));
    ui.volume.addEventListener('input', () => {
      state.masterVolume = Number(ui.volume.value) / 100;
      if (ui.volumeOut) ui.volumeOut.textContent = Math.round(state.masterVolume * 100) + '%';
      applyVolume();
      saveSetting('sba:volume', ui.volume.value);
    });

    /* ---- controls ---- */
    ui.controlsBack.addEventListener('click', () => comeBack());

    /* ---- atlas ---- */
    ui.atlasClose.addEventListener('click', () => closeAtlas());
    ui.atlasPlay.addEventListener('click', () => { closeAtlas(); beginRun(); });

    /* ---- pause / death / win ---- */
    ui.pauseBtn.addEventListener('click', () => {
      if (state.mode === 'playing') setMode('paused');
    });
    ui.helpBtn.addEventListener('click', () => {
      if (state.mode === 'playing') openControls('paused');
    });
    ui.resumeBtn.addEventListener('click', () => setMode('playing'));
    ui.pauseControlsBtn.addEventListener('click', () => openControls('paused'));
    ui.pauseAtlasBtn.addEventListener('click', () => openAtlas('paused'));
    ui.restartBtn.addEventListener('click', () => { beginRun(); });
    ui.pauseMenuBtn.addEventListener('click', () => showMenu());
    ui.retryBtn.addEventListener('click', () => { beginRun(); });
    ui.deathMenuBtn.addEventListener('click', () => showMenu());
    ui.winAgainBtn.addEventListener('click', () => { beginRun(); });
    ui.winMenuBtn.addEventListener('click', () => showMenu());

    document.addEventListener('fullscreenchange', syncFullscreenButton);

    /* ---- menu hotkeys ---- */
    window.addEventListener('keydown', (e) => {
      if (state.mode === 'menu') {
        if (e.code === 'Enter' || e.code === 'NumpadEnter') { beginRun(); e.preventDefault(); }
        else if (e.code === 'KeyS') { openSettings('menu'); e.preventDefault(); }
        else if (e.code === 'KeyO') { openAtlas(); e.preventDefault(); }
      } else if (state.mode === 'playing') {
        if (e.code === 'KeyH') { openControls('paused'); e.preventDefault(); }
      }
    });

    window.addEventListener('pointerdown', primeMenuMusic, { once: true });
  }

  /* ------------------------------------------------------------------ */
  /*  Screens                                                           */
  /* ------------------------------------------------------------------ */
  function renderControlLists() {
    const html = CONTROLS.map(([key, key2, desc, src]) => `
      <div class="control-row">
        <kbd>${key}</kbd>${key2 ? `<kbd>${key2}</kbd>` : ''}
        <span class="desc">${desc}</span>
        <span class="src">${src}</span>
      </div>`).join('');
    if (ui.settingsControls) ui.settingsControls.innerHTML = html;
    if (ui.controlsList) ui.controlsList.innerHTML = html;
  }

  function saveSetting(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (err) { /* private mode */ }
  }

  function readSetting(key) {
    try { return localStorage.getItem(key); } catch (err) { return null; }
  }

  function restoreSettings() {
    const savedVolume = readSetting('sba:volume');
    if (savedVolume !== null && ui.volume) {
      ui.volume.value = savedVolume;
      state.masterVolume = Number(savedVolume) / 100;
    }
    if (ui.volumeOut) ui.volumeOut.textContent = Math.round(state.masterVolume * 100) + '%';

    const savedQuality = readSetting('sba:quality');
    if (savedQuality && ['low', 'normal', 'high'].includes(savedQuality)) {
      state.quality = savedQuality;
      if (ui.quality) ui.quality.value = savedQuality;
    }
    applyQuality(state.quality, true);
    syncFullscreenButton();
  }

  function applyQuality(value, silent = false) {
    state.quality = ['low', 'normal', 'high'].includes(value) ? value : 'normal';
    if (ui.quality) ui.quality.value = state.quality;
    saveSetting('sba:quality', state.quality);
    resize();
    if (window.StickmanAtlas && window.StickmanAtlas.isOpen) window.StickmanAtlas.resize();
    if (!silent) showToast('Quality · ' + state.quality.toUpperCase());
  }

  function toggleFullscreen() {
    const el = document.documentElement;
    const request = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (!request) { showToast('Fullscreen is not available here'); return; }
      Promise.resolve(request.call(el)).catch(() => showToast('Fullscreen was blocked by the browser'));
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen || (() => {})).call(document);
    }
  }

  function syncFullscreenButton() {
    if (!ui.fullscreen) return;
    const on = !!(document.fullscreenElement || document.webkitFullscreenElement);
    ui.fullscreen.textContent = on ? 'ON' : 'OFF';
    ui.fullscreen.setAttribute('aria-pressed', String(on));
  }

  function exitToPortfolio() {
    const url = '../../index.html#past-work';
    try {
      if (window.top && window.top !== window) { window.top.location.href = url; return; }
    } catch (err) { /* cross-origin parent */ }
    window.location.href = url;
  }

  function beginRun() {
    resetRun();
    startGame();
  }

  function showMenu() {
    closeAtlas();
    resetRun();
    setMode('menu');
  }

  function openSettings(from) {
    state.cameFrom = from;
    setMode('settings');
  }

  function openControls(from) {
    state.cameFrom = from;
    setMode('controls');
  }

  function comeBack() {
    if (state.cameFrom === 'paused') setMode('paused');
    else setMode('menu');
  }

  function openAtlas(from = 'menu') {
    if (!window.StickmanAtlas) { showToast('Level atlas unavailable'); return; }
    state.cameFrom = from;
    state.mode = 'atlas';
    resetInput();
    hideScreens();
    ui.hud.classList.remove('active');
    stopMusic();
    window.StickmanAtlas.open();
  }

  function closeAtlas() {
    if (window.StickmanAtlas && window.StickmanAtlas.isOpen) window.StickmanAtlas.close();
    if (state.mode !== 'atlas') return;
    if (state.cameFrom === 'paused') setMode('paused');
    else setMode('menu');
  }

  /* ------------------------------------------------------------------ */
  /*  Audio                                                             */
  /* ------------------------------------------------------------------ */
  const audioCache = new Map();
  let musicEl = null;

  function audioInfo(name) {
    return state.level && state.level.audio ? state.level.audio[name] : null;
  }

  function playSfx(name, volume = 1, rate = 1) {
    const info = audioInfo(name);
    if (!info) return;
    try {
      let base = audioCache.get(name);
      if (!base) {
        base = new Audio(info.file);
        base.preload = 'auto';
        audioCache.set(name, base);
      }
      const el = base.cloneNode();
      el.volume = clamp(volume * state.masterVolume, 0, 1);
      el.playbackRate = clamp(rate, 0.5, 2);
      el.play().catch(() => {});
    } catch (err) { /* audio is best-effort */ }
  }

  function playMusic(name) {
    if (state.musicName === name) return null;
    const info = audioInfo(name);
    if (!info) return null;
    state.musicName = name;
    stopMusic();
    if (!info.music) return null;
    musicEl = new Audio(info.file);
    musicEl.loop = true;
    musicEl.volume = clamp(0.42 * state.masterVolume, 0, 1);
    const started = musicEl.play();
    if (started && started.catch) {
      started.catch(() => {
        if (state.musicName === name) state.musicName = null;
      });
    }
    return started;
  }

  function stopMusic() {
    if (musicEl) {
      musicEl.pause();
      musicEl.src = '';
      musicEl = null;
    }
  }

  function applyVolume() {
    if (musicEl) musicEl.volume = clamp(0.42 * state.masterVolume, 0, 1);
  }

  let menuMusicPrimed = false;
  function primeMenuMusic() {
    if (menuMusicPrimed || state.mode !== 'menu') return;
    menuMusicPrimed = true;
    const started = playMusic('MenuBG');
    // Autoplay may still be blocked before the first gesture — let the next
    // pointer/key event try again instead of silently staying mute forever.
    if (started && started.catch) {
      started.catch(() => { menuMusicPrimed = false; });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Run lifecycle                                                     */
  /* ------------------------------------------------------------------ */
  function resetRun() {
    const lv = state.level;
    const sp = lv.entities.Player[0] || { x: -5, y: 6.5 };
    player = {
      x: sp.x, y: sp.y, vx: 0, vy: 0,
      facing: 1,
      grounded: false,
      wallDir: 0,
      health: START_HEALTH,
      stamina: 100,
      slow: 10,
      ammo: AMMO_MAX,
      crouching: false,
      sliding: 0,
      slideTimer: 0,
      gunOut: false,
      punchTimer: 0,
      punchCooldown: 0,
      shootCooldown: 0,
      recoil: 0,
      grapple: null,
      grappleHops: 0,
      fallSpeed: 0,
      invuln: 2.5,
      reloading: false,
      reloadTimer: 0,
      staminaDelay: 0,
      slowDelay: 0,
      spawnGrace: 2.5,
      walkPhase: 0,
      dustTimer: 0,
      muzzle: 0,
      hitFlash: 0,
      dead: false
    };

    enemies = lv.entities.Enemy.map((e, i) => ({
      x: e.x, y: e.y,
      health: ENEMY_HEALTH,
      facing: -1,
      shootTimer: 3.2 + (i % 7) * 0.21,
      angle: 180,
      hitFlash: 0,
      crouch: 0,
      alive: true,
      bob: Math.random() * Math.PI * 2
    }));

    pickups = [];
    for (const d of lv.entities.DiamondPickUp || []) {
      pickups.push({ type: 'diamond', x: d.x, y: d.y, phase: Math.random() * 6.28, taken: false });
    }
    for (const h of lv.entities.HeartPickUp || []) {
      pickups.push({ type: 'heart', x: h.x, y: h.y, phase: Math.random() * 6.28, taken: false });
    }
    for (const s of lv.entities.SlowMoPowerUpControler || []) {
      pickups.push({ type: 'slow', x: s.x, y: s.y, phase: Math.random() * 6.28, taken: false });
    }

    bullets = [];
    enemyBullets = [];
    particles = [];
    floaters = [];

    state.stats = { diamonds: 0, kills: 0, deaths: 0, time: 0 };
    if (ui.menuPlay) ui.menuPlay.disabled = false;
    if (ui.loading) ui.loading.classList.add('hidden');
    state.cam.x = player.x;
    state.cam.y = player.y;
    state.timeScale = 1;
    state.shake = 0;
    state.flash = 0;
    updateHud();
  }

  function hideScreens() {
    [ui.menu, ui.settings, ui.controls, ui.pause, ui.death, ui.win].forEach((el) => {
      if (el) el.classList.add('hidden');
    });
  }

  function resetInput() {
    input.left = false; input.right = false; input.up = false; input.down = false;
    input.jump = false; input.jumpPressed = false;
    input.mousePressed = false;
    input.gunToggle = false; input.reload = false; input.crouch = false; input.slow = false;
  }

  function startGame() {
    if (!state.level) return;
    stopMusic();
    menuMusicPrimed = true;
    playMusic('GameBG');
    state.mode = 'playing';
    hideScreens();
    resetInput();
    ui.hud.classList.add('active');
    ui.hud.setAttribute('aria-hidden', 'false');
    lastFrame = performance.now();
    state.accumulator = 0;
    canvas.focus();
    showToast('A / D move · SPACE jump · LMB grapple · Q pistol · SHIFT crouch · W slow-mo', 6000);
  }

  function setMode(next) {
    if (!state.level) return;
    state.mode = next;
    resetInput();

    hideScreens();
    if (next === 'menu') ui.menu.classList.remove('hidden');
    else if (next === 'settings') ui.settings.classList.remove('hidden');
    else if (next === 'controls') ui.controls.classList.remove('hidden');
    else if (next === 'paused') ui.pause.classList.remove('hidden');
    else if (next === 'dead') ui.death.classList.remove('hidden');
    else if (next === 'won') ui.win.classList.remove('hidden');

    ui.hud.classList.toggle('active', next === 'playing');
    ui.hud.setAttribute('aria-hidden', next === 'playing' ? 'false' : 'true');

    if (next === 'menu') {
      if (window.StickmanAtlas && window.StickmanAtlas.isOpen) window.StickmanAtlas.close();
      stopMusic();
      menuMusicPrimed = false;
      state.timeScale = 1;
      primeMenuMusic();
    }

    if (next === 'paused') {
      ui.pauseDiamonds.textContent = state.stats.diamonds;
      ui.pauseHealth.textContent = player ? Math.max(0, player.health) : 0;
      ui.pauseEnemies.textContent = enemies.filter((e) => e.alive).length;
      state.timeScale = 1;
    }

    if (next === 'playing') {
      lastFrame = performance.now();
      state.accumulator = 0;
      if (!musicEl || musicEl.paused) playMusic('GameBG');
    }

    if (next === 'dead' || next === 'won') stopMusic();
  }

  function die(reason) {
    if (player.dead) return;
    player.dead = true;
    state.stats.deaths++;
    playSfx('DeathExplosion', 0.85);
    burst(player.x, player.y - 0.3, 34, ['#ffffff', '#c9c9c9', '#ff6b6b'], 6.5, 0.9);
    state.shake = 1;
    ui.deathDiamonds.textContent = state.stats.diamonds;
    ui.deathKills.textContent = state.stats.kills;
    document.getElementById('death-message').textContent = reason || 'Your stickman has run out of health.';
    setMode('dead');
    stopMusic();
  }

  function win() {
    const t = state.stats.time;
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    ui.winTime.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
    ui.winKills.textContent = state.stats.kills;
    ui.winDeaths.textContent = state.stats.deaths;
    setMode('won');
    playSfx('DeathExplosion', 0.5, 1.4);
    stopMusic();
  }

  /* ------------------------------------------------------------------ */
  /*  Collision helpers                                                 */
  /* ------------------------------------------------------------------ */
  function aabb(px, py, crouchScale = 1) {
    const h = PLAYER_HALF_H * crouchScale;
    const cy = py + PLAYER_COLLIDER_Y * crouchScale;
    return { x0: px - PLAYER_HALF_W, x1: px + PLAYER_HALF_W, y0: cy - h, y1: cy + h };
  }

  function solidAt(x, y) {
    const found = rectsInBox(x - 0.02, y - 0.02, x + 0.02, y + 0.02, scratch);
    return found.length > 0;
  }

  // Line of sight between a gunner and the player. Used so enemies stop
  // firing through rock — bullets already die on solids, this stops the
  // meaningless muzzle fire (and the unfair hits through thin floors).
  function lineOfSight(ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) return true;
    const steps = Math.max(2, Math.min(70, Math.ceil(dist / 0.45)));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (solidAt(ax + dx * t, ay + dy * t)) return false;
    }
    return true;
  }

  const scratch = [];
  const scratch2 = [];

  function overlapsSolid(box) {
    return rectsInBox(box.x0, box.y0, box.x1, box.y1, scratch).length > 0;
  }

  function overlapsTrap(box) {
    const list = rectsInBox(box.x0, box.y0, box.x1, box.y1, scratch2);
    for (const r of list) if (r.trap) return true;
    return false;
  }

  function movePlayer(dt) {
    const scale = player.crouching ? CROUCH_SCALE : 1;
    const eps = 0.0005;

    // ---- horizontal ----
    player.x += player.vx * dt;
    let box = aabb(player.x, player.y, scale);
    let hits = rectsInBox(box.x0, box.y0, box.x1, box.y1, scratch);
    if (player.vx !== 0 && hits.length) {
      if (player.vx > 0) {
        let mx = Infinity;
        for (const r of hits) mx = Math.min(mx, r.x - PLAYER_HALF_W - eps);
        player.x = mx;
      } else {
        let mx = -Infinity;
        for (const r of hits) mx = Math.max(mx, r.x + r.w + PLAYER_HALF_W + eps);
        player.x = mx;
      }
      player.vx = 0;
    }

    // ---- vertical ----
    player.y += player.vy * dt;
    box = aabb(player.x, player.y, scale);
    hits = rectsInBox(box.x0, box.y0, box.x1, box.y1, scratch);
    let landed = false;
    if (hits.length) {
      if (player.vy <= 0) {
        let my = -Infinity;
        for (const r of hits) {
          my = Math.max(my, r.y + r.h - PLAYER_COLLIDER_Y * scale + PLAYER_HALF_H * scale);
        }
        player.y = my;
        landed = true;
      } else {
        let my = Infinity;
        for (const r of hits) {
          my = Math.min(my, r.y - (PLAYER_COLLIDER_Y + PLAYER_HALF_H) * scale - eps);
        }
        player.y = my;
      }
      player.vy = 0;
    }

    player.grounded = landed;

    // walls (for wall-jumping)
    const mid = player.y + PLAYER_COLLIDER_Y * scale;
    const leftWall = overlapsSolid({
      x0: player.x - PLAYER_HALF_W - 0.06, x1: player.x - PLAYER_HALF_W,
      y0: mid - 0.35, y1: mid + 0.35
    });
    const rightWall = overlapsSolid({
      x0: player.x + PLAYER_HALF_W, x1: player.x + PLAYER_HALF_W + 0.06,
      y0: mid - 0.35, y1: mid + 0.35
    });
    player.wallDir = leftWall ? -1 : rightWall ? 1 : 0;

    // keep the impact velocity until updatePlayer has checked it — resetting it
    // here made the fall-damage check below impossible to ever trigger
    if (!player.grounded) player.fallSpeed = Math.min(player.fallSpeed, player.vy);
  }

  /* ------------------------------------------------------------------ */
  /*  Player update                                                     */
  /* ------------------------------------------------------------------ */
  function updatePlayer(dt) {
    if (!player || player.dead) return;
    const p = player;

    if (p.spawnGrace > 0) p.spawnGrace = Math.max(0, p.spawnGrace - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.punchCooldown = Math.max(0, p.punchCooldown - dt);
    p.shootCooldown = Math.max(0, p.shootCooldown - dt);
    p.muzzle = Math.max(0, p.muzzle - dt);
    p.hitFlash = Math.max(0, p.hitFlash - dt);
    p.sliding = Math.max(0, p.sliding - dt);
    p.recoil = Math.max(0, p.recoil - dt);

    // ---- crouch / slide ----
    if (input.crouch && !p.crouching && !p.gunOut && p.stamina >= CROUCH_COST && p.grounded) {
      p.crouching = true;
      p.stamina -= CROUCH_COST;
      p.staminaDelay = 0.7;
    } else if (!input.crouch && p.crouching) {
      // only stand back up when the full-height collider actually fits
      const standing = aabb(p.x, p.y, 1);
      if (!overlapsSolid(standing)) p.crouching = false;
    }

    if (input.crouch && p.gunOut && p.grounded && p.stamina >= SLIDE_COST && p.sliding <= 0) {
      p.sliding = 0.5;
      p.stamina -= SLIDE_COST;
      p.staminaDelay = 0.7;
      playSfx('FootSteps', 0.5, 1.35);
    }

    // ---- gun toggle ----
    if (input.gunToggle) {
      input.gunToggle = false;
      if (p.grounded && !p.crouching) {
        p.gunOut = !p.gunOut;
        playSfx('BoneBreakSound', 0.28, 1.9);
      }
    }

    // ---- movement ----
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let speed = MOVE_SPEED;
    if (p.gunOut) speed -= GUN_SPEED_CHANGE;
    if (p.crouching) speed -= CROUCH_SPEED_CHANGE;
    if (p.sliding > 0) speed += 2;

    if (dir !== 0) p.facing = dir;
    p.vx = dir * speed;

    // ---- jump ----
    if (input.jumpPressed) {
      input.jumpPressed = false;
      if (p.stamina >= 1 && (p.grounded || p.wallDir !== 0)) {
        let force = p.grounded ? JUMP_FORCE : WALL_JUMP_FORCE;
        if (p.gunOut) force -= GUN_SPEED_CHANGE;
        if (p.crouching) force -= CROUCH_JUMP_CHANGE;
        p.vy = force;
        p.grounded = false;
        p.stamina -= 1;
        p.staminaDelay = 0.7;
        playSfx('JumpSound', 0.5);
        dust(p.x, p.y - 1.0, 6);
      }
    }

    // ---- gravity ----
    p.vy += GRAVITY * dt;
    if (p.vy < -40) p.vy = -40;

    // ---- slow motion ----
    if (input.slow && p.slow >= SLOW_COST && state.timeScale === 1) {
      p.slow -= SLOW_COST;
      p.slowDelay = 8;
      state.timeScale = 0.5;
    } else if (!input.slow && state.timeScale !== 1) {
      state.timeScale = 1;
    }

    // ---- move & collide ----
    movePlayer(dt);

    // ---- grapple constraint (after motion, like a DistanceJoint2D) ----
    updateGrapple(dt);

    // ---- landing damage ----
    if (p.grounded && p.fallSpeed <= FALL_DAMAGE_VELOCITY) {
      damagePlayer(1, 'You hit the ground too hard.');
    }
    if (p.grounded) p.fallSpeed = 0;

    // ---- traps ----
    const box = aabb(p.x, p.y, p.crouching ? CROUCH_SCALE : 1);
    if (overlapsTrap(box)) {
      damagePlayer(1, 'You fell into the lava.');
      p.vy = 9;
      p.y += 0.4;
    }

    if (p.y < DEATH_Y) die('You fell out of the cave.');

    // ---- shooting ----
    if (input.mousePressed && p.gunOut && p.grounded && p.ammo >= 1 && p.shootCooldown <= 0) {
      shoot();
    }

    // ---- punch ----
    if (input.mousePressed && !p.gunOut && p.punchCooldown <= 0) {
      punch();
    }

    // ---- grapple start ----
    if (input.mousePressed && !p.gunOut) {
      startGrapple();
    }
    if (!input.mouseDown && p.grapple) p.grapple = null;

    input.mousePressed = false;

    // ---- walking dust / footsteps ----
    if (p.grounded && dir !== 0) {
      p.dustTimer -= dt;
      if (p.dustTimer <= 0) {
        p.dustTimer = 0.3;
        playSfx('FootSteps', 0.22, rnd(0.94, 1.06));
        dust(p.x - p.facing * 0.25, p.y - 1.02, 2);
      }
      p.walkPhase += dt * (p.sliding > 0 ? 18 : 11);
    } else {
      p.walkPhase += dt * 2;
    }

    // ---- stamina regen ----
    p.staminaDelay = Math.max(0, p.staminaDelay - dt);
    if (p.staminaDelay <= 0 && p.stamina < 100) {
      p.stamina = Math.min(100, p.stamina + 14 * dt);
    }

    // ---- slow regen ----
    p.slowDelay = Math.max(0, p.slowDelay - dt);
    if (p.slowDelay <= 0 && p.slow < SLOW_MAX) {
      p.slow = Math.min(SLOW_MAX, p.slow + 1.2 * dt);
    }

    // ---- reload ----
    if (input.reload) {
      input.reload = false;
      if (p.gunOut && p.ammo < AMMO_MAX) {
        p.reloading = true;
        p.reloadTimer = 0.35;
      }
    }
    if (p.reloading) {
      p.reloadTimer -= dt;
      if (p.reloadTimer <= 0) {
        p.ammo = Math.min(AMMO_MAX, p.ammo + 1);
        p.reloadTimer = 0.5;
        playSfx('BoneBreakSound', 0.16, 1.5);
        if (p.ammo >= AMMO_MAX) p.reloading = false;
      }
    }

    // ---- pickups ----
    collectPickups(p);

    if (p.health <= 0) die();

    updateHud();
  }

  function updateGrapple(dt) {
    const p = player;
    if (!p.grapple) { p.grappleHops = 0; return; }
    const g = p.grapple;
    const dx = p.x - g.ax;
    const dy = p.y - g.ay;
    const dist = Math.hypot(dx, dy) || 0.0001;
    if (dist > g.len) {
      const nx = dx / dist, ny = dy / dist;
      p.x = g.ax + nx * g.len;
      p.y = g.ay + ny * g.len;
      const radial = p.vx * nx + p.vy * ny;
      if (radial > 0) {
        p.vx -= radial * nx;
        p.vy -= radial * ny;
      }
    }
    if (input.slow && p.grappleHops < 1) {
      p.vy = GRAPPLE_HOP;
      p.grappleHops++;
      p.grapple.len = Math.max(1.2, p.grapple.len - 0.6);
      playSfx('JumpSound', 0.35, 1.25);
    }
  }

  function startGrapple() {
    const p = player;
    const m = screenToWorld(input.mouseX, input.mouseY);
    let dx = m.x - p.x;
    let dy = m.y - p.y;
    let dist = Math.hypot(dx, dy);
    if (dist < 0.6) return;

    const MAX_HOOK = 26;
    if (dist > MAX_HOOK) {
      dx *= MAX_HOOK / dist;
      dy *= MAX_HOOK / dist;
      dist = MAX_HOOK;
    }

    // The original DistanceJoint2D hooked any point in the air. Keep that,
    // but stop the anchor from being buried inside rock — otherwise the
    // joint hauls the player into a wall and the level can trap them.
    let free = 0;
    for (let d = 0.2; d <= dist; d += 0.18) {
      if (solidAt(p.x + (dx / dist) * d, p.y + (dy / dist) * d)) break;
      free = d;
    }
    if (free < dist) {
      if (free < 1.1) return;
      dist = free;
    }

    const ax = p.x + (dx / dist) * dist;
    const ay = p.y + (dy / dist) * dist;
    p.grapple = { ax, ay, len: Math.max(1.5, dist) };
    p.grappleHops = 0;
    playSfx('BoneBreakSound', 0.2, 2.0);
  }

  function shoot() {
    const p = player;
    p.ammo -= 1;
    p.shootCooldown = 0.18;
    p.muzzle = 0.07;
    p.x -= p.facing * 0.18;
    const muzzle = gunMuzzleWorld();
    const aim = Math.atan2(
      screenToWorld(input.mouseX, input.mouseY).y - muzzle.y,
      screenToWorld(input.mouseX, input.mouseY).x - muzzle.x
    );
    // if the barrel is inside geometry, spawn the round a little closer
    if (solidAt(muzzle.x, muzzle.y)) {
      muzzle.x = p.x + Math.cos(aim) * 0.5;
      muzzle.y = p.y + 0.12 + Math.sin(aim) * 0.5;
    }
    bullets.push({
      x: muzzle.x, y: muzzle.y,
      vx: Math.cos(aim) * BULLET_SPEED,
      vy: Math.sin(aim) * BULLET_SPEED,
      life: 2.2,
      trail: []
    });
    playSfx('GunShot', 0.55, rnd(0.95, 1.05));
    state.shake = Math.max(state.shake, 0.35);
    for (let i = 0; i < 5; i++) {
      particles.push({
        x: muzzle.x, y: muzzle.y,
        vx: Math.cos(aim) * rnd(1, 4) + rnd(-1, 1),
        vy: Math.sin(aim) * rnd(1, 4) + rnd(-1, 1),
        life: 0.18, max: 0.18, size: rnd(1, 2.5), color: '#ffd166', gravity: 0
      });
    }
  }

  function punch() {
    const p = player;
    p.punchCooldown = PUNCH_COOLDOWN;
    p.punchTimer = 0.14;
    const px = p.x + p.facing * 0.5;
    const py = p.y + 0.15;
    let hit = false;
    for (const e of enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - px, e.y - py + 0.4) < PUNCH_RANGE + 0.5) {
        damageEnemy(e, PUNCH_DAMAGE);
        hit = true;
      }
    }
    if (hit) playSfx('BoneBreakSound', 0.45, 1.05);
  }

  function damagePlayer(amount) {
    const p = player;
    if (p.invuln > 0 || p.dead) return;
    p.health -= amount;
    p.invuln = 0.45;
    p.hitFlash = 0.3;
    state.flash = 0.55;
    state.shake = Math.max(state.shake, 0.5);
    playSfx('BoneBreakSound', 0.6, rnd(0.95, 1.1));
    updateHud();
  }

  function damageEnemy(e, amount, dirX = 0) {
    e.health -= amount;
    e.hitFlash = 0.12;
    burst(e.x + rnd(-0.2, 0.2), e.y - 0.35, 7, ['#ff6b6b', '#ffd166', '#ffffff'], 3.4, 0.45);
    playSfx('BoneBreakSound', 0.4, rnd(0.95, 1.15));
    if (dirX) e.x += dirX * 0.12;
    if (e.health <= 0) killEnemy(e);
    else if (e.health <= 20) e.crouch = 1;
  }

  function killEnemy(e) {
    if (!e.alive) return;
    e.alive = false;
    state.stats.kills++;
    playSfx('DeathExplosion', 0.55);
    burst(e.x, e.y - 0.4, 20, ['#ffffff', '#ff6b6b', '#c9c9c9'], 6, 0.7);
    state.shake = Math.max(state.shake, 0.4);
  }

  /* ------------------------------------------------------------------ */
  /*  Entities                                                          */
  /* ------------------------------------------------------------------ */
  function updateEnemies(dt) {
    const p = player;
    const view = viewSize();
    // A short quiet beat at the top of a run: the spawn sits inside the
    // village where three gunners already have line of sight.
    const waking = state.stats.time < 4;
    for (const e of enemies) {
      if (!e.alive) continue;
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      e.bob += dt * 2;
      const dx = p.x - e.x;
      const dy = (p.y - 0.2) - (e.y - 0.5);
      const dist = Math.hypot(dx, dy);
      e.facing = dx >= 0 ? 1 : -1;
      // Only engage from inside the camera frame. The original EnemyWeapon
      // fired on a blind 2 s timer; firing from off-screen reads as a bug.
      const visible = Math.abs(e.x - state.cam.x) < view.w / 2 + 2
        && Math.abs(e.y - state.cam.y) < view.h / 2 + 2;
      const inRange = visible && !waking && dist < ENEMY_RANGE && Math.abs(dy) < 9;
      if (inRange) {
        e.angle = Math.atan2(dy, dx) * 180 / Math.PI;
        e.shootTimer -= dt;
        if (e.shootTimer <= 0 && !p.dead) {
          if (lineOfSight(e.x, e.y - 0.45, p.x, p.y - 0.2)) {
            e.shootTimer = ENEMY_SHOOT_INTERVAL + rnd(-0.15, 0.15);
            const mx = e.x + Math.cos(rad(e.angle)) * 0.95;
            const my = e.y - 0.45 + Math.sin(rad(e.angle)) * 0.95;
            enemyBullets.push({ x: mx, y: my, vx: Math.cos(rad(e.angle)) * ENEMY_BULLET_SPEED, vy: Math.sin(rad(e.angle)) * ENEMY_BULLET_SPEED, life: 3 });
            playSfx('GunShot', 0.18, rnd(1.15, 1.3));
            burst(mx, my, 3, ['#ffd166'], 2.6, 0.15);
          } else {
            e.shootTimer = 0.25;   // keep trying — fire the moment there is a clear shot
          }
        }
      } else {
        e.angle = e.facing > 0 ? 0 : 180;
        e.shootTimer = Math.max(e.shootTimer, 0.4);
      }
    }
  }

  function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 4) b.trail.shift();

      let dead = b.life <= 0;
      if (solidAt(b.x, b.y)) {
        dead = true;
        burst(b.x, b.y, 5, ['#ffd166', '#ffffff'], 2.5, 0.3);
      }
      if (!dead) {
        for (const e of enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.x - b.x, (e.y - 0.4) - b.y) < 0.62) {
            damageEnemy(e, BULLET_DAMAGE, Math.sign(b.vx));
            dead = true;
            break;
          }
        }
      }
      if (dead) bullets.splice(i, 1);
    }

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      let dead = b.life <= 0;
      if (solidAt(b.x, b.y)) {
        dead = true;
        burst(b.x, b.y, 4, ['#ff9f43', '#ffffff'], 2.2, 0.25);
      }
      if (!dead && player && !player.dead) {
        const box = aabb(player.x, player.y, player.crouching ? CROUCH_SCALE : 1);
        if (b.x > box.x0 && b.x < box.x1 && b.y > box.y0 && b.y < box.y1) {
          damagePlayer(1);
          player.vx = Math.sign(b.vx) * ENEMY_KNOCKBACK;
          dead = true;
        }
      }
      if (dead) enemyBullets.splice(i, 1);
    }
  }

  function updatePickups(dt) {
    const p = player;
    for (const item of pickups) {
      if (item.taken) continue;
      item.phase += dt * 2.6;
      const d = Math.hypot(item.x - p.x, item.y - (p.y - 0.2));
      if (d < 1.0) {
        item.taken = true;
        if (item.type === 'diamond') {
          state.stats.diamonds++;
          playSfx('BoneBreakSound', 0.35, 1.7);
          burst(item.x, item.y, 8, ['#7ef9ff', '#ffffff'], 3, 0.5);
          floaters.push({ x: item.x, y: item.y + 0.6, text: '+1', life: 0.8, color: '#7ef9ff' });
          if (state.stats.diamonds >= TOTAL_DIAMONDS) win();
        } else if (item.type === 'heart') {
          p.health = Math.min(MAX_HEALTH, p.health + 1);
          playSfx('BoneBreakSound', 0.4, 1.35);
          burst(item.x, item.y, 7, ['#ff6b6b', '#ffd166'], 3, 0.5);
          floaters.push({ x: item.x, y: item.y + 0.6, text: '+1 HP', life: 0.8, color: '#ff8b8b' });
        } else {
          p.slow = Math.min(SLOW_MAX, p.slow + 25);
          playSfx('BoneBreakSound', 0.35, 1.55);
          burst(item.x, item.y, 8, ['#b98cff', '#ffffff'], 3, 0.5);
          floaters.push({ x: item.x, y: item.y + 0.6, text: '+25 SLOW', life: 0.8, color: '#c9a6ff' });
        }
        updateHud();
      }
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const q = particles[i];
      q.life -= dt;
      if (q.life <= 0) { particles.splice(i, 1); continue; }
      q.vy += (q.gravity || 0) * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
    }
    for (let i = floaters.length - 1; i >= 0; i--) {
      floaters[i].life -= dt;
      floaters[i].y += dt * 0.7;
      if (floaters[i].life <= 0) floaters.splice(i, 1);
    }
  }

  function collectPickups(p) { /* handled in updatePickups */ }

  function dust(x, y, count = 4) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x: x + rnd(-0.25, 0.25), y: y + rnd(-0.08, 0.08),
        vx: rnd(-1.1, 1.1), vy: rnd(0.2, 1.4),
        life: rnd(0.25, 0.5), max: 0.5, size: rnd(1.2, 3), color: 'rgba(220,220,220,0.75)', gravity: -1.5
      });
    }
  }

  function burst(x, y, count, colors, speed, life) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rnd(speed * 0.3, speed);
      particles.push({
        x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s + 1,
        life: rnd(life * 0.5, life), max: life, size: rnd(1.2, 3.2),
        color: colors[(Math.random() * colors.length) | 0], gravity: -14
      });
    }
  }

  function updateCamera(dt) {
    const p = player;
    const targetX = p.x + p.facing * 0.45;
    const targetY = p.y + 0.35;
    const k = 1 - Math.exp(-6.5 * dt);
    state.cam.x = lerp(state.cam.x, targetX, k);
    state.cam.y = lerp(state.cam.y, targetY, k);

    const view = viewSize();
    const halfW = view.w / 2;
    const halfH = view.h / 2;
    const minX = bounds.minX + halfW;
    const maxX = bounds.maxX - halfW;
    const minY = bounds.minY + halfH;
    const maxY = bounds.maxY - halfH;
    state.cam.x = clampToArena(state.cam.x, minX, maxX, (bounds.minX + bounds.maxX) / 2);
    state.cam.y = clampToArena(state.cam.y, minY, maxY, (bounds.minY + bounds.maxY) / 2);

    state.shake = Math.max(0, state.shake - dt * 3.2);
    state.flash = Math.max(0, state.flash - dt * 2.4);
  }

  /* ------------------------------------------------------------------ */
  /*  Simulation step                                                   */
  /* ------------------------------------------------------------------ */
  function step(dt) {
    state.elapsed += dt;
    state.stats.time += dt;
    updatePlayer(dt);
    updateEnemies(dt);
    updateBullets(dt);
    updatePickups(dt);
    updateParticles(dt);
    updateCamera(dt);
  }

  /* ------------------------------------------------------------------ */
  /*  Rendering                                                         */
  /* ------------------------------------------------------------------ */
  function resize() {
    const cap = state.quality === 'low' ? 1 : state.quality === 'high' ? 2 : 1.5;
    const dpr = Math.min(window.devicePixelRatio || 1, cap);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    state.dpr = dpr;
    state.pxPerUnit = canvas.height / VIEW_HEIGHT;
    ctx.imageSmoothingEnabled = state.quality !== 'low';
    ctx.imageSmoothingQuality = 'high';
    if (window.StickmanAtlas && window.StickmanAtlas.isOpen) window.StickmanAtlas.resize();
  }

  function worldToScreen(x, y) {
    return {
      x: (x - state.cam.x) * state.pxPerUnit + canvas.width / 2,
      y: canvas.height / 2 - (y - state.cam.y) * state.pxPerUnit
    };
  }

  function screenToWorld(sx, sy) {
    const dpr = state.dpr || 1;
    return {
      x: (sx * dpr - canvas.width / 2) / state.pxPerUnit + state.cam.x,
      y: (canvas.height / 2 - sy * dpr) / state.pxPerUnit + state.cam.y
    };
  }

  function viewSize() {
    return {
      w: canvas.width / state.pxPerUnit,
      h: canvas.height / state.pxPerUnit
    };
  }

  function drawSprite(name, x, y, rot = 0, sx = 1, sy = 1, flipX = false, flipY = false, alpha = 1, mirrorX = false) {
    const lv = state.level;
    const sp = lv.sprites[name];
    if (!sp) return;
    const img = state.images.get(sp.tex);
    if (!img) return;

    const PX = state.pxPerUnit;
    const w = (sp.rect[2] / sp.ppu) * Math.abs(sx) * PX;
    const h = (sp.rect[3] / sp.ppu) * Math.abs(sy) * PX;
    if (w < 0.4 || h < 0.4) return;

    const s = worldToScreen(x, y);
    const margin = Math.max(w, h) * 0.75 + 40;
    if (s.x < -margin || s.x > canvas.width + margin || s.y < -margin || s.y > canvas.height + margin) return;

    const rx = sp.rect[0];
    const ry = img.height - (sp.rect[1] + sp.rect[3]);
    const rw = sp.rect[2];
    const rh = sp.rect[3];
    if (rw <= 0 || rh <= 0) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(s.x, s.y);
    ctx.rotate(-rad(rot));
    const fx = (sx < 0 ? -1 : 1) * (flipX ? -1 : 1) * (mirrorX ? -1 : 1);
    const fy = (sy < 0 ? -1 : 1) * (flipY ? -1 : 1);
    if (fx !== 1 || fy !== 1) ctx.scale(fx, fy);
    ctx.drawImage(img, rx, ry, rw, rh, -sp.pivot[0] * w, -(1 - sp.pivot[1]) * h, w, h);
    ctx.restore();
  }

  function render() {
    if (!state.level) return;
    const W = canvas.width, H = canvas.height;

    // background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#131a28');
    grad.addColorStop(0.45, '#0c1018');
    grad.addColorStop(1, '#080a0f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    if (state.shake > 0.001) {
      const m = state.shake * 8;
      ctx.translate(rnd(-m, m), rnd(-m, m));
    }

    drawWorld();
    drawEntities();
    drawEffects();

    ctx.restore();

    // damage flash
    if (state.flash > 0.001) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.55, state.flash * 0.6);
      ctx.fillStyle = '#ff2d2d';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // vignette
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    if (state.mode === 'playing' || state.mode === 'paused') drawReticle();
  }

  function drawReticle() {
    const dpr = state.dpr || 1;
    const x = input.mouseX * dpr;
    const y = input.mouseY * dpr;
    if (x < 0 || y < 0 || x > canvas.width || y > canvas.height) return;
    const r = Math.max(5, state.pxPerUnit * 0.09);
    ctx.save();
    ctx.strokeStyle = 'rgba(232, 244, 250, 0.85)';
    ctx.lineWidth = Math.max(1, state.pxPerUnit * 0.018);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(196, 255, 61, 0.95)';
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1.2, r * 0.22), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232, 244, 250, 0.5)';
    ctx.beginPath();
    ctx.moveTo(x - r * 1.8, y); ctx.lineTo(x - r * 1.15, y);
    ctx.moveTo(x + r * 1.15, y); ctx.lineTo(x + r * 1.8, y);
    ctx.moveTo(x, y - r * 1.8); ctx.lineTo(x, y - r * 1.15);
    ctx.moveTo(x, y + r * 1.15); ctx.lineTo(x, y + r * 1.8);
    ctx.stroke();
    ctx.restore();
  }

  function drawWorld() {
    const lv = state.level;
    // NB: use the rendered view size (canvas pixels / pxPerUnit). Using
    // clientWidth here made culling dpr-dependent, which popped tiles and
    // props in and out of existence at the screen edges on retina displays.
    const view = viewSize();
    const camL = state.cam.x - view.w / 2 - 2;
    const camR = state.cam.x + view.w / 2 + 2;
    const camB = state.cam.y - view.h / 2 - 2;
    const camT = state.cam.y + view.h / 2 + 2;

    const tilemaps = lv.tilemaps;
    for (const tm of tilemaps) {
      // quick reject
      if (tm.x > camR + 2 || tm.x + 130 < camL) continue;
      for (const c of tm.cells) {
        const x = tm.x + c.x + 0.5;
        const y = tm.y + c.y + 0.5;
        if (x < camL || x > camR || y < camB || y > camT) continue;
        drawSprite(c.s, x, y);
      }
    }

    for (const p of lv.props) {
      if (p.x < camL || p.x > camR || p.y < camB || p.y > camT) continue;
      drawSprite(p.sprite, p.x, p.y, p.rot, p.sx, p.sy, p.flipX, p.flipY, p.color ? p.color[3] : 1);
    }
  }

  function drawEntities() {
    const p = player;

    // pickups
    for (const item of pickups) {
      if (item.taken) continue;
      const bob = Math.sin(item.phase) * 0.12;
      const alpha = 0.92;
      if (item.type === 'diamond') {
        drawSprite('icons8-diamond-64', item.x, item.y + bob, 0, 0.6, 0.6, false, false, alpha);
      } else if (item.type === 'heart') {
        drawSprite('GameHeart', item.x, item.y + bob, Math.sin(item.phase * 0.6) * 6, 0.9, 0.9, false, false, alpha);
      } else {
        drawSprite('icons8-slow-motion-64', item.x, item.y + bob, 0, 0.65, 0.65, false, false, alpha);
      }
    }

    // enemies
    for (const e of enemies) {
      if (!e.alive) continue;
      if (Math.abs(e.x - state.cam.x) > 26) continue;
      drawRig(e.x, e.y, {
        facing: e.facing,
        aim: e.angle,
        walk: 0,
        squash: e.crouch ? 0.72 : 1,
        gun: true,
        sword: false,
        flash: e.hitFlash > 0,
        bob: Math.sin(e.bob) * 0.01
      });
    }

    // grapple rope
    if (p && p.grapple && !p.dead) {
      const a = worldToScreen(p.x, p.y - 0.15);
      const b = worldToScreen(p.grapple.ax, p.grapple.ay);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(1.2, state.pxPerUnit * 0.035);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(b.x, b.y, Math.max(2.5, state.pxPerUnit * 0.07), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(196,255,61,0.9)';
      ctx.fill();
      ctx.restore();
    }

    // player
    if (p && !p.dead) {
      const crouch = p.crouching ? CROUCH_SCALE : 1;
      const moving = p.grounded && Math.abs(p.vx) > 0.2;
      drawRig(p.x, p.y, {
        facing: p.facing,
        aim: null,
        walk: moving ? p.walkPhase : 0,
        squash: crouch,
        gun: p.gunOut,
        sword: true,
        muzzle: p.muzzle > 0,
        punch: p.punchTimer > 0,
        jump: !p.grounded,
        vy: p.vy,
        bob: moving ? Math.abs(Math.sin(p.walkPhase)) * 0.025 : Math.sin(state.elapsed * 2) * 0.012,
        flash: p.hitFlash > 0,
        crouching: p.crouching,
        sliding: p.sliding > 0
      });
    }

    // bullets
    for (const b of bullets) {
      const s = worldToScreen(b.x, b.y);
      ctx.save();
      ctx.fillStyle = '#ffe08a';
      ctx.shadowColor = '#ffd166';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(1.6, state.pxPerUnit * 0.045), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const b of enemyBullets) {
      const s = worldToScreen(b.x, b.y);
      ctx.save();
      ctx.fillStyle = '#ff8b5e';
      ctx.shadowColor = '#ff5a2d';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(1.4, state.pxPerUnit * 0.038), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawEffects() {
    for (const q of particles) {
      const s = worldToScreen(q.x, q.y);
      const a = Math.max(0, q.life / q.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = q.color;
      const size = Math.max(1, q.size * (state.pxPerUnit / 60));
      ctx.fillRect(s.x - size / 2, s.y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;

    ctx.font = `700 ${Math.round(state.pxPerUnit * 0.22)}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    for (const f of floaters) {
      const s = worldToScreen(f.x, f.y);
      ctx.globalAlpha = Math.min(1, f.life / 0.45);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, s.x, s.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  function gunMuzzleWorld() {
    const p = player;
    const angle = p.gunOut
      ? Math.atan2(screenToWorld(input.mouseX, input.mouseY).y - (p.y + 0.1), screenToWorld(input.mouseX, input.mouseY).x - p.x)
      : 0;
    const dir = p.gunOut ? angle : (p.facing > 0 ? 0 : Math.PI);
    return {
      x: p.x + Math.cos(dir) * 0.9,
      y: p.y + 0.12 + Math.sin(dir) * 0.9
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Character rig                                                     */
  /* ------------------------------------------------------------------ */
  const RIG = {
    body: { sprite: 'ProtoBody', x: 0, y: 0.209, rot: 0 },
    head: { sprite: 'ProtoHead', x: 0, y: -0.034, rot: 0 },
    arms: { x: 0, y: -0.257 },
    upperArmL: { sprite: 'ProtoUpperArm', x: -0.001, y: 0.111, rot: -168.2 },
    lowerArmL: { sprite: 'ProtoLowerArm', x: 0.25, y: 0, rot: 4.8 },
    upperArmR: { sprite: 'ProtoUpperArm', x: -0.001, y: 0.111, rot: -14 },
    lowerArmR: { sprite: 'ProtoLowerArm', x: 0.25, y: 0, rot: 10.7 },
    gunHolder: { x: 0.03, y: 0.03, rot: 8 },
    // nudged onto the hand line — the serialized 0.70 / 0.13 offsets drew the
    // pistol floating above the wrist once the arm was rotated to aim
    gun: { sprite: 'deagle', x: 0.64, y: 0.035, rot: 0, scale: 0.115 },
    upperLegL: { sprite: 'ProtoUpperLeg', x: -0.045, y: -0.268, rot: -7.4 },
    lowerLegL: { sprite: 'ProtoLowerLeg', x: -0.023, y: -0.345, rot: 3 },
    upperLegR: { sprite: 'ProtoUpperLeg', x: 0.019, y: -0.273, rot: 16 },
    lowerLegR: { sprite: 'ProtoLowerLeg', x: -0.023, y: -0.345, rot: -13.5 },
    sword: { sprite: 'TX Village Props Sword', x: -0.23, y: -0.22, rot: -103.3 }
  };

  function drawRig(px, py, opts) {
    const m = opts.facing < 0 ? -1 : 1;
    const squash = opts.squash || 1;
    const walk = opts.walk || 0;
    const swing = Math.sin(walk) * 38;

    // body origin sits at the player's transform origin
    const body = {
      x: px + m * RIG.body.x,
      y: py + RIG.body.y * squash + (opts.bob || 0),
      rot: 0,
      sx: 1,
      sy: squash
    };

    // sword rides on the back, behind everything
    if (opts.sword) {
      const sword = child(body, RIG.sword, m);
      drawSprite(RIG.sword.sprite, sword.x, sword.y, sword.rot, 1, squash, false, false, 0.95, m < 0);
    }

    const head = child(body, RIG.head, m);
    drawSprite(RIG.head.sprite, head.x, head.y, head.rot, 1, squash * (opts.crouching ? 0.95 : 1), false, false, 1, m < 0);

    // legs first (behind body)
    const legs = [
      { up: RIG.upperLegL, lo: RIG.lowerLegL, phase: swing },
      { up: RIG.upperLegR, lo: RIG.lowerLegR, phase: -swing }
    ];
    legs.forEach((leg, idx) => {
      let upRot = leg.up.rot + leg.phase * (opts.jump ? 0.45 : 1);
      let loRot = leg.lo.rot + (opts.jump ? 24 : Math.max(0, -leg.phase) * 0.55);
      if (opts.crouching) { upRot += 26; loRot -= 12; }
      if (opts.sliding) { upRot = -55; loRot = 35; }
      const up = child(body, { x: leg.up.x, y: leg.up.y, rot: upRot }, m);
      drawSprite(leg.up.sprite, up.x, up.y, up.rot, 1, squash, false, false, 1, m < 0);
      const lo = child(up, { x: leg.lo.x, y: leg.lo.y, rot: loRot }, m);
      drawSprite(leg.lo.sprite, lo.x, lo.y, lo.rot, 1, squash, false, false, 1, m < 0);
    });

    // body
    drawSprite(RIG.body.sprite, body.x, body.y, body.rot, 1, squash, false, false, 1, m < 0);

    // arms
    const arms = child(body, RIG.arms, m);

    let leftUpRot = -100 + swing * 0.55;
    let leftLoRot = -10;
    if (opts.jump) { leftUpRot -= 28; leftLoRot -= 18; }
    if (opts.sliding) { leftUpRot = -60; leftLoRot = -30; }
    if (opts.crouching) { leftUpRot = -78; leftLoRot = -32; }

    const armL = child(arms, { x: RIG.upperArmL.x, y: RIG.upperArmL.y, rot: leftUpRot }, m);
    drawSprite(RIG.upperArmL.sprite, armL.x, armL.y, armL.rot, 1, squash, false, false, 1, m < 0);
    const foreL = child(armL, { x: RIG.lowerArmL.x, y: RIG.lowerArmL.y, rot: leftLoRot }, m);
    drawSprite(RIG.lowerArmL.sprite, foreL.x, foreL.y, foreL.rot, 1, squash, false, false, 1, m < 0);

    // right arm: aims when the gun is out, swings otherwise
    let rightUpRot = -80 - swing * 0.55;
    let rightLoRot = -8;
    let aimAngle = null;

    if (opts.aim !== null && opts.aim !== undefined) {
      const worldAim = opts.aim;
      aimAngle = m > 0 ? worldAim : 180 - worldAim;
      rightUpRot = aimAngle;
      rightLoRot = 0;
    } else if (opts.gun && player && player.gunOut) {
      const w = screenToWorld(input.mouseX, input.mouseY);
      const worldAim = Math.atan2(w.y - (py + 0.1), w.x - px) * 180 / Math.PI;
      aimAngle = m > 0 ? worldAim : 180 - worldAim;
      rightUpRot = aimAngle;
      rightLoRot = 0;
    } else if (opts.punch) {
      rightUpRot = 0;
      rightLoRot = 0;
    } else if (opts.jump) {
      rightUpRot += 28;
      rightLoRot += 14;
    } else if (opts.sliding) {
      rightUpRot = 30;
      rightLoRot = -10;
    } else if (opts.crouching) {
      rightUpRot = -55;
      rightLoRot = -25;
    }

    const armR = child(arms, { x: RIG.upperArmR.x, y: RIG.upperArmR.y, rot: rightUpRot }, m);
    drawSprite(RIG.upperArmR.sprite, armR.x, armR.y, armR.rot, 1, squash, false, false, 1, m < 0);
    const foreR = child(armR, { x: RIG.lowerArmR.x, y: RIG.lowerArmR.y, rot: rightLoRot }, m);
    drawSprite(RIG.lowerArmR.sprite, foreR.x, foreR.y, foreR.rot, 1, squash, false, false, 1, m < 0);

    // gun
    if (opts.gun) {
      const holder = child(foreR, { x: RIG.gunHolder.x, y: RIG.gunHolder.y, rot: RIG.gunHolder.rot }, m);
      const gun = child(holder, { x: RIG.gun.x, y: RIG.gun.y, rot: RIG.gun.rot }, m);
      drawSprite(RIG.gun.sprite, gun.x, gun.y, gun.rot, RIG.gun.scale, RIG.gun.scale, false, false, 1, m < 0);
      if (opts.muzzle) {
        const s = worldToScreen(
          gun.x + Math.cos(rad(gun.rot)) * 0.5 * m,
          gun.y + Math.sin(rad(gun.rot)) * 0.5
        );
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#fff3c4';
        ctx.beginPath();
        ctx.arc(s.x, s.y, state.pxPerUnit * 0.11, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    if (opts.flash) {
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#ff3b3b';
      const s = worldToScreen(body.x, body.y - 0.2);
      ctx.beginPath();
      ctx.arc(s.x, s.y, state.pxPerUnit * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function child(parentXf, local, m) {
    const r = rad(parentXf.rot);
    const cos = Math.cos(r), sin = Math.sin(r);
    const lx = local.x * m * parentXf.sx;
    const ly = local.y * parentXf.sy;
    return {
      x: parentXf.x + cos * lx - sin * ly,
      y: parentXf.y + sin * lx + cos * ly,
      rot: parentXf.rot + (local.rot || 0) * m,
      sx: parentXf.sx,
      sy: parentXf.sy
    };
  }

  /* ------------------------------------------------------------------ */
  /*  HUD                                                               */
  /* ------------------------------------------------------------------ */
  let lastHud = '';
  function updateHud() {
    if (!player) return;
    const p = player;
    const sig = [p.health, Math.round(p.stamina), Math.round(p.slow), p.ammo, state.stats.diamonds, p.gunOut].join('|');
    if (sig === lastHud) return;
    lastHud = sig;

    const hp = clamp(p.health / MAX_HEALTH, 0, 1);
    ui.healthFill.style.width = (hp * 100) + '%';
    ui.healthFill.className = hp <= 0.33 ? 'low' : hp <= 0.66 ? 'mid' : '';
    ui.healthVal.textContent = p.health;

    ui.staminaFill.style.width = clamp(p.stamina, 0, 100) + '%';
    ui.slowFill.style.width = clamp((p.slow / SLOW_MAX) * 100, 0, 100) + '%';

    if (ui.ammoPips.childElementCount !== AMMO_MAX) {
      ui.ammoPips.innerHTML = '';
      for (let i = 0; i < AMMO_MAX; i++) ui.ammoPips.appendChild(document.createElement('b'));
    }
    [...ui.ammoPips.children].forEach((el, i) => {
      el.classList.toggle('on', i < p.ammo);
    });

    ui.diamondCount.textContent = state.stats.diamonds;
  }

  let toastTimer = null;
  function showToast(text, ms = 1900) {
    ui.toast.textContent = text;
    ui.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove('show'), ms);
  }

  /* ------------------------------------------------------------------ */
  /*  Frame loop                                                        */
  /* ------------------------------------------------------------------ */
  let lastFrame = performance.now();

  function frame(now) {
    const raw = Math.min((now - lastFrame) / 1000, 0.06);
    lastFrame = now;

    if (state.mode === 'playing') {
      state.accumulator += raw * state.timeScale;
      let steps = 0;
      while (state.accumulator >= STEP && steps < 10) {
        step(STEP);
        state.accumulator -= STEP;
        steps++;
      }
      if (steps === 10) state.accumulator = 0;
    }

    // the menu / settings / atlas screens are opaque; skip the canvas work
    if (state.mode === 'playing' || state.mode === 'paused' || state.mode === 'dead' || state.mode === 'won') {
      render();
    }

    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------ */
  /*  Debug hook (used for automated play-testing)                       */
  /* ------------------------------------------------------------------ */
  window.__STICKMAN = {
    ready: false,
    get mode() { return state.mode; },
    get player() { return player; },
    get stats() { return state.stats; },
    get enemies() { return enemies; },
    get pickups() { return pickups; },
    get cam() { return state.cam; },
    get cameFrom() { return state.cameFrom; },
    get timeScale() { return state.timeScale; },
    get level() { return state.level; },
    get input() { return input; },
    get enemyBullets() { return enemyBullets; },
    get bullets() { return bullets; },
    nearTraps: () => solidRects.filter((r) => r.trap && Math.abs(r.x + 0.5 - player.x) < 4 && Math.abs(r.y + 0.5 - player.y) < 4)
      .map((r) => [r.x, r.y]),
    rects: () => solidRects.length,
    freeAt: (x, y, scale = 1) => !overlapsSolid(aabb(x, y, scale)),
    heal: () => { if (player) { player.health = MAX_HEALTH; player.invuln = 999; } },
    resume: () => { if (state.mode === 'paused') setMode('playing'); },
    godMode: (on = true) => { if (player) player.invuln = on ? 1e9 : 0; },
    start: () => { resetRun(); startGame(); },
    teleport: (x, y) => { if (player) { player.x = x; player.y = y; player.vx = 0; player.vy = 0; } },
    give: () => { if (player) { player.ammo = AMMO_MAX; player.health = MAX_HEALTH; player.slow = SLOW_MAX; player.stamina = 100; } },
    key: (code, down) => {
      const map = { KeyA: 'left', KeyD: 'right', Space: 'jump', ShiftLeft: 'crouch', KeyW: 'slow', KeyQ: 'gunToggle', KeyR: 'reload' };
      if (map[code]) input[map[code]] = down;
      if (code === 'Space' && down) input.jumpPressed = true;
    }
  };

  boot();
})();
