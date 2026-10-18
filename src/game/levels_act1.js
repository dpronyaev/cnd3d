// Act I: eleven zones re-imagined from the original game's themes (new layouts following the original beats).
import { generate } from './levelgen.js';

const L = (meta, chunks) => generate({ ...meta, chunks });

export const ZONE_0 = L({ id: '0', name: 'Улица и лаборатория', theme: 'street', music: 'zone0', boss: 'brusher', act: 1, outro: 'afterZone0', seed: 11, ground: ['d', 'd', 'm'], air: [] }, [
  { type: 'start' }, { type: 'flat', len: 14 }, { type: 'gap', w: 3 }, { type: 'flat', len: 10 }, { type: 'stepsUp', n: 2 }, { type: 'flat', len: 8 }, { type: 'gap', w: 5 },
  { type: 'flat', len: 10 }, { type: 'stepsDown' }, { type: 'wallPuzzle' }, { type: 'flat', len: 12 }, { type: 'climb', rise: 4, prize: 'T' }, { type: 'flat', len: 8 }, { type: 'descent' },
  { type: 'flat', len: 12 }, { type: 'arena' },
]);

export const ZONE_A = L({ id: 'A', name: 'Верхушки деревьев', theme: 'tree', music: 'zoneA', boss: 'owl', act: 1, outro: 'gadgetLetter1', seed: 21, solid: '#', alt: '%', ground: ['b'], air: ['b', 's'] }, [
  { type: 'start' }, { type: 'flat', len: 12, air: true }, { type: 'gap', w: 4 }, { type: 'flat', len: 8 }, { type: 'tower', rise: 8, prize: 'a' }, { type: 'flat', len: 10, air: true }, { type: 'climb', rise: 3, prize: '*' },
  { type: 'flat', len: 8 }, { type: 'descent' }, { type: 'flat', len: 10 }, { type: 'gap', w: 5 }, { type: 'flat', len: 10, air: true }, { type: 'tower', rise: 6, prize: 'T' }, { type: 'descent' }, { type: 'flat', len: 8 }, { type: 'arena' },
]);

export const ZONE_B = L({ id: 'B', name: 'Закусочная', theme: 'kitchen', music: 'zoneB', boss: 'rocket', act: 1, seed: 31, ground: ['m', 'm', 'l'], air: ['c'], water: true }, [
  { type: 'start' }, { type: 'flat', len: 12 }, { type: 'steam' }, { type: 'flat', len: 8 }, { type: 'hazard', len: 12, kind: '~', cranes: true }, { type: 'flat', len: 10 }, { type: 'stepsUp', n: 3 }, { type: 'flat', len: 10 },
  { type: 'stepsDown' }, { type: 'steam', len: 14 }, { type: 'hazard', len: 14, kind: '~', cranes: true }, { type: 'flat', len: 10 }, { type: 'wallPuzzle' }, { type: 'flat', len: 8 }, { type: 'arena' },
]);

export const ZONE_C = L({ id: 'C', name: 'Библиотека', theme: 'library', music: 'zoneA', boss: null, act: 1, outro: 'gadgetLetter2', seed: 41, ground: ['l', 'l'], air: ['s', 's', 't'] }, [
  { type: 'start' }, { type: 'flat', len: 12, air: true }, { type: 'stepsUp', n: 3 }, { type: 'flat', len: 10, air: true }, { type: 'gap', w: 4 }, { type: 'flat', len: 8 }, { type: 'climb', rise: 5, prize: 'Z' }, { type: 'flat', len: 10 },
  { type: 'descent' }, { type: 'flat', len: 12, air: true }, { type: 'wallPuzzle' }, { type: 'gap', w: 5 }, { type: 'flat', len: 12 }, { type: 'tower', rise: 6, prize: '1' }, { type: 'descent' }, { type: 'flat', len: 10 }, { type: 'exit' },
]);

export const ZONE_D = L({ id: 'D', name: 'Магазин игрушек', theme: 'toystore', music: 'zoneD', boss: 'robot', act: 1, outro: 'gadgetLetter2', seed: 51, ground: ['w', 'm'], air: ['c', 'c'] }, [
  { type: 'start' }, { type: 'flat', len: 12, air: true }, { type: 'fallers', len: 16 }, { type: 'flat', len: 8 }, { type: 'stepsUp', n: 2 }, { type: 'flat', len: 10, air: true }, { type: 'gap', w: 4 }, { type: 'stepsDown' },
  { type: 'fallers', len: 18 }, { type: 'flat', len: 8 }, { type: 'wallPuzzle' }, { type: 'climb', rise: 4, prize: 'T' }, { type: 'descent' }, { type: 'flat', len: 10, air: true }, { type: 'arena' },
]);

