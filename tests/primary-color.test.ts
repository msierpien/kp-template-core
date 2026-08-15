import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import {
  CURRENT_COLOR,
  applyPrimaryColor,
  isCurrentColor,
  resolvePrimaryColor,
  type TemplateLayoutJson,
} from '../src/template-layout';
import { layoutOverridesSchema } from '../src/layout-overrides';

const layout = { primaryColor: '#2f3437' } as TemplateLayoutJson;

describe('kolor wiodacy projektu', () => {
  test('wybor klienta wygrywa z ustawieniem szablonu', () => {
    assert.equal(resolvePrimaryColor(layout, { primaryColor: '#7f1d1d' }), '#7f1d1d');
    assert.equal(resolvePrimaryColor(layout, null), '#2f3437');
  });

  test('smiec od klienta nie przebija szablonu', () => {
    // Kolor idzie prosto do rasteryzacji SVG i do fabrica - wartosc spoza
    // zapisu hex musi odpasc, a nie zostac wstrzyknieta.
    for (const bad of ['red', 'url(#x)', '#zzz', '', null, 42, '#12345678901']) {
      assert.equal(resolvePrimaryColor(layout, { primaryColor: bad }), '#2f3437', `nie odrzucono: ${bad}`);
    }
  });

  test('bez koloru w szablonie i u klienta wychodzi null, nie czern', () => {
    // Domyslna czern zamalowalaby projekt, ktory swiadomie uzywa wlasnych
    // barw warstw - lepiej powiedziec "nie ma", niz zgadywac.
    assert.equal(resolvePrimaryColor({} as TemplateLayoutJson, null), null);
    assert.equal(resolvePrimaryColor(null, null), null);
  });

  test('podstawienie dotyczy wylacznie currentColor', () => {
    assert.equal(applyPrimaryColor(CURRENT_COLOR, '#7f1d1d'), '#7f1d1d');
    assert.equal(applyPrimaryColor('currentcolor', '#7f1d1d'), '#7f1d1d');
    assert.equal(applyPrimaryColor('#111111', '#7f1d1d'), '#111111');
    // Bez koloru wiodacego wartosc zostaje nietknieta.
    assert.equal(applyPrimaryColor(CURRENT_COLOR, null), CURRENT_COLOR);
    assert.equal(applyPrimaryColor(undefined, '#7f1d1d'), undefined);
  });

  test('rozpoznanie currentColor nie zalezy od wielkosci liter', () => {
    assert.ok(isCurrentColor('currentColor'));
    assert.ok(isCurrentColor(' CURRENTCOLOR '));
    assert.ok(!isCurrentColor('#000000'));
    assert.ok(!isCurrentColor(undefined));
  });

  test('schemat nadpisan klienta przyjmuje hex i odrzuca reszte', () => {
    assert.equal(layoutOverridesSchema.safeParse({ primaryColor: '#7f1d1d' }).success, true);
    assert.equal(layoutOverridesSchema.safeParse({ primaryColor: 'javascript:alert(1)' }).success, false);
    assert.equal(layoutOverridesSchema.safeParse({}).success, true);
  });
});
