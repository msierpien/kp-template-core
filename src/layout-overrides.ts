import { z } from 'zod';

/**
 * Schemat nadpisan layoutu przysylanych przez portal klienta.
 *
 * Do tej pory `layoutOverrides` szlo do bazy i do renderera jako surowy JSON -
 * jedyna kontrola byla liczba elementow i dlugosc tekstu. Klient dostarcza
 * jednak CALE obiekty warstw (`addedLayers[].layer`), wiec mogl podac dowolne
 * `imageUrl`, a renderer robil z niego `path.join(storage, imageUrl)` albo
 * pobieral adres http - czyli path traversal i SSRF jednym polem.
 *
 * UWAGA: `z.object` po cichu usuwa klucze spoza schematu. Kazde nowe pole
 * nadpisania trzeba dopisac TUTAJ i wydac nowa wersje pakietu - inaczej
 * zniknie przy zapisie, a portal nie dowie sie o tym ani slowem.
 * `parseLayoutOverrides` raportuje wyciete klucze wlasnie po to, zeby taki
 * rozjazd zostawial slad.
 */

export const MAX_ADDED_LAYERS = 40;
export const MAX_ADDED_LAYER_TEXT = 2000;
export const MAX_CUSTOM_FIELDS = 10;
export const MAX_CUSTOM_FIELD_LABEL = 60;
/** Sufit na liczbe sztuk z wlasnymi nadpisaniami (lista gosci bywa dluga). */
const MAX_ITEM_ENTRIES = 500;
/** Sufit na liczbe warstw w jednym wiadrze nadpisan. */
const MAX_LAYER_ENTRIES = 200;

/** Wspolrzedne i wymiary w px szablonu - z zapasem, ale nie w nieskonczonosc. */
const coordinate = z.number().finite().min(-100_000).max(100_000);
const dimension = z.number().finite().min(0).max(100_000);
const color = z.string().max(64);

/**
 * Sciezka pliku w storage - jedyna forma `imageUrl`, jaka przyjmujemy od
 * klienta. Bez protokolu (SSRF), bez `..` i bez wiodacego `/` (wyjscie poza
 * katalog storage). Renderer i tak przepuszcza ja przez `safeStoragePath`,
 * ale zla sciezka ma polec juz przy zapisie, a nie dopiero przy druku.
 */
const storageRelativePath = z
  .string()
  .min(1)
  .max(512)
  .refine((value) => !/^[a-z][a-z0-9+.-]*:/i.test(value), {
    message: 'Adres grafiki musi wskazywać plik w magazynie, nie adres zewnętrzny',
  })
  .refine((value) => !value.startsWith('/') && !value.startsWith('\\'), {
    message: 'Nieprawidłowa ścieżka grafiki',
  })
  .refine((value) => !value.split(/[\\/]/).includes('..'), {
    message: 'Nieprawidłowa ścieżka grafiki',
  });

const textAlign = z.enum(['left', 'center', 'right', 'justify']);

/** Zgody, ktore klient nadaje wlasnemu elementowi (na warstwach szablonu decyduje projektant). */
const clientFlags = {
  clientDraggable: z.boolean().optional(),
  clientResizable: z.boolean().optional(),
  clientRotatable: z.boolean().optional(),
  clientFontSize: z.boolean().optional(),
  clientFontFamily: z.boolean().optional(),
  clientColor: z.boolean().optional(),
  clientTextAlign: z.boolean().optional(),
  clientFontWeight: z.boolean().optional(),
  clientLineHeight: z.boolean().optional(),
};

const textPropertiesSchema = z.object({
  type: z.enum(['text', 'textbox']).optional(),
  text: z.string().max(MAX_ADDED_LAYER_TEXT).optional(),
  fieldKey: z.string().max(120).optional(),
  placeholder: z.string().max(200).optional(),
  fontSize: z.number().finite().min(1).max(2000).optional(),
  fontUnit: z.enum(['pt', 'px']).optional(),
  fontFamily: z.string().max(120).optional(),
  fontWeight: z.number().finite().min(1).max(1000).optional(),
  fontStyle: z.string().max(32).optional(),
  fill: color.optional(),
  textAlign: textAlign.optional(),
  verticalAlign: z.enum(['top', 'middle', 'bottom']).optional(),
  lineHeight: z.number().finite().min(0.1).max(10).optional(),
  maxLines: z.number().int().min(1).max(100).optional(),
  textTransform: z.string().max(32).optional(),
  splitByGrapheme: z.boolean().optional(),
  editable: z.boolean().optional(),
  padding: z.number().finite().min(0).max(1000).optional(),
  backgroundColor: color.optional(),
  backgroundOpacity: z.number().finite().min(0).max(1).optional(),
  borderColor: color.optional(),
  borderWidth: z.number().finite().min(0).max(1000).optional(),
  ...clientFlags,
});

