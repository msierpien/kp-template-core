import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_VARIANT_ID,
  getTemplatePages,
  getTemplatePagesForAnswers,
  getTemplateVariants,
  resolveTemplateVariant,
  withTemplateVariants,
  type TemplateLayoutJson,
  type TemplatePage,
} from '../src/template-layout';

function makePage(id: string, name = id): TemplatePage {
  return {
    id,
    name,
    canvas: {
      width: 1063,
      height: 1594,
      unit: 'mm',
      widthMm: 90,
      heightMm: 135,
      dpi: 300,
      bleed: 0,
      safeArea: 0,
      backgroundColor: '#ffffff',
    },
    layers: [],
  };
}

function makeLayout(): TemplateLayoutJson {
  return {
    version: 2,
    canvas: makePage('page-1').canvas,
    fonts: [],
    layers: [],
    pages: [makePage('page-1')],
  };
}

test('layout bez wariantow ma jeden wariant zlozony ze stron', () => {
  const variants = getTemplateVariants(makeLayout());

  assert.equal(variants.length, 1);
  assert.equal(variants[0].id, DEFAULT_VARIANT_ID);
  assert.deepEqual(variants[0].pages.map((page) => page.id), ['page-1']);
});

test('withTemplateVariants odbija pierwszy wariant w pages/canvas/layers', () => {
  const layout = withTemplateVariants(makeLayout(), [
    { id: 'v-full', name: 'Z potwierdzeniem', matchValue: 'tak', pages: [makePage('page-1'), makePage('page-2')] },
    { id: 'v-short', name: 'Bez potwierdzenia', matchValue: 'nie', pages: [makePage('page-1')] },
  ]);

  assert.equal(layout.version, 2);
  assert.deepEqual(getTemplatePages(layout).map((page) => page.id), ['page-1', 'page-2']);
  assert.equal(layout.variants?.length, 2);
});

test('wariant wybiera sie odpowiedzia z pola formularza', () => {
  const layout: TemplateLayoutJson = {
    ...withTemplateVariants(makeLayout(), [
      { id: 'v-full', name: 'Z potwierdzeniem', matchValue: 'tak', pages: [makePage('page-1'), makePage('page-2')] },
      { id: 'v-short', name: 'Bez potwierdzenia', matchValue: 'nie', pages: [makePage('page-1')] },
    ]),
    variantFieldKey: 'potwierdzenie',
  };

  assert.equal(resolveTemplateVariant(layout, { potwierdzenie: 'nie' })?.id, 'v-short');
  assert.equal(resolveTemplateVariant(layout, { potwierdzenie: 'tak' })?.id, 'v-full');

  // Wartosci z listy wyboru bywaja z inna wielkoscia liter i spacja na koncu.
  assert.equal(resolveTemplateVariant(layout, { potwierdzenie: ' NIE ' })?.id, 'v-short');

  assert.deepEqual(
    getTemplatePagesForAnswers(layout, { potwierdzenie: 'nie' }).map((page) => page.id),
    ['page-1']
  );
});

test('brak odpowiedzi albo nieznana wartosc daje pierwszy wariant', () => {
  const layout: TemplateLayoutJson = {
    ...withTemplateVariants(makeLayout(), [
      { id: 'v-full', name: 'Z potwierdzeniem', matchValue: 'tak', pages: [makePage('page-1'), makePage('page-2')] },
      { id: 'v-short', name: 'Bez potwierdzenia', matchValue: 'nie', pages: [makePage('page-1')] },
    ]),
    variantFieldKey: 'potwierdzenie',
  };

  assert.equal(resolveTemplateVariant(layout, {})?.id, 'v-full');
  assert.equal(resolveTemplateVariant(layout, { potwierdzenie: 'moze' })?.id, 'v-full');
  assert.equal(resolveTemplateVariant(layout, null)?.id, 'v-full');
});

test('layout bez wariantow renderuje sie ze stron mimo pola wariantu', () => {
  const layout: TemplateLayoutJson = { ...makeLayout(), variantFieldKey: 'potwierdzenie' };

  assert.deepEqual(
    getTemplatePagesForAnswers(layout, { potwierdzenie: 'nie' }).map((page) => page.id),
    ['page-1']
  );
});
