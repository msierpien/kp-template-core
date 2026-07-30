# kp-template-core

Wspólny kontrakt trzech aplikacji personalizacji: **kp-admin** (tworzy projekt),
**kp-client** (pokazuje go i modyfikuje) i **kp-api** (waliduje i renderuje na PDF).

Dopóki ten opis żył w trzech kopiach, rozjazdy były niewidoczne aż do produkcji —
pole dodane w panelu znikało przy zapisie, a podgląd u klienta rozjeżdżał się
z wydrukiem. Tutaj jest jedno miejsce, a każda zmiana przechodzi przez wersję
pakietu, więc kompilator w trzech repozytoriach pokazuje, co wymaga uwagi.

## Co jest w środku

| Moduł | Zawartość |
|---|---|
| `template-layout` | Format projektu (`layoutJson`): strony, warianty układu, warstwy i ich właściwości, skład do druku, mockupy, formaty i przeliczniki mm ↔ px |
| `layout-overrides` | Schemat Zod zmian wprowadzanych przez klienta w portalu + `parseLayoutOverrides` (to on decyduje, co API przyjmie do bazy) |
| `mockup-warp` | Geometria nakładania projektu na zdjęcie produktu — ten sam kod liczy podgląd w przeglądarce i render do druku |

## Instalacja w aplikacji

Pakiet leży w GitHub Packages, więc rejestr trzeba wskazać per scope.
W repozytorium konsumenta (`.npmrc`) idzie **wyłącznie** mapowanie:

```
@msierpien:registry=https://npm.pkg.github.com
```

Token (uprawnienie **`read:packages`**) musi być na poziomie **użytkownika**.
pnpm celowo nie rozwija zmiennych w danych logowania z pliku commitowanego do
repozytorium — chroni przed wyciekiem tokenu do obcego rejestru — więc
`//npm.pkg.github.com/:_authToken=${NPM_TOKEN}` w `.npmrc` projektu **zostanie
zignorowane** i instalacja skończy się `401`.

**Lokalnie** — w `~/.npmrc`:

```bash
printf '//npm.pkg.github.com/:_authToken=%s\n' "$NPM_TOKEN" > ~/.npmrc && chmod 600 ~/.npmrc
```

**Vercel** — zmienna `NPM_TOKEN` w Settings → Environment Variables, plus
nadpisany Install Command (Settings → Build & Development Settings):

```
echo "//npm.pkg.github.com/:_authToken=$NPM_TOKEN" >> ~/.npmrc && pnpm install
```

**Docker (kp-api)** — sekret montowany jako `/root/.npmrc` na czas `RUN`; nigdy
`ENV` ani `.npmrc` z wpisanym tokenem, bo zostaje w warstwie obrazu na zawsze.
Szczegóły w `kp-api/Dockerfile` i `docker-compose.production.yml`.

Potem zwyczajnie:

```bash
pnpm add @msierpien/kp-template-core
```

```ts
import { getTemplatePages, parseLayoutOverrides } from '@msierpien/kp-template-core'
```

`zod` jest zależnością **peer** — pakiet używa tej wersji, którą ma aplikacja,
więc w jednym procesie nie ma dwóch kopii Zoda.

## Warianty układu

Ten sam produkt bywa potrzebny w kilku składach — zaproszenie z prośbą
o potwierdzenie przybycia i bez niej. Zamiast liczyć na automatyczne dosuwanie
tekstu, szablon trzyma **warianty**: każdy ma własny komplet stron, więc
projektant panuje nad typografią w każdym z nich.

```ts
layout.variants = [
  { id: 'v-full',  name: 'Z potwierdzeniem',   matchValue: 'tak', pages: [...] },
  { id: 'v-short', name: 'Bez potwierdzenia',  matchValue: 'nie', pages: [...] },
]
layout.variantFieldKey = 'potwierdzenie' // pole formularza typu lista wyboru
```

Odczyt zawsze przez helpery, nie po polach wprost:

| Funkcja | Do czego |
|---|---|
| `getTemplateVariants(layout)` | Lista wariantów; layout bez `variants` zwraca jeden zbudowany z `pages` |
| `resolveTemplateVariant(layout, answers)` | Wariant wybrany odpowiedzią klienta (bez rozróżniania wielkości liter) |
| `getTemplatePagesForAnswers(layout, answers)` | Strony do renderowania dla tych odpowiedzi |
| `withTemplateVariants(layout, variants)` | Zapis wariantów; `pages`/`canvas`/`layers` zostają lustrem **pierwszego** wariantu |

Lustro celowo nie śledzi wariantu otwartego w edytorze — konsument nieznający
wariantów ma zawsze pokazywać układ podstawowy, a nie ten, który projektant
akurat oglądał.

Skład do druku i mockupy są **wspólne dla szablonu** i wskazują strony po
`pageId`, więc warianty powinny mieć ten sam zestaw stron —
`validateTemplateVariants(layout, kluczePól)` zwraca ostrzeżenia, gdy któraś
strona wypada z wariantu albo pole wybierające wariant nie istnieje.

