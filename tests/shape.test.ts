import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import {
  buildDashArray,
  buildShapeGeometry,
  isTransparentFill,
  resolveBorderRadiusPx,
  resolveFillColor,
  resolveLineLayerHeightPx,
  resolveStrokeStyle,
  resolveStrokeWidthPx,
  type ShapeLayerInput,
  type ShapeProperties,
} from '../src';

/**
 * Te liczby sa kontraktem miedzy edytorem a rendererem druku. Figura policzona
 * inaczej po obu stronach daje podglad zgodny z niczym - i widac to dopiero
 * na papierze.
 *
 * Przelicznik: 1 mm przy 300 dpi to 11.811 px, przy 600 dpi dwa razy tyle.
 */
const PX_PER_MM_300 = 300 / 25.4;

function props(overrides: Partial<ShapeProperties> = {}): ShapeProperties {
  return {
    type: 'shape',
    shapeType: 'rectangle',
    fill: '',
    stroke: '#000000',
    strokeWidth: 1,
    borderRadius: 0,
    ...overrides,
  };
}

function layer(overrides: Partial<ShapeLayerInput> = {}): ShapeLayerInput {
  return {
    x: 500,
    y: 400,
    width: 200,
    height: 100,
    rotation: 0,
    opacity: 1,
    properties: props(),
    ...overrides,
  };
}

describe('resolveStrokeWidthPx', () => {
  test('milimetry maja pierwszenstwo przed pikselami', () => {
    const width = resolveStrokeWidthPx(props({ strokeWidth: 1, strokeWidthMm: 0.5 }), 300);

    assert.equal(Math.round(width * 1000) / 1000, Math.round(0.5 * PX_PER_MM_300 * 1000) / 1000);
  });

  test('ta sama grubosc w mm daje dwa razy wiecej pikseli przy 600 dpi', () => {
    const at300 = resolveStrokeWidthPx(props({ strokeWidthMm: 0.5 }), 300);
    const at600 = resolveStrokeWidthPx(props({ strokeWidthMm: 0.5 }), 600);

    assert.equal(Math.round(at600 * 1000) / 1000, Math.round(at300 * 2 * 1000) / 1000);
  });

  test('bez pola w mm zostaja piksele - stare szablony rysuja sie jak dotad', () => {
    assert.equal(resolveStrokeWidthPx(props({ strokeWidth: 3 }), 300), 3);
  });

  test('cienka kreska NIE jest zaokraglana do pelnych pikseli', () => {
    // 0.1 mm przy 300 dpi to 1.18 px. Zaokraglenie zrownaloby ja z 0.2 mm,
    // a to wlasnie ta roznica, ktora projektant ustawia.
    const thin = resolveStrokeWidthPx(props({ strokeWidthMm: 0.1 }), 300);
    const thicker = resolveStrokeWidthPx(props({ strokeWidthMm: 0.2 }), 300);

    assert.notEqual(thin, thicker);
    assert.ok(thin > 1 && thin < 2);
  });

  test('ujemna i niepoprawna wartosc schodzi do zera', () => {
    assert.equal(resolveStrokeWidthPx(props({ strokeWidth: -5 }), 300), 0);
    assert.equal(
      resolveStrokeWidthPx(props({ strokeWidth: 2, strokeWidthMm: -1 }), 300),
      2
    );
  });
});

describe('resolveBorderRadiusPx', () => {
  test('milimetry maja pierwszenstwo, piksele zostaja jako zapas', () => {
    assert.equal(
      Math.round(resolveBorderRadiusPx(props({ borderRadius: 4, borderRadiusMm: 2 }), 300)),
      Math.round(2 * PX_PER_MM_300)
    );
    assert.equal(resolveBorderRadiusPx(props({ borderRadius: 4 }), 300), 4);
  });
});

describe('buildDashArray', () => {
  test('linia ciagla nie ma tablicy - fabric rysuje ja wtedy bez przerw', () => {
    assert.equal(buildDashArray('solid', 10), undefined);
  });

  test('wzor jest proporcjonalny do grubosci', () => {
    assert.deepEqual(buildDashArray('dashed', 4), [12, 8]);
    assert.deepEqual(buildDashArray('dashed', 8), [24, 16]);
    assert.deepEqual(buildDashArray('dotted', 4), [4, 8]);
  });

  test('zerowa grubosc nie daje wzoru - nie ma czego kreskowac', () => {
    assert.equal(buildDashArray('dashed', 0), undefined);
  });
});

