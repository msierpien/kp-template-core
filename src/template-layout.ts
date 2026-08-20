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
  /**
   * Sklad WIELU SZTUK na jednym arkuszu, razem z paserami dla plotera.
   * Rozne ziarno niz `print`: tam skladaja sie strony jednego egzemplarza
   * (przod i tyl winietki), tu - kolejne sztuki z zamowienia.
   */
  imposition?: SheetImposition;
  /** Wizualizacje projektu na zdjeciach produktu. */
  mockups?: MockupConfig[];
  /**
   * Kolory zaproponowane klientowi w portalu (hex). Pusta lista lub brak =
   * klient dostaje swobodny wybornik.
   */
  palette?: string[];
  /**
   * Kolor wiodacy projektu (hex).
   *
   * Jedno pokretlo na caly motyw: warstwy z `fill: 'currentColor'` i podklad
   * arkusza w SVG biora kolor stad. Dzieki temu zmiana barwy zaproszenia to
   * jedna wartosc, a nie obchodzenie kazdej warstwy z osobna - i klient moze
   * ja przestawic, nie rozjezdzajac skladu.
   *
   * Brak = warstwy zostaja przy swoich wlasnych kolorach.
   */
  primaryColor?: string;

  /**
   * Korekta pozycji wydruku dla TEGO szablonu, w milimetrach.
   *
   * Osobna od korekty globalnej w ustawieniach druku, bo kompensuje co innego:
   * globalna dotyczy mechaniki podajnika i obowiazuje kazdy wydruk, a ta
   * poprawia konkretny FORMAT - drukarka inaczej prowadzi winietke 90x50,
   * a inaczej kartke A6, i poprawka dobra dla jednej psuje druga.
   *
   * Dodatnia wartosc przesuwa projekt w prawo / w dol. Arkusz zbiorczy ma
   * wlasna kalibracje (`slotOffset*`) i tej NIE dolicza - jedzie innym torem
   * podajnika, a przesuniete pasery moglyby wyjsc poza obszar, w ktorym ploter
   * ich szuka.
   */
  printOffsetXMm?: number;
  printOffsetYMm?: number;

  /**
   * Profil druku, ktorym ma sie drukowac ten szablon.
   *
   * Profil to komplet ustawien maszyny: drukarka, format papieru, podajnik,
   * jakosc i rodzaj papieru. Zyje w konfiguracji agenta na maszynie przy
   * drukarce, bo tylko tam wiadomo, jakie wartosci przyjmuje sterownik - tu
   * trzymamy sam WYBOR, zeby operator nie odtwarzal go z pamieci przy kazdym
   * wydruku.
   *
   * Wskazujemy po NAZWIE, nie po id agenta: agent bywa zakladany na nowo (nowy
   * Mac, nowy token), a nazwa profilu przezywa te operacje. Gdy agent takiego
   * profilu nie zna, okno druku wraca do recznego wyboru i mowi o tym wprost -
   * nigdy nie drukuje "czymkolwiek".
   */
  printProfile?: TemplatePrintProfile;
}

export interface TemplatePrintProfile {
  /** Nazwa profilu w konfiguracji agenta, np. `winietki-105x100`. */
  profile: string;
  /**
   * Odstepstwa od profilu, klucz opcji sterownika -> wartosc (np. jakosc druku
   * albo rodzaj papieru). Pusty obiekt znaczy "wszystko jak w profilu".
   */
  options?: Record<string, string>;
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
  /**
   * Grupy warstw tej strony. Brak pola = layout sprzed grup - kazdy odczyt
   * musi to znosic, bo `layoutSnapshot` zamraza layout w chwili zamowienia
   * i stare sprawy nigdy grup nie dostana.
   */
  groups?: LayerGroup[];
}

/**
 * Grupa warstw - pojemnik, NIE warstwa.
 *
 * Renderery (kp-api, kp-client, mockupy, impozycja) iteruja po plaskiej liscie
 * `layers` posortowanej po `zIndex`. Grupa jako warstwa zmusilaby kazdy z nich
 * do rekursji; jako `groupId` na warstwie nie zmusza do niczego - i dlatego
 * ustawienia grupy MATERIALIZUJEMY w dzieciach w chwili zmiany, zamiast
 * rozwiazywac je przy renderze.
 *
 * `settings` trzyma ostatnia wartosc ustawiona NA GRUPIE. Roznica miedzy nia
 * a wartoscia warstwy to "nadpisanie" - warstwa, ktora swiadomie nie idzie za
 * grupa. Bez tego zapisu nie dalo by sie odroznic nadpisania od wartosci,
 * ktora grupa dopiero co nadala wszystkim.
 */
export interface LayerGroup {
  id: string;
  name: string;
  /** Grupa nadrzedna - lista jest plaska, zagniezdzenie opisuje to pole. */
  parentId?: string;
  collapsed?: boolean;
  settings?: LayerGroupSettings;
}

