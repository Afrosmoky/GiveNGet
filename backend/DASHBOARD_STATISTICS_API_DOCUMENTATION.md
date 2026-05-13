# Dokumentacja API - Statystyki Dashboardu

## Endpointy Dashboardu

### Firma: Pobierz dane statystyczne dashboardu

- **Metoda**: GET
- **Ścieżka**: `/api/company/dashboard-data`
- **Autoryzacja**: wymagany zalogowany użytkownik (firma)
- **Opis**: Zwraca kompleksowe dane statystyczne dla dashboardu firmy, w tym podsumowanie aktywności, popularność ofert w czasie oraz dane CTR (Click-Through Rate).

### Parametry zapytania

- Brak

### Body żądania

- Brak

### Struktura odpowiedzi 200 OK

Obiekt zawierający:

#### activitySummary (podsumowanie aktywności)

- **totalOffers**: całkowita liczba opublikowanych ofert (number)
- **activeOffers**: liczba aktywnych ofert (number)
- **pendingOffers**: liczba ofert oczekujących na weryfikację (number)
- **expiredOffers**: liczba wygasłych ofert (number)
- **messagesFromUsers**: liczba wiadomości otrzymanych od użytkowników (number)
- **totalViews**: łączna liczba wyświetleń profilu i ofert (number)

#### popularityOverTime (popularność w czasie)

Mapa (obiekt) gdzie:
- **Klucz**: data w formacie ISO (YYYY-MM-DD) (string)
- **Wartość**: liczba interakcji (wyświetleń + kliknięć) w danym dniu (number)
- **Okres**: ostatnie 30 dni

#### ctrData (dane CTR dla ofert)

Obiekt gdzie:
- **Klucz**: ID oferty (string)
- **Wartość**: obiekt zawierający:
  - **offerId**: identyfikator oferty (string)
  - **offerName**: nazwa oferty (string)
  - **views**: liczba wyświetleń oferty (number)
  - **clicks**: liczba kliknięć w ofertę (number)
  - **ctr**: Click-Through Rate w procentach (number, zaokrąglone do 2 miejsc po przecinku)

### Przykładowa odpowiedź

```json
{
  "activitySummary": {
    "totalOffers": 15,
    "activeOffers": 10,
    "pendingOffers": 3,
    "expiredOffers": 2,
    "messagesFromUsers": 47,
    "totalViews": 342
  },
  "popularityOverTime": {
    "2025-01-15": 12,
    "2025-01-16": 18,
    "2025-01-17": 15,
    "2025-01-18": 22,
    "2025-01-19": 19,
    "2025-01-20": 25
  },
  "ctrData": {
    "OF1234567890": {
      "offerId": "OF1234567890",
      "offerName": "Elektronika używana",
      "views": 156,
      "clicks": 43,
      "ctr": 27.56
    },
    "OF0987654321": {
      "offerId": "OF0987654321",
      "offerName": "Meble do salonu",
      "views": 89,
      "clicks": 12,
      "ctr": 13.48
    },
    "OF1122334455": {
      "offerId": "OF1122334455",
      "offerName": "Rower miejski",
      "views": 234,
      "clicks": 67,
      "ctr": 28.63
    }
  }
}
```

### Kody odpowiedzi

- **200 OK**: dane dashboardu zwrócone poprawnie
- **401 Unauthorized**: brak autoryzacji lub użytkownik nie jest zalogowany
- **500 Internal Server Error**: błąd serwera podczas pobierania danych

### Przykład (curl)

```bash
curl -X GET \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/api/company/dashboard-data"
```

### Uwagi

- Dane dotyczą tylko ofert należących do zalogowanego użytkownika
- Statystyki popularności pokazują dane z ostatnich 30 dni
- CTR jest obliczany jako `(kliknięcia / wyświetlenia) * 100`
- Jeśli oferta nie ma żadnych wyświetleń, CTR wynosi 0

---

## Endpointy Statystyk Ofert

### Zapisz kliknięcie w ofertę

- **Metoda**: POST
- **Ścieżka**: `/api/offer/{offerId}/click`
- **Autoryzacja**: opcjonalna (dla zalogowanych użytkowników zapisuje statystyki)
- **Opis**: Zapisuje statystykę kliknięcia w ofertę. Używany do obliczania CTR (Click-Through Rate). Dla użytkowników niezalogowanych zwraca sukces, ale nie zapisuje statystyk.

### Parametry ścieżki

- **offerId** (wymagany, string): identyfikator oferty

### Parametry zapytania

- Brak

### Body żądania

- Brak

### Struktura odpowiedzi 200 OK

- **"OK"** (string): zawsze zwraca "OK" niezależnie od statusu autoryzacji

### Przykładowa odpowiedź

```
OK
```

### Kody odpowiedzi

- **200 OK**: operacja zakończona (statystyki zapisane lub użytkownik niezalogowany)
- **400 Bad Request**: nieprawidłowy ID oferty
- **404 Not Found**: oferta o podanym ID nie istnieje

### Przykład (curl)

```bash
# Dla zalogowanego użytkownika
curl -X POST \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/api/offer/OF1234567890/click"

# Dla niezalogowanego użytkownika (też zwraca OK)
curl -X POST \
  -H "Content-Type: application/json" \
  "http://localhost:8080/api/offer/OF1234567890/click"
```

### Uwagi

- Endpoint zawsze zwraca sukces (200 OK), nawet w przypadku błędów, aby nie przerywać działania frontendu
- Statystyki są zapisywane tylko dla zalogowanych użytkowników
- Endpoint powinien być wywoływany, gdy użytkownik kliknie w ofertę (np. w liście ofert)
- Kliknięcie różni się od wyświetlenia szczegółów oferty, które jest automatycznie zapisywane przy pobieraniu szczegółów oferty

---

## Informacje techniczne

### Zbieranie statystyk

System automatycznie zbiera następujące statystyki:

1. **Wyświetlenia ofert**: zapisywane automatycznie przy pobieraniu szczegółów oferty (`GET /api/offer/details/{offerId}`)
   - Statystyka jest zapisywana tylko jeśli użytkownik nie jest właścicielem oferty

2. **Kliknięcia w oferty**: zapisywane przez endpoint `POST /api/offer/{offerId}/click`
   - Powinien być wywoływany przez frontend gdy użytkownik klika w ofertę

3. **Wyświetlenia profilu**: zapisywane automatycznie przy pobieraniu danych profilu (`GET /api/profile/{userId}`)
   - Statystyka jest zapisywana tylko jeśli użytkownik nie przegląda własnego profilu

4. **Wiadomości**: zapisywane automatycznie przy wysyłaniu wiadomości przez WebSocket

### Obliczanie CTR

CTR (Click-Through Rate) jest obliczany dla każdej oferty według wzoru:

```
CTR = (liczba kliknięć / liczba wyświetleń) * 100
```

- Jeśli liczba wyświetleń wynosi 0, CTR = 0
- CTR jest zaokrąglany do 2 miejsc po przecinku

### Przechowywanie danych

Statystyki są przechowywane w następujących tabelach:

- **offer_statistics**: wyświetlenia ofert, kliknięcia, wyświetlenia profilu
- **message_statistics**: wiadomości między użytkownikami

Wszystkie statystyki zawierają znacznik czasu (`created_at`), co umożliwia analizę w czasie.