describe('resolveStrokeStyle', () => {
  test('odczytuje z powrotem styl zapisany w szablonie', () => {
    const strokeWidthMm = 0.5;
    const widthPx = resolveStrokeWidthPx(props({ strokeWidthMm }), 300);

    const dashed = props({ strokeWidthMm, strokeDashArray: buildDashArray('dashed', widthPx) });
    const dotted = props({ strokeWidthMm, strokeDashArray: buildDashArray('dotted', widthPx) });

    assert.equal(resolveStrokeStyle(dashed, 300), 'dashed');
    assert.equal(resolveStrokeStyle(dotted, 300), 'dotted');
    assert.equal(resolveStrokeStyle(props({ strokeWidthMm }), 300), 'solid');
    assert.equal(resolveStrokeStyle(props({ strokeWidthMm, strokeDashArray: [] }), 300), 'solid');
  });
});

describe('resolveFillColor', () => {
  test('trzy zapisy braku wypelnienia znacza to samo', () => {
    for (const value of ['', 'transparent', 'none', 'TRANSPARENT', '  ']) {
      assert.equal(isTransparentFill(value), true, `${value} powinno byc puste`);
      assert.equal(resolveFillColor(value), '');
    }

    assert.equal(resolveFillColor('#ff0000'), '#ff0000');
    assert.equal(isTransparentFill('#ff0000'), false);
  });
});

describe('buildShapeGeometry', () => {
  test('prostokat: srodek warstwy zostaje srodkiem figury', () => {
    const geometry = buildShapeGeometry(layer({ properties: props({ fill: '#ff0000' }) }), 300);

    assert.equal(geometry.kind, 'rect');
    assert.equal(geometry.left, 500);
    assert.equal(geometry.top, 400);
    assert.equal(geometry.width, 200);
    assert.equal(geometry.height, 100);
    assert.equal(geometry.fill, '#ff0000');
  });

  test('zaokraglenie rogow nie przekracza polowy boku', () => {
    const geometry = buildShapeGeometry(
      layer({ width: 100, height: 40, properties: props({ borderRadius: 500 }) }),
      300
    );

    assert.equal(geometry.rx, 50);
    assert.equal(geometry.ry, 20);
  });

  test('linia to odcinek poziomy przez srodek, bez wypelnienia', () => {
    const geometry = buildShapeGeometry(
      layer({
        width: 300,
        properties: props({ shapeType: 'line', fill: '#00ff00', strokeWidthMm: 0.5 }),
      }),
      300
    );

    assert.equal(geometry.kind, 'line');
    assert.deepEqual(geometry.points, [-150, 0, 150, 0]);
    // Wypelnienie pod cienka kreska rysowaloby pasek szerszy od niej samej.
    assert.equal(geometry.fill, '');
  });

  test('kolo trzyma sie krotszego boku, elipsa bierze oba', () => {
    const circle = buildShapeGeometry(
      layer({ width: 200, height: 120, properties: props({ shapeType: 'circle' }) }),
      300
    );
    const ellipse = buildShapeGeometry(
      layer({ width: 200, height: 120, properties: props({ shapeType: 'ellipse' }) }),
      300
    );

    assert.equal(circle.rx, 60);
    assert.equal(circle.ry, 60);
    assert.equal(circle.width, 120);
    assert.equal(ellipse.rx, 100);
    assert.equal(ellipse.ry, 60);
  });

  test('skala podgladu mnozy wszystko rowno - takze grubosc i kreskowanie', () => {
    const shapeProps = props({
      shapeType: 'rectangle',
      strokeWidthMm: 1,
      strokeDashArray: [30, 20],
    });

    const full = buildShapeGeometry(layer({ properties: shapeProps }), 300, 1);
    const half = buildShapeGeometry(layer({ properties: shapeProps }), 300, 0.5);

    assert.equal(half.left, full.left / 2);
    assert.equal(half.width, full.width / 2);
    assert.equal(half.strokeWidth, full.strokeWidth / 2);
    assert.deepEqual(half.strokeDashArray, [15, 10]);
  });

  test('obrot i krycie warstwy ida do figury bez zmian', () => {
    const geometry = buildShapeGeometry(
      layer({ rotation: 90, opacity: 0.4, properties: props({ shapeType: 'line' }) }),
      300
    );

    assert.equal(geometry.angle, 90);
    assert.equal(geometry.opacity, 0.4);
  });
});

describe('resolveLineLayerHeightPx', () => {
  test('wysokosc warstwy linii to jej grubosc, nigdy zero', () => {
    assert.equal(resolveLineLayerHeightPx(props({ strokeWidthMm: 1 }), 300), 12);
    assert.equal(resolveLineLayerHeightPx(props({ strokeWidth: 0 }), 300), 1);
  });
});