/** Wartosci nadane calej grupie - do porownania z wartoscia warstwy. */
export interface LayerGroupSettings {
  visible?: boolean;
  locked?: boolean;
  opacity?: number;
  fontFamily?: string;
  fontSize?: number;
  fill?: string;
  textAlign?: 'left' | 'center' | 'right';
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
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
// Sklad wielu sztuk na arkuszu (imposition) + pasery Print & Cut
// ============================================

/**
 * Zrodlo paserow na arkuszu.
 *
 * `silhouette` - rysujemy je sami wg konfiguracji ponizej.
 * `none` - nie rysujemy nic, bo pasery sa juz wdrukowane w podklad
 *   (`backgroundUrl`) przygotowany w Silhouette Studio.
 */
export type RegistrationMarkPreset = 'silhouette' | 'none';

/**
 * Pasery Print & Cut - znaczniki, po ktorych ploter ustawia ciecie.
 *
 * Kazdy z czterech rogow to kat prosty otwarty do srodka arkusza: ramie
 * pionowe i poziome wychodzace z narozy prostokata odsunietego od krawedzi
 * o `inset*`. Ramiona poziome po PRAWEJ sa krotsze - tak rysuje Silhouette
 * Studio i tak wygladaja pliki, na ktorych ploter zostal wykalibrowany.
 */
export interface RegistrationMarksConfig {
  preset: RegistrationMarkPreset;
  /** Odsuniecie ZEWNETRZNEJ krawedzi paserow od krawedzi arkusza, w mm. */
  insetTopMm: number;
  insetRightMm: number;
  insetBottomMm: number;
  insetLeftMm: number;
  /** Dlugosc ramienia pionowego (kazdy rog) i poziomego (rogi lewe), w mm. */
  armLengthMm: number;
  /** Dlugosc ramienia poziomego po prawej stronie, w mm. */
  armLengthRightMm: number;
  thicknessMm: number;
  color: string;
}

/**
 * Domyslne pasery, zmierzone na pliku wyeksportowanym ze Silhouette Studio
 * (A4, funkcja Print & Cut, ustawienia domyslne: dlugosc 10 mm, grubosc
 * 0,5 mm, wstawka 15,88 mm = 0,625 cala).
 *
 * Nie zmieniac "na oko" - ploter szuka paserow w waskim oknie i kazda zmiana
 * wymaga ponownego testu ciecia.
 */
export const SILHOUETTE_MARKS_DEFAULT: RegistrationMarksConfig = {
  preset: 'silhouette',
  insetTopMm: 15.88,
  insetRightMm: 15.88,
  insetBottomMm: 15.88,
  insetLeftMm: 15.88,
  armLengthMm: 10,
  armLengthRightMm: 5,
  thicknessMm: 0.5,
  color: '#000000',
};

/**
 * Jedno gniazdo na arkuszu - miejsce na jedna sztuke z zamowienia.
 *
 * `xMm`/`yMm` to lewy gorny rog LINII CIECIA (format netto). Spad, jesli
 * szablon go ma, wychodzi poza te wspolrzedne - dzieki temu korekta pozycji
 * w panelu oznacza dokladnie to, co operator widzi na wydruku.
 */
export interface ImpositionSlot {
  id: string;
  xMm: number;
  yMm: number;
  rotation: PrintRotation;
  /** Ktora strona layoutu trafia w gniazdo. Brak = pierwsza strona. */
  pageId?: string;
}

export interface SheetImposition {
  /** Wylaczony sklad = paczka do druku idzie stara sciezka (sztuka = plik). */
  enabled: boolean;
  sheet: { widthMm: number; heightMm: number };
  slots: ImpositionSlot[];
  marks?: RegistrationMarksConfig;
  /** Drukowany podklad pod uzytkami (ozdobna ramka). URL assetu szablonu. */
  backgroundUrl?: string;
  /**
   * Plik ze sciezkami ciecia (SVG) do zaimportowania w Silhouette Studio.
   *
   * Kontur wycinanego ksztaltu zyje w GRAFICE, nie w danych szablonu - owalu
   * z falowana krawedzia nie da sie odtworzyc z prostokata uzytku. Powstaje
   * przy wgrywaniu podkladu, z tych samych sciezek noza, ktore z niego
   * zdejmujemy - wiec wydruk i ciecie nie moga sie rozjechac.
   */
  cutFileUrl?: string;
  /**
   * Podklad per strona - klucz to `pageId`.
   *
   * Kazda strona projektu jedzie na WLASNY arkusz, a te arkusze nie musza
   * wygladac tak samo: przod zaproszenia laduje na wydrukowanej wstazce,
   * a tyl na czystej kartce. Pusty string = ten arkusz jest bez podkladu,
   * mimo `backgroundUrl` ustawionego globalnie.
   */
  pageBackgrounds?: Record<string, string>;
  /**
   * Kalibracja po probnym CIECIU: przesuwa WSZYSTKIE uzytki naraz, wzgledem
   * paserow. Paserow nie rusza - to one sa ukladem odniesienia plotera.
   */
  slotOffsetXMm?: number;
  slotOffsetYMm?: number;
  /**
   * Kalibracja po probnym WYDRUKU: przesuwa caly arkusz razem z paserami.
   *
   * Kompensuje mechanike podajnika - papier wciagniety krzywo daje robote
   * przesunieta na kartce. Ciecia to nie psuje (ploter kalibruje sie do
   * znalezionych paserow, wiec zostaja spojne z grafika), ale przy wiekszych
   * wartosciach pasery moga wyjsc poza obszar, w ktorym ploter ich szuka.
   *
   * Zastepuje globalne `PrintSettings.printOffset*`, ktore dla arkusza
   * z paserami jest zbyt tepym narzedziem: kompensacja dobra dla docinanych
   * kartek nie musi pasowac do arkusza z innego podajnika.
   */
  sheetOffsetXMm?: number;
  sheetOffsetYMm?: number;
}

export const A4_SHEET_MM = { widthMm: 210, heightMm: 297 };

// ============================================
// Kolor wiodacy projektu
// ============================================

/**
 * Wartosc, ktora w warstwie znaczy "wez kolor wiodacy projektu".
 *
 * Ta sama nazwa co w SVG i nie przypadkiem: podklad wektorowy przebarwia sie
 * podmiana `currentColor`, wiec warstwy uzywaja tego samego slowa i caly
 * motyw ma jedno pojecie koloru.
 */
export const CURRENT_COLOR = 'currentColor';

/** Czy wartosc koloru odsyla do koloru wiodacego zamiast podawac wlasny. */
export function isCurrentColor(value: unknown): boolean {
  return typeof value === 'string' && value.trim().toLowerCase() === 'currentcolor';
}

/** Poprawny zapis hex - tylko taki podstawiamy pod `currentColor`. */
function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{3,8}$/i.test(value.trim());
}

