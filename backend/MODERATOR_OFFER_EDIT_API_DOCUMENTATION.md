# API Dokumentacja - Edycja Oferty przez Moderatora

## Endpoint

```
PUT /api/mod/offers/{offerId}
```

## Opis

Endpoint do edycji oferty przez moderatora lub administratora. Moderator może modyfikować treść oferty, kategorię, lokalizację i zdjęcia, ale **nie może** zmieniać terminu ważności oraz godzin odbioru. Każda modyfikacja wymaga podania powodu zmiany, a właściciel oferty otrzymuje powiadomienie emailowe o modyfikacji.

## Autoryzacja

Wymagany zalogowany użytkownik z uprawnieniami moderatora (EMPLOYEE) lub administratora (ADMIN).

## Parametry ścieżki

- **offerId** (wymagany, string): identyfikator oferty do edycji

## Parametry zapytania

- **images** (opcjonalne, MultipartFile[]): nowe obrazy do dodania do oferty

## Body żądania

Format: `multipart/form-data` lub `application/json`

### Struktura ModeratorUpdateOfferDTO

```json
{
  "categoryId": 4,
  "subcategoryId": 2,
  "description": "Zaktualizowany opis oferty",
  "offerType": "free",
  "removedImages": ["/static/offer/ABC123/image3.jpg"],
  "reason": "Poprawa błędów w opisie i kategorii"
}
```

### Pola

- **categoryId** (wymagane, Integer): ID kategorii
- **subcategoryId** (opcjonalne, Integer): ID podkategorii (wymagane jeśli kategoria ma podkategorie)
- **description** (wymagane, String): opis oferty
- **offerType** (wymagane, String): typ transakcji (`free`, `exchange`, `sale`)
- **removedImages** (opcjonalne, List<String>): lista ścieżek do zdjęć do usunięcia
- **reason** (wymagane, String): powód modyfikacji oferty

### Pola NIEDOSTĘPNE dla moderatora

Następujące pola **nie mogą** być zmieniane przez moderatora:
- **name** - nazwa/tytuł oferty
- **location** - lokalizacja oferty
- **expiryDate** - termin ważności oferty
- **pickupTimeFrom** - godzina odbioru od
- **pickupTimeTo** - godzina odbioru do

Te pola pozostają bez zmian niezależnie od żądania.

## Struktura odpowiedzi

### Sukces (200 OK)

```
"Oferta została zaktualizowana pomyślnie"
```

### Błędy

#### 400 Bad Request - Nieprawidłowe parametry
```
"ID kategorii jest wymagane"
"Nazwa jest wymagana"
"Powód zmiany jest wymagany"
"Kategoria nie została znaleziona"
"Podkategoria nie należy do wybranej kategorii"
```

#### 400 Bad Request - Brak uprawnień
```
"Tylko moderatorzy i administratorzy mogą edytować oferty"
```

#### 400 Bad Request - Oferta nie istnieje
```
"Oferta nie została znaleziona"
```

#### 400 Bad Request - Zakazane treści
```
"Treść oferty zawiera zakazane słowa/wzorce. Oferta została oznaczona do weryfikacji."
```

#### 401 Unauthorized - Brak autoryzacji
```
"Użytkownik musi być zalogowany"
```

#### 500 Internal Server Error
```
"Błąd podczas aktualizacji oferty: [szczegóły błędu]"
```

## Kody odpowiedzi HTTP

- `200 OK` - oferta została zaktualizowana pomyślnie
- `400 Bad Request` - błąd walidacji, brak uprawnień lub oferta nie istnieje
- `401 Unauthorized` - brak autoryzacji
- `403 Forbidden` - brak uprawnień moderatora/administratora
- `500 Internal Server Error` - błąd serwera

## Przykłady użycia

### Edycja oferty - zmiana opisu i kategorii

```bash
curl -X PUT \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": 5,
    "subcategoryId": 3,
    "description": "Poprawiony opis oferty",
    "offerType": "free",
    "reason": "Korekta błędów w opisie, zmiana kategorii na bardziej odpowiednią"
  }' \
  "http://localhost:8080/api/mod/offers/ABC123"
```

### Edycja oferty z usunięciem zdjęć i dodaniem nowych

