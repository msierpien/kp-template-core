/**
 * Geometria figur (`shape`): kreski, ramki, kola, elipsy.
 *
 * CALA arytmetyka figury mieszka tutaj i nigdzie wiecej - tak samo jak luk
 * w `text-path`. Edytor admina, portal klienta i renderer do druku wolaja te
 * same funkcje, bo rozjazd geometrii widac dopiero na papierze, czyli po fakcie.
 *
 * Wynik jest opisem niezaleznym od Fabrica: trzy miejsca rysujace roznia sie
 * tylko konstruktorem obiektu, a nie liczeniem.
 *
 * Jednostki: wejscie w milimetrach (`strokeWidthMm`, `borderRadiusMm`) albo w
 * pikselach strony (stare pola), wyjscie zawsze w pikselach - przemnozonych
 * przez `scale`, jesli renderer rysuje w skali podgladu.
 *
 * Uklad odniesienia: `x`/`y` warstwy to SRODEK figury, jak wszedzie w formacie
 * (`originX`/`originY: 'center'`). Linia to odcinek poziomy przez ten srodek,
 * a kierunek nadaje jej `rotation` warstwy - pionowa kreska to 90 stopni.
 * Wysokosc warstwy `line` nie opisuje nic widocznego poza gruboscia obrysu.
 */

import { mmToPx } from './template-layout';
import type { ShapeProperties, ShapeType } from './template-layout';

/** Styl obrysu wybierany w panelu - liczby kreskowania wynikaja z grubosci. */
export type ShapeStrokeStyle = 'solid' | 'dashed' | 'dotted';

/**
 * Warstwa figury w postaci, ktorej potrzebuje geometria.
 *
 * Strukturalnie, a nie przez `ShapeLayer`: kp-admin i kp-client maja wlasne
 * kopie typow warstw i nie zawsze podstawia sie tu dokladnie ten sam typ.
 */
export interface ShapeLayerInput {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  properties: ShapeProperties;
}

export interface ShapeGeometry {
  /** Rodzaj obiektu do narysowania - `circle` z formatu tez jest elipsa. */
  kind: 'rect' | 'ellipse' | 'line';
  /** Srodek figury. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** Prostokat: zaokraglenie rogow. Elipsa: polosie. Linia: zero. */
  rx: number;
  ry: number;
  /** Konce odcinka wzgledem srodka warstwy - tylko dla `kind: 'line'`. */
  points: [number, number, number, number];
  /** Pusty string = brak wypelnienia (fabric i canvas rozumieja to tak samo). */
  fill: string;
  stroke: string;
  strokeWidth: number;
  /** Brak pola = linia ciagla. */
  strokeDashArray?: number[];
  angle: number;
  opacity: number;
}

const TRANSPARENT_FILLS = new Set(['', 'transparent', 'none']);

function toNonNegativeNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
}

/**
 * Milimetry na piksele BEZ zaokraglania do pelnych pikseli.
 *
 * `mmToPx` zaokragla, bo sluzy do pozycji i wymiarow kartki. Przy grubosci
 * obrysu zaokraglenie zjadaloby roznice miedzy 0,3 a 0,5 mm na stronach o
 * nizszym dpi, a to jest wlasnie ta roznica, ktora projektant ustawia.
 */
function mmToPxExact(mm: number, dpi: number): number {
  return (mm / 25.4) * dpi;
}

export function isTransparentFill(fill: unknown): boolean {
  return TRANSPARENT_FILLS.has(String(fill ?? '').trim().toLowerCase());
}

/** Kolor wypelnienia w postaci, ktora fabric rozumie jako "nie rysuj". */
export function resolveFillColor(fill: unknown): string {
  return isTransparentFill(fill) ? '' : String(fill).trim();
}

/** Grubosc obrysu w pikselach strony. Milimetry maja pierwszenstwo. */
export function resolveStrokeWidthPx(properties: ShapeProperties, dpi = 300): number {
  const mm = toNonNegativeNumber(properties.strokeWidthMm);
  if (mm !== undefined) return mmToPxExact(mm, dpi);

  return toNonNegativeNumber(properties.strokeWidth) ?? 0;
}

/** Zaokraglenie rogow w pikselach strony. Milimetry maja pierwszenstwo. */
export function resolveBorderRadiusPx(properties: ShapeProperties, dpi = 300): number {
  const mm = toNonNegativeNumber(properties.borderRadiusMm);
  if (mm !== undefined) return mmToPxExact(mm, dpi);

  return toNonNegativeNumber(properties.borderRadius) ?? 0;
}

/**
 * Kreska i przerwa liczone z grubosci obrysu.
 *
 * Stale liczby wygladaly dobrze tylko przy jednej grubosci: przy grubej kresce
 * przerwy znikaly, przy cienkiej robil sie plot. Proporcja do grubosci daje ten
 * sam wzor niezaleznie od ustawienia.
 */
