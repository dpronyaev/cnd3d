// Act II "Операция «Громовержец»": eleven new zones inspired by the Rescue Rangers animated series.
import { generate } from './levelgen.js';

const L = (meta, chunks) => generate({ ...meta, chunks });

export const ZONE_K = L({ id: 'K', name: 'Штаб Спасателей', theme: 'hq', music: 'zoneA', boss: null, act: 2, intro: 'act2intro', outro: 'afterK', seed: 201, ground: ['i', 'i'], air: ['y'] }, [
  { type: 'start' }, { type: 'flat', len: 12, air: true }, { type: 'gearRoom' }, { type: 'flat', len: 8 }, { type: 'breakWall', prize: 'g' }, { type: 'flat', len: 10 }, { type: 'stepsUp', n: 3 }, { type: 'flat', len: 10, air: true },
  { type: 'gap', w: 4 }, { type: 'stepsDown' }, { type: 'tower', rise: 7, prize: 'g' }, { type: 'descent' }, { type: 'flat', len: 12 }, { type: 'exit' },
]);

export const ZONE_L = L({ id: 'L', name: 'Замок Нимнула', theme: 'nimlab', music: 'zone0', boss: 'nimdrone', act: 2, outro: 'afterL', seed: 211, ground: ['m', 'w'], air: ['x', 'x'] }, [
  { type: 'start' }, { type: 'flat', len: 12, air: true }, { type: 'hazard', len: 12, kind: '^', moving: true }, { type: 'gearRoom' }, { type: 'flat', len: 8 }, { type: 'stepsUp', n: 3 }, { type: 'flat', len: 10, air: true }, { type: 'gap', w: 5 },
  { type: 'stepsDown' }, { type: 'wallPuzzle' }, { type: 'flat', len: 8 }, { type: 'climb', rise: 6, prize: 'g' }, { type: 'descent' }, { type: 'gearRoom' }, { type: 'flat', len: 10 }, { type: 'arena' },
]);

export const ZONE_M = L({ id: 'M', name: 'Пристань и Пи-раты', theme: 'pier', music: 'zoneB', boss: 'squid', act: 2, outro: 'afterM', seed: 221, ground: ['e', 'e', 'r'], air: ['j'], water: true, heavy: 'B' }, [
  { type: 'start' }, { type: 'flat', len: 12 }, { type: 'hazard', len: 12, kind: '~' }, { type: 'gearRoom' }, { type: 'flat', len: 10, air: true }, { type: 'hazard', len: 14, kind: '~', boat: true }, { type: 'flat', len: 8 }, { type: 'stepsUp', n: 2 },
  { type: 'flat', len: 10 }, { type: 'stepsDown' }, { type: 'climb', rise: 5, prize: 'g' }, { type: 'descent' }, { type: 'hazard', len: 12, kind: '~', moving: true }, { type: 'gearRoom' }, { type: 'flat', len: 8 }, { type: 'arena', water: true },
]);

export const ZONE_N = L({ id: 'N', name: 'Прачечная Сиамских близнецов', theme: 'laundry', music: 'zoneD', boss: 'siamese', act: 2, outro: 'afterN', seed: 231, ground: ['m', 'l'], air: ['j', 'j'] }, [
  { type: 'start' }, { type: 'flat', len: 12, air: true }, { type: 'steam' }, { type: 'gearRoom' }, { type: 'flat', len: 8 }, { type: 'stepsUp', n: 3 }, { type: 'flat', len: 10, air: true }, { type: 'stepsDown' },
  { type: 'hazard', len: 12, kind: '^', moving: true }, { type: 'steam', len: 14 }, { type: 'climb', rise: 5, prize: 'g' }, { type: 'descent' }, { type: 'gearRoom' }, { type: 'flat', len: 8 }, { type: 'arena' },
]);

export const ZONE_O = L({ id: 'O', name: 'Притон Рэта Капоне', theme: 'speakeasy', music: 'zoneG', boss: 'capone', act: 2, outro: 'afterO', seed: 241, ground: ['k', 'k', 'e'], air: ['t', 't'], heavy: 'B' }, [
  { type: 'start' }, { type: 'flat', len: 12, air: true }, { type: 'gearRoom' }, { type: 'flat', len: 10 }, { type: 'gap', w: 4 }, { type: 'stepsUp', n: 3 }, { type: 'flat', len: 10, air: true }, { type: 'stepsDown' },
  { type: 'breakWall', prize: 'g' }, { type: 'flat', len: 10 }, { type: 'wallPuzzle' }, { type: 'climb', rise: 5, prize: 'g' }, { type: 'descent' }, { type: 'flat', len: 10 }, { type: 'arena' },
]);

export const ZONE_P = L({ id: 'P', name: 'Музей естествознания', theme: 'museum', music: 'zoneF', boss: 'dinoskel', act: 2, outro: 'afterP', seed: 251, ground: ['u', 'm'], air: ['t', 'c'] }, [
  { type: 'start' }, { type: 'flat', len: 12, air: true }, { type: 'stepsUp', n: 3 }, { type: 'flat', len: 10 }, { type: 'gearRoom' }, { type: 'gap', w: 5 }, { type: 'stepsDown' }, { type: 'flat', len: 10, air: true },
  { type: 'wallPuzzle' }, { type: 'tower', rise: 7, prize: 'g' }, { type: 'descent' }, { type: 'flat', len: 10 }, { type: 'gearRoom' }, { type: 'flat', len: 8 }, { type: 'arena' },
]);