```bash
curl -X PUT \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -F "categoryId=4" \
  -F "description=Poprawiony opis oferty" \
  -F "offerType=free" \
  -F "removedImages=/static/offer/ABC123/image2.jpg" \
  -F "reason=Usunięcie nieodpowiednich zdjęć i dodanie nowych" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg" \
  "http://localhost:8080/api/mod/offers/ABC123"
```

### Edycja oferty - tylko zmiana kategorii

```bash
curl -X PUT \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": 6,
    "subcategoryId": 4,
    "description": "Oryginalny opis",
    "offerType": "free",
    "reason": "Zmiana kategorii na bardziej odpowiednią"
  }' \
  "http://localhost:8080/api/mod/offers/ABC123"
```

## Uwagi

### Pola edytowalne przez moderatora

Moderator może edytować następujące pola:
- ✅ Opis oferty (`description`)
- ✅ Kategoria i podkategoria (`categoryId`, `subcategoryId`)
- ✅ Typ transakcji (`offerType`)
- ✅ Zdjęcia (dodawać nowe, usuwać istniejące)

### Pola NIEDOSTĘPNE dla moderatora

Moderator **nie może** edytować:
- ❌ Nazwa/tytuł oferty (`name`)
- ❌ Lokalizacja oferty (`location`, `lat`, `lon`, `coordinates`)
- ❌ Termin ważności (`expiryDate`)
- ❌ Godzina odbioru od (`pickupTimeFrom`)
- ❌ Godzina odbioru do (`pickupTimeTo`)

Te pola pozostają bez zmian i są ignorowane w żądaniu.

### Zarządzanie zdjęciami

- **removedImages** (opcjonalne, List<String>): lista ścieżek do zdjęć, które mają być usunięte
  - Tylko zdjęcia z tej listy zostaną usunięte
  - Wszystkie pozostałe zdjęcia pozostają bez zmian
  - Jeśli lista jest pusta lub `null`, żadne zdjęcia nie są usuwane

- **images** (query param, opcjonalne): nowe pliki zdjęć do dodania
  - Można przesłać wiele plików jednocześnie
  - Nowe zdjęcia są dodawane do istniejących (nie zastępują ich)

### Powiadomienia email

Po modyfikacji oferty przez moderatora:
1. **Właściciel oferty** otrzymuje email z:
   - Informacją o modyfikacji
   - Powodem zmiany
   - Linkiem do zmodyfikowanej oferty
   - Informacją, że niektóre pola (nazwa, lokalizacja, termin ważności, godziny odbioru) nie mogą być zmieniane

2. **Zainteresowani użytkownicy** (którzy mają ofertę w ulubionych) otrzymują standardowe powiadomienie o zmianie oferty

### Walidacja

- Kategoria musi istnieć w systemie
- Jeśli kategoria ma podkategorie, `subcategoryId` jest wymagane
- Podkategoria musi należeć do wybranej kategorii
- Typ transakcji musi być dozwolony dla wybranej kategorii/podkategorii
- Powód zmiany (`reason`) jest **wymagany** i nie może być pusty
- Jeśli oferta zawiera zakazane treści po edycji, status zmienia się na `PENDING`

### Status oferty po edycji

- Jeśli oferta zawiera zakazane treści → status zmienia się na `PENDING`
- Jeśli oferta była wcześniej zablokowana → status zmienia się na `PENDING` (wymaga ponownej weryfikacji)
- W przeciwnym razie status pozostaje bez zmian

### Uprawnienia

- Tylko użytkownicy z rolą **EMPLOYEE** (moderator) lub **ADMIN** (administrator) mogą używać tego endpointa
- Zwykli użytkownicy muszą używać standardowego endpointa `/api/offer/{offerId}` do edycji własnych ofert

## Przykład odpowiedzi emailowej

Właściciel oferty otrzyma email z następującą treścią:

```
Temat: Twoja oferta została zmodyfikowana przez pracownika - GNG

Witaj [Imię Nazwisko],

Informujemy, że Twoja oferta została zmodyfikowana przez pracownika platformy GNG.

[Nazwa oferty]

Powód modyfikacji:
[Powód podany przez moderatora]

Uwaga: Niektóre pola oferty (termin ważności, godziny odbioru) nie mogą być 
zmieniane przez pracowników i pozostały bez zmian.

[Link do oferty]

Pozdrawiamy,
Zespół GNG
```

