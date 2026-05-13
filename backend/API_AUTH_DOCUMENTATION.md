# API Uwierzytelniania GNG

## Endpoint logowania

### POST `/api/auth/login`

Endpoint do logowania użytkownika. Zwraca token JWT, który należy używać w kolejnych żądaniach.

**Żądanie:**
```json
{
    "email": "user@example.com",
    "password": "password123"
}
```

**Odpowiedź przy sukcesie (200 OK):**
```json
{
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "tokenType": "Bearer",
    "email": "user@example.com",
    "firstName": "Jan",
    "lastName": "Kowalski",
    "id": 1
}
```

**Odpowiedź przy błędzie (401 Unauthorized):**
```json
"Nieprawidłowy email lub hasło"
```

## Endpoint wylogowania

### POST `/api/auth/logout`

Endpoint do wylogowania użytkownika. W przypadku JWT wylogowanie polega głównie na usunięciu tokenu po stronie klienta.

**Nagłówki:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

**Odpowiedź (200 OK):**
```json
"Wylogowano pomyślnie"
```

## Endpoint walidacji tokenu

### GET `/api/auth/validate`

Endpoint do sprawdzenia czy token jest jeszcze ważny.

**Nagłówki:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

**Odpowiedź przy sukcesie (200 OK):**
```json
"Token jest ważny"
```

**Odpowiedź przy błędzie (401 Unauthorized):**
```json
"Token jest nieważny"
```

## Chroniony endpoint dashboard

### GET `/dashboard`

Chroniony endpoint dostępny tylko dla zalogowanych użytkowników. Zwraca dane panelu użytkownika.

**Nagłówki:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

**Odpowiedź przy sukcesie (200 OK):**
```json
{
    "messageEntity": "Witamy w panelu użytkownika!",
    "user": {
        "id": 1,
        "email": "user@example.com",
        "firstName": "Jan",
        "lastName": "Kowalski",
        "verified": true
    },
    "timestamp": 1703123456789
}
```

**Odpowiedź przy braku autoryzacji (401 Unauthorized):**
```json
"Brak autoryzacji. Wymagane logowanie."
```

## Korzystanie z tokenu w żądaniach

W każdym żądaniu do chronionych endpointów należy dołączyć nagłówek:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

## Ważność tokenu

Token JWT jest ważny przez 24 godziny (86400000 ms) od momentu wygenerowania.

## CORS

API obsługuje żądania z wszystkich origin z metodami: GET, POST, PUT, DELETE, OPTIONS.

## Przykład użycia w JavaScript

```javascript
// Logowanie
const loginResponse = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        email: 'user@example.com',
        password: 'password123'
    })
});

const loginData = await loginResponse.json();

if (loginResponse.ok) {
    // Zapisz token do localStorage lub sessionStorage
    localStorage.setItem('token', loginData.token);
    localStorage.setItem('user', JSON.stringify(loginData));
}

// Wylogowanie
const logoutResponse = await fetch('/api/auth/logout', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
});

if (logoutResponse.ok) {
    // Usuń token z localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Przekieruj na stronę logowania
}

// Dostęp do chronionego endpointu dashboard
const token = localStorage.getItem('token');
const dashboardResponse = await fetch('/dashboard', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});

if (dashboardResponse.ok) {
    const dashboardData = await dashboardResponse.json();
    console.log('Dashboard data:', dashboardData);
} else if (dashboardResponse.status === 401) {
    // Token nieważny lub brak autoryzacji - przekieruj na login
    window.location.href = '/login';
}

// Używanie tokenu w kolejnych żądaniach
const response = await fetch('/api/some-protected-endpoint', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});
``` 