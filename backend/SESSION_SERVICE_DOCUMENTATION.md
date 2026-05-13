# SessionService - Dokumentacja

## Opis

`SessionService` to komponent sesyjny dla aplikacji Spring Boot, który przechowuje nagłówek "Authorization" i udostępnia statyczne metody do wyciągnięcia adresu email użytkownika oraz innych informacji z dowolnego miejsca w projekcie.

## Lokalizacja

`src/main/java/com/example/gng/auth/service/SessionService.java`

## Funkcjonalności

### Główne metody

#### 1. `getCurrentUserEmail()` - Pobieranie email użytkownika
```java
String email = SessionService.getCurrentUserEmail();
if (email != null) {
    System.out.println("Aktualny użytkownik: " + email);
}
```

#### 2. `getAuthorizationHeader()` - Pobieranie tokenu JWT
```java
String token = SessionService.getAuthorizationHeader(); // Bez "Bearer "
String fullHeader = SessionService.getFullAuthorizationHeader(); // Z "Bearer "
```

#### 3. `isUserLoggedIn()` - Sprawdzanie statusu logowania
```java
if (SessionService.isUserLoggedIn()) {
    // Użytkownik jest zalogowany
}
```

#### 4. `getCurrentUserId()` - Pobieranie ID użytkownika
```java
Long userId = SessionService.getCurrentUserId();
```

#### 5. `getCurrentUserClaims()` - Pobieranie claims z tokenu
```java
Claims claims = SessionService.getCurrentUserClaims();
if (claims != null) {
    Date expiration = claims.getExpiration();
    Date issuedAt = claims.getIssuedAt();
}
```

## Przykłady użycia

### W kontrolerze

```java
@RestController
public class MyController {
    
    @GetMapping("/user-info")
    public ResponseEntity<?> getUserInfo() {
        try {
            String email = SessionService.getCurrentUserEmail();
            
            if (email == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Brak zalogowanego użytkownika");
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("email", email);
            response.put("isLoggedIn", SessionService.isUserLoggedIn());
            response.put("userId", SessionService.getCurrentUserId());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Błąd serwera");
        }
    }
}
```

### W serwisie

```java
@Service
public class MyService {
    
    public void doSomethingForCurrentUser() {
        String currentUserEmail = SessionService.getCurrentUserEmail();
        
        if (currentUserEmail != null) {
            // Logika dla zalogowanego użytkownika
            log.info("Wykonuję operację dla użytkownika: {}", currentUserEmail);
        } else {
            throw new SecurityException("Użytkownik nie jest zalogowany");
        }
    }
}
```

### W innej klasie

```java
public class AnyClass {
    
    public void someMethod() {
        // Można używać z dowolnego miejsca w aplikacji
        if (SessionService.isUserLoggedIn()) {
            String email = SessionService.getCurrentUserEmail();
            System.out.println("Zalogowany użytkownik: " + email);
        }
    }
}
```

## Porównanie z tradycyjnym podejściem

### Przed (tradycyjne podejście):
```java
Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
if (authentication != null && authentication.isAuthenticated() && 
    !"anonymousUser".equals(authentication.getName())) {
    String userEmail = authentication.getName();
    // Dalszy kod...
}
```

### Po (z SessionService):
```java
String userEmail = SessionService.getCurrentUserEmail();
if (userEmail != null) {
    // Dalszy kod...
}
```

## Wymagania

1. **Spring Boot** - aplikacja musi być aplikacją Spring Boot
2. **JWT** - aplikacja używa JWT do uwierzytelniania
3. **Web Context** - metody działają tylko w kontekście żądania HTTP

## Uwagi techniczne

- Wszystkie metody są **statyczne** - można ich używać bez tworzenia instancji
- Metody są **thread-safe** - każde żądanie HTTP ma swój własny kontekst
- Obsługa błędów jest wbudowana - metody zwracają `null` w przypadku problemów
- Używa `RequestContextHolder` do dostępu do aktualnego żądania HTTP

## Obsługa błędów

Wszystkie metody obsługują błędy gracefully:
- Zwracają `null` jeśli nie można pobrać informacji
- Logują błędy na poziomie ERROR
- Nie rzucają wyjątków (poza `getCurrentUserId()` która może rzucić `NumberFormatException`)

## Dodatkowe zmodyfikowane pliki

1. **JwtService.java** - dodana publiczna metoda `getAllClaims(String token)`
2. **UserDashboardController.java** - dodany przykład użycia w metodzie `/dashboard-v2`

## Testowanie

### Endpointy do testowania:
- `GET /dashboard-v2` - przykład użycia SessionService
- `GET /api/session/current-user` - szczegółowe informacje (jeśli nie usunięto przykładowego kontrolera)
- `GET /api/session/user-email` - prosty przykład pobierania email

### Wymagany nagłówek:
```
Authorization: Bearer <your-jwt-token>
``` 