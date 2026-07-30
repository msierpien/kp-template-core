import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import {
  buildTextPathD,
  getTextPathArcLength,
  getTextPathAnchorOffset,
  getTextPathBBox,
  isTextPathRadiusTooTight,
  resolveTextPathStartOffset,
  mmToPx,
  type TextPathGeometryInput,
} from '../src';

/**
 * Wartosci odniesienia sprawdzone spike'em w `fabric/node`: polokrag
 * o promieniu 100 px ma dlugosc 314 px, a jego bbox wysokosc 100 px (nie 200),
 * co daje kotwice `dy = r/2`. Te liczby sa kontraktem miedzy edytorem
 * i rendererem - jesli tu pekna, wydruk rozjedzie sie z podgladem.
 */

/** Promien 100 px przy 300 dpi to 8.47 mm. */
const R_MM = 100 / (300 / 25.4);
const R_PX = mmToPx(R_MM, 300);

function arc(overrides: Partial<TextPathGeometryInput> = {}): TextPathGeometryInput {
  return {
    pathShape: 'arc',
    radiusMm: R_MM,
    startAngle: 180,
    sweepAngle: 180,
    ...overrides,
  };
}

describe('buildTextPathD', () => {
  test('gorny polokrag to jeden luk od lewej do prawej', () => {
    const d = buildTextPathD(arc());

    // start 180 stopni = (-r, 0), koniec 360 = (r, 0)
    assert.match(d, /^M -100 0 A 100 100 0 0 1 100 (0|-0)$/);
  });

  test('pelny okrag sklada sie z DWOCH polukow', () => {
    // Jeden `A` na 360 stopni degeneruje sie do punktu - poczatek rowny
    // koncowi nie mowi przegladarce, ktora droga jechac.
    const d = buildTextPathD(arc({ pathShape: 'circle' }));
    const arcs = d.match(/A /g) || [];

    assert.equal(arcs.length, 2, 'okrag musi miec dwa luki');
  });

  test('sweep powyzej 180 stopni tez dzieli sie na dwa luki', () => {
    // Inaczej trzeba by ustawic large-arc-flag, a zly flag obraca luk na
    // przeciwna strone okregu.
    const d = buildTextPathD(arc({ sweepAngle: 270 }));
    assert.equal((d.match(/A /g) || []).length, 2);
  });

  test('ujemny sweep odwraca kierunek rysowania', () => {
    const clockwise = buildTextPathD(arc({ sweepAngle: 120 }));
    const counter = buildTextPathD(arc({ sweepAngle: -120 }));

    assert.match(clockwise, /0 0 1 /, 'dodatni sweep = flaga 1');
    assert.match(counter, /0 0 0 /, 'ujemny sweep = flaga 0');
  });

  test('kat ujemny liczy sie tak samo jak jego dodatni odpowiednik', () => {
    assert.equal(buildTextPathD(arc({ startAngle: -180 })), buildTextPathD(arc({ startAngle: 180 })));
  });

  test('sweep powyzej pelnego obrotu jest przycinany, nie zawija sie', () => {
    assert.equal(buildTextPathD(arc({ sweepAngle: 720 })), buildTextPathD(arc({ sweepAngle: 360 })));
  });
});

describe('getTextPathArcLength', () => {
  test('polokrag ma dlugosc PI * r', () => {
    // Spike w fabric/node: 314 px dla r = 100 px.
    assert.equal(Math.round(getTextPathArcLength(arc())), 314);
  });

  test('okrag ma dlugosc 2 * PI * r', () => {
    assert.equal(Math.round(getTextPathArcLength(arc({ pathShape: 'circle' }))), 628);
  });

  test('kierunek nie zmienia dlugosci', () => {
    assert.equal(
      getTextPathArcLength(arc({ sweepAngle: 90 })),
      getTextPathArcLength(arc({ sweepAngle: -90 }))
    );
  });
});

