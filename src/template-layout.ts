/**
 * Format projektu (layoutJson) - JEDNO zrodlo prawdy dla trzech aplikacji.
 *
 * kp-admin ten format tworzy, kp-client go pokazuje i modyfikuje, kp-api
 * waliduje go i renderuje na PDF. Dopoki opis zyl w trzech kopiach, rozjazdy
 * byly niewidoczne az do produkcji: pole dodane w panelu znikalo przy zapisie,
 * a podglad u klienta rozjezdzal sie z wydrukiem.
 *
 * Zmiana formatu = zmiana TUTAJ, nowa wersja pakietu i aktualizacja w trzech
 * repozytoriach. Kompilator pokaze wtedy, co wymaga uwagi.
 */

// ============================================
// Template Layout JSON - definicja struktury wizualnej szablonu
// ============================================

/**
 * Główna struktura layoutu szablonu.
 * Zapisywana w PersonalizationTemplate.layoutJson
 */
export interface TemplateLayoutJson {
  version: 1 | 2;
  canvas: CanvasConfig;
  fonts: FontConfig[];
  layers: Layer[];
  /** Strony projektu. Brak = jedna strona z canvas/layers powyzej. */
  pages?: TemplatePage[];
  /**
   * Warianty ukladu tego samego produktu - np. zaproszenie z prosba o
   * potwierdzenie przybycia i bez niej. Kazdy wariant ma wlasny komplet stron,
   * wiec projektant panuje nad skladem, zamiast liczyc na automatyczne
   * dosuwanie tekstu. Brak = jeden uklad (`pages`).
   */
  variants?: TemplateVariant[];
  /**
   * Klucz pola formularza, ktorego odpowiedz wybiera wariant (pole typu lista
   * wyboru). Brak = wariant wybiera operator albo pada pierwszy z listy.
   */
  variantFieldKey?: string;
  /** Rozmieszczenie stron na arkuszu drukarskim. */
  print?: PrintLayout;
  /** Wizualizacje projektu na zdjeciach produktu. */
  mockups?: MockupConfig[];
  /**
   * Kolory zaproponowane klientowi w portalu (hex). Pusta lista lub brak =
   * klient dostaje swobodny wybornik.
   */
  palette?: string[];
}

// ============================================
// Mockupy (projekt na zdjeciu produktu)
// ============================================

export type MockupBlendMode = 'normal' | 'multiply' | 'screen' | 'overlay';

/** Punkt znormalizowany do rozmiaru zdjecia (0..1), niezalezny od rozdzielczosci. */
export interface MockupPoint {
  x: number;
  y: number;
}

/**
 * Powierzchnia na zdjeciu, na ktora nakladana jest jedna strona projektu.
 * Rogi w kolejnosci: lewy-gorny, prawy-gorny, prawy-dolny, lewy-dolny -
 * liczone wzgledem projektu, nie zdjecia (dzieki temu obrocona winietka
 * nadal wyglada poprawnie).
 */
export interface MockupSurface {
  id: string;
  /** Ktora strona projektu ma sie tu renderowac. */
  pageId: string;
  corners: [MockupPoint, MockupPoint, MockupPoint, MockupPoint];
  /** multiply = nadruk na papierze (biel projektu przepuszcza fakture zdjecia). */
  blendMode: MockupBlendMode;
  /** Krycie 0..1. */
  opacity: number;
}

export interface MockupConfig {
  id: string;
  name: string;
  /** Sciezka zdjecia w storage (asset szablonu). */
  imageUrl: string;
  surfaces: MockupSurface[];
}

// ============================================
// Strony i sklad do druku (wersja 2)
// ============================================
// Wstecznie zgodne: layouty bez `pages` czytamy jako jedna strone zlozona
// z pol `canvas` i `layers`. Nowe layouty wypelniaja `pages`, a `canvas`/
// `layers` pozostaja lustrem pierwszej strony dla starych konsumentow.

export interface TemplatePage {
  id: string;
  name: string;
  canvas: CanvasConfig;
  layers: Layer[];
}

/**
 * Jeden uklad produktu. Warianty roznia sie skladem, nie danymi - odpowiedzi
 * klienta sa wspolne, wiec przelaczenie wariantu nie kasuje wpisanych tresci.
 */
export interface TemplateVariant {
  id: string;
  name: string;
  /**
   * Wartosc pola `variantFieldKey`, przy ktorej wybieramy ten wariant.
   * Brak = wariant osiagalny tylko recznie (albo jako pierwszy z listy).
   */
  matchValue?: string;
  pages: TemplatePage[];
}

export type PrintRotation = 0 | 90 | 180 | 270;

export interface PrintPlacement {
  pageId: string;
  /** Pozycja lewego-gornego rogu strony na arkuszu, w mm. */
  xMm: number;
  yMm: number;
  /** Obrot strony przy skladaniu do druku (nie dotyczy projektowania). */
  rotation: PrintRotation;
}

/**
 * `sheet` - wszystkie strony skladane na jednym arkuszu (przod i tyl tej samej
 * karty). `separate` - kazda strona na wlasnym arkuszu, bo to osobne kartki
 * (zaproszenie 90x135 + zwrotka 95x145).
 */
