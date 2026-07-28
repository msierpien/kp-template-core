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

  // Fabric zjada spacje na zlamaniu - druga linia zaczyna sie od "Blanke",
  // a w surowym tekscie ten znak ma indeks 7, nie 6.
  const lines = ['Babcie', 'Blanke i Dziadka Antka'];
  const styles = buildFabricTextStyles(text, lines, chars);

  assert.equal(styles[0], undefined, 'pierwsza linia nie ma stylowanych znakow');
  assert.deepEqual(styles[1][0], { fontWeight: 700 });
  assert.deepEqual(styles[1][5], { fontWeight: 700 });
  assert.equal(styles[1][6], undefined);
});

test('kolejne zlamania nie przesuwaja stylu', () => {
  const text = 'Babcie Blanke i Dziadka Antka na uroczystosc';
  // Ostatnie slowo - najbardziej narazone na kumulacje bledu.
  const chars = resolveCharStyles(text, [{ start: 33, end: 44, fontStyle: 'italic' }]);

  // Zawijanie fabrica dla ramki 150 px (sprawdzone na zywym obiekcie).
  const lines = ['Babcie Blanke i', 'Dziadka Antka', 'na uroczystosc'];
  const styles = buildFabricTextStyles(text, lines, chars);

  assert.equal(styles[0], undefined);
  assert.equal(styles[1], undefined);
  assert.deepEqual(styles[2][3], { fontStyle: 'italic' }, 'kursywa zaczyna sie od "uroczystosc"');
  assert.equal(styles[2][2], undefined, 'spacja przed slowem zostaje bez stylu');
});

test('twardy koniec linii tez nie rozjezdza indeksow', () => {
  const text = 'wraz z Rodzicami\nz radoscia pragnie zaprosic';
  const chars = resolveCharStyles(text, [{ start: 17, end: 28, fontWeight: 700 }]);
  const lines = ['wraz z Rodzicami', 'z radoscia', 'pragnie zaprosic'];
  const styles = buildFabricTextStyles(text, lines, chars);

  assert.equal(styles[0], undefined);
  assert.deepEqual(styles[1][0], { fontWeight: 700 }, 'pogrubienie startuje za znakiem nowej linii');
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