describe('getTextPathBBox i kotwica', () => {
  test('bbox gornego poluku ma wysokosc r, nie 2r', () => {
    // To zrodlo bledu "warstwa skacze po zapisie": srodek bboksu nie jest
    // srodkiem okregu.
    const box = getTextPathBBox(arc());

    assert.equal(box.width, R_PX * 2);
    assert.ok(Math.abs(box.height - R_PX) <= 1, `wysokosc ${box.height} ma byc ~${R_PX}`);
  });

  test('gorna polowka daje kotwice dy = -r/2', () => {
    // Luk 180-360 stopni idzie w GORE (os Y w dol), wiec srodek bboksu lezy
    // o r/2 NAD srodkiem okregu.
    const { dx, dy } = getTextPathAnchorOffset(arc());

    assert.ok(Math.abs(dx) <= 1, `dx ${dx} ma byc ~0`);
    assert.ok(Math.abs(dy + R_PX / 2) <= 1, `dy ${dy} ma byc ~${-R_PX / 2}`);
  });

  test('dolna polowka daje kotwice po drugiej stronie', () => {
    const { dy } = getTextPathAnchorOffset(arc({ startAngle: 0 }));
    assert.ok(Math.abs(dy - R_PX / 2) <= 1, `dy ${dy} ma byc ~${R_PX / 2}`);
  });

  test('pelny okrag jest wysrodkowany na srodku okregu', () => {
    const { dx, dy } = getTextPathAnchorOffset(arc({ pathShape: 'circle' }));

    assert.equal(dx, 0);
    assert.equal(dy, 0);
  });

  test('bbox nigdy nie ma zerowego wymiaru', () => {
    // Zerowa szerokosc albo wysokosc nie przeszlaby walidacji struktury layoutu.
    const box = getTextPathBBox(arc({ sweepAngle: 0 }));

    assert.ok(box.width >= 1);
    assert.ok(box.height >= 1);
  });
});

describe('resolveTextPathStartOffset', () => {
  test('wysrodkowanie zostawia rowne zapasy po obu stronach', () => {
    // Spike: luk 314 px, napis 190 px, offset 62 px daje symetryczny napis.
    assert.equal(resolveTextPathStartOffset('center', 314, 190), 62);
  });

  test('start to zawsze zero', () => {
    assert.equal(resolveTextPathStartOffset('start', 314, 190), 0);
  });

  test('koniec dosuwa napis do konca luku', () => {
    assert.equal(resolveTextPathStartOffset('end', 314, 190), 124);
  });

  test('napis dluzszy niz luk zaczyna sie na jego poczatku', () => {
    // Ujemny offset cofnalby napis PRZED luk - o niemieszczeniu sie ostrzega
    // walidacja, ale rysowac trzeba od poczatku.
    assert.equal(resolveTextPathStartOffset('center', 200, 500), 0);
    assert.equal(resolveTextPathStartOffset('end', 200, 500), 0);
  });
});

describe('isTextPathRadiusTooTight', () => {
  test('promien mniejszy niz 1.5 wysokosci pisma jest za ciasny', () => {
    // Litery stoja prostopadle do krzywej - przy malym promieniu ich dolne
    // krawedzie zbiegaja sie i zlepiaja.
    assert.equal(isTextPathRadiusTooTight(pxToMmAt300(60), 50), true);
  });

  test('szeroki luk przy tym samym pismie jest w porzadku', () => {
    assert.equal(isTextPathRadiusTooTight(pxToMmAt300(300), 50), false);
  });

  test('zerowy promien albo zerowe pismo zawsze jest bledem', () => {
    assert.equal(isTextPathRadiusTooTight(0, 20), true);
    assert.equal(isTextPathRadiusTooTight(10, 0), true);
  });
});

/** Pomocnik: piksele przy 300 dpi na milimetry (bez zaokraglania w druga strone). */
function pxToMmAt300(px: number): number {
  return (px / 300) * 25.4;
}