/**
 * Kolor wiodacy dla renderu: wybor klienta wygrywa z ustawieniem szablonu.
 *
 * Zwraca `null`, gdy nie ma poprawnego koloru - wolajacy zostawia wtedy
 * warstwy przy ich wlasnych barwach, zamiast malowac projekt czernia
 * z przypadku.
 */
export function resolvePrimaryColor(
  layout: TemplateLayoutJson | null | undefined,
  overrides?: { primaryColor?: unknown } | null
): string | null {
  const fromClient = overrides?.primaryColor;
  if (isHexColor(fromClient)) return fromClient.trim();
  if (isHexColor(layout?.primaryColor)) return layout!.primaryColor!.trim();
  return null;
}

/**
 * Podstawia kolor wiodacy pod `currentColor`.
 *
 * Brak koloru wiodacego zostawia wartosc bez zmian - `currentColor` dojdzie
 * wtedy do renderera, ktory potraktuje ja jak nieznana barwe i uzyje swojego
 * domyslu. To lepsze niz ciche zaczernienie projektu.
 */
export function applyPrimaryColor(value: string | undefined, primaryColor: string | null): string | undefined {
  if (!primaryColor || !isCurrentColor(value)) return value;
  return primaryColor;
}

/**
 * Layout z `currentColor` juz podstawionym w warstwach - do renderu.
 *
 * Konsumenci rysujacy projekt (fabric na serwerze, canvas w przegladarce,
 * mockup) dostaja warstwy, nie caly layout, i nie maja jak samodzielnie
 * dojsc do koloru wiodacego. Zamiast uczyc kazdego z nich tej sciezki,
 * rozwiazujemy kolor RAZ, tu, i przekazujemy dalej gotowy layout.
 *
 * Zwraca ten sam obiekt, gdy nie ma czego podmieniac - podglad w przegladarce
 * przerysowuje sie przy kazdej zmianie i nowa referencja co klatke kasowalaby
 * memoizacje.
 */
export function withResolvedPrimaryColor<T extends TemplateLayoutJson>(
  layout: T,
  overrides?: { primaryColor?: unknown } | null
): T {
  const primaryColor = resolvePrimaryColor(layout, overrides);
  if (!primaryColor) return layout;

  let touched = false;
  const resolveLayers = (layers: Layer[] | undefined): Layer[] | undefined => {
    if (!Array.isArray(layers)) return layers;
    return layers.map((layer) => {
      const props = layer?.properties as unknown as Record<string, unknown> | undefined;
      if (!props) return layer;
      const fill = applyPrimaryColor(props.fill as string | undefined, primaryColor);
      const stroke = applyPrimaryColor(props.stroke as string | undefined, primaryColor);
      // `tint` to kolor grafiki wektorowej (ozdobnik z biblioteki). Bez niego
      // jedno pokretlo malowaloby tekst i figury, a ozdobnik zostawalby przy
      // swojej barwie - czyli dokladnie ten rozjazd, ktory kolor wiodacy
      // mial zlikwidowac.
      const tint = applyPrimaryColor(props.tint as string | undefined, primaryColor);
      if (fill === props.fill && stroke === props.stroke && tint === props.tint) return layer;
      touched = true;
      // Przez `unknown`: `properties` jest tu workowatym Record-em, a `Layer`
      // to unia, w ktorej nie kazdy wariant zna wszystkie trzy kolory.
      return { ...layer, properties: { ...props, fill, stroke, tint } } as unknown as Layer;
    });
  };

  const layers = resolveLayers(layout.layers);
  const pages = Array.isArray(layout.pages)
    ? layout.pages.map((page) => ({ ...page, layers: resolveLayers(page.layers) as Layer[] }))
    : layout.pages;
  const variants = Array.isArray(layout.variants)
    ? layout.variants.map((variant) => ({
        ...variant,
        pages: variant.pages.map((page) => ({ ...page, layers: resolveLayers(page.layers) as Layer[] })),
      }))
    : layout.variants;

  if (!touched) return layout;
  return { ...layout, layers, ...(pages ? { pages } : {}), ...(variants ? { variants } : {}) } as T;
}

