# Dokumentacja Systemu Obsługi Plików

## Przegląd

System obsługi plików w aplikacji GNG został zmodyfikowany z przechowywania obrazów w formacie base64 w bazie danych na system plików z obsługą statycznych endpointów. Dodatkowo, endpoint rejestracji użytkowników został zaktualizowany, aby przyjmować pliki bezpośrednio przez `multipart/form-data`.

## Struktura Katalogów

```
./uploads/
└── images/
    └── {userId}/
        └── profilePicture_{uuid}.{extension}
```

## Konfiguracja

### application-local.properties
```properties
# File Storage Configuration
file.storage.base-path=./uploads
file.storage.images.path=${file.storage.base-path}/images
file.storage.max-file-size=5MB

# Multipart file upload configuration
spring.servlet.multipart.enabled=true
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=10MB
spring.servlet.multipart.file-size-threshold=2KB
```

## Główne Komponenty

### 1. FileStorageService

Zarządza operacjami na plikach:

**Metody:**
- `saveProfilePicture(Long userId, MultipartFile file)` - zapisuje plik z MultipartFile
- `saveProfilePicture(Long userId, String base64Data, String fileName, String mimeType)` - zapisuje z base64 (kompatybilność wsteczna)
- `deleteFile(String filePath)` - usuwa plik
- `loadFileAsBytes(String filePath)` - ładuje plik jako tablicę bajtów
- `fileExists(String filePath)` - sprawdza istnienie pliku

**Obsługiwane formaty obrazów:**
- JPEG/JPG
- PNG
- GIF
- WebP

### 2. FileController

Udostępnia statyczne pliki:

**Endpointy:**
- `GET /static/{userId}/{fileName}` - serwuje konkretny plik
- `GET /static/{userId}/profilePicture` - automatycznie znajduje zdjęcie profilowe

**Funkcje:**
- Automatyczne określanie Content-Type
- Cache-Control na 1 godzinę
- Obsługa błędów 404

### 3. ImageModel

Zaktualizowana encja przechowująca informacje o obrazach:

```java
@Entity
@Table(name = "images")
public class ImageModel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "file_path", nullable = false, length = 500)
    private String filePath; // Zmieniono z 'image' (base64) na 'file_path'
    
    @Column(name = "file_name", length = 255)
    private String fileName;
    
    @Column(name = "type_mime", length = 100)
    private String typMime;
    
    @Column(name = "added")
    private LocalDateTime added;
}
```

## API Endpoints

### 1. Rejestracja Użytkownika (NOWE API)

**POST /registerUser**

**Content-Type:** `multipart/form-data`

**Parametry:**
- `name` (string, required) - Imię
- `surname` (string, required) - Nazwisko
- `email` (string, required) - Email
- `phoneNumber` (string, required) - Numer telefonu
- `address` (string, required) - Adres
- `password` (string, required, min 6 znaków) - Hasło
- `age` (integer, required) - Wiek
- `profilePhoto` (file, optional) - Zdjęcie profilowe

**Przykład cURL:**
```bash
curl -X POST http://localhost:8080/registerUser \
  -F "name=Jan" \
  -F "surname=Kowalski" \
  -F "email=jan.kowalski@example.com" \
  -F "phoneNumber=123456789" \
  -F "address=ul. Testowa 1, Warszawa" \
  -F "password=haslo123" \
  -F "age=25" \
  -F "profilePhoto=@/path/to/photo.jpg"
```

**Przykład JavaScript (FormData):**
```javascript
const formData = new FormData();
formData.append('name', 'Jan');
formData.append('surname', 'Kowalski');
formData.append('email', 'jan.kowalski@example.com');
formData.append('phoneNumber', '123456789');
formData.append('address', 'ul. Testowa 1, Warszawa');
formData.append('password', 'haslo123');
formData.append('age', '25');
formData.append('profilePhoto', fileInput.files[0]); // file from input

fetch('http://localhost:8080/registerUser', {
  method: 'POST',
  body: formData
});
```