export type PrintMode = 'sheet' | 'separate';

export interface PrintLayout {
  sheet: { widthMm: number; heightMm: number };
  placements: PrintPlacement[];
  /** Brak = tryb wynika z wymiarow stron (patrz shouldPrintPagesSeparately). */
  mode?: PrintMode;
}

// ============================================
// Odczyt stron (wstecznie zgodny)
// ============================================

/**
 * Zwraca strony layoutu. Layout bez `pages` (wersja 1) traktujemy jak jedna
 * strone zlozona z pol `canvas` i `layers`. Kazdy konsument iterujacy strony
 * powinien uzywac tej funkcji zamiast czytac `pages` wprost.
 */
export function getTemplatePages(layout: TemplateLayoutJson | null | undefined): TemplatePage[] {
  if (!layout) return [];
  if (Array.isArray(layout.pages) && layout.pages.length > 0) {
    return layout.pages;
  }
  return [
    {
      id: 'page-1',
      name: 'Strona 1',
      canvas: layout.canvas,
      layers: layout.layers || [],
    },
  ];
}

/** Czy layout ma wiecej niz jedna strone. */
export function isMultiPageLayout(layout: TemplateLayoutJson | null | undefined): boolean {
  return getTemplatePages(layout).length > 1;
}

// ============================================
// Warianty ukladu
// ============================================

/**
 * Warianty layoutu. Layout bez `variants` ma jeden wariant zlozony z `pages` -
 * dzieki temu konsument moze zawsze iterowac po tej samej strukturze.
 */
export function getTemplateVariants(layout: TemplateLayoutJson | null | undefined): TemplateVariant[] {
  if (!layout) return [];
  if (Array.isArray(layout.variants) && layout.variants.length > 0) {
    return layout.variants;
  }
  return [
    {
      id: DEFAULT_VARIANT_ID,
      name: 'Układ podstawowy',
      pages: getTemplatePages(layout),
    },
  ];
}

export const DEFAULT_VARIANT_ID = 'variant-1';

/**
 * Wariant wybrany odpowiedziami klienta.
 *
 * Dopasowanie idzie po `matchValue` pola `variantFieldKey`, bez rozrozniania
 * wielkosci liter i bez spacji na brzegach - wartosci pochodza z listy wyboru
 * wypelnianej recznie, wiec "Tak " i "tak" musza trafiac w to samo.
 * Brak dopasowania = pierwszy wariant, zeby druk nigdy nie zostal bez ukladu.
 */
export function resolveTemplateVariant(
  layout: TemplateLayoutJson | null | undefined,
  answers?: Record<string, unknown> | null
): TemplateVariant | null {
  const variants = getTemplateVariants(layout);
  if (variants.length === 0) return null;

  const fieldKey = layout?.variantFieldKey;
  const rawAnswer = fieldKey && answers ? answers[fieldKey] : undefined;
  const answer = typeof rawAnswer === 'string' ? rawAnswer.trim().toLowerCase() : '';

  if (answer) {
    const matched = variants.find(
      (variant) => (variant.matchValue || '').trim().toLowerCase() === answer
    );
    if (matched) return matched;
  }

  return variants[0];
}

/**
 * Czy strony maja jechac na osobne arkusze.
 *
 * Jawny `print.mode` wygrywa; bez niego decyduja wymiary. Skladanie na wspolny
 * arkusz ma sens dla przodu i tylu tej samej karty - strony o roznych
 * formatach to osobne kartki i zlozone razem daja wydruk nie do przyciecia.
 */
export function shouldPrintPagesSeparately(layout: TemplateLayoutJson | null | undefined): boolean {
  if (!layout) return false;
  if (layout.print?.mode) return layout.print.mode === 'separate';
  return hasMixedPageSizes(layout);
}

/** Czy strony layoutu roznia sie wymiarami. */
export function hasMixedPageSizes(layout: TemplateLayoutJson | null | undefined): boolean {
  const pages = getTemplatePages(layout);
  if (pages.length < 2) return false;

  const first = { widthMm: getCanvasWidthMm(pages[0].canvas), heightMm: getCanvasHeightMm(pages[0].canvas) };
  return pages.some((page) => {
    const widthMm = getCanvasWidthMm(page.canvas);
    const heightMm = getCanvasHeightMm(page.canvas);
    return Math.abs(widthMm - first.widthMm) > 0.01 || Math.abs(heightMm - first.heightMm) > 0.01;
  });
}

/** Strony wariantu wybranego odpowiedziami - to na nich pracuje renderer. */
export function getTemplatePagesForAnswers(
  layout: TemplateLayoutJson | null | undefined,
  answers?: Record<string, unknown> | null
): TemplatePage[] {
  const variant = resolveTemplateVariant(layout, answers);
  return variant ? variant.pages : getTemplatePages(layout);
}

