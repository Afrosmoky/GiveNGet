# Biovlo MVP — zakres (Kamień Milowy / Załącznik nr 1)

**Zasada przewodnia:** dowieźć wąski, działający przepływ pilotażu (**rezerwacja → potwierdzenie odbioru → raport oszczędności**) na istniejącym kodzie, bez doklejania warstwy grywalizacji B2C.

**Szacowany nakład:** 122–194 rbh (jedna osoba doświadczona, wsparta Claude Code). Kalendarzowo part-time ~4–6 tygodni.

> Statusy poniżej pochodzą z audytu zakresu pilotażu i mogą wymagać weryfikacji z aktualnym stanem kodu.

---

## Co już działa (fundament — bez budowy)
- Konta: rejestracja użytkownika i firmy, aktywacja e-mail, reset hasła, JWT, bany.
- Oferty: dodawanie ze zdjęciami, terminem ważności i godzinami odbioru; edycja; lista z filtrami.
- Mapa z ofertami (markery) + „produkty w pobliżu" (promień, dystans).
- Konto i panel firmy; publikowanie ofert przez firmę; część statystyk firmowych.
- Regulamin (treści statyczne). Moderacja / panel admina (skargi, zakazane słowa, bany).

---

## Do zbudowania

### A. Rdzeń mechaniki pilotażu — 38–60 rbh
| Funkcja | Stan | Est. (rbh) |
|---|---|---|
| Rezerwacje: encja, hold, wygasanie, anulowanie, statusy, limity anty-abuse | od zera | 16–24 |
| Potwierdzenie odbioru: kod rezerwacji + skan QR kamerą w przeglądarce | od zera | 16–26 |
| Ilość / stan magazynowy (pole quantity) + dekrementacja przy rezerwacji | od zera | 6–10 |

### B. Sklep / retail — 40–62 rbh
| Funkcja | Stan | Est. (rbh) |
|---|---|---|
| Import ofert z Excela (mapowanie kolumn, walidacja, raport błędów) | od zera | 16–24 |
| Rola pracownika sklepu (panel EMPLOYEE: dodawanie ofert, potwierdzanie odbioru) | typ EMPLOYEE istnieje | 8–12 |
| Profil sklepu — widok publiczny | fundament jest | 6–10 |
| Raport oszczędności (kg, wartość, liczba uratowanych, prosty CO₂) | od zera | 10–16 |

### C. Platforma — 16–28 rbh
| Funkcja | Stan | Est. (rbh) |
|---|---|---|
| Statystyki platformowe (aktywni userzy, sklepy, rezerwacje, odbiory) | częściowo jest | 6–10 |
| Powiadomienia FCM (potwierdzenie rezerwacji, wygasanie, przypomnienie odbioru) | silnik FCM jest | 6–10 |
| Zgody RODO + akceptacja regulaminu | regulamin jest | 4–8 |

### D. Bezpieczeństwo — 16–24 rbh (wymagane przy pilotażu pod marką sieci)
| Funkcja | Stan | Est. (rbh) |
|---|---|---|
| Hardening: CORS, rate limiting, klucz Firebase z repo, walidacja plików (import!), auth czatu/WS | do zrobienia | 16–24 |

### E. Bufor — 12–20 rbh
Stabilizacja, testy, deploy pilotażu, poprawki.

---

## Poza zakresem MVP (faza 2)
- Encja „Produkt" / baza produktów z autouzupełnianiem.
- Skan kodu kreskowego (EAN) przy dodawaniu.
- Integracja API z systemem magazynowym sklepu.
- Warstwa B2C: odznaki, rangi, cele, rankingi, storytelling CO₂/woda.
- Rozbudowany raport ESG (pełne wskaźniki, eksporty).

---

## Mechanizm odbioru (opcja wybrana)
Potwierdza **pracownik sklepu** w przeglądarkowym panelu — bez osobnej aplikacji ani sprzętu. Baseline: klient pokazuje krótki kod rezerwacji, pracownik go wpisuje i potwierdza. Dodatkowo: skan QR kamerą telefonu/terminala przez przeglądarkę (biblioteka JS), na urządzeniu, które sklep już posiada. To domyka rezerwację i czyni statystykę „uratowane" wiarygodną oraz odporną na no-showy.

---

## Procedura odbioru MVP (Kamień Milowy)
1. Zgłoszenie gotowości przez CTO → sprawdzenie, czy funkcje z Zał. nr 1 działają na produkcji.
2. Odbiór przez Założyciela / osobę o kompetencjach technicznych w **7 dni roboczych** (brak reakcji → dodatkowe 3 dni → odbiór bez zastrzeżeń).
3. **Błąd krytyczny** = uniemożliwia podstawowy przepływ (rezerwacja → odbiór → raport) lub inną kluczową funkcję. Tylko błędy krytyczne wstrzymują odbiór.
4. Usterki drobne/kosmetyczne nie blokują odbioru — usuwane po odbiorze.
5. Potwierdzenie: **protokół odbioru**.
