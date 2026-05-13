# API Dokumentacja - Ban/Unban User

## Endpoint
```
PATCH /api/mod/users/{id}/ban
```

## Opis
Endpoint do blokowania/odblokowywania użytkownika z możliwością ustawienia czasu trwania bana. Dostępny dla moderatorów i administratorów.

## Parametry

### Path Parameters
- `{id}` (Long, wymagane) - ID użytkownika do zablokowania/odblokowania

### Query Parameters

#### Dla banowania użytkownika (`banned=true`):
- `banned` (boolean, wymagane) - musi być `true` dla banowania
- `reasonCode` (Integer, wymagane) - kod powodu bana (patrz sekcja "Kody powodów banowania")
- `reason` (String, opcjonalne) - dodatkowy opis powodu (wymagany tylko dla `reasonCode=401`)
- `durationDays` (Integer, opcjonalne) - czas trwania bana w dniach
  - Jeśli podany: ban czasowy na określoną liczbę dni
  - Jeśli `null` lub nie podany: ban permanentny

#### Dla odbanowania użytkownika (`banned=false`):
- `banned` (boolean, wymagane) - musi być `false` dla odbanowania
- `reason` (String, opcjonalne) - powód odbanowania

## Kody powodów banowania

| Kod | Opis |
|-----|------|
| 101 | Nieodpowiednia kategoria |
| 102 | Wulgaryzmy/obraźliwe treści |
| 103 | Towar niedozwolony |
| 104 | Wprowadzające w błąd |
| 105 | Naruszenie zdjęć/RODO |
| 201 | Spam |
| 301 | Nadużycie w transakcji |
| 401 | Inne (wymaga dodatkowego opisu w parametrze `reason`) |

## Przykłady użycia

### Zablokowanie użytkownika na 7 dni - Nieodpowiednia kategoria
```
PATCH /api/mod/users/123/ban?banned=true&reasonCode=101&durationDays=7
```

### Zablokowanie użytkownika na 2 tygodnie - Wulgaryzmy
```
PATCH /api/mod/users/123/ban?banned=true&reasonCode=102&durationDays=14
```

### Zablokowanie permanentne - Spam
```
PATCH /api/mod/users/123/ban?banned=true&reasonCode=201
```

### Zablokowanie na 30 dni - Inne (wymaga reason)
```
PATCH /api/mod/users/123/ban?banned=true&reasonCode=401&reason=Szczegółowy opis powodu&durationDays=30
```

### Odblokowanie użytkownika
```
PATCH /api/mod/users/123/ban?banned=false&reason=Problem został rozwiązany
```

## Odpowiedź

### Sukces (200 OK)
```
"OK"
```

### Błędy

#### 400 Bad Request - Brak kodu powodu
```
"Kod powodu bana (reasonCode) jest wymagany"
```

#### 400 Bad Request - Nieprawidłowy kod
```
"Nieprawidlowy kod powodu bana: 999"
```

#### 400 Bad Request - Brak opisu dla "Inne"
```
"Powód 'Inne' wymaga dodatkowego opisu"
```

#### 400 Bad Request - Użytkownik już zbanowany
```
"Użytkownik ma już aktywny ban"
```

#### 400 Bad Request - Użytkownik nie zbanowany
```
"Użytkownik nie ma aktywnego bana"
```

#### 400 Bad Request - Brak uprawnień do banowania permanentnego
```
"Tylko administrator może zbanować użytkownika permanentnie"
```

#### 400 Bad Request - Użytkownik nie istnieje
```
"User with id=123 not found"
```

#### 401 Unauthorized - Brak autoryzacji
```
"Brak autoryzacji"
```

#### 500 Internal Server Error
```
"Błąd podczas operacji banowania: [szczegóły błędu]"
```

## Kody odpowiedzi HTTP
- `200 OK` - pomyślna operacja
- `400 Bad Request` - błąd walidacji lub użytkownik nie istnieje
- `401 Unauthorized` - brak autoryzacji
- `403 Forbidden` - brak uprawnień moderatora/administratora
- `500 Internal Server Error` - błąd serwera

## Uwagi

### Banowanie
- Operacja jest natychmiastowa - użytkownik zostaje zablokowany od razu
- Zablokowani użytkownicy nie mogą się logować
- Ban czasowy automatycznie wygasa po upływie określonego czasu
- **Ban permanentny (bez `durationDays` lub `durationDays=null`) może nałożyć tylko administrator (ADMIN)**
- Moderatorzy (EMPLOYEE) mogą banować tylko na określony czas (muszą podać `durationDays`)
- Ban permanentny wymaga ręcznego odbanowania
- Jeśli użytkownik ma już aktywny ban, nie można nałożyć kolejnego
- Dla kodu powodu `401` (Inne) parametr `reason` jest **wymagany**

### Odbanowanie
- Odbanowanie kończy aktywny ban ustawiając datę zakończenia na aktualną
- Użytkownik może się ponownie zalogować po odbanowaniu

### Powiadomienia email
- Po banowaniu użytkownik otrzymuje email z powodem blokady
- Dla banów czasowych email zawiera:
  - Powód bana
  - Czas trwania blokady (np. "7 dni", "2 tygodnie")
  - Datę zakończenia blokady
  - Informację o automatycznym odblokowaniu
- Dla banów permanentnych email zawiera tylko powód bana
- Po odbanowaniu użytkownik otrzymuje email z:
  - Powodem odbanowania
  - Linkiem do logowania
  - Przypomnieniem o przestrzeganiu regulaminu

### Uprawnienia
- Endpoint wymaga roli moderatora (EMPLOYEE) lub administratora (ADMIN)
- Moderator musi być zalogowany (token JWT w nagłówku Authorization)

## Przykład użycia (curl)

### Banowanie na 7 dni
```bash
curl -X PATCH \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  "http://localhost:8080/api/mod/users/123/ban?banned=true&reasonCode=101&durationDays=7"
```

### Banowanie permanentne
```bash
curl -X PATCH \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  "http://localhost:8080/api/mod/users/123/ban?banned=true&reasonCode=201"
```

### Banowanie z dodatkowym opisem (Inne)
```bash
curl -X PATCH \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  "http://localhost:8080/api/mod/users/123/ban?banned=true&reasonCode=401&reason=Szczegółowy opis powodu&durationDays=14"
```

### Odbanowanie
```bash
curl -X PATCH \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  "http://localhost:8080/api/mod/users/123/ban?banned=false&reason=Problem został rozwiązany"
```