/**
 * Sklad arkuszowy szablonu albo `null`.
 *
 * Konsumenci nie czytaja `layout.imposition` wprost - wylaczony sklad ma
 * zachowywac sie identycznie jak jego brak, a gniazda bez pozycji nie maja
 * sensu (dalyby pusty arkusz z samymi paserami).
 */
export function getSheetImposition(
  layout: TemplateLayoutJson | null | undefined
): SheetImposition | null {
  const imposition = layout?.imposition;
  if (!imposition || imposition.enabled !== true) return null;
  if (!Array.isArray(imposition.slots) || imposition.slots.length === 0) return null;
  return imposition;
}

/**
 * Podklad arkusza dla wskazanej strony.
 *
 * Wpis w `pageBackgrounds` wygrywa z globalnym `backgroundUrl`, a wpis pusty
 * oznacza swiadome "ten arkusz ma byc czysty" - inaczej nie dalo by sie
 * zdjac podkladu z jednej strony, gdy pozostale go maja.
 */
export function getSheetBackgroundUrl(
  imposition: SheetImposition,
  pageId?: string
): string | null {
  const perPage = pageId ? imposition.pageBackgrounds?.[pageId] : undefined;
  if (perPage !== undefined) return perPage.trim() ? perPage : null;
  return imposition.backgroundUrl?.trim() ? imposition.backgroundUrl : null;
}

/** Pozycja gniazda po doliczeniu kalibracji arkusza. */
export function getSlotPositionMm(
  slot: ImpositionSlot,
  imposition: SheetImposition
): { xMm: number; yMm: number } {
  return {
    xMm: slot.xMm + (imposition.slotOffsetXMm || 0),
    yMm: slot.yMm + (imposition.slotOffsetYMm || 0),
  };
}

/**
 * Prostokat, w ktorym wolno klasc uzytki.
 *
 * Ploter skanuje okolice paserow, wiec grafika nie moze na nie wchodzic ani
 * ocierac sie o nie - stad zapas `clearanceMm` wokol znacznikow. Milimetr
 * wystarcza czujnikowi, a wiekszy zapas zjadalby uzyteczna szerokosc arkusza:
 * przy domyslnej wstawce 15,88 mm zostaje na uzytki niecale 193 mm.
 */
export function getMarksSafeArea(
  sheet: { widthMm: number; heightMm: number },
  marks?: RegistrationMarksConfig | null,
  clearanceMm = 1
): { xMm: number; yMm: number; widthMm: number; heightMm: number } {
  if (!marks || marks.preset === 'none') {
    return { xMm: 0, yMm: 0, widthMm: sheet.widthMm, heightMm: sheet.heightMm };
  }

  const left = marks.insetLeftMm + marks.thicknessMm + clearanceMm;
  const top = marks.insetTopMm + marks.thicknessMm + clearanceMm;
  const right = sheet.widthMm - marks.insetRightMm - marks.thicknessMm - clearanceMm;
  const bottom = sheet.heightMm - marks.insetBottomMm - marks.thicknessMm - clearanceMm;

  return {
    xMm: left,
    yMm: top,
    widthMm: Math.max(0, right - left),
    heightMm: Math.max(0, bottom - top),
  };
}

/**
 * Automatyczne rozmieszczenie `count` uzytkow wewnatrz obszaru wolnego od
 * paserow. Uzytki ida rzedami od lewej-gory, wysrodkowane w calosci - to
 * punkt wyjscia do recznej korekty, a nie ostateczny sklad.
 */