**Odpowiedź sukces (201):**
```
"Użytkownik został zarejestrowany pomyślnie"
```

**Odpowiedź błąd (400):**
```
"Błąd podczas rejestracji: [szczegóły błędu]"
```

### 2. Pobieranie Plików Statycznych

**GET /static/{userId}/{fileName}**

Pobiera konkretny plik użytkownika.

**Przykład:**
```bash
curl http://localhost:8080/static/123/profilePicture_abc123.jpg
```

**GET /static/{userId}/profilePicture**

Automatycznie znajduje i zwraca zdjęcie profilowe użytkownika.

**Przykład:**
```bash
curl http://localhost:8080/static/123/profilePicture
```

### 3. Dashboard Użytkownika

**GET /dashboard**

**Wymagane:** Token JWT w nagłówku Authorization

**Odpowiedź:**
```json
{
  "id": 123,
  "firstName": "Jan",
  "lastName": "Kowalski",
  "email": "jan.kowalski@example.com",
  "phoneNumber": "123456789",
  "address": "ul. Testowa 1, Warszawa",
  "age": 25,
  "profilePictureUrl": "/static/123/profilePicture_abc123.jpg"
}
```

## Migracja Bazy Danych

System zawiera automatyczną migrację z base64 na system plików:

```sql
-- Dodanie nowej kolumny
ALTER TABLE images ADD COLUMN file_path VARCHAR(500) NOT NULL;

-- Usunięcie starej kolumny
ALTER TABLE images DROP COLUMN image;
```

## Bezpieczeństwo

### Walidacja Plików
- Sprawdzanie typu MIME
- Ograniczenie rozmiaru (10MB)
- Dozwolone formaty: JPEG, PNG, GIF, WebP

### Kontrola Dostępu
- Publiczny dostęp do /static/** (zgodnie z SecurityConfig)
- Autoryzacja wymagana dla chronionych endpointów

## Obsługa Błędów

### FileStorageService
- Automatyczne tworzenie katalogów
- Logowanie błędów
- Graceful handling niepowodzeń

### FileController
- Odpowiedzi 404 dla nieistniejących plików
- Proper Content-Type headers
- Logging dostępów

## Przykłady Integracji

### HTML Form
```html
<form action="/registerUser" method="post" enctype="multipart/form-data">
  <input type="text" name="name" required>
  <input type="text" name="surname" required>
  <input type="email" name="email" required>
  <input type="tel" name="phoneNumber" required>
  <input type="text" name="address" required>
  <input type="password" name="password" required>
  <input type="number" name="age" required>
  <input type="file" name="profilePhoto" accept="image/*">
  <button type="submit">Zarejestruj</button>
</form>
```

### React Component
```jsx
const [formData, setFormData] = useState({
  name: '',
  surname: '',
  email: '',
  phoneNumber: '',
  address: '',
  password: '',
  age: '',
  profilePhoto: null
});

const handleSubmit = async (e) => {
  e.preventDefault();
  
  const form = new FormData();
  Object.keys(formData).forEach(key => {
    if (formData[key]) {
      form.append(key, formData[key]);
    }
  });
  
  try {
    const response = await fetch('/registerUser', {
      method: 'POST',
      body: form
    });
    
    if (response.ok) {
      console.log('Rejestracja udana');
    }
  } catch (error) {
    console.error('Błąd rejestracji:', error);
  }
};
```

## Zalety Nowego Systemu

1. **Wydajność**: Pliki serwowane bezpośrednio przez serwer
2. **Skalowalność**: Odciążenie bazy danych
3. **Cache**: Możliwość cache'owania plików po stronie klienta
4. **Standardowe API**: Użycie multipart/form-data zgodnie ze standardami
5. **Bezpieczeństwo**: Walidacja typów plików i rozmiarów

## Migracja z Poprzedniej Wersji

Jeśli masz istniejące dane w formacie base64, system zachowuje kompatybilność wsteczną poprzez metodę `saveProfilePicture` z parametrami base64. 