export const ZONE_Q = L({ id: 'Q', name: 'Зоопарк ночью', theme: 'zoo', music: 'zoneA', boss: 'python', act: 2, outro: 'afterQ', seed: 261, ground: ['l', 'l', 'k'], air: ['y', 't'], water: true }, [
  { type: 'start' }, { type: 'flat', len: 12, air: true }, { type: 'gearRoom' }, { type: 'hazard', len: 12, kind: '~' }, { type: 'flat', len: 10, air: true }, { type: 'stepsUp', n: 2 }, { type: 'flat', len: 10 }, { type: 'stepsDown' },
  { type: 'climb', rise: 6, prize: 'g' }, { type: 'descent' }, { type: 'flat', len: 10, air: true }, { type: 'gearRoom' }, { type: 'gap', w: 4 }, { type: 'flat', len: 10 }, { type: 'arena' },
]);

export const ZONE_R = L({ id: 'R', name: 'Болото ведьмы Уинифред', theme: 'witch', music: 'zoneJ', boss: 'winifred', act: 2, outro: 'afterR', seed: 271, ground: ['z', 'l'], air: ['t', 'y', 'y'], water: true }, [
  { type: 'start' }, { type: 'flat', len: 12, air: true }, { type: 'hazard', len: 14, kind: '~', moving: true }, { type: 'gearRoom' }, { type: 'flat', len: 10 }, { type: 'stepsUp', n: 3 }, { type: 'flat', len: 10, air: true }, { type: 'stepsDown' },
  { type: 'hazard', len: 12, kind: '~' }, { type: 'climb', rise: 5, prize: 'g' }, { type: 'descent' }, { type: 'flat', len: 10, air: true }, { type: 'gearRoom' }, { type: 'flat', len: 8 }, { type: 'arena' },
]);

export const ZONE_S = L({ id: 'S', name: 'Подземный театр', theme: 'theatre', music: 'zoneG', boss: 'sewernose', act: 2, outro: 'afterS', seed: 281, ground: ['r', 'q'], air: ['t', 'j'], water: true }, [
  { type: 'start' }, { type: 'flat', len: 12, air: true }, { type: 'gearRoom' }, { type: 'flat', len: 10 }, { type: 'hazard', len: 12, kind: '~', moving: true }, { type: 'stepsUp', n: 3 }, { type: 'flat', len: 10, air: true }, { type: 'stepsDown' },
  { type: 'wallPuzzle' }, { type: 'tower', rise: 6, prize: 'g' }, { type: 'descent' }, { type: 'flat', len: 10 }, { type: 'gearRoom' }, { type: 'flat', len: 8 }, { type: 'arena' },
]);

export const ZONE_T = L({ id: 'T', name: 'Дирижабль Нимнула', theme: 'airship', music: 'zoneF', boss: 'nimmech', act: 2, outro: 'afterT', seed: 291, ground: ['m', 'w'], air: ['x', 'x', 'c'] }, [
  { type: 'start' }, { type: 'flat', len: 12, air: true }, { type: 'gap', w: 5 }, { type: 'gearRoom' }, { type: 'fans', len: 16 }, { type: 'flat', len: 8 }, { type: 'stepsUp', n: 3 }, { type: 'flat', len: 10, air: true },
  { type: 'gap', w: 5 }, { type: 'stepsDown' }, { type: 'hazard', len: 14, kind: '^', moving: true }, { type: 'climb', rise: 6, prize: 'g' }, { type: 'descent' }, { type: 'gearRoom' }, { type: 'flat', len: 8 }, { type: 'arena' },
]);

export const ZONE_U = L({ id: 'U', name: 'Небоскрёб «Громовержец»', theme: 'skyscraper', music: 'zoneJ', boss: 'fatcatfinal', act: 2, intro: 'beforeU', outro: 'ending2', seed: 301, ground: ['d', 'w', 'k'], air: ['x', 'x', 't'] }, [
  { type: 'start' }, { type: 'flat', len: 12, air: true }, { type: 'gap', w: 5 }, { type: 'flat', len: 10, air: true }, { type: 'gearRoom' }, { type: 'hazard', len: 14, kind: '^', moving: true }, { type: 'stepsUp', n: 3 }, { type: 'flat', len: 10, air: true },
  { type: 'gap', w: 5 }, { type: 'stepsDown' }, { type: 'wallPuzzle' }, { type: 'tower', rise: 8, prize: 'g' }, { type: 'descent' }, { type: 'flat', len: 10, air: true }, { type: 'gearRoom' }, { type: 'flat', len: 10 }, { type: 'arena' },
]);

export const ACT2 = { K: ZONE_K, L: ZONE_L, M: ZONE_M, N: ZONE_N, O: ZONE_O, P: ZONE_P, Q: ZONE_Q, R: ZONE_R, S: ZONE_S, T: ZONE_T, U: ZONE_U };
