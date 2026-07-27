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
| `template-layout` | Format projektu (`layoutJson`): strony, warstwy i ich właściwości, skład do druku, mockupy, formaty i przeliczniki mm ↔ px |
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