const imagePropertiesSchema = z.object({
  type: z.literal('image').optional(),
  imageUrl: storageRelativePath,
  fit: z.enum(['contain', 'cover', 'fill']).optional(),
  tint: color.optional(),
  lockAspectRatio: z.boolean().optional(),
  ...clientFlags,
});

const baseAddedLayer = {
  id: z.string().min(1).max(120),
  name: z.string().max(200).optional(),
  visible: z.boolean().optional(),
  locked: z.boolean().optional(),
  opacity: z.number().finite().min(0).max(1).optional(),
  zIndex: z.number().finite().min(-10_000).max(10_000).optional(),
  x: coordinate,
  y: coordinate,
  width: dimension,
  height: dimension,
  rotation: z.number().finite().min(-360).max(360).optional(),
};

/**
 * Warstwa dodana przez klienta. Tylko trzy typy - portal nie tworzy innych,
 * a tlo czy linia ciecia to decyzje projektanta szablonu.
 */
const addedLayerSchema = z.discriminatedUnion('type', [
  z.object({ ...baseAddedLayer, type: z.literal('text'), properties: textPropertiesSchema }),
  z.object({ ...baseAddedLayer, type: z.literal('textbox'), properties: textPropertiesSchema }),
  z.object({ ...baseAddedLayer, type: z.literal('image'), properties: imagePropertiesSchema }),
]);

/** Nadpisanie pojedynczej warstwy - geometria i styl, ktory szablon dopuszcza. */
const layerOverrideSchema = z.object({
  x: coordinate.optional(),
  y: coordinate.optional(),
  width: dimension.optional(),
  height: dimension.optional(),
  rotation: z.number().finite().min(-360).max(360).optional(),
  zIndex: z.number().finite().min(-10_000).max(10_000).optional(),
  visible: z.boolean().optional(),
  fontSize: z.number().finite().min(1).max(2000).optional(),
  fontFamily: z.string().max(120).optional(),
  fill: color.optional(),
  textAlign: textAlign.optional(),
  fontWeight: z.number().finite().min(1).max(1000).optional(),
  // Ten sam zakres co w `textPropertiesSchema` - odstep to mnoznik wysokosci
  // wiersza, nie milimetry.
  lineHeight: z.number().finite().min(0.1).max(10).optional(),
  text: z.string().max(MAX_ADDED_LAYER_TEXT).optional(),
  tint: color.optional(),
  /** Pole wylacznie kliencie - renderer czyta gotowy `fontSize`. */
  autoFit: z.boolean().optional(),
});

const layersMapSchema = z.record(z.string().max(120), layerOverrideSchema).refine(
  (value) => Object.keys(value).length <= MAX_LAYER_ENTRIES,
  { message: `Za dużo nadpisanych warstw (maksymalnie ${MAX_LAYER_ENTRIES})` }
);

export const layoutOverridesSchema = z.object({
  /**
   * Kolor wiodacy wybrany przez klienta - jedno pokretlo na caly motyw
   * (tekst i podklad wektorowy), zamiast przemalowywania warstwy po warstwie.
   * Wygrywa z `primaryColor` szablonu.
   */
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional(),
  layers: layersMapSchema.optional(),
  items: z
    .record(
      z.string().max(12),
      z.object({ layers: layersMapSchema.optional() })
    )
    .refine((value) => Object.keys(value).length <= MAX_ITEM_ENTRIES, {
      message: `Za dużo sztuk z własnymi ustawieniami (maksymalnie ${MAX_ITEM_ENTRIES})`,
    })
    .optional(),
  addedLayers: z
    .array(
      z.object({
        id: z.string().min(1).max(120),
        pageId: z.string().min(1).max(120),
        layer: addedLayerSchema,
      })
    )
    .max(MAX_ADDED_LAYERS, `Za dużo dodanych elementów (maksymalnie ${MAX_ADDED_LAYERS})`)
    .optional(),
  customFields: z
    .array(
      z.object({
        key: z
          .string()
          .min(1)
          .max(120)
          .regex(/^[a-z0-9_]+$/i, 'Nieprawidłowy klucz kolumny'),
        label: z.string().min(1).max(MAX_CUSTOM_FIELD_LABEL),
        scope: z.enum(['SHARED', 'INDIVIDUAL']),
      })
    )
    .max(MAX_CUSTOM_FIELDS, `Za dużo dodanych kolumn (maksymalnie ${MAX_CUSTOM_FIELDS})`)
    .optional(),
});

