// Entry point: game state machine (title, select, cutscenes, map, zones, bonus, game over, ending).
import * as THREE from 'three';
import { Input } from './engine/input.js';
import { Audio } from './engine/audio.js';
import { HUD } from './game/hud.js';
import { World } from './game/world.js';
import { MUSIC, SFX, ALL_TRACKS } from './game/constants.js';
import { ORIG } from './game/levels_orig_data.js';
import { ACT2 } from './game/levels_act2.js';
import { ZONES, MAPS, CUTSCENES, CHARACTER_NAMES, ZONE_HINTS } from './game/story.js';
import { RANGERS, animateCharacter, makeNPC, makeItem, animateItem, mat, getHeroStyle, setHeroStyle } from './game/models.js';
import { THEMES, buildBackground, TEX } from './game/themes.js';

const LEVELS = { ...ORIG, ...ACT2 };
const SAVE_KEY = 'cnd3d_save_v1';
const CHARS = ['chip', 'dale', 'gadget', 'monty', 'zipper'];

class Game {
  constructor() {
    this.hud = new HUD(); this.input = new Input(); this.audio = new Audio();
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    document.getElementById('game').appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 300);
    this.resize(); addEventListener('resize', () => this.resize());
    this.state = 'loading'; this.stateT = 0; this.world = null; this.lastT = performance.now();
    this.progress = this.loadSave() || this.freshProgress();
    this.session = { act: 1, players: ['chip'], twoPlayer: false, current: null, cleared: {}, lives: 3 };
    this.menuSel = 0; this.decor = []; this.clock = 0;
    this._setupTouch();
    this.loop = this.loop.bind(this);
    this.load();
  }
  freshProgress() { return { act1Done: false, act2Done: false, unlockedAct2: false, lives: 3, flowers: 0, stars: 0, gears: 0, act: 1 }; }
  loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s && typeof s === 'object' ? { ...this.freshProgress(), ...s } : null; } catch (e) { return null; } }
  save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ act1Done: this.progress.act1Done, act2Done: this.progress.act2Done, unlockedAct2: this.progress.unlockedAct2 })); } catch (e) { } }
  resize() { const w = innerWidth, h = innerHeight; this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  _setupTouch() { for (const b of document.querySelectorAll('#touch button')) { const k = b.dataset.k; const down = (e) => { e.preventDefault(); if (!this.input.keys.has(k)) this.input.pressedThisFrame.add(k); this.input.keys.add(k); }; const up = (e) => { e.preventDefault(); this.input.keys.delete(k); }; b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up); } }

  async load() {
    const bar = document.getElementById('loadbar'), txt = document.getElementById('loadtext'); let n = 0;
    await Promise.all(ALL_TRACKS.map(async (t) => { await this.audio.loadTrack(t, `./assets/music/${t}.json`); n++; bar.style.width = (n / ALL_TRACKS.length * 100) + '%'; txt.textContent = t; }));
    txt.textContent = 'Нажмите любую клавишу'; bar.style.width = '100%';
    requestAnimationFrame(this.loop); this.ready = true;
    const start = () => { if (this.started) return; this.started = true; this.audio.init(); this.audio.resume(); document.getElementById('loading').style.display = 'none'; removeEventListener('keydown', start); removeEventListener('pointerdown', start); this._startFn = null; this.hud.setFade(0); this.gotoTitle(); };
    addEventListener('keydown', start); addEventListener('pointerdown', start);
    this._startFn = start; // the main loop calls it when a gamepad button is pressed
    this.input.onPadEvent = (kind, pad) => { const name = (pad.id || '').replace(/\(.*$/, '').trim() || 'геймпад'; this.toast(kind === 'connected' ? `Геймпад подключён: ${name}` : `Геймпад отключён: ${name}`, 2600); };
    txt.textContent = 'Нажмите любую клавишу или кнопку геймпада';
  }

  // ------------------------------------------------------------ scene helpers
  clearScene() {
    this.hud.msg.style.top = '42%';
    if (this.world) { this.world.dispose(); this.world = null; }
    for (const d of this.decor) this.scene.remove(d); this.decor = [];
    while (this.scene.children.length) this.scene.remove(this.scene.children[0]);
    this.scene.fog = null; this.hud.setBoss(null); this.hud.hideDialog(); this.hud.hideMenu(); this.hud.showMessage(''); this.hud.setHelp(''); this.hud.clearPlayers(); this.hud.setZone('');
  }
  stage(themeKey, width = 40) {
    // a small 3D "stage" for menus and cutscenes: themed background + floor + lights
    const theme = THEMES[themeKey] || THEMES.hq; const fake = { width, height: 12, groundY: 0 };
    const bg = buildBackground(theme, fake); bg.position.x = -width / 2; this.scene.add(bg); this.decor.push(bg);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(width + 20, 1, 8), new THREE.MeshStandardMaterial({ map: TEX[theme.solid[0]](...theme.solid.slice(1)), roughness: 0.9 })); floor.position.set(0, -0.48, 0); floor.receiveShadow = true; /* 2 cm above the backdrop ground: no z-fighting */ this.scene.add(floor); this.decor.push(floor);
    const hemi = new THREE.HemisphereLight(theme.sky[1], '#333', 0.7); const sun = new THREE.DirectionalLight('#fff4e0', 1.0); sun.position.set(-4, 8, 8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
    this.scene.add(hemi, sun); this.decor.push(hemi, sun); this.scene.background = new THREE.Color(theme.sky[0]); this.scene.fog = new THREE.Fog(theme.fog, 20, 60);
    this.camera.position.set(0, 2.2, 9); this.camera.lookAt(0, 1.2, 0);
  }
  addActor(kind, x, y = 0, scale = 1) { const m = RANGERS[kind] ? RANGERS[kind]() : makeNPC(kind); m.position.set(x, y, 0); m.scale.setScalar(scale * (kind === 'monty' ? 0.85 : kind === 'zipper' ? 1.3 : kind === 'fatcat' ? 1 : 1)); this.scene.add(m); this.decor.push(m); m.userData.actor = true; m.userData.t = Math.random() * 5; m.userData.faceX = 0; return m; }
  animateActors(dt) { for (const d of this.decor) if (d.userData.actor) { d.userData.t += dt; const st = { facing: d.position.x < 0 ? 1 : -1, vx: 0, vy: 0, grounded: true, t: d.userData.t }; if (d.userData.parts) animateCharacter(d, st, dt); else d.rotation.y = Math.sin(d.userData.t * 0.5) * 0.2 + (d.position.x < 0 ? 0.6 : -0.6); if (d.userData.speaking) { d.position.y = (d.userData.baseY || 0) + Math.abs(Math.sin(d.userData.t * 10)) * 0.12; } else d.position.y = d.userData.baseY || 0; } }
  toast(t) { this.hud.toast(t); }
  fadeFlash() { this.hud.setFade(1); setTimeout(() => this.hud.setFade(0), 120); }
  menu() { const m = this.input.menu(); if (this.stateT < 0.3) { m.ok = false; m.back = false; m.start = false; } return m; }
  setState(s) { this.state = s; this.stateT = 0; }

  // ------------------------------------------------------------ TITLE
  gotoTitle() {
    this.clearScene(); this.stage('street', 40); this.setState('title');
    this._titleActors();
    this.hud.showMessage('ЧИП И ДЕЙЛ\nСПЕШАТ НА ПОМОЩЬ 3D');
    this.menuItems = ['ОРИГИНАЛЬНАЯ ИГРА: ПРОПАВШИЙ КОТЁНОК', 'НОВЫЕ ПРИКЛЮЧЕНИЯ: ОПЕРАЦИЯ «ГРОМОВЕРЖЕЦ»', 'ЗВУКОВОЙ ТЕСТ', 'УПРАВЛЕНИЕ', 'ГЕЙМПАД', 'НАСТРОЙКИ'];
    this.menuSel = 0; this.hud.showMenu(this.menuItems, 0);
    this.hud.setHelp('Стрелки/крестовина — выбор, Z/Enter или A — подтвердить. Оригинальная игра — уровни Capcom 1990 г. один в один, в 3D; «Громовержец» — новое продолжение. Фанатский некоммерческий проект.');
    this.audio.playMusic(MUSIC.title);
  }
  updateTitle(dt) {
    const m = this.menu();
    if (m.up) { this.menuSel = (this.menuSel + this.menuItems.length - 1) % this.menuItems.length; this.audio.playSfx(SFX.menuMove); }
    if (m.down) { this.menuSel = (this.menuSel + 1) % this.menuItems.length; this.audio.playSfx(SFX.menuMove); }
    this.hud.showMenu(this.menuItems, this.menuSel);
    if (m.ok) {
      this.audio.playSfx(SFX.menuOk); const it = this.menuItems[this.menuSel];
      if (it.startsWith('ОРИГИНАЛЬНАЯ')) this.gotoSelect(1);
      else if (it.startsWith('НОВЫЕ')) this.gotoSelect(2);
      else if (it === 'ЗВУКОВОЙ ТЕСТ') this.gotoSoundTest();
      else if (it === 'ГЕЙМПАД') this.gotoGamepad();
      else if (it === 'НАСТРОЙКИ') this.gotoOptions();
      else this.gotoControls();
    }
    this.camera.position.x = Math.sin(this.clock * 0.3) * 2; this.camera.lookAt(0, 1.2, 0);
  }
  // ------------------------------------------------------------ OPTIONS
  gotoOptions() { this.setState('options'); this.optSel = 0; this.hud.showMessage('НАСТРОЙКИ'); this.hud.setHelp('Вверх/вниз — пункт, влево/вправо или Z — изменить, Esc/B — назад'); this._showOptions(); }
  _optionItems() { return [`МОДЕЛИ ГЕРОЕВ: ${getHeroStyle() === 'old' ? 'ВСРАТЫЕ МОДЕЛИ' : 'КАК В МУЛЬТФИЛЬМЕ'}`, 'НАЗАД']; }
  _showOptions() { this.hud.showMenu(this._optionItems(), this.optSel); }
  updateOptions() {
    const m = this.menu(); const n = this._optionItems().length;
    if (m.up) { this.optSel = (this.optSel + n - 1) % n; this.audio.playSfx(SFX.menuMove); }
    if (m.down) { this.optSel = (this.optSel + 1) % n; this.audio.playSfx(SFX.menuMove); }
    if (m.back || (m.ok && this.optSel === n - 1)) { this.audio.playSfx(SFX.menuOk); this.gotoTitle(); return; }
    if (this.optSel === 0 && (m.ok || m.left || m.right)) { setHeroStyle(getHeroStyle() === 'old' ? 'cartoon' : 'old'); this.audio.playSfx(SFX.menuOk); this._rebuildTitleActors(); }
    this._showOptions(); this.camera.position.x = Math.sin(this.clock * 0.3) * 2; this.camera.lookAt(0, 1.2, 0);
  }
  _rebuildTitleActors() { for (const d of this.decor.filter(d => d.userData.actor)) this.scene.remove(d); this.decor = this.decor.filter(d => !d.userData.actor); this._titleActors(); }
  _titleActors() {
    this.addActor('chip', -1.2, 0, 1.4).userData.baseY = 0; this.addActor('dale', 1.2, 0, 1.4);
    this.addActor('gadget', -3.4, 0, 1.2); this.addActor('monty', 3.6, 0, 1.2); const z = this.addActor('zipper', 0, 2.6, 1.2); z.userData.baseY = 2.6; z.userData.hover = true;
  }
  gotoControls() { this.setState('controls'); this.hud.hideMenu(); this.hud.showMessage(''); this.hud.showDialog('Управление', 'Игрок 1: стрелки — движение, Z/Пробел — прыжок, X — поднять/бросить. Вниз — присесть (с ящиком — спрятаться), Вниз+прыжок — спрыгнуть с платформы, Вверх+X — бросок вверх.\nИгрок 2: WASD, G — прыжок, H — поднять/бросить. Напарника можно поднять и бросить!\nEnter — пауза, Shift — статус, M — звук.\n\nГеймпад: крестовина или левый стик — движение, A (нижняя кнопка) — прыжок, X/Y — поднять/бросить, Start — пауза, Back — статус, B — назад в меню. Первый подключённый геймпад — игрок 1, второй — игрок 2 (в игре на одного любой геймпад управляет героем). Настройка Steam Controller — в пункте «Геймпад».\n\nПредметы: ящики бросают во врагов, под ними можно прятаться; металлические ящики можно складывать; яблоки тяжёлые; красный мяч нужен против боссов. Цветы (100) и звёзды (20) дают жизнь, жёлуди лечат, сыр зовёт Рокки, Вжик даёт неуязвимость.'); }
  gotoGamepad() {
    this.setState('gamepad'); this.hud.hideMenu(); this.hud.showMessage('ГЕЙМПАД');
    this.hud.setHelp('Esc / B — назад. Нажмите любую кнопку на геймпаде, чтобы браузер его показал.');
  }
  updateGamepad() {
    const pads = this.input.describePads();
    let text;
    if (!pads.length) {
      text = 'Геймпад не обнаружен.\nНажмите на нём любую кнопку: браузер показывает геймпад только после первого нажатия.\n\nSteam Controller / Steam Deck: на рабочем столе Steam по умолчанию превращает его в клавиатуру и мышь, и браузер не видит геймпада. Варианты:\n1) Долго нажмите кнопку «Вид» (⧉, слева): Steam переключит профиль рабочего стола на набор «Геймпад», и контроллер появится как Xbox 360 (Steam Virtual Gamepad). Повторное долгое нажатие вернёт клавиатуру и мышь.\n2) Либо в Steam: Настройки → Контроллер → «Раскладка для рабочего стола» → шаблон «Геймпад»; либо добавьте браузер в Steam как стороннюю игру.\n3) Без настройки работает и профиль «клавиатура/мышь»: крестовина — движение, Y — прыжок, LB/R4/R5 — поднять/бросить, A — подтвердить, B — назад, «Меню» — пауза.';
    } else {
      text = pads.map(p => { const b = p.buttons.map((v, i) => v ? `[${i}]` : '').join(''); const held = Object.entries(p.state).filter(([k, v]) => v && k !== 'any').map(([k]) => k).join(' '); return `Игрок ${p.player}: ${p.id}\nРаскладка: ${p.mapping}   кнопок: ${p.buttons.length}   осей: ${p.axes.length}\nНажато: ${b || '—'}   → ${held || '—'}\nОси: ${p.axes.join(', ')}`; }).join('\n\n');
      text += '\n\nЕсли направления или кнопки не совпадают, в Steam выберите шаблон «Геймпад» (стандартная раскладка Xbox).';
    }
    this.hud.showDialog('Геймпад', text); this.hud.skipTyping();
    if (this.menu().back || this.menu().start) { this.hud.hideDialog(); this.gotoTitle(); }
  }
  gotoSoundTest() { this.setState('soundtest'); this.hud.hideMenu(); this.soundList = Object.values(MUSIC); this.soundSel = 0; this.hud.showMessage('ЗВУКОВОЙ ТЕСТ'); this.hud.setHelp('Вверх/вниз — трек, Z — играть, Esc — назад. Все мелодии восстановлены из звукового движка оригинала и перезвучены заново.'); this.hud.showMenu(this.soundList, 0); }
  updateSoundTest() { const m = this.menu(); if (m.back) { this.gotoTitle(); return; } if (m.up) this.soundSel = (this.soundSel + this.soundList.length - 1) % this.soundList.length; if (m.down) this.soundSel = (this.soundSel + 1) % this.soundList.length; this.hud.showMenu(this.soundList, this.soundSel); if (m.ok) { this.audio.stopMusic(); this.audio.playMusic(this.soundList[this.soundSel], { loop: true }); } if (m.back) this.gotoTitle(); }

  // ------------------------------------------------------------ PLAYER SELECT
  gotoSelect(act) {
    this.clearScene(); this.stage('hq', 30); this.setState('select'); this.session = { act, players: ['chip'], twoPlayer: false, current: null, cleared: {}, visited: {} };
    this.progress.lives = 3; this.progress.flowers = 0; this.progress.stars = 0; this.progress.gears = 0; this.progress.act = act;
    this.selStep = 0; this.selIdx = [0, 1]; this.selPlayers = 1; this.selCursor = 0;
    this.hud.showMessage(act === 1 ? 'ОРИГИНАЛЬНАЯ ИГРА\nПРОПАВШИЙ КОТЁНОК' : 'НОВЫЕ ПРИКЛЮЧЕНИЯ\nОПЕРАЦИЯ «ГРОМОВЕРЖЕЦ»');
    this.hud.setHelp('Выберите число игроков и персонажей. В новых приключениях доступны все Спасатели; в оригинале — Чип и Дейл (все пятеро после прохождения).');
    this.audio.playMusic(MUSIC.gadget);
    this._rebuildSelectActors();
  }
  _rebuildSelectActors() {
    for (const d of [...this.decor]) if (d.userData.actor) { this.scene.remove(d); this.decor.splice(this.decor.indexOf(d), 1); }
    const avail = this.availableChars();
    avail.forEach((k, i) => { const a = this.addActor(k, (i - (avail.length - 1) / 2) * 2.2, 0, 1.3); a.userData.key = k; });
  }
  availableChars() { return this.session.act === 2 || this.progress.act1Done ? CHARS : ['chip', 'dale']; }
  updateSelect(dt) {
    const m = this.menu(); const avail = this.availableChars();
    if (this.selStep === 0) {
      const items = ['1 ИГРОК', '2 ИГРОКА']; if (m.up || m.down) { this.selPlayers = this.selPlayers === 1 ? 2 : 1; this.audio.playSfx(SFX.menuMove); } this.hud.showMenu(items, this.selPlayers - 1);
      if (m.ok) { this.selStep = 1; this.audio.playSfx(SFX.menuOk); this.hud.hideMenu(); }
      if (m.back) this.gotoTitle();
    } else {
      const pi = this.selStep - 1; // which player chooses
      if (m.left) { this.selIdx[pi] = (this.selIdx[pi] + avail.length - 1) % avail.length; this.audio.playSfx(SFX.menuMove); }
      if (m.right) { this.selIdx[pi] = (this.selIdx[pi] + 1) % avail.length; this.audio.playSfx(SFX.menuMove); }
      if (pi === 1 && this.selIdx[1] === this.selIdx[0]) this.selIdx[1] = (this.selIdx[1] + 1) % avail.length;
      const k = avail[this.selIdx[pi]];
      this.hud.showMenu([`ИГРОК ${pi + 1}: ◀ ${CHARACTER_NAMES[k].toUpperCase()} ▶`], 0);
      this.hud.setHelp({ chip: 'Чип — лидер команды. Сбалансированный.', dale: 'Дейл — чуть быстрее, любит пошутить.', gadget: 'Гайка — планирует в воздухе (держите прыжок).', monty: 'Рокки — силач: тяжёлые предметы не замедляют, ломает хрупкие стены с разбега.', zipper: 'Вжик — летает (прыжок в воздухе), но не поднимает тяжёлое.' }[k]);
      for (const d of this.decor) if (d.userData.actor) { d.userData.speaking = d.userData.key === k; d.scale.setScalar(d.userData.key === k ? 1.6 : 1.2); }
      if (m.ok) { this.audio.playSfx(SFX.menuOk); if (this.selStep < this.selPlayers) this.selStep++; else { this.session.players = this.selIdx.slice(0, this.selPlayers).map(i => avail[i]); this.session.twoPlayer = this.selPlayers === 2; this.input.twoPlayer = this.session.twoPlayer; this.startAct(); } }
      if (m.back) { this.selStep = 0; }
    }
  }
  startAct() {
    const map = MAPS[this.session.act]; this.session.current = map.start; this.session.cleared = {};
    const first = LEVELS[map.start];
    if (this.session.act === 1) this.playCutscene('intro', () => this.gotoLevel(map.start));
    else this.playCutscene('act2intro', () => this.gotoLevel(map.start));
  }

  // ------------------------------------------------------------ CUTSCENES
  playCutscene(id, onDone) {
    const cs = CUTSCENES[id]; if (!cs) { onDone(); return; }
    this.clearScene(); this.stage(cs.bg, 30); this.setState('cutscene'); this.cut = { cs, line: 0, onDone, actors: {} };
    for (const a of cs.actors) { const m = this.addActor(a.kind, a.x, a.y || 0, 1.25); m.userData.baseY = a.y || 0; this.cut.actors[a.kind] = this.cut.actors[a.kind] || m; }
    this.audio.playMusic(id.startsWith('ending') ? MUSIC.title : id.startsWith('gadget') || id === 'afterCasino' || id === 'beforeCasino' ? MUSIC.gadget : MUSIC.map);
    this.hud.setHelp('Z/Enter — далее, Esc — пропустить сцену');
    this._showLine();
  }
  _showLine() {
    const c = this.cut; const [who, text] = c.cs.lines[c.line]; for (const k in c.actors) c.actors[k].userData.speaking = (k === who);
    this.hud.showDialog(CHARACTER_NAMES[who] || '', text); this.audio.playSfx(SFX.text);
  }
  updateCutscene(dt) {
    const m = this.menu();
    if (m.back) { this._endCutscene(); return; }
    if (m.ok) { if (!this.hud.dialogDone()) this.hud.skipTyping(); else { this.cut.line++; if (this.cut.line >= this.cut.cs.lines.length) this._endCutscene(); else this._showLine(); } }
    this.camera.position.x = Math.sin(this.clock * 0.2) * 0.8; this.camera.lookAt(0, 1.2, 0);
  }
  _endCutscene() { const cb = this.cut.onDone; this.hud.hideDialog(); for (const k in this.cut.actors) this.cut.actors[k].userData.speaking = false; this.cut = null; cb(); }

  // ------------------------------------------------------------ MAP
  gotoMap() {
    this.clearScene(); this.setState('map'); const map = MAPS[this.session.act]; this.map = map;
    this.scene.background = new THREE.Color(this.session.act === 1 ? '#1f3f78' : '#101c3a'); this.scene.fog = new THREE.Fog('#1f3f78', 30, 70);
    const hemi = new THREE.HemisphereLight('#bcd', '#223', 0.8); const sun = new THREE.DirectionalLight('#fff', 1.0); sun.position.set(-5, 12, 8); sun.castShadow = true; this.scene.add(hemi, sun); this.decor.push(hemi, sun);
    // city blocks grid
    const r = (s) => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; let seed = 7;
    const ground = new THREE.Mesh(new THREE.BoxGeometry(60, 1, 30), new THREE.MeshStandardMaterial({ map: TEX.grass('#3a7a3a') })); ground.position.set(8, -0.5, 0.5); ground.receiveShadow = true; this.scene.add(ground); this.decor.push(ground);
    for (let i = 0; i < 90; i++) { seed = seed * 9301 + 49297; const x = -6 + (seed % 233280) / 233280 * 30; seed = seed * 7 + 13; const z = -6 + (seed % 233280) / 233280 * 12; let tooClose = false; for (const id in map.nodes) { const n = map.nodes[id]; if (Math.hypot(n.x - x, -n.y - z) < 1.6) tooClose = true; } if (tooClose) continue; const h = 0.6 + ((seed >> 3) % 100) / 100 * 2.4; const b = new THREE.Mesh(new THREE.BoxGeometry(0.8, h, 0.8), new THREE.MeshStandardMaterial({ color: ['#c8b8a8', '#a8b8c8', '#d0c0a0', '#b0a090'][i % 4] })); b.position.set(x, h / 2, z); b.castShadow = true; this.scene.add(b); this.decor.push(b); }
    // roads (edges)
    this.mapNodes = {};
    for (const [a, b] of map.edges) { const na = map.nodes[a], nb = map.nodes[b]; const dx = nb.x - na.x, dz = -(nb.y - na.y); const len = Math.hypot(dx, dz); const road = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.5), new THREE.MeshStandardMaterial({ color: '#555' })); road.position.set((na.x + nb.x) / 2, 0.06, -(na.y + nb.y) / 2); road.rotation.y = -Math.atan2(dz, dx); this.scene.add(road); this.decor.push(road); }
    for (const id in map.nodes) { const n = map.nodes[id]; const done = this.session.cleared[id]; const col = done ? '#40c060' : this.isUnlocked(id) ? '#ffd040' : '#777'; const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.3, 16), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.3 })); pad.position.set(n.x, 0.15, -n.y); this.scene.add(pad); this.decor.push(pad); const marker = makeItem(done ? 'star' : 'flower'); marker.position.set(n.x, 0.3, -n.y); marker.scale.setScalar(1.3); this.scene.add(marker); this.decor.push(marker); this.mapNodes[id] = { pad, marker, n }; }
    // the Ranger Plane (player marker)
    const plane = new THREE.Group(); plane.add(new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), mat('#e03030'))); const wing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.4), mat('#f0d060')); wing.position.y = 0.15; plane.add(wing); const bal = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), mat('#60a0e0')); bal.position.y = 0.9; plane.add(bal); const pilot = RANGERS[this.session.players[0]](); pilot.scale.setScalar(0.45); pilot.position.y = 0.25; plane.add(pilot); this.scene.add(plane); this.decor.push(plane); this.plane = plane;
    const cur = map.nodes[this.session.current]; plane.position.set(cur.x, 0.8, -cur.y); this.mapSel = this.session.current; this.planeT = 1;
    this.hud.showMessage(map.title); this.hud.setHelp('Стрелки — выбрать соседнюю зону, Z/Enter — лететь. Жёлтые — доступны, зелёные — пройдены.');
    this.audio.playMusic(MUSIC.map); this._mapHint();
  }
  isUnlocked(id) { const map = MAPS[this.session.act]; if (id === map.start) return true; return map.edges.some(([a, b]) => (b === id && this.session.cleared[a]) || (a === id && this.session.cleared[b])); }
  neighbors(id) { const map = this.map; const out = []; for (const [a, b] of map.edges) { if (a === id) out.push(b); if (b === id) out.push(a); } return out; }
  _mapHint() { const z = ZONES[this.mapSel]; this.hud.setZone(`Зона «${z.letter}»: ${z.name}` + (this.session.cleared[this.mapSel] ? ' ✓' : '')); this.hud.showDialog('Гайка', ZONE_HINTS[this.mapSel] || ''); }
  updateMap(dt) {
    const m = this.menu(); const map = this.map; const cur = map.nodes[this.mapSel];
    const pick = (dirx, diry) => { let best = null, bd = 1e9; for (const n of this.neighbors(this.mapSel).concat(Object.keys(map.nodes))) { if (n === this.mapSel) continue; const p = map.nodes[n]; const dx = p.x - cur.x, dy = p.y - cur.y; const dot = dx * dirx + dy * diry; if (dot <= 0.3) continue; if (!this.isUnlocked(n)) continue; const d = Math.hypot(dx, dy) - dot * 0.5; if (d < bd) { bd = d; best = n; } } return best; };
    let nxt = null; if (m.left) nxt = pick(-1, 0); if (m.right) nxt = pick(1, 0); if (m.up) nxt = pick(0, 1); if (m.down) nxt = pick(0, -1);
    if (nxt) { this.mapSel = nxt; this.audio.playSfx(SFX.menuMove); this._mapHint(); }
    if (m.ok && this.isUnlocked(this.mapSel)) { this.audio.playSfx(SFX.menuOk); this.session.current = this.mapSel; this.hud.hideDialog(); this.gotoLevel(this.mapSel); return; }
    if (m.back) { this.gotoTitle(); return; }
    const target = map.nodes[this.mapSel]; const p = this.plane.position; p.x += (target.x - p.x) * dt * 4; p.z += (-target.y - p.z) * dt * 4; p.y = 0.8 + Math.sin(this.clock * 3) * 0.1; this.plane.rotation.y = Math.atan2(target.x - p.x, -target.y - p.z);
    for (const id in this.mapNodes) { const mn = this.mapNodes[id]; animateItem(mn.marker, this.clock); mn.pad.scale.setScalar(id === this.mapSel ? 1.3 + Math.sin(this.clock * 6) * 0.1 : 1); }
    this.camera.position.set(p.x, 7.5, p.z + 9); this.camera.lookAt(p.x, 0, p.z - 1);
  }

  // ------------------------------------------------------------ LEVEL
  gotoLevel(id) {
    const def = LEVELS[id]; if (!def) { this.gotoMap(); return; }
    const begin = () => {
      this.clearScene(); this.setState('level'); this.currentLevelId = id;
      this.world = new World(this, def, this.session.players);
      const z = ZONES[id]; this.hud.setZone(`Зона «${z.letter}»: ${z.name}`); this.hud.showMessage(`ЗОНА «${z.letter}»\n${z.name.toUpperCase()}`); setTimeout(() => { if (this.state === 'level') this.hud.showMessage(''); }, 2200);
      this.audio.playMusic(def.music); this.hud.setHelp(''); this.levelDeathPending = null;
    };
    if (def.intro && !this.session.visited[id]) { this.session.visited[id] = true; this.playCutscene(def.intro, begin); } else { this.session.visited[id] = true; begin(); }
  }
  updateLevel(dt) {
    const w = this.world; if (!w) return;
    if (this.input.startPressed) { this.paused = !this.paused; this.hud.showMessage(this.paused ? 'ПАУЗА' : ''); this.audio.setMusicDucked(this.paused); }
    if (this.paused) { if (this.input.escapePressed) { this.paused = false; this.audio.setMusicDucked(false); this.gotoMap(); } return; }
    if (this.input.selectPressed) this.toast(`Жизни ×${this.progress.lives}   Цветы ${this.progress.flowers}/100   Звёзды ${this.progress.stars}/20` + (this.session.act === 2 ? `   Детали ${this.progress.gears}` : ''));
    w.update(dt, this.input);
    this.hud.setPlayers(w.players, this.progress, this.session.players.map(k => CHARACTER_NAMES[k]));
    if (w.boss) this.hud.setBoss(w.boss.dead ? null : w.boss);
    if (w.clock > 1 && Math.floor(w.clock) % 4 === 0) w.setCheckpoint();
    // death handling
    if (this.levelDeathPending && this.stateT > this.levelDeathPending) { this.levelDeathPending = null; this._afterDeath(); }
  }
  onPlayerDied(p, reason) {
    const w = this.world; const alive = w.players.filter(q => q.active && !q.dead);
    if (alive.length) { // co-op: the partner continues; dead player respawns in a moment if lives remain
      setTimeout(() => { if (this.world !== w) return; if (this.progress.lives > 0) { this.progress.lives--; w.respawn(p); p.x = alive[0].x; p.y = alive[0].y + 0.5; } else p.active = false; }, 1500);
      return;
    }
    w.state = 'dead'; this.audio.stopMusic(); this.audio.playJingle(MUSIC.death, null); this.setState('level'); this.levelDeathPending = 2.6;
  }
  _afterDeath() {
    const w = this.world;
    if (this.progress.lives > 0) { this.progress.lives--; for (const p of w.players) { w.respawn(p); } for (const pr of w.projectiles) pr.dead = true; this.audio.playMusic(w.bossActive ? MUSIC.boss : w.def.music); }
    else this.gotoGameOver();
  }
  onBossStart(boss) { this.audio.playMusic(MUSIC.boss); this.toast(boss.info.name); this.input.rumble(0, 0.8, 0.5, 300); }
  rumble(playerIndex, strong, weak, ms) { this.input.rumble(playerIndex, strong, weak, ms); }
  onBossDefeated(boss) { const w = this.world; w.camLockL = -Infinity; w.camLockR = Infinity; this.audio.stopMusic(); this.audio.playMusic(w.def.music); this.toast('ПОБЕДА!'); for (const pr of w.projectiles) pr.dead = true; }
  onLevelClear() {
    const id = this.currentLevelId; this.session.cleared[id] = true; this.audio.stopMusic(); this.audio.playJingle(MUSIC.clear, () => { });
    this.hud.showMessage('ЗОНА ПРОЙДЕНА!');
    setTimeout(() => { if (this.state !== 'level') return; this.gotoBonus(() => this._afterLevel(id)); }, 2600);
  }
  _afterLevel(id) {
    const def = LEVELS[id]; const map = MAPS[this.session.act];
    const next = () => { if (id === map.final) this.gotoEnding(); else this.gotoMap(); };
    if (def.outro) this.playCutscene(def.outro, next); else next();
  }

  // ------------------------------------------------------------ BONUS GAME (pick a crate)
  gotoBonus(onDone) {
    this.clearScene(); this.stage('toystore', 24); this.setState('bonus'); this.bonus = { onDone, sel: 2, opened: false, crates: [], t: 0 };
    const prizes = ['flower', 'flower', 'star', 'acorn', 'oneup']; for (let i = prizes.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [prizes[i], prizes[j]] = [prizes[j], prizes[i]]; }
    for (let i = 0; i < 5; i++) { const c = makeItem('crate'); c.position.set((i - 2) * 2.2, 0, 0); c.scale.setScalar(1.4); this.scene.add(c); this.decor.push(c); this.bonus.crates.push({ mesh: c, prize: prizes[i] }); }
    const hero = this.addActor(this.session.players[0], 0, 2.2, 1.2); hero.userData.baseY = 2.2; this.bonus.hero = hero;
    this.hud.showMessage('БОНУС!\nВыберите ящик'); this.hud.setHelp('Влево/вправо — выбрать, Z — открыть'); this.audio.playMusic(MUSIC.bonus);
  }
  updateBonus(dt) {
    const b = this.bonus; b.t += dt; const m = this.menu();
    if (!b.opened) {
      if (m.left) { b.sel = Math.max(0, b.sel - 1); this.audio.playSfx(SFX.menuMove); } if (m.right) { b.sel = Math.min(4, b.sel + 1); this.audio.playSfx(SFX.menuMove); }
      b.hero.position.x += ((b.sel - 2) * 2.2 - b.hero.position.x) * dt * 10;
      if (m.ok) { b.opened = true; const c = b.crates[b.sel]; const prize = c.prize; c.mesh.visible = false; const pm = makeItem(prize); pm.position.set((b.sel - 2) * 2.2, 0.3, 0.3); pm.scale.setScalar(1.5); this.scene.add(pm); this.decor.push(pm); b.prizeMesh = pm;
        const names = { flower: '+10 цветов', star: '+5 звёзд', acorn: 'Жёлудь: здоровье восстановлено', oneup: '1 UP!' }; this.hud.showMessage(names[prize]); this.audio.playSfx(prize === 'oneup' ? SFX.oneup : SFX.item);
        if (prize === 'flower') this.progress.flowers += 10; if (prize === 'star') this.progress.stars += 5; if (prize === 'oneup') this.progress.lives++;
        if (this.progress.flowers >= 100) { this.progress.flowers -= 100; this.progress.lives++; } if (this.progress.stars >= 20) { this.progress.stars -= 20; this.progress.lives++; }
        b.doneAt = b.t + 2.2; }
    } else { if (b.prizeMesh) animateItem(b.prizeMesh, b.t); if (b.t > b.doneAt || m.ok) { const cb = b.onDone; this.bonus = null; cb(); } }
    this.camera.position.set(0, 3, 9); this.camera.lookAt(0, 1.2, 0);
  }

  // ------------------------------------------------------------ GAME OVER / ENDING
  gotoGameOver() {
    this.clearScene(); this.stage('lab', 24); this.setState('gameover'); this.hud.showMessage('КОНЕЦ ИГРЫ'); this.audio.stopMusic(); this.audio.playJingle(MUSIC.gameover, null);
    this.goMenu = ['ПРОДОЛЖИТЬ (с карты)', 'В ГЛАВНОЕ МЕНЮ']; this.goSel = 0; this.hud.showMenu(this.goMenu, 0);
    const fc = this.addActor('fatcat', 0, 0, 1.4); fc.userData.speaking = true;
  }
  updateGameOver() { const m = this.menu(); if (m.up || m.down) this.goSel = 1 - this.goSel; this.hud.showMenu(this.goMenu, this.goSel); if (m.ok) { if (this.goSel === 0) { this.progress.lives = 3; this.gotoMap(); } else this.gotoTitle(); } }
  gotoEnding() {
    if (this.session.act === 1) { this.progress.act1Done = true; this.progress.unlockedAct2 = true; } else this.progress.act2Done = true; this.save();
    this.clearScene(); this.stage('hq', 30); this.setState('ending'); this.endT = 0;
    const kinds = ['monty', 'zipper', 'gadget', 'dale', 'chip']; kinds.forEach((k, i) => { const a = this.addActor(k, (i - 2) * 1.8, k === 'zipper' ? 2.4 : 0, 1.3); a.userData.baseY = k === 'zipper' ? 2.4 : 0; a.userData.speaking = true; });
    this.hud.showMessage(this.session.act === 1 ? 'СПАСАТЕЛИ, ВПЕРЁД!!!\n\nАКТ II ОТКРЫТ' : 'СПАСАТЕЛИ, ВПЕРЁД!!!\n\n— КОНЕЦ —');
    this.hud.setHelp('Спасибо за игру! Z — в меню.'); this.audio.playMusic(MUSIC.title);
    this.credits = ['3D-ремейк по мотивам Chip ’n Dale Rescue Rangers (Capcom, 1990)', 'Музыка: оригинальные композиции Харуми Фудзиты, восстановлены из звукового движка и перезвучены', 'Новые уровни, сюжет Акта II, 3D-модели и код — созданы для этого ремейка', 'Персонажи принадлежат Disney. Некоммерческий фанатский проект'];
  }
  updateEnding(dt) { this.endT += dt; const i = Math.floor(this.endT / 4) % this.credits.length; this.hud.setHelp(this.credits[i] + '\n\nZ — в меню'); if (this.menu().ok && this.endT > 2) this.gotoTitle(); this.camera.position.x = Math.sin(this.clock * 0.3) * 2; this.camera.lookAt(0, 1.2, 0); }

  // ------------------------------------------------------------ main loop
  loop(now) {
    requestAnimationFrame(this.loop);
    let dt = Math.min(0.05, (now - this.lastT) / 1000); this.lastT = now; this.clock += dt; this.stateT += dt;
    try { this.input.update(); } catch (e) { if (!this._inputErr) { this._inputErr = true; console.warn('input', e); } }
    if (this.input.mutePressed) { const m = this.audio.toggleMute(); this.toast(m ? 'Звук выключен' : 'Звук включён'); }
    if (this.input.pressedViewToggle) { this.widescreen = !this.widescreen; this.toast(this.widescreen ? 'Широкий кадр' : 'Кадр как на NES (16:15)'); }
    if (this.state === 'loading' && this.ready && this._startFn && this.input.padAnyPressed) this._startFn();
    this.frames = (this.frames || 0) + 1;
    switch (this.state) {
      case 'title': this.updateTitle(dt); break;
      case 'controls': if (this.menu().ok || this.menu().back) this.gotoTitle(); break;
      case 'soundtest': this.updateSoundTest(); break;
      case 'gamepad': this.updateGamepad(); break;
      case 'options': this.updateOptions(); break;
      case 'select': this.updateSelect(dt); break;
      case 'cutscene': this.updateCutscene(dt); break;
      case 'map': this.updateMap(dt); break;
      case 'level': this.updateLevel(dt); break;
      case 'bonus': this.updateBonus(dt); break;
      case 'gameover': this.updateGameOver(); break;
      case 'ending': this.updateEnding(dt); break;
    }
    if (this.state !== 'level') this.animateActors(dt);
    for (const d of this.decor) if (d.userData.hover) d.position.y = d.userData.baseY + Math.sin(this.clock * 4) * 0.2;
    this.hud.update(dt); if (this.state === 'loading') this.hud.setFade(1);
    this._applyViewport();
    const nesLook = this.state === 'level' && this.world && this.world.level.original; // original zones: keep NES palette colours (no filmic tone curve)
    this.renderer.toneMapping = nesLook ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    this.renderer.render(this.scene, this.camera);
  }
  // Original levels are shown in a NES-like 16:15 frame (pillarboxed) unless widescreen is toggled with V
  _applyViewport() {
    const w = innerWidth, h = innerHeight; const nes = this.state === 'level' && this.world && this.world.level.original && !this.widescreen;
    if (nes) {
      const vw = Math.min(w, Math.round(h * 16 / 15)); const vh = Math.round(vw * 15 / 16); const x = Math.round((w - vw) / 2), y = Math.round((h - vh) / 2);
      this.renderer.setScissorTest(true); this.renderer.setScissor(0, 0, w, h); this.renderer.setClearColor('#000000'); this.renderer.clear();
      this.renderer.setViewport(x, y, vw, vh); this.renderer.setScissor(x, y, vw, vh);
      if (this.camera.aspect !== vw / vh) { this.camera.aspect = vw / vh; this.camera.updateProjectionMatrix(); }
    } else {
      this.renderer.setScissorTest(false); this.renderer.setViewport(0, 0, w, h);
      if (this.camera.aspect !== w / h) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
    }
  }
}

window.game = new Game();