export function buildDashArray(
  style: ShapeStrokeStyle,
  strokeWidthPx: number
): number[] | undefined {
  const width = toNonNegativeNumber(strokeWidthPx) ?? 0;
  if (style === 'solid' || width <= 0) return undefined;

  return style === 'dotted' ? [width, width * 2] : [width * 3, width * 2];
}

/** Odczyt stylu z zapisanej tablicy - panel musi pokazac, co jest w szablonie. */
export function resolveStrokeStyle(properties: ShapeProperties, dpi = 300): ShapeStrokeStyle {
  const dash = properties.strokeDashArray;
  if (!Array.isArray(dash) || dash.length === 0) return 'solid';

  const dashLength = Number(dash[0]);
  if (!Number.isFinite(dashLength) || dashLength <= 0) return 'solid';

  // Kropka to kreska rowna grubosci; kreska jest od niej wyraznie dluzsza.
  // Prog w polowie drogi miedzy jednym a trzema, wiec recznie wpisane wartosci
  // z innego zrodla tez trafiaja w sensowna kategorie.
  const strokeWidth = resolveStrokeWidthPx(properties, dpi);
  if (strokeWidth <= 0) return 'dashed';

  return dashLength <= strokeWidth * 2 ? 'dotted' : 'dashed';
}

/**
 * Wysokosc warstwy `line` - zawsze grubosc kreski.
 *
 * Warstwa musi miec niezerowa wysokosc (walidacja struktury odrzuca zera),
 * a jedyna sensowna wartoscia jest grubosc obrysu: wtedy uchwyt na canvasie
 * pokrywa sie z tym, co widac, zamiast otaczac kreske pusta ramka.
 */
export function resolveLineLayerHeightPx(properties: ShapeProperties, dpi = 300): number {
  return Math.max(1, Math.round(resolveStrokeWidthPx(properties, dpi)));
}

function resolveKind(shapeType: ShapeType): ShapeGeometry['kind'] {
  if (shapeType === 'line') return 'line';
  if (shapeType === 'circle' || shapeType === 'ellipse') return 'ellipse';
  return 'rect';
}

/**
 * Pelny opis figury do narysowania.
 *
 * `scale` to skala podgladu (renderer druku podaje 1 albo swoja skale renderu).
 * Nalezy wylacznie do wywolujacego - modul nie wie, w czym kto rysuje.
 */
export function buildShapeGeometry(
  layer: ShapeLayerInput,
  dpi = 300,
  scale = 1
): ShapeGeometry {
  const properties = layer.properties;
  const kind = resolveKind(properties.shapeType);

  const strokeWidth = resolveStrokeWidthPx(properties, dpi) * scale;
  const width = Math.max(0, Number(layer.width) || 0) * scale;
  const height = Math.max(0, Number(layer.height) || 0) * scale;

  // Kolo trzyma sie krotszego boku, zeby przypadkowo rozciagnieta ramka nie
  // zrobila z niego elipsy. Edytor i tak blokuje proporcje przy skalowaniu.
  const diameter = properties.shapeType === 'circle' ? Math.min(width, height) : 0;

  const dashArray = Array.isArray(properties.strokeDashArray)
    ? properties.strokeDashArray
        .map((value) => (Number(value) || 0) * scale)
        .filter((value) => value > 0)
    : undefined;

  const rx =
    kind === 'ellipse'
      ? (properties.shapeType === 'circle' ? diameter : width) / 2
      : kind === 'rect'
        ? Math.min(resolveBorderRadiusPx(properties, dpi) * scale, width / 2)
        : 0;

  const ry =
    kind === 'ellipse'
      ? (properties.shapeType === 'circle' ? diameter : height) / 2
      : kind === 'rect'
        ? Math.min(resolveBorderRadiusPx(properties, dpi) * scale, height / 2)
        : 0;

  return {
    kind,
    left: Number(layer.x) * scale,
    top: Number(layer.y) * scale,
    // Elipsa: wymiar wynika z polosi, wiec kolo zostaje kolem takze w bboksie.
    width: kind === 'ellipse' ? rx * 2 : width,
    height: kind === 'ellipse' ? ry * 2 : height,
    rx,
    ry,
    // Odcinek poziomy przez srodek warstwy; pion i skosy robi `rotation`.
    points: kind === 'line' ? [-width / 2, 0, width / 2, 0] : [0, 0, 0, 0],
    // Linia nie ma wnetrza do wypelnienia - fabric rysowalby wtedy pasek
    // koloru pod cienka kreska, szerszy od niej samej.
    fill: kind === 'line' ? '' : resolveFillColor(properties.fill),
    stroke: String(properties.stroke ?? '').trim(),
    strokeWidth,
    strokeDashArray: dashArray && dashArray.length > 0 ? dashArray : undefined,
    angle: Number(layer.rotation) || 0,
    opacity: layer.opacity ?? 1,
  };
}
