# Architektura pod mobile — decyzje

## Stan backendu (zweryfikowany 09.2026)
Backend jest już w znacznym stopniu API-first i gotowy pod klienta mobilnego:
- Auth: JWT, sesje `STATELESS`, CSRF wyłączony, CORS konfigurowalny.
- Role: `ROLE_USER`, `ROLE_COMPANY`, `ROLE_EMPLOYEE`, `ROLE_ADMIN` (rola pracownika sklepu istnieje).
- Push: FCM zintegrowane (`FcmNotificationService`, `FcmToken`) — działa też dla mobile.
- Struktura: pakiety feature-by-feature (offer, auth, chat, file, statistics, favorites, consultant, rates, user…).

## Zasady dla nowych funkcji (żeby backend został reużywalny w mobile)
1. **DTO w odpowiedziach** — nigdy nie zwracać encji JPA bezpośrednio.
2. **Wersjonowanie API** — nowe endpointy pod `/api/v1/...`.
3. **Spójny format błędów** — jeden kształt (kod, message, szczegóły).
4. **Paginacja** list (page/size) i stabilne sortowanie.
5. **Logika w backendzie** — klient (web/mobile) cienki; żadnych reguł biznesowych po stronie frontu.
6. **Bez couplingu web-only** — brak zależności od sesji/cookie/renderu serwerowego; wszystko przez REST + JWT.

## Warstwa mobilna — decyzja
- **Podczas developmentu:** budujemy responsywny web + PWA-ready. Panel pracownika (potwierdzenie odbioru, skan QR) działa w przeglądarce telefonu (biblioteka JS do QR). Bez Capacitora w trakcie budowy funkcji.
- **Capacitor — DECYZJA: dodajemy na końcu, tuż przed pilotażem** (nie na starcie). Wtedy zapewnia: instalowalną apkę pod marką sieci, niezawodny push na iOS, pewny dostęp do kamery. To cienka nakładka na ten sam kod React — dokładamy ją jako ostatni krok przed uruchomieniem pilotażu.
  - ⚠️ **Uwaga do zweryfikowania na tym etapie:** obecne powiadomienia FCM są „data-only" (bez bloku `notification`), więc na iOS w tle nie wyświetlą się automatycznie w PWA. To wzmacnia sens Capacitora dokładnie na kroku przed pilotażem — przy okazji trzeba naprawić FCM (patrz `01_MVP_ZAKRES.md` / audyt: ścieżka klucza w Dockerze, brak bloku `notification`).
- **React Native** — dopiero po udanym pilotażu, jeśli potrzebna premium natywna apka (osobny codebase).

## Dlaczego to jest tanie później
Obie ścieżki (Capacitor, potem ewentualnie RN) są tanie, bo backend jest API-first, a front konsumuje to samo API. Utrzymanie zasad powyżej to jedyny warunek.