export function defaultImpositionSlots(
  sheet: { widthMm: number; heightMm: number },
  page: { widthMm: number; heightMm: number },
  marks?: RegistrationMarksConfig | null,
  count = 2,
  gapMm = 0
): ImpositionSlot[] {
  const area = getMarksSafeArea(sheet, marks);
  const perRow = Math.max(1, Math.floor((area.widthMm + gapMm) / (page.widthMm + gapMm)));
  const rows = Math.max(1, Math.ceil(count / perRow));

  const usedWidth = perRow * page.widthMm + (perRow - 1) * gapMm;
  const usedHeight = rows * page.heightMm + (rows - 1) * gapMm;
  const startX = area.xMm + Math.max(0, (area.widthMm - usedWidth) / 2);
  const startY = area.yMm + Math.max(0, (area.heightMm - usedHeight) / 2);

  const slots: ImpositionSlot[] = [];
  for (let index = 0; index < count; index += 1) {
    const col = index % perRow;
    const row = Math.floor(index / perRow);
    slots.push({
      id: `slot-${index + 1}`,
      xMm: Number((startX + col * (page.widthMm + gapMm)).toFixed(2)),
      yMm: Number((startY + row * (page.heightMm + gapMm)).toFixed(2)),
      rotation: 0,
    });
  }

  return slots;
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
 * Warstwa widziana przez EDYTOR - tyle, ile trzeba, zeby ja narysowac
 * i przesunac, bez znajomosci `properties` konkretnego rodzaju.
 *
 * Kanwa (fabric) i panele wlasciwosci w kp-admin i kp-client pracowaly na
 * dwoch osobnych kopiach tego typu. Rozne kopie znaczyly rozne rzeczy przy
 * pierwszej zmianie formatu - stad jedna, tutaj.
 */
export interface LayerGeometry {
  id: string;
  type: LayerType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  visible?: boolean;
  locked?: boolean;
  opacity?: number;
  zIndex?: number;
  /** Grupa, do ktorej warstwa nalezy - patrz `LayerGroup`. */
  groupId?: string;
  /** Blok z biblioteki, z ktorego warstwa powstala. */
  blockId?: string;
  properties: object;
}

// ============================================
// Grupy warstw
// ============================================

/** Grupy strony. Layout sprzed grup zwraca pusta liste, nie `undefined`. */
export function getPageGroups(page: TemplatePage | null | undefined): LayerGroup[] {
  if (!page || !Array.isArray(page.groups)) return [];
  return page.groups;
}

/**
 * Warstwy nalezace do grupy. `deep` dolacza takze warstwy grup podrzednych -
 * bez tego ukrycie grupy nadrzednej ominelo by polowe jej zawartosci.
 */
export function getGroupLayers(page: TemplatePage, groupId: string, deep = true): Layer[] {
  const ids = deep ? new Set(collectGroupTree(page, groupId)) : new Set([groupId]);
  return (page.layers || []).filter((layer) => layer.groupId && ids.has(layer.groupId));
}

/** Identyfikatory grupy i wszystkich jej potomkow. */
export function collectGroupTree(page: TemplatePage, groupId: string): string[] {
  const groups = getPageGroups(page);
  const out = [groupId];

  for (let index = 0; index < out.length; index += 1) {
    const current = out[index];
    for (const group of groups) {
      if (group.parentId === current && !out.includes(group.id)) {
        out.push(group.id);
      }
    }
  }

  return out;
}

/** Lancuch grup od najblizszej do korzenia - dla etykiet i kaskady ustawien. */
export function resolveGroupChain(page: TemplatePage, layer: Layer): LayerGroup[] {
  const groups = getPageGroups(page);
  const chain: LayerGroup[] = [];

  let currentId = layer.groupId;
  while (currentId) {
    const group = groups.find((entry) => entry.id === currentId);
    if (!group || chain.some((entry) => entry.id === group.id)) break;
    chain.push(group);
    currentId = group.parentId;
  }

  return chain;
}

/**
 * Ustawienia grupy widziane przez warstwe - blizsza grupa wygrywa z dalsza.
 * Sama warstwa NIE jest tu brana pod uwage: porownanie jej wartosci z tym
 * wynikiem daje wlasnie liste nadpisan.
 */
export function resolveGroupSettings(page: TemplatePage, layer: Layer): LayerGroupSettings {
  const chain = resolveGroupChain(page, layer);
  const settings: LayerGroupSettings = {};

  // Od korzenia w dol, zeby blizsza grupa nadpisala dalsza.
  for (const group of [...chain].reverse()) {
    Object.assign(settings, group.settings || {});
  }

  return settings;
}

export function withPageGroups(page: TemplatePage, groups: LayerGroup[]): TemplatePage {
  return { ...page, groups };
}

/**
 * Zsuwa warstwy kazdej grupy do CIAGLEGO zakresu `zIndex`.
 *
 * Grupa przeplatana warstwami z zewnatrz nie jest grupa: przesuniecie jej
 * w kolejnosci przenosiloby tez cudze warstwy, a "wyzej/nizej" na grupie
 * nie mialoby jednoznacznego znaczenia. Kolejnosc wewnatrz grupy i pozycje
 * grupy wzgledem reszty wyznacza NAJWYZSZA warstwa grupy - tam, gdzie
 * projektant ja ostatnio przeciagnal.
 */
export function normalizeGroupZIndex(page: TemplatePage): TemplatePage {
  const layers = page.layers || [];
  if (layers.length === 0) return page;
  if (!layers.some((layer) => layer.groupId)) return page;

  const sorted = [...layers].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  // Klucz porzadkowy: dla warstwy w grupie - najwyzszy zIndex tej grupy,
  // zeby cala grupa wskoczyla tam, gdzie stoi jej wierzcholek.
  const groupTop = new Map<string, number>();
  for (const layer of sorted) {
    if (!layer.groupId) continue;
    const current = groupTop.get(layer.groupId) ?? Number.NEGATIVE_INFINITY;
    groupTop.set(layer.groupId, Math.max(current, layer.zIndex ?? 0));
  }

  const ordered = sorted
    .map((layer, index) => ({
      layer,
      // `index` rozstrzyga remisy - stabilnie, wg dotychczasowej kolejnosci.
      key: layer.groupId ? (groupTop.get(layer.groupId) ?? 0) : (layer.zIndex ?? 0),
      index,
      group: layer.groupId ?? '',
    }))
    .sort((a, b) => a.key - b.key || a.group.localeCompare(b.group) || a.index - b.index);

  let changed = false;
  const next = ordered.map((entry, index) => {
    if ((entry.layer.zIndex ?? 0) === index) return entry.layer;
    changed = true;
    return { ...entry.layer, zIndex: index } as Layer;
  });

  return changed ? { ...page, layers: next } : page;
}

/**
 * Przypisanie warstw do grupy (albo wypiecie ich przez `groupId = null`).
 * Zawsze konczy sie normalizacja zIndeksow - patrz wyzej.
 */
export function assignGroup(
  page: TemplatePage,
  layerIds: string[],
  groupId: string | null
): TemplatePage {
  if (layerIds.length === 0) return page;

  const targets = new Set(layerIds);
  const layers = (page.layers || []).map((layer) => {
    if (!targets.has(layer.id)) return layer;
    if (groupId) return { ...layer, groupId } as Layer;

    const { groupId: _removed, ...rest } = layer as Layer & { groupId?: string };
    return rest as Layer;
  });

  return normalizeGroupZIndex({ ...page, layers });
}

/**
 * Rozgrupowanie: warstwy zostaja na projekcie, znika sam pojemnik.
 *
 * Ustawienia grupy sa juz zmaterializowane w warstwach, wiec nie ma czego
 * przepisywac - projekt wyglada tak samo przed i po.
 */
export function ungroupLayers(page: TemplatePage, groupId: string): TemplatePage {
  const tree = new Set(collectGroupTree(page, groupId));
  const groups = getPageGroups(page).filter((group) => !tree.has(group.id));
  const layers = (page.layers || []).map((layer) => {
    if (!layer.groupId || !tree.has(layer.groupId)) return layer;
    const { groupId: _removed, ...rest } = layer as Layer & { groupId?: string };
    return rest as Layer;
  });

  return normalizeGroupZIndex({ ...page, layers, groups });
}

/** Grupy bez zadnej warstwy - zostaja po skasowaniu ostatniego dziecka. */
export function findEmptyGroups(page: TemplatePage): LayerGroup[] {
  const used = new Set((page.layers || []).map((layer) => layer.groupId).filter(Boolean));
  const parents = new Set(getPageGroups(page).map((group) => group.parentId).filter(Boolean));
  return getPageGroups(page).filter((group) => !used.has(group.id) && !parents.has(group.id));
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
  /** Grupa, do ktorej warstwa nalezy. Brak = warstwa stoi luzem. */
  groupId?: string;
  /**
   * Blok z biblioteki, z ktorego warstwa powstala.
   *
   * Sam znacznik pochodzenia - warstwa jest zwykla warstwa projektu i zyje
   * dalej wlasnym zyciem. Po nim panel rozpoznaje instancje bloku na liscie
   * warstw i bedzie umial zaproponowac aktualizacje po zmianie w bibliotece.
   */
  blockId?: string;
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
  /**
   * Kolor podstawiany pod `currentColor` w SVG (ozdobnik z palety projektu).
   *
   * Sam moze byc `currentColor` - wtedy ozdobnik idzie za kolorem wiodacym
   * projektu, tak jak wypelnienie tekstu i obrys figury.
   */
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
  /**
   * Obrys glifow - kolor i grubosc w milimetrach.
   *
   * Jedyny sposob, zeby jasny napis zostal czytelny na fotograficznym tle bez
   * podkladania pod niego prostokata. Nazwa `stroke` jest ta sama co w figurze
   * NIE przez przypadek: dzieki temu obrys tekstu przechodzi przez kaskade
   * koloru wiodacego (`withResolvedPrimaryColor`) bez zadnego dodatkowego kodu.
   *
   * Cienia swiadomie nie ma: obrys ma pelne krycie, wiec drukarnia dostaje to,
   * co widzi projektant, bez rozmowy o splaszczaniu przezroczystosci.
   */
  stroke?: string;
  /** Grubosc obrysu w milimetrach. Brak albo 0 = bez obrysu. */
  strokeWidthMm?: number;
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
  /**
   * Czy klient moze zmienic odstep miedzy wierszami.
   *
   * Osobno od `clientFontSize`, bo to inna decyzja projektanta: rozmiar pisma
   * bywa bezpieczny, a rozjechany interlinia potrafi wypchnac tekst poza ramke.
   */
  clientLineHeight?: boolean;
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
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  /**
   * Obrys glifow - kolor i grubosc w milimetrach.
   *
   * Jedyny sposob, zeby jasny napis zostal czytelny na fotograficznym tle bez
   * podkladania pod niego prostokata. Nazwa `stroke` jest ta sama co w figurze
   * NIE przez przypadek: dzieki temu obrys tekstu przechodzi przez kaskade
   * koloru wiodacego (`withResolvedPrimaryColor`) bez zadnego dodatkowego kodu.
   *
   * Cienia swiadomie nie ma: obrys ma pelne krycie, wiec drukarnia dostaje to,
   * co widzi projektant, bez rozmowy o splaszczaniu przezroczystosci.
   */
  stroke?: string;
  /** Grubosc obrysu w milimetrach. Brak albo 0 = bez obrysu. */
  strokeWidthMm?: number;
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
   * Wielkosc liter napisu.
   *
   * Doszlo pozniej niz w `TextFieldProperties`, bo pole tekstowe dostawalo
   * tresc z panelu i wersaliki dalo sie wpisac recznie - kosztem tego, ze
   * ta sama tresc w polu formularza klienta wygladala juz inaczej.
   */
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  /**
   * Obrys glifow - kolor i grubosc w milimetrach. Patrz `TextFieldProperties`.
   */
  stroke?: string;
  strokeWidthMm?: number;

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
  /**
   * Czy klient moze zmienic odstep miedzy wierszami.
   *
   * Osobno od `clientFontSize`, bo to inna decyzja projektanta: rozmiar pisma
   * bywa bezpieczny, a rozjechany interlinia potrafi wypchnac tekst poza ramke.
   */
  clientLineHeight?: boolean;
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
  /**
   * Obrys glifow - kolor i grubosc w milimetrach. Patrz `TextFieldProperties`.
   */
  stroke?: string;
  strokeWidthMm?: number;


  // --- zgody klienta ---
  clientFontSize?: boolean;
  clientFontFamily?: boolean;
  clientColor?: boolean;
  clientFontWeight?: boolean;
}

/**
 * Figura rysowana wprost przez renderer: kreska, ramka, kolo, elipsa.
 *
 * Arytmetyka (przeliczenia mm, konce odcinka, kreskowanie) siedzi w module
 * `shape` i nigdzie indziej - tak samo jak przy `text_path`. Kazde z trzech
 * miejsc rysujacych (edytor, portal, renderer druku) wola te same funkcje.
 *
 * Pola `*Mm` sa opcjonalne i maja pierwszenstwo przed odpowiednikami w
 * pikselach. Piksele zostaja dla szablonow zapisanych przed ich wprowadzeniem.
 */
export interface ShapeProperties {
  type: 'shape';
  shapeType: ShapeType;
  /** Pusty string, 'transparent' i 'none' znacza brak wypelnienia. */
  fill: string;
  stroke: string;
  /** Grubosc obrysu w pikselach strony - uzywana, gdy brak `strokeWidthMm`. */
  strokeWidth: number;
  /** Grubosc obrysu w milimetrach - w mm mysli projektant, bo w nich drukuje. */
  strokeWidthMm?: number;
  /** Zaokraglenie rogow prostokata w pikselach strony. */
  borderRadius: number;
  /** Zaokraglenie rogow prostokata w milimetrach. */
  borderRadiusMm?: number;
  /**
   * Kreska i przerwa w pikselach strony, jak w `CutLineProperties`. Pusta
   * tablica albo brak pola = linia ciagla. Wartosci liczy `buildDashArray`
   * z grubosci obrysu, zeby wzor wygladal tak samo przy kazdej grubosci.
   */
  strokeDashArray?: number[];
}

export type ShapeType = 'rectangle' | 'circle' | 'ellipse' | 'line';

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
    | 'VARIANT_MATCH_VALUE_MISSING'
    | 'IMPOSITION_SLOT_PAGE_MISSING'
    | 'IMPOSITION_SLOT_OUT_OF_SHEET'
    | 'IMPOSITION_SLOT_HITS_MARKS'
    | 'IMPOSITION_SLOTS_OVERLAP'
    | 'LAYER_GROUP_MISSING'
    | 'GROUP_EMPTY'
    | 'GROUP_PARENT_MISSING'
    | 'GROUP_ZINDEX_INTERLEAVED';
  message: string;
  layerId?: string;
  layerName?: string;
  fieldKey?: string;
  variantId?: string;
  pageId?: string;
  slotId?: string;
  groupId?: string;
}

