import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assignGroup,
  collectGroupTree,
  createEmptyLayout,
  findEmptyGroups,
  getGroupLayers,
  getPageGroups,
  getTemplatePages,
  normalizeGroupZIndex,
  resolveGroupChain,
  resolveGroupSettings,
  ungroupLayers,
  validateLayerGroups,
  withPageGroups,
  withTemplatePages,
  type Layer,
  type LayerGroup,
  type TemplatePage,
} from '../src/template-layout';

function layer(id: string, zIndex: number, groupId?: string): Layer {
  return {
    id,
    name: id,
    type: 'text',
    visible: true,
    locked: false,
    opacity: 1,
    zIndex,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    rotation: 0,
    ...(groupId ? { groupId } : {}),
    properties: { fieldKey: id, fontSize: 12, fontFamily: 'Arial', fill: '#000000' },
  } as unknown as Layer;
}

function page(layers: Layer[], groups: LayerGroup[] = []): TemplatePage {
  const base = createEmptyLayout(105, 148, 300);
  return { id: 'page-1', name: 'Przód', canvas: base.canvas, layers, groups };
}

test('layout sprzed grup czyta sie bez wyjatkow', () => {
  const legacy = createEmptyLayout(105, 148, 300);
  const [first] = getTemplatePages(legacy);

  assert.deepEqual(getPageGroups(first), []);
  assert.deepEqual(validateLayerGroups(legacy), []);
  assert.deepEqual(findEmptyGroups(first), []);
});

test('przypisanie do grupy zsuwa warstwy do ciaglego zakresu zIndex', () => {
  // Warstwy grupy stoja na 0 i 2, a miedzy nimi cudza warstwa - po
  // przypisaniu grupa musi byc zwarta.
  const source = page(
    [layer('naglowek', 0), layer('tlo', 1), layer('kreska', 2)],
    [{ id: 'g1', name: 'Nagłówek' }]
  );

  const grouped = assignGroup(source, ['naglowek', 'kreska'], 'g1');
  const order = [...grouped.layers].sort((a, b) => a.zIndex - b.zIndex).map((l) => l.id);

  assert.deepEqual(order, ['tlo', 'naglowek', 'kreska'], 'grupa wskakuje nad tlo, w calosci');
  assert.deepEqual(
    grouped.layers.map((l) => l.zIndex).sort((a, b) => a - b),
    [0, 1, 2],
    'zIndeksy zostaja ciagle'
  );
  assert.equal(validateLayerGroups(withTemplatePages(createEmptyLayout(), [grouped])).length, 0);
});

test('przeplot grupy z obca warstwa daje ostrzezenie', () => {
  const interleaved = page(
    [layer('a', 0, 'g1'), layer('obca', 1), layer('b', 2, 'g1')],
    [{ id: 'g1', name: 'Grupa' }]
  );

  const warnings = validateLayerGroups(withTemplatePages(createEmptyLayout(), [interleaved]));
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, 'GROUP_ZINDEX_INTERLEAVED');

  // Normalizacja rozwiazuje problem bez pytania projektanta.
  const fixed = normalizeGroupZIndex(interleaved);
  assert.equal(validateLayerGroups(withTemplatePages(createEmptyLayout(), [fixed])).length, 0);
});

test('warstwa wskazujaca nieistniejaca grupe jest zglaszana', () => {
  const orphan = page([layer('a', 0, 'znikla')], []);
  const warnings = validateLayerGroups(withTemplatePages(createEmptyLayout(), [orphan]));

  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, 'LAYER_GROUP_MISSING');
  assert.equal(warnings[0].layerId, 'a');
});

test('pusta grupa i osierocona grupa nadrzedna sa zglaszane', () => {
  const empty = page([layer('a', 0)], [{ id: 'g1', name: 'Pusta' }]);
  assert.deepEqual(
    validateLayerGroups(withTemplatePages(createEmptyLayout(), [empty])).map((w) => w.code),
    ['GROUP_EMPTY']
  );

  const orphanParent = page(
    [layer('a', 0, 'g2')],
    [{ id: 'g2', name: 'Dziecko', parentId: 'nie-ma' }]
  );
  assert.deepEqual(
    validateLayerGroups(withTemplatePages(createEmptyLayout(), [orphanParent])).map((w) => w.code),
    ['GROUP_PARENT_MISSING']
  );
});

test('zagniezdzenie: drzewo, warstwy i lancuch grup', () => {
  const nested = page(
    [layer('a', 0, 'rodzic'), layer('b', 1, 'dziecko')],
    [
      { id: 'rodzic', name: 'Rodzic' },
      { id: 'dziecko', name: 'Dziecko', parentId: 'rodzic' },
    ]
  );

  assert.deepEqual(collectGroupTree(nested, 'rodzic').sort(), ['dziecko', 'rodzic']);
  assert.deepEqual(getGroupLayers(nested, 'rodzic').map((l) => l.id), ['a', 'b']);
  assert.deepEqual(getGroupLayers(nested, 'rodzic', false).map((l) => l.id), ['a']);
  assert.deepEqual(
    resolveGroupChain(nested, nested.layers[1]).map((g) => g.id),
    ['dziecko', 'rodzic'],
    'od najblizszej do korzenia'
  );
});

test('blizsza grupa wygrywa z dalsza przy kaskadzie ustawien', () => {
  const nested = withPageGroups(
    page([layer('b', 0, 'dziecko')]),
    [
      { id: 'rodzic', name: 'Rodzic', settings: { fontFamily: 'Cormorant', fill: '#111111' } },
      { id: 'dziecko', name: 'Dziecko', parentId: 'rodzic', settings: { fill: '#a3123a' } },
    ]
  );

  assert.deepEqual(resolveGroupSettings(nested, nested.layers[0]), {
    fontFamily: 'Cormorant',
    fill: '#a3123a',
  });
});

test('rozgrupowanie zdejmuje pojemnik razem z podgrupami, warstwy zostaja', () => {
  const nested = page(
    [layer('a', 0, 'rodzic'), layer('b', 1, 'dziecko'), layer('c', 2)],
    [
      { id: 'rodzic', name: 'Rodzic' },
      { id: 'dziecko', name: 'Dziecko', parentId: 'rodzic' },
    ]
  );

  const flat = ungroupLayers(nested, 'rodzic');
  assert.deepEqual(getPageGroups(flat), []);
  assert.equal(flat.layers.length, 3, 'zadna warstwa nie znika');
  assert.ok(flat.layers.every((l) => l.groupId === undefined));
});

test('wypiecie warstwy z grupy przez groupId = null', () => {
  const grouped = page([layer('a', 0, 'g1'), layer('b', 1, 'g1')], [{ id: 'g1', name: 'Grupa' }]);
  const next = assignGroup(grouped, ['b'], null);

  assert.equal(next.layers.find((l) => l.id === 'b')?.groupId, undefined);
  assert.equal(next.layers.find((l) => l.id === 'a')?.groupId, 'g1');
});

test('normalizacja nie rusza strony bez grup', () => {
  const plain = page([layer('a', 0), layer('b', 1)]);
  assert.equal(normalizeGroupZIndex(plain), plain, 'ta sama referencja - brak pustego commitu');
});
