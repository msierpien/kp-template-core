/**
 * Geometria tekstu prowadzonego po krzywej (`text_path`).
 *
 * CALA arytmetyka luku mieszka tutaj i nigdzie wiecej. Edytor admina, portal
 * klienta i renderer do druku wolaja te same funkcje - inaczej podglad
 * rozjechalby sie z wydrukiem, a rozjazd geometrii widac dopiero na papierze,
 * czyli po fakcie.
 *
 * Jednostki: wejscie w milimetrach (`radiusMm`), wyjscie w pikselach przy dpi
 * strony. Skala podgladu NIE nalezy do tego modulu - edytor mnozy wynik przez
 * swoja skale, renderer bierze go wprost. To jedyna dozwolona roznica miedzy
 * dwoma wywolaniami.
 */

import { mmToPx } from './template-layout';
import type { TextPathShape, TextPathTextAlign } from './template-layout';

export interface TextPathGeometryInput {
  pathShape: TextPathShape;
  /** Promien w milimetrach - w mm mysli projektant, bo w nich ma wycinarke. */
  radiusMm: number;
  /**
   * Kat poczatkowy w stopniach, 0 = godzina 3, rosnie zgodnie z ruchem
   * wskazowek zegara (uklad ekranowy: os Y w dol).
   */
  startAngle: number;
  /**
   * Rozpietosc luku w stopniach. Ujemna odwraca kierunek rysowania.
   * Dla `circle` ignorowana - okrag ma zawsze 360.
   */
  sweepAngle: number;
}

/** Zaokraglenie do dwoch miejsc - `d` ma byc stabilne i czytelne w JSON-ie. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Punkt na okregu o promieniu `r` wokol (0,0) pod danym katem. */
function pointOnCircle(radiusPx: number, angleDeg: number): { x: number; y: number } {
  const radians = toRadians(angleDeg);
  return {
    x: round(radiusPx * Math.cos(radians)),
    y: round(radiusPx * Math.sin(radians)),
  };
}

/** Rozpietosc luku uzyta do rysowania: okrag to zawsze pelne 360 stopni. */
function effectiveSweep(props: TextPathGeometryInput): number {
  if (props.pathShape === 'circle') return 360;
  // Powyzej pelnego obrotu luk zaczyna nachodzic na siebie - nie ma tam nic
  // do pokazania, wiec przycinamy.
  return Math.max(-360, Math.min(360, props.sweepAngle));
}

/**
 * Atrybut `d` prowadnicy, wysrodkowany na (0,0).
 *
 * Okrag i luk powyzej 180 stopni skladamy z DWOCH polukow: jeden `A` na 360
 * stopni degeneruje sie do punktu (poczatek = koniec, wiec przegladarka nie
 * wie, ktora droga jechac), a przy sweep > 180 zly `large-arc-flag` obraca
 * luk na druga strone.
 */
export function buildTextPathD(props: TextPathGeometryInput, dpi = 300): string {
  const radiusPx = mmToPx(props.radiusMm, dpi);
  const sweep = effectiveSweep(props);
  const clockwise = sweep >= 0 ? 1 : 0;
  const absSweep = Math.abs(sweep);

  const start = pointOnCircle(radiusPx, props.startAngle);

  if (absSweep >= 360) {
    const half = pointOnCircle(radiusPx, props.startAngle + (sweep >= 0 ? 180 : -180));
    return [
      `M ${start.x} ${start.y}`,
      `A ${radiusPx} ${radiusPx} 0 0 ${clockwise} ${half.x} ${half.y}`,
      `A ${radiusPx} ${radiusPx} 0 0 ${clockwise} ${start.x} ${start.y}`,
    ].join(' ');
  }

  if (absSweep > 180) {
    const half = pointOnCircle(radiusPx, props.startAngle + sweep / 2);
    const end = pointOnCircle(radiusPx, props.startAngle + sweep);
    return [
      `M ${start.x} ${start.y}`,
      `A ${radiusPx} ${radiusPx} 0 0 ${clockwise} ${half.x} ${half.y}`,
      `A ${radiusPx} ${radiusPx} 0 0 ${clockwise} ${end.x} ${end.y}`,
    ].join(' ');
  }

  const end = pointOnCircle(radiusPx, props.startAngle + sweep);
  return `M ${start.x} ${start.y} A ${radiusPx} ${radiusPx} 0 0 ${clockwise} ${end.x} ${end.y}`;
}

/**
 * Dlugosc luku w pikselach - analitycznie, bez probkowania krzywej.
 *
 * To ta liczba decyduje, czy napis sie zmiesci, wiec musi byc identyczna
 * w edytorze i w walidacji po stronie API.
 */
export function getTextPathArcLength(props: TextPathGeometryInput, dpi = 300): number {
  const radiusPx = mmToPx(props.radiusMm, dpi);
  const sweep = Math.abs(effectiveSweep(props));
  return round(toRadians(sweep) * radiusPx);
}