/**
 * Zapisuje warianty, utrzymujac `pages`/`canvas`/`layers` jako lustro
 * PIERWSZEGO wariantu.
 *
 * Lustro celowo nie sledzi wariantu otwartego w edytorze: konsument nieznajacy
 * wariantow (starsza wersja aplikacji, podglad w liscie) ma zawsze pokazywac
 * uklad podstawowy, a nie ten, ktory projektant akurat ogladal.
 */
export function withTemplateVariants(
  layout: TemplateLayoutJson,
  variants: TemplateVariant[]
): TemplateLayoutJson {
  const first = variants[0];
  if (!first) return { ...layout, variants: [] };

  return {
    ...withTemplatePages(layout, first.pages),
    variants,
  };
}

/**
 * Zapisuje strony z powrotem do layoutu, utrzymujac `canvas`/`layers` jako
 * lustro pierwszej strony (wstecznosc dla starych konsumentow).
 */
export function withTemplatePages(
  layout: TemplateLayoutJson,
  pages: TemplatePage[]
): TemplateLayoutJson {
  const first = pages[0];
  return {
    ...layout,
    version: 2,
    canvas: first ? first.canvas : layout.canvas,
    layers: first ? first.layers : layout.layers,
    pages,
  };
}



// ============================================
// Canvas
// ============================================

export interface CanvasConfig {
  width: number;        // pochodna szerokość w px dla kompatybilności renderera
  height: number;       // pochodna wysokość w px dla kompatybilności renderera
  unit: 'px' | 'mm';   // dla nowych layoutów źródłem prawdy jest mm
  widthMm?: number;
  heightMm?: number;
  formatPreset?: TemplateFormatPreset;
  dpi: number;          // rozdzielczość (300 dla druku)
  bleed: number;        // pochodna spadówka w px
  safeArea: number;     // pochodna strefa bezpieczna w px
  bleedMm?: number;
  safeAreaMm?: number;
  backgroundColor: string;
}

export type TemplateFormatPreset = 'WINIETKA_90X50' | 'A6_105X148' | 'DL_99X210' | 'THANK_YOU_148X105' | 'CUSTOM';
export type CanvasConfigInput = Partial<CanvasConfig>;

export interface TemplateFormatOption {
  key: TemplateFormatPreset;
  label: string;
  widthMm: number;
  heightMm: number;
}

export const TEMPLATE_FORMAT_PRESETS: TemplateFormatOption[] = [
  { key: 'WINIETKA_90X50', label: 'Winietka 90 x 50 mm', widthMm: 90, heightMm: 50 },
  { key: 'A6_105X148', label: 'A6 105 x 148 mm', widthMm: 105, heightMm: 148 },
  { key: 'DL_99X210', label: 'DL 99 x 210 mm', widthMm: 99, heightMm: 210 },
  { key: 'THANK_YOU_148X105', label: 'Podziękowania 148 x 105 mm', widthMm: 148, heightMm: 105 },
  { key: 'CUSTOM', label: 'Własny format', widthMm: 148, heightMm: 105 },
];

const DEFAULT_CANVAS_FORMAT: TemplateFormatPreset = 'THANK_YOU_148X105';
const DEFAULT_CANVAS_PRESET = TEMPLATE_FORMAT_PRESETS.find((preset) => preset.key === DEFAULT_CANVAS_FORMAT)!;

function toPositiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function toNonNegativeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function resolveFormatPreset(value: unknown): TemplateFormatPreset | undefined {
  if (typeof value !== 'string') return undefined;
  return TEMPLATE_FORMAT_PRESETS.some((preset) => preset.key === value)
    ? value as TemplateFormatPreset
    : undefined;
}

function getPresetDimensions(formatPreset?: TemplateFormatPreset): TemplateFormatOption {
  if (!formatPreset || formatPreset === 'CUSTOM') return DEFAULT_CANVAS_PRESET;
  return TEMPLATE_FORMAT_PRESETS.find((preset) => preset.key === formatPreset) ?? DEFAULT_CANVAS_PRESET;
}

export function mmToPx(mm: number, dpi = 300): number {
  return Math.round((mm / 25.4) * dpi);
}

export function pxToMm(px: number, dpi = 300): number {
  return Number(((px / dpi) * 25.4).toFixed(2));
}

export function getCanvasWidthMm(canvas: CanvasConfigInput): number {
  const explicitWidthMm = toPositiveNumber(canvas.widthMm);
  if (explicitWidthMm) return explicitWidthMm;

  const formatPreset = resolveFormatPreset(canvas.formatPreset);
  if (formatPreset && formatPreset !== 'CUSTOM') return getPresetDimensions(formatPreset).widthMm;

  const widthPx = toPositiveNumber(canvas.width);
  if (widthPx) return pxToMm(widthPx, toPositiveNumber(canvas.dpi) ?? 300);

  return DEFAULT_CANVAS_PRESET.widthMm;
}

export function getCanvasHeightMm(canvas: CanvasConfigInput): number {
  const explicitHeightMm = toPositiveNumber(canvas.heightMm);
  if (explicitHeightMm) return explicitHeightMm;

  const formatPreset = resolveFormatPreset(canvas.formatPreset);
  if (formatPreset && formatPreset !== 'CUSTOM') return getPresetDimensions(formatPreset).heightMm;

  const heightPx = toPositiveNumber(canvas.height);
  if (heightPx) return pxToMm(heightPx, toPositiveNumber(canvas.dpi) ?? 300);

  return DEFAULT_CANVAS_PRESET.heightMm;
}