export const ZONE_E = L({ id: 'E', name: 'Сад и фонтан', theme: 'garden', music: 'zoneA', boss: 'grouper', act: 1, seed: 61, ground: ['b'], air: ['b', 'n'], water: true }, [
  { type: 'start' }, { type: 'flat', len: 12, air: true }, { type: 'gap', w: 3 }, { type: 'flat', len: 10, air: true }, { type: 'hazard', len: 14, kind: '~', boat: true }, { type: 'flat', len: 10 }, { type: 'stepsUp', n: 2 }, { type: 'flat', len: 10, air: true },
  { type: 'stepsDown' }, { type: 'climb', rise: 5, prize: 'T' }, { type: 'descent' }, { type: 'hazard', len: 12, kind: '~' }, { type: 'flat', len: 10 }, { type: 'arena', water: true },
]);

export const ZONE_F = L({ id: 'F', name: 'Машинное отделение', theme: 'machine', music: 'zoneF', boss: null, act: 1, outro: 'beforeCasino', seed: 71, ground: ['m', 'm'], air: ['c'] }, [
  { type: 'start' }, { type: 'flat', len: 10 }, { type: 'hazard', len: 12, kind: '^', moving: true }, { type: 'flat', len: 8 }, { type: 'stepsUp', n: 3 }, { type: 'flat', len: 10 }, { type: 'gap', w: 5 }, { type: 'flat', len: 8 },
  { type: 'stepsDown' }, { type: 'hazard', len: 16, kind: '^', moving: true }, { type: 'flat', len: 10 }, { type: 'climb', rise: 6, prize: 'T' }, { type: 'flat', len: 8 }, { type: 'descent' }, { type: 'wallPuzzle' }, { type: 'flat', len: 8 }, { type: 'exit' },
]);

export const ZONE_G = L({ id: 'G', name: 'Казино Толстопуза', theme: 'casino', music: 'zoneG', boss: 'casinocat', act: 1, outro: 'afterCasino', seed: 81, ground: ['q', 'q', 'l'], air: ['t'] }, [
  { type: 'start' }, { type: 'flat', len: 12 }, { type: 'gap', w: 4 }, { type: 'flat', len: 10, air: true }, { type: 'stepsUp', n: 3 }, { type: 'flat', len: 12 }, { type: 'gap', w: 5 }, { type: 'stepsDown' },
  { type: 'wallPuzzle' }, { type: 'flat', len: 12, air: true }, { type: 'climb', rise: 5, prize: 'T' }, { type: 'descent' }, { type: 'flat', len: 10 }, { type: 'arena' },
]);

export const ZONE_H = L({ id: 'H', name: 'Водопровод', theme: 'sewer', music: 'zoneF', boss: null, act: 1, seed: 91, ground: ['r', 'r'], air: ['j'], water: true }, [
  { type: 'start' }, { type: 'flat', len: 12 }, { type: 'hazard', len: 12, kind: '~' }, { type: 'flat', len: 8 }, { type: 'stepsUp', n: 2 }, { type: 'flat', len: 10, air: true }, { type: 'stepsDown' }, { type: 'hazard', len: 14, kind: '~', moving: true },
  { type: 'flat', len: 10 }, { type: 'climb', rise: 5, prize: 'T' }, { type: 'descent' }, { type: 'wallPuzzle' }, { type: 'hazard', len: 10, kind: '~' }, { type: 'flat', len: 10 }, { type: 'exit' },
]);

export const ZONE_I = L({ id: 'I', name: 'Склад и вентиляторы', theme: 'office', music: 'zoneF', boss: 'caterpillar', act: 1, outro: 'beforeFinal', seed: 101, ground: ['m', 'm', 'l'], air: ['c'] }, [
  { type: 'start' }, { type: 'flat', len: 12 }, { type: 'fans', len: 16 }, { type: 'flat', len: 8 }, { type: 'stepsUp', n: 3 }, { type: 'flat', len: 10 }, { type: 'gap', w: 4 }, { type: 'stepsDown' },
  { type: 'fans', len: 18 }, { type: 'flat', len: 8 }, { type: 'climb', rise: 5, prize: 'T' }, { type: 'descent' }, { type: 'wallPuzzle' }, { type: 'flat', len: 10 }, { type: 'arena' },
]);

export const ZONE_J = L({ id: 'J', name: 'Фабрика Толстопуза', theme: 'factory', music: 'zoneJ', boss: 'fatcat', act: 1, outro: 'ending1', seed: 111, ground: ['d', 'w', 'd'], air: ['c', 'x'] }, [
  { type: 'start' }, { type: 'flat', len: 12, air: true }, { type: 'hazard', len: 12, kind: '^', moving: true }, { type: 'flat', len: 10 }, { type: 'stepsUp', n: 3 }, { type: 'flat', len: 10, air: true }, { type: 'gap', w: 5 }, { type: 'stepsDown' },
  { type: 'wallPuzzle' }, { type: 'flat', len: 10 }, { type: 'hazard', len: 14, kind: '^', moving: true }, { type: 'climb', rise: 6, prize: 'T' }, { type: 'descent' }, { type: 'flat', len: 12, air: true }, { type: 'arena' },
]);

export const ACT1 = { '0': ZONE_0, A: ZONE_A, B: ZONE_B, C: ZONE_C, D: ZONE_D, E: ZONE_E, F: ZONE_F, G: ZONE_G, H: ZONE_H, I: ZONE_I, J: ZONE_J };