/**
 * Sprawdzenie skladu arkuszowego przed wyslaniem paczki na drukarke.
 *
 * Wszystkie trzy bledy - uzytek poza arkuszem, uzytek na paserze i nachodzace
 * gniazda - wychodza dopiero na wydruku, a wtedy jest juz zmarnowany papier
 * i czas plotera. Kalibracja (`slotOffset*`) jest tu doliczona, bo to ona
 * decyduje, gdzie uzytek naprawde wyladuje.
 */
export function validateSheetImposition(
  layout: TemplateLayoutJson | null | undefined
): TemplateLayoutWarning[] {
  const imposition = getSheetImposition(layout);
  if (!imposition) return [];

  const warnings: TemplateLayoutWarning[] = [];
  const pages = getTemplatePages(layout);
  const safeArea = getMarksSafeArea(imposition.sheet, imposition.marks);

  const boxes: Array<{ slotId: string; x: number; y: number; w: number; h: number }> = [];

  for (const slot of imposition.slots) {
    const page = slot.pageId ? pages.find((candidate) => candidate.id === slot.pageId) : pages[0];
    if (!page) {
      warnings.push({
        code: 'IMPOSITION_SLOT_PAGE_MISSING',
        message: `Gniazdo "${slot.id}" wskazuje stronę "${slot.pageId}", której nie ma w projekcie.`,
        slotId: slot.id,
        ...(slot.pageId ? { pageId: slot.pageId } : {}),
      });
      continue;
    }

    // Obrot o 90/270 zamienia boki - uzytek 90x130 polozony bokiem zajmuje
    // 130x90 i moze wyjsc poza arkusz mimo poprawnych wspolrzednych.
    const swap = slot.rotation === 90 || slot.rotation === 270;
    const pageWidthMm = swap ? getCanvasHeightMm(page.canvas) : getCanvasWidthMm(page.canvas);
    const pageHeightMm = swap ? getCanvasWidthMm(page.canvas) : getCanvasHeightMm(page.canvas);
    const { xMm, yMm } = getSlotPositionMm(slot, imposition);

    if (xMm < 0 || yMm < 0 || xMm + pageWidthMm > imposition.sheet.widthMm || yMm + pageHeightMm > imposition.sheet.heightMm) {
      warnings.push({
        code: 'IMPOSITION_SLOT_OUT_OF_SHEET',
        message: `Gniazdo "${slot.id}" wychodzi poza arkusz ${imposition.sheet.widthMm}x${imposition.sheet.heightMm} mm.`,
        slotId: slot.id,
      });
    } else if (
      xMm < safeArea.xMm ||
      yMm < safeArea.yMm ||
      xMm + pageWidthMm > safeArea.xMm + safeArea.widthMm ||
      yMm + pageHeightMm > safeArea.yMm + safeArea.heightMm
    ) {
      warnings.push({
        code: 'IMPOSITION_SLOT_HITS_MARKS',
        message: `Gniazdo "${slot.id}" wchodzi w strefę paserów - ploter może ich nie odczytać.`,
        slotId: slot.id,
      });
    }

    boxes.push({ slotId: slot.id, x: xMm, y: yMm, w: pageWidthMm, h: pageHeightMm });
  }

  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      const overlaps =
        a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      if (!overlaps) continue;
      warnings.push({
        code: 'IMPOSITION_SLOTS_OVERLAP',
        message: `Gniazda "${a.slotId}" i "${b.slotId}" nachodzą na siebie.`,
        slotId: a.slotId,
      });
    }
  }

  return warnings;
}