export function getCanvasWidthPx(canvas: CanvasConfigInput): number {
  const dpi = toPositiveNumber(canvas.dpi) ?? 300;
  return mmToPx(getCanvasWidthMm(canvas), dpi);
}

export function getCanvasHeightPx(canvas: CanvasConfigInput): number {
  const dpi = toPositiveNumber(canvas.dpi) ?? 300;
  return mmToPx(getCanvasHeightMm(canvas), dpi);
}

export function normalizeCanvasConfig(canvas: CanvasConfigInput): CanvasConfig {
  const dpi = toPositiveNumber(canvas.dpi) ?? 300;
  const widthMm = getCanvasWidthMm(canvas);
  const heightMm = getCanvasHeightMm(canvas);
  const bleedMm = toNonNegativeNumber(canvas.bleedMm) ?? pxToMm(toNonNegativeNumber(canvas.bleed) ?? 0, dpi);
  const safeAreaMm = toNonNegativeNumber(canvas.safeAreaMm) ?? pxToMm(toNonNegativeNumber(canvas.safeArea) ?? 0, dpi);
  const formatPreset = resolveFormatPreset(canvas.formatPreset);

  return {
    width: mmToPx(widthMm, dpi),
    height: mmToPx(heightMm, dpi),
    unit: 'mm',
    widthMm,
    heightMm,
    ...(formatPreset ? { formatPreset } : {}),
    dpi,
    bleedMm,
    safeAreaMm,
    bleed: mmToPx(bleedMm, dpi),
    safeArea: mmToPx(safeAreaMm, dpi),
    backgroundColor: typeof canvas.backgroundColor === 'string' && canvas.backgroundColor
      ? canvas.backgroundColor
      : '#ffffff',
  };
}

// ============================================
// Fonts
// ============================================

export interface FontConfig {
  family: string;       // np. "Great Vibes"
  src: string;          // URL Google Fonts lub lokalna ścieżka
  weight: number;       // np. 400, 600, 700
  style: 'normal' | 'italic';
}

// ============================================
// Layers
// ============================================

export type LayerType = 'background' | 'image' | 'text' | 'static_text' | 'textbox' | 'text_path' | 'shape' | 'cut_line';

export interface LayerBase {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;      // 0-1
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;     // w stopniach
}

// Discriminated union layers
export type Layer =
  | BackgroundLayer
  | ImageLayer
  | TextFieldLayer
  | StaticTextLayer
  | TextBoxLayer
  | TextPathLayer
  | ShapeLayer
  | CutLineLayer;

export type SimpleSlotKey =
  | 'TOP_LEFT'
  | 'TOP_CENTER'
  | 'TOP_RIGHT'
  | 'MIDDLE_LEFT'
  | 'MIDDLE_CENTER'
  | 'MIDDLE_RIGHT'
  | 'BOTTOM_LEFT'
  | 'BOTTOM_CENTER'
  | 'BOTTOM_RIGHT';

// ============================================
// Layer types
// ============================================

export interface BackgroundLayer extends LayerBase {
  type: 'background';
  properties: BackgroundProperties;
}

export interface ImageLayer extends LayerBase {
  type: 'image';
  properties: ImageProperties;
}

export interface TextFieldLayer extends LayerBase {
  type: 'text';
  properties: TextFieldProperties;
}

export interface StaticTextLayer extends LayerBase {
  type: 'static_text';
  properties: StaticTextProperties;
}

export interface TextBoxLayer extends LayerBase {
  type: 'textbox';
  properties: TextBoxProperties;
}

/**
 * Tekst prowadzony po krzywej (luk, okrag).
 *
 * `x`/`y` to srodek OKREGU, nie srodek napisu - tam projektant celuje
 * promieniem i tam siedzi uchwyt w edytorze. Przelozenie na kotwice fabrica
 * robi `getTextPathAnchorOffset`; policzenie tego na miejscu, w aplikacji,
 * konczy sie warstwa skaczaca po zapisie.
 *
 * `width`/`height` z `LayerBase` opisuja zasieg samej krzywej
 * (`getTextPathBBox`), a nie rozmiar tekstu - napis po luku nie ma ramki,
 * w ktorej mialby sie zawijac. Warstwa jest jednoliniowa.
 */
export interface TextPathLayer extends LayerBase {
  type: 'text_path';
  properties: TextPathProperties;
}

export interface ShapeLayer extends LayerBase {
  type: 'shape';
  properties: ShapeProperties;
}

export interface CutLineLayer extends LayerBase {
  type: 'cut_line';
  properties: CutLineProperties;
}

// ============================================
// Properties per layer type
// ============================================

export interface BackgroundProperties {
  type: 'background';
  imageUrl: string;           // ścieżka do pliku w storage
  fit: 'cover' | 'contain' | 'fill';
}