/**
 * Przesuniecie srodka bboksu prowadnicy wzgledem srodka okregu.
 *
 * Fabric kotwiczy obiekt na srodku BBOKSU SCIEZKI, a projektant ustawia
 * srodek OKREGU (tam jest uchwyt, tam celuje promien). Dla gornego poluku
 * bbox ma wysokosc r, nie 2r, wiec te dwa punkty roznia sie o r/2 - i to
 * wlasnie ta liczba, pominieta przy odczycie pozycji, powoduje, ze warstwa
 * "skacze" po zapisie i przeladowaniu strony.
 *
 * Zwracamy wektor OD srodka okregu DO srodka bboksu: zeby postawic srodek
 * okregu w (x, y), obiekt trzeba umiescic w (x + dx, y + dy).
 */
export function getTextPathAnchorOffset(props: TextPathGeometryInput, dpi = 300): { dx: number; dy: number } {
  const box = getTextPathBBox(props, dpi);
  return {
    dx: round(box.left + box.width / 2),
    dy: round(box.top + box.height / 2),
  };
}

/**
 * Prostokat otaczajacy prowadnice, w pikselach, wzgledem srodka okregu.
 *
 * Potrzebny do `layer.width/height` - walidacja struktury layoutu odrzuca
 * warstwy o zerowych wymiarach, a dla tekstu po luku nie ma innego sensownego
 * rozmiaru niz zasieg samej krzywej.
 *
 * Liczymy z probkowania luku co stopien i domykamy katami skrajnymi. Nie
 * potrzeba tu wzorow na ekstrema: krok jednego stopnia daje przy promieniu
 * 100 mm blad ponizej jednej dziesiatej milimetra, a funkcja chodzi wylacznie
 * przy zmianie parametrow, nie w petli renderowania.
 */
export function getTextPathBBox(
  props: TextPathGeometryInput,
  dpi = 300
): { left: number; top: number; width: number; height: number } {
  const radiusPx = mmToPx(props.radiusMm, dpi);
  const sweep = effectiveSweep(props);

  if (Math.abs(sweep) >= 360) {
    return { left: -radiusPx, top: -radiusPx, width: radiusPx * 2, height: radiusPx * 2 };
  }

  const step = sweep >= 0 ? 1 : -1;
  const angles: number[] = [props.startAngle, props.startAngle + sweep];
  for (let angle = 0; Math.abs(angle) < Math.abs(sweep); angle += step) {
    angles.push(props.startAngle + angle);
  }

  const points = angles.map((angle) => pointOnCircle(radiusPx, angle));
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  const left = Math.min(...xs);
  const top = Math.min(...ys);

  return {
    left: round(left),
    top: round(top),
    // Zero szerokosci albo wysokosci (luk zdegenerowany do odcinka pionowego
    // czy poziomego) nie przejdzie walidacji struktury - stad minimum 1 px.
    width: Math.max(1, round(Math.max(...xs) - left)),
    height: Math.max(1, round(Math.max(...ys) - top)),
  };
}

/**
 * `pathStartOffset` dla fabrica: ile pikseli po luku przed pierwszym glifem.
 *
 * Fabric nie zna pojecia "wysrodkuj napis na luku" - przyjmuje wylacznie
 * offset w pikselach, wiec przeliczenie musi zrobic ktos, kto zna i dlugosc
 * luku, i szerokosc napisu.
 *
 * Wynik nie schodzi ponizej zera: napis dluzszy niz luk zaczyna sie na jego
 * poczatku i wychodzi za koniec (o czym osobno ostrzega walidacja), a nie
 * cofa sie przed niego.
 */
export function resolveTextPathStartOffset(
  textAlign: TextPathTextAlign,
  arcLength: number,
  textWidth: number
): number {
  if (textAlign === 'start') return 0;

  const slack = arcLength - textWidth;
  if (slack <= 0) return 0;

  return round(textAlign === 'center' ? slack / 2 : slack);
}

/**
 * Czy przy tym promieniu i stopniu pisma glify nie beda na siebie nachodzic.
 *
 * Litery stoja prostopadle do krzywej, wiec przy malym promieniu ich dolne
 * krawedzie zbiegaja sie do srodka i zaczynaja sie zlepiac. Progiem jest
 * stosunek promienia do wysokosci pisma - ponizej ~1.5 napis robi sie
 * nieczytelny niezaleznie od kroju.
 */
export function isTextPathRadiusTooTight(radiusMm: number, fontSizePx: number, dpi = 300): boolean {
  const radiusPx = mmToPx(radiusMm, dpi);
  if (radiusPx <= 0 || fontSizePx <= 0) return true;
  return radiusPx / fontSizePx < 1.5;
}
