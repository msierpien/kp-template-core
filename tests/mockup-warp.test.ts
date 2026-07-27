import assert from 'node:assert/strict';
import { test } from 'node:test';
import { quadToPixels, squareToQuad, type Quad } from '../src/mockup-warp';

const quad: Quad = [
  { x: 100, y: 60 },
  { x: 500, y: 20 },
  { x: 520, y: 380 },
  { x: 80, y: 300 },
];

test('homografia odwzorowuje rogi kwadratu jednostkowego na rogi czworokata', () => {
  const map = squareToQuad(quad);
  const corners: Array<[number, number]> = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];

  corners.forEach(([u, v], index) => {
    const point = map(u, v);
    assert.ok(Math.abs(point.x - quad[index].x) < 1e-6, `rog ${index}: x ${point.x}`);
    assert.ok(Math.abs(point.y - quad[index].y) < 1e-6, `rog ${index}: y ${point.y}`);
  });
});

test('perspektywa: srodek projektu nie jest srednia rogow', () => {
  const map = squareToQuad(quad);
  const center = map(0.5, 0.5);
  const average = {
    x: quad.reduce((sum, p) => sum + p.x, 0) / 4,
    y: quad.reduce((sum, p) => sum + p.y, 0) / 4,
  };

  // Przy zbieznych bokach punkt zbiegu przesuwa srodek - gdyby kod robil samo
  // bilinearne mieszanie rogow, obie wartosci bylyby identyczne.
  const distance = Math.hypot(center.x - average.x, center.y - average.y);
  assert.ok(distance > 0.5, `oczekiwano przesuniecia srodka, jest ${distance.toFixed(3)} px`);
});

test('rownoleglobok sprowadza sie do mapy afinicznej', () => {
  const parallelogram: Quad = [
    { x: 0, y: 0 },
    { x: 100, y: 20 },
    { x: 120, y: 120 },
    { x: 20, y: 100 },
  ];
  const map = squareToQuad(parallelogram);
  const center = map(0.5, 0.5);

  assert.ok(Math.abs(center.x - 60) < 1e-6, `x ${center.x}`);
  assert.ok(Math.abs(center.y - 60) < 1e-6, `y ${center.y}`);
});

test('quadToPixels skaluje rogi znormalizowane do rozmiaru zdjecia', () => {
  const normalized: Quad = [
    { x: 0.1, y: 0.2 },
    { x: 0.9, y: 0.2 },
    { x: 0.9, y: 0.8 },
    { x: 0.1, y: 0.8 },
  ];
  const pixels = quadToPixels(normalized, 1000, 500);

  assert.deepEqual(pixels[0], { x: 100, y: 100 });
  assert.deepEqual(pixels[2], { x: 900, y: 400 });
});

/*
 * Test rysowania na prawdziwym canvasie (node-canvas) zostaje w kp-api:
 * `canvas` to zaleznosc natywna wymagajaca cairo, a ten pakiet ma byc lekki
 * i instalowac sie tak samo na serwerze, jak w buildzie Vercela. Tutaj
 * pilnujemy samej geometrii - to ona musi byc identyczna w podgladzie
 * i w wydruku.
 */