export interface ImageProperties {
  type: 'image';
  imageUrl: string;
  fit: 'cover' | 'contain' | 'fill';
  // Zgody na ruch w portalu klienta (opt-in, jak przy warstwach tekstowych).
  clientDraggable?: boolean;
  clientResizable?: boolean;
  clientRotatable?: boolean;
  /** Kolor podstawiany pod `currentColor` w SVG (ozdobnik z palety projektu). */
  tint?: string;
  /** Czy skalowanie ma trzymac proporcje zrodla. */
  lockAspectRatio?: boolean;
}

/**
 * Pole tekstowe edytowalne przez klienta.
 * fieldKey łączy warstwę z FormField.key w bazie danych.
 */
export interface TextFieldProperties {
  type: 'text';
  fieldKey: string;           // KLUCZ POWIĄZANIA z FormField.key
  simpleSlot?: SimpleSlotKey;  // pozycja w trybie SIMPLE
  placeholder: string;
  fontSize: number;
  fontUnit?: 'px' | 'pt';
  fontFamily: string;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  fill: string;               // kolor tekstu (hex)
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  maxLines: number;
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  editable: true;
  /**
   * Swiatlo miedzy literami w tysiecznych firetu (jednostka fabrica
   * `charSpacing`): 50 = 0,05 em. Dodatnie rozstrzela, ujemne sciesnia.
   *
   * Przy kaligrafii i wersalikach ("na uroczystosc przyjecia") to jedyny
   * sposob, zeby napis oddychal - sam rozmiar pisma tego nie zalatwia.
   */
  letterSpacing?: number;
  /** Style fragmentow - patrz TextBoxProperties.styleRanges. */
  styleRanges?: TextStyleRange[];
  // Client interaction settings
  clientDraggable?: boolean;  // Czy klient może przesuwać
  clientResizable?: boolean;  // Czy klient może zmieniać rozmiar
  clientRotatable?: boolean;  // Czy klient może obracać
  clientFontWeight?: boolean; // Czy klient może zmienić grubość pisma
  // Edycja typografii przez klienta - opt-in, bo wplywa na wyglad druku
  clientFontSize?: boolean;
  clientFontFamily?: boolean;
  clientColor?: boolean;
  clientTextAlign?: boolean;
}

/**
 * Stały tekst - nie edytowalny przez klienta.
 * @deprecated Użyj TextBoxLayer z editable: false
 */
export interface StaticTextProperties {
  type: 'static_text';
  text: string;               // stały tekst
  fontSize: number;
  fontUnit?: 'px' | 'pt';
  fontFamily: string;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  fill: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  editable: false;
}

/**
 * TextBox - pole tekstowe z ramką (Frame Text).
 * Może być edytowalne lub statyczne.
 */
/**
 * Styl fragmentu tekstu - pogrubienie albo kursywa w srodku akapitu.
 *
 * Zakres liczymy na SUROWYM tekscie warstwy (indeksy znakow), a nie na
 * zawinietych liniach jak robi to fabric. Zawijanie zmienia sie z szerokoscia
 * ramki i z trescia, wiec styl przypiety do numeru linii rozjezdzalby sie przy
 * kazdej poprawce. Konwersja na strukture fabrica idzie przez
 * `buildFabricTextStyles`, zeby edytor, portal i wydruk liczyly ja tak samo.
 */
export interface TextStyleRange {
  /** Indeks pierwszego znaku, od 0. */
  start: number;
  /** Indeks ZA ostatnim znakiem zakresu. */
  end: number;
  fontWeight?: number;
  fontStyle?: 'normal' | 'italic';
  underline?: boolean;
  fill?: string;
  fontFamily?: string;
  /** Rozmiar w tej samej jednostce co warstwa (`fontUnit`). */
  fontSize?: number;
}

/** Styl pojedynczego znaku - wynik zlozenia zakresow. */
export type TextCharStyle = Omit<TextStyleRange, 'start' | 'end'>;

