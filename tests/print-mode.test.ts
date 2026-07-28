import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  hasMixedPageSizes,
  shouldPrintPagesSeparately,
  type TemplateLayoutJson,
  type TemplatePage,
} from '../src/template-layout';

function makePage(id: string, widthMm: number, heightMm: number): TemplatePage {
  return {
    id,
    name: id,
    canvas: {
      width: Math.round((widthMm / 25.4) * 300),
      height: Math.round((heightMm / 25.4) * 300),
      unit: 'mm',
      widthMm,
      heightMm,
      dpi: 300,
      bleed: 0,
      safeArea: 0,
      backgroundColor: '#ffffff',
    },
    layers: [],
  };
}

function makeLayout(pages: TemplatePage[], print?: TemplateLayoutJson['print']): TemplateLayoutJson {
  return {
    version: 2,
    canvas: pages[0].canvas,
    fonts: [],
    layers: pages[0].layers,
    pages,
    ...(print ? { print } : {}),
  };
}

test('przod i tyl tej samej karty skladaja sie na jednym arkuszu', () => {
  const layout = makeLayout([makePage('page-1', 90, 50), makePage('page-2', 90, 50)]);

  assert.equal(hasMixedPageSizes(layout), false);
  assert.equal(shouldPrintPagesSeparately(layout), false);
});

test('kartki o roznych wymiarach ida na osobne arkusze', () => {
  const layout = makeLayout([makePage('page-1', 90, 135), makePage('page-2', 95, 145)]);

  assert.equal(hasMixedPageSizes(layout), true);
  assert.equal(shouldPrintPagesSeparately(layout), true);
});

test('jawny print.mode wygrywa z wymiarami stron', () => {
  const sameSize = [makePage('page-1', 90, 50), makePage('page-2', 90, 50)];
  const mixed = [makePage('page-1', 90, 135), makePage('page-2', 95, 145)];
  const print = { sheet: { widthMm: 100, heightMm: 100 }, placements: [] };

  assert.equal(shouldPrintPagesSeparately(makeLayout(sameSize, { ...print, mode: 'separate' })), true);
  assert.equal(shouldPrintPagesSeparately(makeLayout(mixed, { ...print, mode: 'sheet' })), false);
});

test('jedna strona nigdy nie jest "mieszana"', () => {
  assert.equal(hasMixedPageSizes(makeLayout([makePage('page-1', 90, 135)])), false);
  assert.equal(shouldPrintPagesSeparately(null), false);
});