## Style fragmentów tekstu

Pogrubienie albo kursywa w środku akapitu opisane są zakresami **na surowym
tekście warstwy**, nie na zawiniętych liniach:

```ts
properties.styleRanges = [{ start: 7, end: 13, fontWeight: 700 }]
```

Fabric trzyma style pod numerami linii po zawinięciu — a zawijanie zmienia się
z szerokością ramki i treścią, więc styl przypięty do linii rozjeżdżałby się
przy każdej poprawce. Do tego fabric **zjada separator na złamaniu** (spację
przy zawijaniu, `\n` przy twardym końcu linii), więc sumowanie długości linii
przesuwałoby style o znak na każde złamanie — `buildFabricTextStyles` szuka
każdej linii w surowym tekście zamiast sumować. Konwersja idzie przez helpery,
żeby edytor, portal i wydruk liczyły ją identycznie:

| Funkcja | Do czego |
|---|---|
| `resolveCharStyles(text, ranges)` | Styl każdego znaku po złożeniu zakresów (późniejszy wygrywa, indeksy poza tekstem przycięte) |
| `buildFabricTextStyles(text, lines, charStyles)` | Struktura `{ nrLinii: { nrZnaku: styl } }` dla fabrica — `lines` podaje konsument, bo tylko on zna swoje zawijanie |
| `normalizeStyleRanges(text, ranges)` | Posprzątane zakresy do zapisu (sklejone sąsiednie o tym samym stylu) |

## Światło między literami

`properties.letterSpacing` (1/1000 firetu, jednostka `charSpacing` fabrica):
`50` = 0,05 em, wartości ujemne ściskają. Przy kaligrafii i wersalikach sam
rozmiar pisma nie wystarcza, żeby napis oddychał.

## Tekst po krzywej (`text_path`)

Warstwa `text_path` prowadzi jednoliniowy napis po łuku albo okręgu. `x`/`y`
to **środek okręgu**, nie środek napisu — tam projektant celuje promieniem.
Przełożenie na kotwicę fabrica robi `getTextPathAnchorOffset`; policzenie tego
na miejscu, w aplikacji, kończy się warstwą skaczącą po zapisie.

| Funkcja | Do czego |
|---|---|
| `buildTextPathD(props, dpi)` | Atrybut `d` prowadnicy wokół (0,0). Okrąg i łuk > 180° składa z **dwóch** półłuków |
| `getTextPathArcLength(props, dpi)` | Długość łuku w px, analitycznie (`|sweep| · r`) — ta liczba decyduje, czy napis się mieści |
| `getTextPathBBox(props, dpi)` | Zasięg krzywej → `layer.width/height` (walidacja odrzuca zerowe wymiary) |
| `getTextPathAnchorOffset(props, dpi)` | Wektor od środka okręgu do środka bboksu ścieżki. Górny półłuk: `dy = −r/2` |
| `resolveTextPathStartOffset(align, arcLength, textWidth)` | `pathStartOffset` dla fabrica — start / środek / koniec łuku |
| `isTextPathRadiusTooTight(radiusMm, fontSizePx, dpi)` | Czy przy tym promieniu glify nie będą się zlepiać |

Jednostki: wejście w milimetrach (`radiusMm`), wyjście w pikselach przy dpi
strony. **Skala podglądu nie należy do pakietu** — edytor mnoży wynik przez
swoją skalę, renderer bierze go wprost. To jedyna dozwolona różnica między
dwoma wywołaniami i najłatwiejsza pomyłka w całym mechanizmie.

Wartości odniesienia w testach pochodzą z porównania z `fabric/node`:
półokrąg r = 100 px ma długość 314 px, a jego bbox wysokość 100 px (nie 200).

## Tryb druku

`print.mode` rozstrzyga, czy strony jadą na wspólny arkusz (`sheet` — przód
i tył tej samej karty), czy każda na własny (`separate` — osobne kartki).
Bez tego pola decydują wymiary: `shouldPrintPagesSeparately(layout)` zwraca
`true`, gdy strony różnią się formatem.

## Wydanie nowej wersji

1. Zmiana w `src/`, `npm test`.
2. Podniesienie `version` w `package.json` (semver: zmiana kształtu danych, która
   psuje starsze aplikacje, to **major**).
3. Commit, a potem tag:

```bash
git tag v0.2.0 && git push origin v0.2.0
```

GitHub Actions (`.github/workflows/publish.yml`) uruchomi testy i opublikuje
pakiet. Wersji w rejestrze **nie da się nadpisać** — stąd testy przed publikacją.

## Zasada, o której łatwo zapomnieć

`z.object` po cichu usuwa klucze spoza schematu. Nowe pole nadpisania dodane
w portalu, ale nieopisane w `layout-overrides`, **zniknie przy zapisie**.
Dlatego `parseLayoutOverrides` zwraca listę wyciętych kluczy — API loguje ją
jako ostrzeżenie, żeby rozjazd zostawiał ślad zamiast kasować dane.