export interface TextBoxProperties {
  type: 'textbox';
  fieldKey?: string;          // opcjonalny klucz powiązania z FormField.key
  simpleSlot?: SimpleSlotKey;  // pozycja w trybie SIMPLE
  text: string;               // tekst (może zawierać {{ fieldKey }})
  fontSize: number;
  fontUnit?: 'px' | 'pt';
  fontFamily: string;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  fill: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  verticalAlign: 'top' | 'middle' | 'bottom';
  lineHeight: number;
  padding: number;
  backgroundColor: string;
  /** Krycie tla w procentach (0-100). Brak wartosci = pelne krycie. */
  backgroundOpacity?: number;
  borderColor: string;
  borderWidth: number;
  editable: boolean;          // czy edytowalne przez klienta
  /** Lamanie po znakach zamiast slowach (pismo CJK). */
  splitByGrapheme?: boolean;
  /**
   * Swiatlo miedzy literami w tysiecznych firetu (jednostka fabrica
   * `charSpacing`): 50 = 0,05 em. Dodatnie rozstrzela, ujemne sciesnia.
   *
   * Przy kaligrafii i wersalikach ("na uroczystosc przyjecia") to jedyny
   * sposob, zeby napis oddychal - sam rozmiar pisma tego nie zalatwia.
   */
  letterSpacing?: number;
  /**
   * Style fragmentow tekstu (pogrubienie, kursywa, kolor). Puste albo brak =
   * caly tekst w stylu warstwy.
   *
   * Uwaga dla pol edytowalnych: zakresy dotycza tekstu z szablonu, wiec po
   * podstawieniu odpowiedzi klienta trzeba je przeliczyc albo pominac -
   * `resolveCharStyles` przycina je do dlugosci tekstu, nigdy nie wychodzi poza.
   */
  styleRanges?: TextStyleRange[];
  // Client interaction settings
  clientDraggable?: boolean;  // Czy klient może przesuwać
  clientResizable?: boolean;  // Czy klient może zmieniać rozmiar
  clientRotatable?: boolean;  // Czy klient może obracać
  clientFontWeight?: boolean; // Czy klient może zmienić grubość pisma
  // Edycja typografii przez klienta - opt-in, bo wplywa na wyglad druku
  clientFontSize?: boolean;
  clientFontFamily?: boolean;
  clientColor?: boolean;
  clientTextAlign?: boolean;
}

/** Kształt prowadnicy tekstu po krzywej. `wave`/`custom` zarezerwowane. */
export type TextPathShape = 'arc' | 'circle';

/**
 * Po ktorej stronie krzywej siedzi tekst: `left` nad linia, `right` pod nia.
 * Nazwy z fabrica - to samo pole idzie prosto do obiektu, wiec nie tlumaczymy.
 */
export type TextPathSide = 'left' | 'right';

/** Do czego przykladaja sie glify (pole fabrica `pathAlign`). */
export type TextPathAlign = 'baseline' | 'center' | 'ascender' | 'descender';

/** Gdzie na luku zaczyna sie napis. */
export type TextPathTextAlign = 'start' | 'center' | 'end';

/**
 * Tekst po krzywej.
 *
 * Tresc bierze sie z pola formularza (`fieldKey`) albo jest stala (`text`) -
 * tak samo jak w `textbox`. Geometria prowadnicy siedzi w polach ponizej,
 * a jej przelozenie na `d`, dlugosc luku i offset startowy robia funkcje
 * z `text-path.ts`. Zadna aplikacja nie liczy tego u siebie.
 */
export interface TextPathProperties {
  type: 'text_path';
  /** Pole formularza, z ktorego bierze sie tresc. Puste = tekst staly. */
  fieldKey?: string;
  /** Tresc stala, gdy warstwa nie jest powiazana z polem. */
  text?: string;
  /** Podpowiedz w edytorze, gdy pole jest jeszcze puste. */
  placeholder?: string;

  // --- prowadnica ---
  pathShape: TextPathShape;
  /** Promien w milimetrach - jednostka projektanta, nie piksele. */
  radiusMm: number;
  /** Kat poczatkowy w stopniach; 0 = godzina 3, rosnie zgodnie z zegarem. */
  startAngle: number;
  /** Rozpietosc luku w stopniach; ujemna odwraca kierunek. Okrag ignoruje. */
  sweepAngle: number;
  /** Strona krzywej: `left` = napis nad linia, `right` = pod nia. */
  pathSide: TextPathSide;
  /** Do czego przykladaja sie glify (pole fabrica `pathAlign`). */
  pathAlign: TextPathAlign;
  /** Gdzie na luku zaczyna sie napis. */
  textPathAlign: TextPathTextAlign;
  /**
   * Ostatnio policzone `d`.
   *
   * Trzymamy je w layoucie, zeby renderer nie musial znac wzorow, a nie jako
   * zrodlo prawdy: przy kazdej zmianie parametrow przeliczamy je z
   * `buildTextPathD`. Przy odczycie starszego layoutu sluzy jako zapas.
   */
  pathD?: string;

  // --- typografia (jak w pozostalych warstwach tekstowych) ---
  fontSize: number;
  fontUnit?: 'px' | 'pt';
  fontFamily: string;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  fill: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  /** Swiatlo miedzy literami w tysiecznych firetu - jak w `TextFieldProperties`. */
  letterSpacing?: number;

  // --- zgody klienta ---
  clientFontSize?: boolean;
  clientFontFamily?: boolean;
  clientColor?: boolean;
  clientFontWeight?: boolean;
}

export interface ShapeProperties {
  type: 'shape';
  shapeType: 'rectangle' | 'circle' | 'ellipse' | 'line';
  fill: string;
  stroke: string;
  strokeWidth: number;
  borderRadius: number;
}

export interface CutLineProperties {
  type: 'cut_line';
  stroke: string;
  strokeWidth: number;
  strokeDashArray: number[];
  clientVisible: false;       // zawsze niewidoczne dla klienta
}

// ============================================
// Style fragmentow tekstu
// ============================================

