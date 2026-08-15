import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  A4_SHEET_MM,
  SILHOUETTE_MARKS_DEFAULT,
  defaultImpositionSlots,
  getMarksSafeArea,
  getSheetImposition,
  getSlotPositionMm,
  validateSheetImposition,
  validateTemplateVariants,
  type SheetImposition,
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

function makeLayout(pages: TemplatePage[], imposition?: SheetImposition): TemplateLayoutJson {
  return {
    version: 2,
    canvas: pages[0].canvas,
    fonts: [],
    layers: pages[0].layers,
    pages,
    ...(imposition ? { imposition } : {}),
  };
}

/** Sklad z zaproszeniem 90x130 na A4, dwie sztuki jedna pod druga. */
function makeSheet(overrides: Partial<SheetImposition> = {}): SheetImposition {
  return {
    enabled: true,
    sheet: A4_SHEET_MM,
    slots: [
      { id: 'slot-1', xMm: 18, yMm: 18, rotation: 0 },
      { id: 'slot-2', xMm: 18, yMm: 148, rotation: 0 },
    ],
    marks: SILHOUETTE_MARKS_DEFAULT,
    ...overrides,
  };
}

test('wylaczony sklad i sklad bez gniazd zachowuja sie jak brak skladu', () => {
  const pages = [makePage('page-1', 90, 130)];

  assert.equal(getSheetImposition(makeLayout(pages)), null);
  assert.equal(getSheetImposition(makeLayout(pages, makeSheet({ enabled: false }))), null);
  assert.equal(getSheetImposition(makeLayout(pages, makeSheet({ slots: [] }))), null);
  assert.notEqual(getSheetImposition(makeLayout(pages, makeSheet())), null);
});

test('kalibracja przesuwa uzytki, nie pasery', () => {
  const imposition = makeSheet({ slotOffsetXMm: 1.5, slotOffsetYMm: -0.5 });

  assert.deepEqual(getSlotPositionMm(imposition.slots[0], imposition), { xMm: 19.5, yMm: 17.5 });

  // Strefa bezpieczna wynika wylacznie z paserow - kalibracja jej nie rusza.
  const area = getMarksSafeArea(imposition.sheet, imposition.marks);
  const areaWithoutOffset = getMarksSafeArea(A4_SHEET_MM, SILHOUETTE_MARKS_DEFAULT);
  assert.deepEqual(area, areaWithoutOffset);
});

test('strefa bezpieczna trzyma sie z dala od paserow, a bez paserow to caly arkusz', () => {
  const area = getMarksSafeArea(A4_SHEET_MM, SILHOUETTE_MARKS_DEFAULT);

  // 15,88 wstawki + 0,5 grubosci + 1 zapasu.
  assert.equal(Number(area.xMm.toFixed(2)), 17.38);
  assert.equal(Number(area.yMm.toFixed(2)), 17.38);
  assert.equal(Number((area.xMm + area.widthMm).toFixed(2)), 192.62);
  assert.equal(Number((area.yMm + area.heightMm).toFixed(2)), 279.62);

  assert.deepEqual(getMarksSafeArea(A4_SHEET_MM, { ...SILHOUETTE_MARKS_DEFAULT, preset: 'none' }), {
    xMm: 0,
    yMm: 0,
    widthMm: 210,
    heightMm: 297,
  });
});

test('poprawny sklad nie zglasza ostrzezen', () => {
  const layout = makeLayout([makePage('page-1', 90, 130)], makeSheet());

  assert.deepEqual(validateSheetImposition(layout), []);
});

test('dwie kartki 90x130 na A4 miesza sie tylko na styk', () => {
  // Miedzy paserami zostaje 262,24 mm wysokosci, a dwie kartki zajmuja 260 mm.
  // Zapas to 2,24 mm na CALY arkusz, wiec zaczynanie ponizej 18,5 mm wypycha
  // dolna kartke na dolny paser - stad ten test pilnuje granicy.
  const area = getMarksSafeArea(A4_SHEET_MM, SILHOUETTE_MARKS_DEFAULT);
  assert.equal(Number(area.heightMm.toFixed(2)), 262.24);

  const tooLow = makeLayout(
    [makePage('page-1', 90, 130)],
    makeSheet({
      slots: [
        { id: 'slot-1', xMm: 18, yMm: 20, rotation: 0 },
        { id: 'slot-2', xMm: 18, yMm: 150, rotation: 0 },
      ],
    })
  );
  assert.deepEqual(
    validateSheetImposition(tooLow).map((warning) => warning.slotId),
    ['slot-2']
  );
});