export type LayoutOverridesInput = z.infer<typeof layoutOverridesSchema>;

/**
 * Nadpisanie JEDNEJ warstwy - typ wyprowadzony wprost ze schematu zapisu.
 *
 * Do 2026-08-19 ten sam ksztalt zyl w trzech kopiach (kp-admin, kp-client
 * w dwoch miejscach), kazda innej dlugosci: panel znal cztery klucze stylu,
 * portal osiem. Rozjazd nie objawial sie bledem - tylko tym, ze w panelu
 * "nie dzialalo" cos, co portal zapisywal poprawnie. Zrodlem prawdy jest
 * teraz zod, ktory i tak decyduje, co wejdzie do bazy.
 */
export type LayoutLayerOverride = z.infer<typeof layerOverrideSchema>;

export type LayoutOverrides = LayoutOverridesInput;

/**
 * Klucze nadpisania, ktore trafiaja do `properties` warstwy.
 *
 * Reszta (`x`, `zIndex`, `visible`…) to pola samej warstwy. Ta lista MUSI byc
 * zgodna z `mergeLayoutWithOverrides` w kp-api - to ona decyduje, co zobaczy
 * renderer druku, a rozjazd oznacza podglad inny niz wydruk.
 *
 * `autoFit` NIE jest tu celowo: to instrukcja dla edytora (czy zmniejszac
 * stopien pisma), a nie wlasciwosc, ktora renderer ma nalozyc na warstwe.
 */
export const STYLE_OVERRIDE_KEYS = [
  'fontSize',
  'fontFamily',
  'fill',
  'textAlign',
  'fontWeight',
  'lineHeight',
  'text',
  'tint',
] as const;

export type StyleOverrideKey = (typeof STYLE_OVERRIDE_KEYS)[number];

export type LayoutOverridesParseResult =
  | { ok: true; data: LayoutOverridesInput | undefined; dropped: string[] }
  | { ok: false; message: string };

/**
 * Klucze obecne w zadaniu, ktorych schemat nie zna - a wiec wycięte.
 *
 * `z.object` usuwa je po cichu i dokladnie na tym dwa razy przejechali sie
 * w tym projekcie: pole dodane w panelu znikalo przy zapisie i nikt nie
 * wiedzial dlaczego. Rozjazd miedzy portalem a API ma zostawiac slad w logu,
 * zamiast kasowac dane bez slowa.
 */
function collectDroppedKeys(input: unknown, parsed: unknown, path = ''): string[] {
  if (!input || typeof input !== 'object' || !parsed || typeof parsed !== 'object') return [];

  if (Array.isArray(input)) {
    if (!Array.isArray(parsed)) return [];
    return input.flatMap((entry, index) =>
      collectDroppedKeys(entry, parsed[index], `${path}[${index}]`)
    );
  }

  const dropped: string[] = [];
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const childPath = path ? `${path}.${key}` : key;
    if (!(key in (parsed as Record<string, unknown>))) {
      dropped.push(childPath);
      continue;
    }
    dropped.push(...collectDroppedKeys(value, (parsed as Record<string, unknown>)[key], childPath));
  }

  return dropped;
}

/**
 * Waliduje nadpisania z requestu. Brak pola to poprawny przypadek - klient
 * moze zapisac same odpowiedzi, bez ruszania projektu.
 */
export function parseLayoutOverrides(input: unknown): LayoutOverridesParseResult {
  if (input === undefined || input === null) return { ok: true, data: undefined, dropped: [] };

  const result = layoutOverridesSchema.safeParse(input);
  if (result.success) {
    return { ok: true, data: result.data, dropped: collectDroppedKeys(input, result.data) };
  }

  const issue = result.error.issues[0];
  const path = issue?.path?.length ? ` (${issue.path.join('.')})` : '';
  return {
    ok: false,
    message: `Nieprawidłowe zmiany projektu${path}: ${issue?.message || 'nieznany błąd'}`,
  };
}