/**
 * Styl kazdego znaku tekstu po zlozeniu zakresow.
 *
 * Zakresy moga na siebie nachodzic - wygrywa pozniejszy, bo tak dziala kazdy
 * edytor tekstu (zaznaczasz fragment i nadajesz mu styl "na wierzchu").
 * Indeksy poza tekstem sa przycinane, wiec krotsza odpowiedz klienta nie
 * wywroci renderowania.
 */
export function resolveCharStyles(
  text: string,
  ranges: TextStyleRange[] | undefined | null
): Array<TextCharStyle | undefined> {
  const chars: Array<TextCharStyle | undefined> = new Array(text.length).fill(undefined);
  if (!Array.isArray(ranges) || ranges.length === 0) return chars;

  for (const range of ranges) {
    const { start, end, ...style } = range;
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;

    const from = Math.max(0, Math.floor(start));
    const to = Math.min(text.length, Math.floor(end));
    if (to <= from) continue;

    const cleaned = Object.fromEntries(
      Object.entries(style).filter(([, value]) => value !== undefined)
    ) as TextCharStyle;
    if (Object.keys(cleaned).length === 0) continue;

    for (let index = from; index < to; index += 1) {
      chars[index] = { ...(chars[index] || {}), ...cleaned };
    }
  }

  return chars;
}

/**
 * Struktura `styles` dla fabrica: { nrLinii: { nrZnaku: styl } }.
 *
 * `lines` to linie PO zawinieciu, w kolejnosci renderowania - dostarcza je
 * konsument, bo tylko on zna swoje zawijanie.
 *
 * Kazda linia jest wyszukiwana w surowym tekscie od biezacej pozycji, zamiast
 * sumowania dlugosci: fabric zjada separator na zlamaniu (spacje przy zawijaniu,
 * `\n` przy twardym koncu linii), wiec proste sumowanie przesuwaloby style o
 * jeden znak na kazde zlamanie - i pogrubienie wedrowaloby w prawo z kazda
 * kolejna linia.
 */
export function buildFabricTextStyles(
  text: string,
  lines: string[],
  charStyles: Array<TextCharStyle | undefined>
): Record<number, Record<number, TextCharStyle>> {
  const styles: Record<number, Record<number, TextCharStyle>> = {};
  let cursor = 0;

  lines.forEach((line, lineIndex) => {
    const found = line ? text.indexOf(line, cursor) : -1;
    const start = found >= 0 ? found : cursor;

    for (let charIndex = 0; charIndex < line.length; charIndex += 1) {
      const style = charStyles[start + charIndex];
      if (!style) continue;
      styles[lineIndex] = styles[lineIndex] || {};
      styles[lineIndex][charIndex] = style;
    }

    cursor = start + line.length;
  });

  return styles;
}

/**
 * Zakresy uporzadkowane i sklejone - do zapisu w szablonie.
 *
 * Bez tego kazde klikniecie "pogrub" dokladalo nowy zakres i lista rosla w
 * nieskonczonosc, mimo ze opisuje ten sam tekst.
 */
export function normalizeStyleRanges(
  text: string,
  ranges: TextStyleRange[] | undefined | null
): TextStyleRange[] {
  const chars = resolveCharStyles(text, ranges);
  const result: TextStyleRange[] = [];

  let index = 0;
  while (index < chars.length) {
    const style = chars[index];
    if (!style) {
      index += 1;
      continue;
    }

    const serialized = JSON.stringify(style);
    let end = index + 1;
    while (end < chars.length && chars[end] && JSON.stringify(chars[end]) === serialized) {
      end += 1;
    }

    result.push({ start: index, end, ...style });
    index = end;
  }

  return result;
}

// ============================================
// Template Asset (plik graficzny szablonu)
// ============================================

export interface TemplateAssetItem {
  id: string;
  templateId: string;
  assetType: 'BACKGROUND' | 'DECORATION' | 'LOGO' | 'CUT_LINE_SVG';
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  metadata: {
    width?: number;
    height?: number;
    originalName?: string;
  } | null;
  sortOrder: number;
  createdAt: Date;
}

// ============================================
// Helpers
// ============================================

/**
 * Tworzy domyślny pusty layout dla nowego szablonu.
 */
export function createEmptyLayout(
  widthMm = 148,
  heightMm = 105,
  dpi = 300,
  formatPreset: TemplateFormatPreset = 'THANK_YOU_148X105'
): TemplateLayoutJson {
  const canvas = normalizeCanvasConfig({
    width: mmToPx(widthMm, dpi),
    height: mmToPx(heightMm, dpi),
    unit: 'mm',
    widthMm,
    heightMm,
    formatPreset,
    dpi,
    bleed: 0,
    safeArea: 0,
    bleedMm: 0,
    safeAreaMm: 0,
    backgroundColor: '#ffffff',
  });

  return {
    version: 1,
    canvas,
    fonts: [],
    layers: [],
  };
}


// ============================================
// Odpowiedzi API i sloty (dotad tylko w kp-admin)
// ============================================

