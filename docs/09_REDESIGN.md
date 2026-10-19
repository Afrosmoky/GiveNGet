# Redesign — decyzje UI (web + mobile)

Gałąź: `redesign`. Kolory robocze (zielenie/fresh) do czasu logo — wszystko w tokenach, reskin pod logo = edycja `tokens.css`.

## Nawigacja wg kontekstu (roli)
- **Konsument (REGULAR/gość):** górny pasek marketplace (logo, Oferty / Mapa / Moje rezerwacje / Ulubione, wyszukiwarka, lokalizacja, dzwonek, avatar) + dolny pasek mobilny.
- **Firma:** boczna konsola (Pulpit, Oferty, Dodaj ofertę, Import, Rezerwacje, Raport, Pracownicy, Profil sklepu, Wyloguj); na mobile sidebar w drawer.
- **Pracownik sklepu:** minimalny layout — zasadniczo jeden ekran „Potwierdź odbiór".
- **Admin/moderator:** konsola jak firma, z pozycjami admina.

## Komponenty
Tokeny + biblioteka UI (Button, Card, Badge/StatusPill, Input, Chip, MetricCard, Logo, Avatar, IconButton). Nowy UI na Tailwind; inline style na dotkniętych elementach zamieniane na klasy.

## Wymagania szczegółowe
- **Zwijane boczne menu (sidebar) w konsoli firmy/admina.** Ikonka (toggle) do zwijania paska. Po zwinięciu sidebar przechodzi w tryb **rail — same ikony** (bez etykiet), z tooltipami na hover; po rozwinięciu wraca pełna lista. Stan zapamiętany (localStorage), płynna animacja szerokości. Wzorzec typowy dla nowoczesnych paneli SaaS.
- Ciemny motyw: nie teraz; tokeny ułożone tak, by dodać go jednym blokiem później.
- **Pasek gościa (niezalogowany):** ukryć pozycje wymagające logowania (Moje rezerwacje, Ulubione, dzwonek, avatar). **Na czas redesignu oferty zostają za loginem (tak jak było od początku), więc dla gościa chowamy też Oferty, Mapa i wyszukiwarkę** — gość widzi: logo oraz „Zaloguj" / „Załóż konto". Pozycje auth-only pokazują się dopiero po zalogowaniu.
- **Publiczne przeglądanie ofert (opcja A) — DECYZJA: robimy na SAMYM KOŃCU, po całej checklistcie reskinu.** Wcześniej (i dziś) oferty były zawsze za loginem — to nie regres, tylko pierwotny stan. Opcja A = nowe ulepszenie (standard dla food-rescue, lepsze na demo z partnerami): otwarcie publicznych `GET` ofert (`/api/offer/newest`, `/recommended`, `/details/{id}`, wyszukiwarka) + **publiczne DTO bez danych wrażliwych** (bez telefonu/e-maila sprzedawcy); rezerwacja, ulubione, czat zostają za loginem. Po włączeniu A — odsłonić z powrotem Oferty/Mapa/wyszukiwarkę dla gościa i zmienić reguły w `SecurityConfig` + `PUBLIC_ENDPOINTS` w `JwtAuthenticationFilter`.

## Szerokość kontenerów — spójność stron publicznych
Strony przed logowaniem mają niespójną szerokość: **landing (`/`) jest na szerokim kontenerze**, a strony statyczne („o nas", polityka prywatności, regulamin — `/static-content/*`) oraz rejestracja są na wąskim. DECYZJA: wyrównać do szerokiego kontenera landingu:
- **Szeroki** (jak landing): `/static-content/[...]` (o nas, polityka, regulamin) i **rejestracja** (`/register`) — zakładanie konta to dłuższy formularz (REGULAR + firma), wygląda lepiej na szerszym.
- **Wąski** (bez zmian): `/login` — to tylko logowanie, wąski kontener jest OK.
Użyć tej samej klasy max-width kontenera co landing (jedno źródło — np. wspólny wrapper/token), żeby nie rozjechało się ponownie.

## Checklista reskinu — WSZYSTKIE ekrany (nic nie pomijamy)
> **STATUS: redesign A–G ZROBIONY (10.2026).** Wszystkie grupy domknięte na gałęzi `redesign`: A (konsument), B (auth/systemowe), C (konsola firmy + lista rezerwacji #8), D (pracownik — odbiór), E (admin/moderator), F (czat), G (rebranding: prawdziwe logo, paleta z logo, favicony + manifest, „GiveNGet"→„Biovlo", „ogłoszenia"→„oferty"). Screeny per grupa w `.redesign-shots/`. Zostaje: scalenie `redesign` → główna gałąź i spięcie z FCM (#5). „GiveNGet" w kodzie tylko jako ID projektu Firebase (`givenget-b5ef0`) — zostaje, bo zmiana zepsułaby FCM.

R1 = motyw + komponenty + powłoki + `/offers/search` jako demo. Potem kolejno:

### A. Konsument (najpierw — to widzą partnerzy/userzy)
- [ ] `/offers/search` — lista/siatka + mapa, `OfferTile` (demo w R1)
- [ ] `/offers/[offerId]` (+ `/[offerName]`) — szczegóły oferty + `ReserveOfferPanel`
- [ ] `/reservations` — Moje rezerwacje (kod + QR)
- [ ] `/favorites` — Ulubione
- [ ] `/stores/[companyId]` — publiczny profil sklepu (nowe)
- [ ] `/profile`, `/profile/[userId]` — profil

### B. Auth / systemowe (każdy nowy user tu trafia)
- [ ] `/login`
- [ ] `/register`, `/register/success`
- [ ] `/activate/[code]`, `/user-not-confirmed`
- [ ] `/reset-password`, `/reset-password/[code]`
- [ ] `/unauthorized`
- [ ] `/static-content/[content-name]` — regulamin/polityka
- [ ] `/` — home/landing

### C. Firma (konsola)
- [ ] `/dashboard` — pulpit (`CompanyDashboard`)
- [ ] `/create-offer` + `/offers/edit/[offerId]` — `OfferForm`
- [ ] `/offers/import` — import Excela (nowe)
- [ ] `/reports/savings` — raport oszczędności (nowe)
- [ ] `/store/employees` — pracownicy (nowe)

### D. Pracownik sklepu
- [ ] `/store/pickup` — „Potwierdź odbiór" (nowe)

### E. Admin / moderator
- [ ] `/admin` + `/admin/users` + `/admin/complaints` + `/admin/forbidden-words` + `/admin/consultant-chats`
- [ ] `/admin/stats` — statystyki platformy (nowe)
- [ ] `/offers/mod-edit/[offerId]` — moderacja oferty

### F. Czat
- [ ] `/chats`, `/consultant-chat`

### G. Przekrojowe (wyszło przy R1)
- [ ] **Stopka (Footer)** — wciąż stary „GiveNGet" + angielski (Details/Follow us/Contact support). Zreskinować i obrandować na Biovlo, treść PL.
- [ ] **Terminologia** — ujednolicić „ogłoszenia" → „oferty" w całej apce (marketplace Biovlo).
- [ ] **Rebranding** — wszystkie „GiveNGet"/stare logo → Biovlo (logo w `Logo.tsx` + miejsca z tekstem).
