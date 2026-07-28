import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildFabricTextStyles,
  normalizeStyleRanges,
  resolveCharStyles,
} from '../src/template-layout';

test('zakres nadaje styl tylko swoim znakom', () => {
  const chars = resolveCharStyles('Kochani Goscie', [{ start: 0, end: 7, fontWeight: 700 }]);

  assert.deepEqual(chars[0], { fontWeight: 700 });
  assert.deepEqual(chars[6], { fontWeight: 700 });
  assert.equal(chars[7], undefined);
  assert.equal(chars.length, 'Kochani Goscie'.length);
});

test('pozniejszy zakres wygrywa, ale nie kasuje pozostalych wlasciwosci', () => {
  const chars = resolveCharStyles('abcdef', [
    { start: 0, end: 6, fontWeight: 700 },
    { start: 2, end: 4, fontStyle: 'italic', fontWeight: 400 },
  ]);

  assert.deepEqual(chars[1], { fontWeight: 700 });
  assert.deepEqual(chars[2], { fontWeight: 400, fontStyle: 'italic' });
  assert.deepEqual(chars[5], { fontWeight: 700 });
});

test('zakres poza tekstem jest przycinany, nie wywraca renderowania', () => {
  const chars = resolveCharStyles('abc', [
    { start: 1, end: 99, fontStyle: 'italic' },
    { start: -5, end: 1, fill: '#ff0000' },
    { start: 3, end: 3, fontWeight: 700 },
  ]);

  assert.equal(chars.length, 3);
  assert.deepEqual(chars[0], { fill: '#ff0000' });
  assert.deepEqual(chars[2], { fontStyle: 'italic' });
});

test('style dla fabrica licza sie po zawinietych liniach', () => {
  const text = 'Babcie Blanke i Dziadka Antka';
  const chars = resolveCharStyles(text, [{ start: 7, end: 13, fontWeight: 700 }]);

  // Tak fabric zawinal tekst w ramce - druga linia zaczyna sie od "Blanke".
  const lines = ['Babcie ', 'Blanke i Dziadka Antka'];
  const styles = buildFabricTextStyles(lines, chars);

  assert.equal(styles[0], undefined, 'pierwsza linia nie ma stylowanych znakow');
  assert.deepEqual(styles[1][0], { fontWeight: 700 });
  assert.deepEqual(styles[1][5], { fontWeight: 700 });
  assert.equal(styles[1][6], undefined);
});

test('normalizeStyleRanges skleja sasiadujace zakresy o tym samym stylu', () => {
  const ranges = normalizeStyleRanges('abcdef', [
    { start: 0, end: 2, fontWeight: 700 },
    { start: 2, end: 4, fontWeight: 700 },
    { start: 4, end: 6, fontStyle: 'italic' },
  ]);

  assert.deepEqual(ranges, [
    { start: 0, end: 4, fontWeight: 700 },
    { start: 4, end: 6, fontStyle: 'italic' },
  ]);
});

test('brak zakresow daje pusta liste i same puste style', () => {
  assert.deepEqual(normalizeStyleRanges('abc', undefined), []);
  assert.deepEqual(resolveCharStyles('abc', null), [undefined, undefined, undefined]);
});
