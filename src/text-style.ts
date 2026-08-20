/**
 * Wyglad napisu, ktory renderer musi policzyc tak samo w trzech miejscach:
 * wielkosc liter i obrys glifow.
 *
 * Powod jest ten sam co przy `shape` i `text-path`: edytor admina, portal
 * klienta i renderer do druku rysuja tekst osobnym kodem, a rozjazd widac
 * dopiero na papierze. `textTransform` byl tego przykladem - siedzial
 * w formacie i w schemacie API od poczatku, ale ZADEN renderer go nie czytal,
 * wiec projektant wpisywal wersaliki recznie w tresc pola i psul dane
 * odpowiedzi klienta.
 *
 * Wyjscie jest opisem niezaleznym od Fabrica: trzy renderery roznia sie
 * konstruktorem obiektu, nie liczeniem.
 */

export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';

/**
 * Wielkosc liter napisu.
 *
 * Locale jawnie polskie, bo `toUpperCase` bez niego idzie za jezykiem
 * srodowiska: na serwerze z tureckim locale "i" zamienia sie w "İ", a to
 * poszloby wprost na wydruk.
 *
 * Zadna z transformacji NIE zmienia liczby znakow, wiec indeksy `styleRanges`
 * (pogrubienie fragmentu) zostaja zgodne z tekstem po zamianie - `text-style-ranges`
 * liczy je na surowej tresci warstwy.
 */
export function applyTextTransform(text: string, transform?: TextTransform | string): string {
  const value = String(text ?? '');
  if (!value) return value;

  switch (transform) {
    case 'uppercase':
      return value.toLocaleUpperCase('pl-PL');
    case 'lowercase':
      return value.toLocaleLowerCase('pl-PL');
    case 'capitalize':
      // Granica slowa liczona na bialych znakach, nie na `\b`: przy "Anna-Maria"
      // i "O'Brien" wielka litera po myslniku albo apostrofie to nie jest to,
      // czego oczekuje sie po imieniu wpisanym przez klienta.
      return value.replace(
        /(^|\s)(\S)/g,
        (_match, prefix: string, first: string) => prefix + first.toLocaleUpperCase('pl-PL')
      );
    default:
      return value;
  }
}

/**
 * Warstwa tekstowa w postaci, ktorej potrzebuje obrys.
 *
 * Strukturalnie, a nie przez `TextFieldProperties`: kp-admin i kp-client maja
 * wlasne kopie typow warstw, a obrys dotyczy czterech rodzajow tekstu naraz.
 */
export interface TextStrokeInput {
  stroke?: string;
  /** Grubosc w milimetrach - w nich mysli projektant, bo w nich drukuje. */
  strokeWidthMm?: number;
}

export interface TextStroke {
  stroke: string;
  strokeWidth: number;
}

const TRANSPARENT = new Set(['', 'none', 'transparent']);

/**
 * Obrys glifow albo `null`, gdy warstwa go nie ma.
 *
 * Milimetry przeliczamy BEZ zaokraglania do pelnych pikseli - tak samo jak
 * grubosc kreski figury. Przy obrysie 0,2 mm zaokraglenie na stronie o niskim
 * dpi zjadaloby cala roznice miedzy "ledwie widoczny" a "gruby".
 */
export function resolveTextStroke(
  properties: TextStrokeInput | undefined | null,
  dpi = 300,
  scale = 1
): TextStroke | null {
  const stroke = String(properties?.stroke ?? '').trim();
  if (TRANSPARENT.has(stroke.toLowerCase())) return null;

  const mm = Number(properties?.strokeWidthMm);
  if (!Number.isFinite(mm) || mm <= 0) return null;

  return { stroke, strokeWidth: (mm / 25.4) * dpi * scale };
}