/**
 * Spojnosc grup warstw na wszystkich stronach layoutu.
 *
 * Wszystko to sa OSTRZEZENIA, nie bledy - layout musi dac sie zapisac takze
 * w stanie posrednim (skasowana ostatnia warstwa grupy, wariant skopiowany
 * miedzy stronami). Blokada zapisu odcielaby projektanta od jego wlasnej pracy.
 */
export function validateLayerGroups(
  layout: TemplateLayoutJson | null | undefined
): TemplateLayoutWarning[] {
  const warnings: TemplateLayoutWarning[] = [];

  for (const page of getTemplatePages(layout)) {
    const groups = getPageGroups(page);
    if (groups.length === 0 && !(page.layers || []).some((layer) => layer.groupId)) continue;

    const byId = new Map(groups.map((group) => [group.id, group]));

    for (const layer of page.layers || []) {
      if (layer.groupId && !byId.has(layer.groupId)) {
        warnings.push({
          code: 'LAYER_GROUP_MISSING',
          message: `Warstwa „${layer.name}" wskazuje grupę, której nie ma na stronie „${page.name}".`,
          layerId: layer.id,
          layerName: layer.name,
          pageId: page.id,
          groupId: layer.groupId,
        });
      }
    }

    for (const group of findEmptyGroups(page)) {
      warnings.push({
        code: 'GROUP_EMPTY',
        message: `Grupa „${group.name}" na stronie „${page.name}" nie ma żadnej warstwy.`,
        pageId: page.id,
        groupId: group.id,
      });
    }

    for (const group of groups) {
      if (group.parentId && !byId.has(group.parentId)) {
        warnings.push({
          code: 'GROUP_PARENT_MISSING',
          message: `Grupa „${group.name}" należy do grupy, której nie ma na stronie „${page.name}".`,
          pageId: page.id,
          groupId: group.id,
        });
      }
    }

    // Przeplot: warstwa spoza grupy stoi w kolejnosci MIEDZY jej warstwami.
    // Wtedy "wyzej/nizej" na grupie przenosiloby cudze warstwy.
    const sorted = [...(page.layers || [])].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    const seen = new Set<string>();
    const closed = new Set<string>();
    let previousGroup = '';

    for (const layer of sorted) {
      const groupId = layer.groupId ?? '';
      if (groupId !== previousGroup) {
        if (previousGroup) closed.add(previousGroup);
        if (groupId && closed.has(groupId)) {
          const group = byId.get(groupId);
          warnings.push({
            code: 'GROUP_ZINDEX_INTERLEAVED',
            message: `Grupa „${group?.name ?? groupId}" na stronie „${page.name}" przeplata się z warstwami spoza grupy.`,
            pageId: page.id,
            groupId,
          });
        }
        previousGroup = groupId;
      }
      if (groupId) seen.add(groupId);
    }
  }

  return warnings;
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
  // Sklad arkuszowy i grupy nie zaleza od wariantow, wiec sprawdzaja sie takze
  // w szablonie z jednym ukladem - stad przed wyjsciem ponizej.
  const impositionWarnings = [...validateSheetImposition(layout), ...validateLayerGroups(layout)];

  if (!layout || !Array.isArray(layout.variants) || layout.variants.length === 0) {
    return impositionWarnings;
  }

  const warnings: TemplateLayoutWarning[] = [...impositionWarnings];
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