export interface TemplateLayoutWarning {
  code:
    | 'TEXT_LAYER_FIELD_KEY_MISSING'
    | 'TEXT_LAYER_FIELD_KEY_UNMAPPED'
    | 'TEXT_LAYER_FIELD_KEY_DUPLICATED'
    | 'BACKGROUND_LAYER_MISSING'
    | 'VARIANT_PAGE_MISSING'
    | 'VARIANT_FIELD_KEY_UNMAPPED'
    | 'VARIANT_MATCH_VALUE_MISSING';
  message: string;
  layerId?: string;
  layerName?: string;
  fieldKey?: string;
  variantId?: string;
  pageId?: string;
}

/**
 * Spojnosc wariantow ze skladem do druku i mockupami.
 *
 * Sklad i mockupy wskazuja strony po `pageId` i sa wspolne dla calego szablonu,
 * wiec wariant bez ktorejs strony po cichu wypadlby z wydruku albo ze zdjecia.
 * Lepiej powiedziec to projektantowi w panelu niz odkryc na paczce do druku.
 */
export function validateTemplateVariants(
  layout: TemplateLayoutJson | null | undefined,
  formFieldKeys: string[] = []
): TemplateLayoutWarning[] {
  if (!layout || !Array.isArray(layout.variants) || layout.variants.length === 0) return [];

  const warnings: TemplateLayoutWarning[] = [];
  const basePageIds = getTemplatePages(layout).map((page) => page.id);

  for (const variant of layout.variants) {
    const variantPageIds = new Set(variant.pages.map((page) => page.id));

    for (const pageId of basePageIds) {
      if (variantPageIds.has(pageId)) continue;
      warnings.push({
        code: 'VARIANT_PAGE_MISSING',
        message: `Wariant "${variant.name}" nie ma strony "${pageId}" - skład do druku i mockup ją pominą.`,
        variantId: variant.id,
        pageId,
      });
    }

    if (layout.variantFieldKey && !variant.matchValue) {
      warnings.push({
        code: 'VARIANT_MATCH_VALUE_MISSING',
        message: `Wariant "${variant.name}" nie ma wartości dopasowania - wybierze go tylko kolejność na liście.`,
        variantId: variant.id,
      });
    }
  }

  if (layout.variantFieldKey && formFieldKeys.length > 0 && !formFieldKeys.includes(layout.variantFieldKey)) {
    warnings.push({
      code: 'VARIANT_FIELD_KEY_UNMAPPED',
      message: `Pole "${layout.variantFieldKey}" wybierające wariant nie istnieje w formularzu.`,
      fieldKey: layout.variantFieldKey,
    });
  }

  return warnings;
}

export interface TemplateLayoutResponse {
  layout: TemplateLayoutJson | null;
  warnings?: TemplateLayoutWarning[];
}

export const SIMPLE_SLOT_OPTIONS: Array<{ key: SimpleSlotKey; label: string; col: number; row: number }> = [
  { key: 'TOP_LEFT', label: 'Lewy górny', col: 0, row: 0 },
  { key: 'TOP_CENTER', label: 'Górny środek', col: 1, row: 0 },
  { key: 'TOP_RIGHT', label: 'Prawy górny', col: 2, row: 0 },
  { key: 'MIDDLE_LEFT', label: 'Lewy środek', col: 0, row: 1 },
  { key: 'MIDDLE_CENTER', label: 'Środek', col: 1, row: 1 },
  { key: 'MIDDLE_RIGHT', label: 'Prawy środek', col: 2, row: 1 },
  { key: 'BOTTOM_LEFT', label: 'Lewy dolny', col: 0, row: 2 },
  { key: 'BOTTOM_CENTER', label: 'Dolny środek', col: 1, row: 2 },
  { key: 'BOTTOM_RIGHT', label: 'Prawy dolny', col: 2, row: 2 },
];

export function isSimpleSlotKey(value: unknown): value is SimpleSlotKey {
  return typeof value === 'string' && SIMPLE_SLOT_OPTIONS.some((slot) => slot.key === value);
}

export function getSimpleSlotKeyByIndex(index: number): SimpleSlotKey {
  return SIMPLE_SLOT_OPTIONS[Math.max(0, index) % SIMPLE_SLOT_OPTIONS.length].key;
}

export function getSimpleSlotPosition(slotKey: SimpleSlotKey, canvas: CanvasConfig): { x: number; y: number } {
  const slot = SIMPLE_SLOT_OPTIONS.find((candidate) => candidate.key === slotKey) || SIMPLE_SLOT_OPTIONS[4];
  return {
    x: Math.round(getCanvasWidthPx(canvas) * ((slot.col + 1) / 4)),
    y: Math.round(getCanvasHeightPx(canvas) * ((slot.row + 1) / 4)),
  };
}

export function getNearestSimpleSlotKey(x: number, y: number, canvas: CanvasConfig): SimpleSlotKey {
  const best = SIMPLE_SLOT_OPTIONS.reduce((nearest, slot) => {
    const position = getSimpleSlotPosition(slot.key, canvas);
    const distance = Math.hypot(position.x - x, position.y - y);
    return distance < nearest.distance ? { key: slot.key, distance } : nearest;
  }, { key: 'MIDDLE_CENTER' as SimpleSlotKey, distance: Number.POSITIVE_INFINITY });

  return best.key;
}