test('uzytek poza arkuszem i uzytek na paserach sa wykrywane', () => {
  const outOfSheet = makeLayout(
    [makePage('page-1', 90, 130)],
    makeSheet({ slots: [{ id: 'slot-1', xMm: 18, yMm: 200, rotation: 0 }] })
  );
  assert.deepEqual(
    validateSheetImposition(outOfSheet).map((warning) => warning.code),
    ['IMPOSITION_SLOT_OUT_OF_SHEET']
  );

  const onMarks = makeLayout(
    [makePage('page-1', 90, 130)],
    makeSheet({ slots: [{ id: 'slot-1', xMm: 5, yMm: 20, rotation: 0 }] })
  );
  assert.deepEqual(
    validateSheetImposition(onMarks).map((warning) => warning.code),
    ['IMPOSITION_SLOT_HITS_MARKS']
  );
});

test('obrot o 90 stopni liczy sie przy sprawdzaniu arkusza', () => {
  // 90x130 obrocone to 130x90: od x=100 wyjdzie poza arkusz szerokosci 210.
  const layout = makeLayout(
    [makePage('page-1', 90, 130)],
    makeSheet({ slots: [{ id: 'slot-1', xMm: 100, yMm: 100, rotation: 90 }] })
  );

  assert.deepEqual(
    validateSheetImposition(layout).map((warning) => warning.code),
    ['IMPOSITION_SLOT_OUT_OF_SHEET']
  );
});

test('kalibracja moze wypchnac poprawny sklad poza arkusz', () => {
  const layout = makeLayout([makePage('page-1', 90, 130)], makeSheet({ slotOffsetYMm: 30 }));

  const codes = validateSheetImposition(layout).map((warning) => warning.code);
  assert.ok(codes.includes('IMPOSITION_SLOT_OUT_OF_SHEET'));
});

test('nachodzace gniazda i brakujaca strona sa wykrywane', () => {
  const overlap = makeLayout(
    [makePage('page-1', 90, 130)],
    makeSheet({
      slots: [
        { id: 'slot-1', xMm: 18, yMm: 20, rotation: 0 },
        { id: 'slot-2', xMm: 18, yMm: 140, rotation: 0 },
      ],
    })
  );
  assert.deepEqual(
    validateSheetImposition(overlap).map((warning) => warning.code),
    ['IMPOSITION_SLOTS_OVERLAP']
  );

  const missingPage = makeLayout(
    [makePage('page-1', 90, 130)],
    makeSheet({ slots: [{ id: 'slot-1', xMm: 18, yMm: 20, rotation: 0, pageId: 'page-9' }] })
  );
  assert.deepEqual(
    validateSheetImposition(missingPage).map((warning) => warning.code),
    ['IMPOSITION_SLOT_PAGE_MISSING']
  );
});

test('ostrzezenia skladu ida tez przez validateTemplateVariants, takze bez wariantow', () => {
  const layout = makeLayout(
    [makePage('page-1', 90, 130)],
    makeSheet({ slots: [{ id: 'slot-1', xMm: 5, yMm: 20, rotation: 0 }] })
  );

  assert.equal(layout.variants, undefined);
  assert.deepEqual(
    validateTemplateVariants(layout).map((warning) => warning.code),
    ['IMPOSITION_SLOT_HITS_MARKS']
  );
});

test('automatyczne rozmieszczenie miesci sie w strefie bezpiecznej', () => {
  const slots = defaultImpositionSlots(A4_SHEET_MM, { widthMm: 90, heightMm: 130 }, SILHOUETTE_MARKS_DEFAULT, 2);
  const layout = makeLayout([makePage('page-1', 90, 130)], makeSheet({ slots }));

  assert.equal(slots.length, 2);
  assert.deepEqual(validateSheetImposition(layout), []);
});
