import { strict as assert } from 'node:assert';
import test from 'node:test';

import { applyTextTransform, resolveTextStroke } from '../src/text-style';
import { normalizeStyleRanges, resolveCharStyles } from '../src/template-layout';

test('wersaliki nie gubia polskich znakow', () => {
  assert.equal(applyTextTransform('Zażółć gęślą jaźń', 'uppercase'), 'ZAŻÓŁĆ GĘŚLĄ JAŹŃ');
  assert.equal(applyTextTransform('ŁÓDŹ', 'lowercase'), 'łódź');
});

test('capitalize podnosi pierwsza litere kazdego slowa', () => {
  assert.equal(applyTextTransform('anna kowalska', 'capitalize'), 'Anna Kowalska');
  assert.equal(applyTextTransform('ala ma kota', 'capitalize'), 'Ala Ma Kota');
});

test('capitalize nie rozbija imion z myslnikiem i apostrofem', () => {
  // `\b` podnioslby litere po myslniku i apostrofie - przy nazwisku wpisanym
  // przez klienta to nie jest to, czego sie po tej opcji oczekuje.
  assert.equal(applyTextTransform('anna-maria', 'capitalize'), 'Anna-maria');
  assert.equal(applyTextTransform("o'brien", 'capitalize'), "O'brien");
});

test('brak transformacji zostawia tresc bez zmian', () => {
  assert.equal(applyTextTransform('Amelia i Kacper', 'none'), 'Amelia i Kacper');
  assert.equal(applyTextTransform('Amelia i Kacper', undefined), 'Amelia i Kacper');
  assert.equal(applyTextTransform('', 'uppercase'), '');
});

test('transformacja nie zmienia liczby znakow - indeksy styleRanges zostaja zgodne', () => {
  // To jest warunek, na ktorym stoi pogrubienie fragmentu: zakresy liczymy na
  // surowej tresci warstwy, a renderer transformuje ja tuz przed rysowaniem.
  for (const transform of ['uppercase', 'lowercase', 'capitalize'] as const) {
    const source = 'Zażółć gęślą jaźń';
    assert.equal(
      applyTextTransform(source, transform).length,
      source.length,
      `${transform} zmienil dlugosc tekstu`
    );
  }
});

test('pogrubiony fragment zostaje na tym samym slowie po wersalikach', () => {
  const source = 'Amelia i Kacper';
  const ranges = normalizeStyleRanges(source, [{ start: 9, end: 15, fontWeight: 700 }]);
  const transformed = applyTextTransform(source, 'uppercase');

  assert.equal(source.slice(9, 15), 'Kacper');
  assert.equal(transformed.slice(9, 15), 'KACPER');

  const styles = resolveCharStyles(transformed, ranges);
  assert.equal(styles[9]?.fontWeight, 700);
  assert.equal(styles[8]?.fontWeight, undefined);
});

test('obrys liczy grubosc z milimetrow, bez zaokraglania do pelnych pikseli', () => {
  const stroke = resolveTextStroke({ stroke: '#ffffff', strokeWidthMm: 0.2 }, 300);
  assert.ok(stroke);
  assert.equal(stroke!.stroke, '#ffffff');
  // 0,2 mm przy 300 dpi to 2,36 px, razy dwa bo polowe obrysu zakrywa
  // wypelnienie. Zaokraglenie do pelnych pikseli zjadaloby cala roznice
  // miedzy "ledwie widoczny" a "gruby".
  assert.ok(Math.abs(stroke!.strokeWidth - 4.724) < 0.01, String(stroke!.strokeWidth));
  assert.equal(stroke!.paintFirst, 'stroke', 'obrys musi isc pod wypelnienie');
});

test('obrys skaluje sie razem z podgladem', () => {
  const full = resolveTextStroke({ stroke: '#fff', strokeWidthMm: 1 }, 300, 1)!;
  const half = resolveTextStroke({ stroke: '#fff', strokeWidthMm: 1 }, 300, 0.5)!;
  assert.ok(Math.abs(half.strokeWidth - full.strokeWidth / 2) < 0.0001);
});

test('brak koloru albo zerowa grubosc znaczy brak obrysu', () => {
  assert.equal(resolveTextStroke({ strokeWidthMm: 1 }, 300), null);
  assert.equal(resolveTextStroke({ stroke: '#fff' }, 300), null);
  assert.equal(resolveTextStroke({ stroke: '#fff', strokeWidthMm: 0 }, 300), null);
  assert.equal(resolveTextStroke({ stroke: 'transparent', strokeWidthMm: 1 }, 300), null);
  assert.equal(resolveTextStroke({ stroke: 'none', strokeWidthMm: 1 }, 300), null);
  assert.equal(resolveTextStroke(undefined, 300), null);
});

test('kolor wiodacy przechodzi przez obrys tekstu', () => {
  // `currentColor` rozwiazuje kaskada layoutu; tutaj pilnujemy tylko tego, ze
  // obrys nie odrzuca wartosci, ktorej kaskada jeszcze nie podmienila.
  const stroke = resolveTextStroke({ stroke: 'currentColor', strokeWidthMm: 0.5 }, 300);
  assert.equal(stroke?.stroke, 'currentColor');
});
