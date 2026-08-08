import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseLayoutOverrides } from '../src/layout-overrides';

/**
 * Te testy pilnuja jednej rzeczy: pole, ktorego schemat nie zna, `z.object`
 * wycina PO CICHU. Zmiana klienta trafia wtedy do bazy bez tej wlasciwosci,
 * a objawem jest "suwak nic nie robi" - bez bledu i bez sladu.
 */

test('odstęp między wierszami przechodzi walidację nadpisań', () => {
  const result = parseLayoutOverrides({
    layers: { party_place: { lineHeight: 1.6 } },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data?.layers?.party_place?.lineHeight, 1.6);
  assert.deepEqual(result.dropped, []);
});

test('odstęp poza zakresem jest odrzucany, a nie po cichu przycinany', () => {
  const result = parseLayoutOverrides({
    layers: { party_place: { lineHeight: 99 } },
  });

  assert.equal(result.ok, false);
});

test('nieznana właściwość zostaje zgłoszona jako wycięta', () => {
  const result = parseLayoutOverrides({
    layers: { party_place: { wymyslonePole: 3 } },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.dropped, ['layers.party_place.wymyslonePole']);
});
