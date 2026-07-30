/**
 * Wspolny kontrakt trzech aplikacji personalizacji.
 *
 * - `template-layout` - format projektu (layoutJson): strony, warstwy,
 *   wlasciwosci, sklad do druku, mockupy.
 * - `layout-overrides` - schemat zmian wprowadzanych przez klienta w portalu,
 *   razem z walidacja (to on decyduje, co API przyjmie do bazy).
 * - `mockup-warp` - geometria nakladania projektu na zdjecie produktu;
 *   ten sam kod liczy podglad w przegladarce i render do druku.
 * - `text-path` - geometria tekstu po krzywej: `d` prowadnicy, dlugosc luku,
 *   offset startowy i kotwica. Tak samo jak przy mockupach: jedna
 *   implementacja dla podgladu i dla wydruku.
 */
export * from './template-layout';
export * from './layout-overrides';
export * from './mockup-warp';
export * from './text-path';
