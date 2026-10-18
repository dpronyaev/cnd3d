// Shared constants: physics, tile legend, music/sfx names.
export const TILE = 1;
// Measured frame by frame in the NES original: jump starts at 7 px/frame (26.25 tiles/s), slows by ~0.35 px/frame^2
// (79 tiles/s^2) and peaks 66-67 px up after 17-18 frames; falling is capped at 7 px/frame.
export const GRAVITY = 79;
export const MAX_FALL = 26.3;
export const PLAYER = {
  w: 0.72, h: 1.35, speed: 6.64, jumpV: 26.3, jumpCut: 0.5, accel: 70, airAccel: 40, friction: 40,
  hearts: 3, invulnTime: 1.6, carrySpeedHeavy: 0.55, carryJumpHeavy: 0.75,
};
// Measured in the NES original: thrown crates/apples move 4 px per frame (15 tiles/s) in a straight line, spawn 20 px ahead
// and 12 px above the feet, ignore terrain and vanish at the screen edge.
export const THROW = { speed: 15, up: 15, drop: 4, ahead: 1.25, height: 0.75 };

// Level tile legend (one char = one tile)
export const T = {
  EMPTY: '.', SOLID: '#', SOLID_ALT: '%', PLATFORM: '=', DECOR_PILLAR: '|', DECOR_LEAF: '"',
  CRATE: 'X', METAL: 'M', APPLE: 'A', BALL: 'O', BARREL: 'B',
  FLOWER: 'f', STAR: '*', ACORN: 'a', BIG_ACORN: 'h', ONEUP: '1', CHEST: 'T', CHEESE: 'C', ZIPPER: 'Z', GEAR: 'g',
  WALL: 'W', SPIKES: '^', WATER: '~', PLAT_H: '_', PLAT_V: ':', FALLER: 'v', FAN: 'F',
  START: 'S', EXIT: 'E', BOSS: 'K', BOAT: 'U', CRANE: 'Y', SWITCH: '&', STEAM: 'P', DOOR: 'D', JET: 'J', KILL: '!', VOID: '@',
};
export const ITEM_CHARS = new Set(['X', 'M', 'A', 'O', 'B', 'f', '*', 'a', 'h', '1', 'T', 'C', 'Z', 'g', 'R', 'N']);
// enemy chars → type
export const ENEMY_CHARS = {
  d: 'mechdog', b: 'bee', m: 'mechmouse', r: 'crab', s: 'spider', n: 'wasphive', q: 'frog', l: 'lizard', c: 'copter',
  w: 'robot', t: 'bat', e: 'pirat', u: 'rhino', i: 'antbot', j: 'jellyfish', k: 'kangarat', y: 'firefly', x: 'drone', z: 'snailbomb', o: 'rat',
};

export const MUSIC = {
  title: 'title', map: 'map', boss: 'boss', bonus: 'bonus', gadget: 'gadget',
  zone0: 'zone0', zoneA: 'zoneA', zoneB: 'zoneB', zoneD: 'zoneD', zoneF: 'zoneF', zoneG: 'zoneG', zoneJ: 'zoneJ',
  clear: 'clear', death: 'death', gameover: 'gameover',
};
export const SFX = {
  jump: 'sfx_10', pickup: 'sfx_16', throw: 'sfx_14', hurt: 'sfx_13', enemyHit: 'sfx_18', bossHit: 'sfx_20', crateBreak: 'sfx_1e',
  land: 'sfx_1c', item: 'sfx_24', star: 'sfx_19', oneup: 'sfx_15', powerup: 'sfx_29', fall: 'sfx_1b', menuMove: 'sfx_26', menuOk: 'sfx_27',
  explode: 'sfx_28', bounce: 'sfx_11', step: 'sfx_21', splash: 'sfx_25', text: 'sfx_22', hide: 'sfx_17', heal: 'sfx_12', alarm: 'sfx_1a',
};
export const ALL_TRACKS = [
  ...Object.values(MUSIC), ...Object.values(SFX),
];
