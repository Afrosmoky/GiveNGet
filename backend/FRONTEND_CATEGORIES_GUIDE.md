# Przewodnik Frontend - Nowa Struktura Kategorii

## Przegląd Zmian
Aplikacja została zaktualizowana o nową strukturę kategorii z określonymi typami transakcji. Wszystkie istniejące kategorie zostały zastąpione nowymi.

## Nowa Struktura Kategorii

### 1. Dania domowe (prywatne)
- **Typy transakcji**: Tylko darowizna/wymiana (bez sprzedaży)
- **Ograniczenia**: Niedostępne dla sprzedaży
- **Podkategorie**: Brak

### 2. Nadwyżki restauracyjne/sklepowe  
- **Typy transakcji**: Wszystkie typy (darowizna/wymiana/sprzedaż)
- **Ograniczenia**: Sprzedaż tylko dla kont firmowych
- **Podkategorie**: Brak

### 3. Owoce i warzywa
- **Typy transakcji**: Wszystkie typy
- **Podkategorie**: Świeże owoce, Świeże warzywa, Zioła i zielenina, Grzyby, Plony z działki (domowe)

### 4. Nabiał i alternatywy
- **Typy transakcji**: Wszystkie typy
- **Podkategorie**: Mleko i napoje roślinne, Sery, Jogurty i desery mleczne, Masło i smarowidła, Jaja

### 5. Mięso, drób i ryby
- **Typy transakcji**: Wszystkie typy
- **Podkategorie**: Świeże mięso, Drób, Ryby i owoce morza, Wędliny i wyroby wędliniarskie, Mrożone mięso/ryby

### 6. Pieczywo i wypieki
- **Typy transakcji**: Wszystkie typy
- **Podkategorie**: Pieczywo i bułki, Wypieki słodkie, Wypieki wytrawne, Wypieki bezglutenowe

### 7. Spiżarnia i produkty suche
- **Typy transakcji**: Wszystkie typy
- **Podkategorie**: Ryż i zboża, Makarony i kluski, Mąki i dodatki do pieczenia, Oleje i octy, Cukier/sól/przyprawy, Konserwy i przetwory

### 8. Mrożonki
- **Typy transakcji**: Wszystkie typy
- **Podkategorie**: Warzywa i owoce mrożone, Lody i desery mrożone, Dania gotowe mrożone, Pieczywo i wypieki mrożone

### 9. Dania gotowe i przygotowane
- **Typy transakcji**: Wszystkie typy
- **Podkategorie**: Dania domowe (tylko darowizna/wymiana), Nadwyżki restauracyjne, Sałatki i kanapki, Zestawy do gotowania

### 10. Słodycze i przekąski
- **Typy transakcji**: Wszystkie typy
- **Podkategorie**: Czekolady i cukierki, Chipsy i przekąski słone, Orzechy i suszone owoce, Płatki śniadaniowe i batoniki

### 11. Napoje bezalkoholowe
- **Typy transakcji**: Wszystkie typy
- **Podkategorie**: Woda i napoje gazowane, Soki i smoothie, Napoje słodzone, Herbata i kawa (opakowane)

### 12. Dziecko i niemowlę
- **Typy transakcji**: Wszystkie typy
- **Ograniczenia**: Tylko zamknięte/opakowane
- **Podkategorie**: Żywność dla niemowląt, Mleko modyfikowane, Przekąski dla dzieci

### 13. Karma dla zwierząt
- **Typy transakcji**: Wszystkie typy
- **Ograniczenia**: Tylko zamknięte, nie do spożycia przez ludzi
- **Podkategorie**: Karma sucha, Karma mokra, Przysmaki dla zwierząt

### 14. Chemia i artykuły domowe (non-food)
- **Typy transakcji**: Wszystkie typy
- **Podkategorie**: Środki czystości i pranie, Papier i artykuły jednorazowe, Higiena osobista, Akcesoria kuchenne

### 15. Inne
- **Typy transakcji**: Wszystkie typy
- **Podkategorie**: Brak

## Ograniczenia Typów Transakcji

### Kategorie z Ograniczeniami
1. **"Dania domowe (prywatne)"** - tylko darowizna/wymiana
2. **"Nadwyżki restauracyjne/sklepowe"** - sprzedaż tylko dla kont firmowych

### Podkategorie z Ograniczeniami
1. **"Plony z działki (domowe)"** (kategoria: Owoce i warzywa) - tylko darowizna/wymiana
2. **"Dania domowe"** (kategoria: Dania gotowe i przygotowane) - tylko darowizna/wymiana
3. **"Nadwyżki restauracyjne"** (kategoria: Dania gotowe i przygotowane) - sprzedaż tylko dla kont firmowych

### Kategorie z Ograniczeniami Produktów
1. **"Dziecko i niemowlę"** - tylko zamknięte/opakowane produkty
2. **"Karma dla zwierząt"** - tylko zamknięte, nie do spożycia przez ludzi

## Typy Transakcji

### free (Darowizna)
- Bezpłatne przekazanie produktów
- Dostępne dla wszystkich kategorii

### exchange (Wymiana)  
- Wymiana produktów na inne
- Dostępne dla wszystkich kategorii

### sale (Sprzedaż)
- Sprzedaż produktów za pieniądze
- **Ograniczenia**:
  - Niedostępne dla "Dania domowe (prywatne)"
  - Niedostępne dla "Plony z działki (domowe)"
  - Niedostępne dla "Dania domowe" (podkategoria)
  - Dostępne dla "Nadwyżki restauracyjne/sklepowe" (tylko konta firmowe)
  - Dostępne dla "Nadwyżki restauracyjne" (podkategoria, tylko konta firmowe)

## Zmiany w API - STRUKTURY ENDPOINTÓW

### ⚠️ KRYTYCZNE ZMIANY - WYMAGANA AKTUALIZACJA FRONTENDU

#### 1. GET /api/categories/all - ZMIENIONA STRUKTURA ODPOWIEDZI

**PRZED (stara struktura):**
```json
[
  {
    "id": 1,
    "name": "Dairy & Alternatives",
    "subcategories": [
      {
        "id": 1,
        "name": "Milk & Plant-Based Drinks"
      }
    ]
  }
]
```

**PO (nowa struktura):**
```json
[
  {
    "id": 1,
    "name": "Dania domowe (prywatne)",
    "allowedTransactionTypes": "[\"free\", \"exchange\"]",
    "subcategories": []
  },
  {
    "id": 4,
    "name": "Produkty spożywcze i domowego użytku",
    "allowedTransactionTypes": "[\"free\", \"exchange\", \"sale\"]",
    "subcategories": [
      {
        "id": 1,
        "name": "Świeże owoce",
        "allowedTransactionTypes": "[\"free\", \"exchange\", \"sale\"]",
        "category": {
          "id": 4,
          "name": "Produkty spożywcze i domowego użytku"
        }
      }
    ]
  }
]
```

**ZMIANY:**
- ✅ **Dodano**: `allowedTransactionTypes` (JSON string)
- ✅ **Zmieniono**: Nazwy kategorii (całkowicie nowe)
- ✅ **Zmieniono**: ID kategorii (nowe numery)
- ✅ **Dodano**: `category` object w subcategories

#### 2. GET /api/favorite-categories - ZMIENIONA STRUKTURA ODPOWIEDZI

**PRZED (stara struktura):**
```json
{
  "categories": [
    {
      "id": 1,
      "name": "Dairy & Alternatives"
    }
  ],
  "subcategories": [
    {
      "id": 1,
      "name": "Milk & Plant-Based Drinks"
    }
  ]
}
```

**PO (nowa struktura):**
```json
{
  "categories": [
    {
      "id": 4,
      "name": "Produkty spożywcze i domowego użytku",
      "allowedTransactionTypes": "[\"free\", \"exchange\", \"sale\"]",
      "subcategories": [
        {
          "id": 1,
          "name": "Świeże owoce",
          "allowedTransactionTypes": "[\"free\", \"exchange\", \"sale\"]"
        }
      ]
    }
  ],
  "subcategories": [
    {
      "id": 2,
      "name": "Plony z działki (domowe)",
      "allowedTransactionTypes": "[\"free\", \"exchange\"]",
      "category": {
        "id": 4,
        "name": "Produkty spożywcze i domowego użytku"
      }
    }
  ]
}
```

**ZMIANY:**
- ✅ **Dodano**: `allowedTransactionTypes` w categories i subcategories
- ✅ **Dodano**: `category` object w subcategories
- ⚠️ **UWAGA**: Ulubione kategorie zostały wyczyszczone - użytkownicy muszą ponownie wybrać

#### 3. GET /api/offer - ZMIENIONA STRUKTURA ODPOWIEDZI

**PRZED (stara struktura):**
```json
[
  {
    "id": "ABC123",
    "name": "Fresh Apples",
    "transactionType": "free",
    "category": {
      "id": 3,
      "name": "Fruits & Vegetables"
    },
    "subcategory": {
      "id": 7,
      "name": "Fresh Fruits"
    }
  }
]
```

**PO (nowa struktura):**
```json
[
  {
    "id": "ABC123",
    "name": "Świeże jabłka",
    "transactionType": "free",
    "category": {
      "id": 4,
      "name": "Produkty spożywcze i domowego użytku",
      "allowedTransactionTypes": "[\"free\", \"exchange\", \"sale\"]"
    },
    "subcategory": {
      "id": 1,
      "name": "Świeże owoce",
      "allowedTransactionTypes": "[\"free\", \"exchange\", \"sale\"]"
    }
  }
]
```

**ZMIANY:**
- ✅ **Dodano**: `allowedTransactionTypes` w category i subcategory
- ✅ **Zmieniono**: Nazwy kategorii i podkategorii
- ✅ **Zmieniono**: ID kategorii i podkategorii

#### 4. POST /api/offer - NOWA WALIDACJA

**PRZED:**
- Brak walidacji typów transakcji
- Wszystkie kombinacje kategoria/typ były dozwolone

**PO:**
- ✅ **Dodano**: Walidacja typów transakcji
- ✅ **Dodano**: Sprawdzanie typu konta użytkownika
- ✅ **Dodano**: Błędy 400 dla niedozwolonych kombinacji

**NOWE BŁĘDY:**
```json
{
  "error": "Typ transakcji 'sale' nie jest dozwolony dla kategorii 'Dania domowe (prywatne)'"
}
```

**NOWE BŁĘDY WALIDACJI PODKATEGORII:**
```json
{
  "error": "Kategoria 'Produkty spożywcze i domowego użytku' wymaga wyboru podkategorii"
}
```

```json
{
  "error": "Podkategoria nie należy do wybranej kategorii"
}
```

#### 5. PUT /api/offer/{id} - NOWA WALIDACJA

**PRZED:**
- Brak walidacji przy edycji

**PO:**
- ✅ **Dodano**: Walidacja typów transakcji przy edycji
- ✅ **Dodano**: Sprawdzanie uprawnień użytkownika

### Nowe Pole w Odpowiedziach
- **`allowedTransactionTypes`** - JSON string z dozwolonymi typami transakcji
- **Format**: `"[\"free\", \"exchange\", \"sale\"]"`
- **Parsowanie**: Wymaga JSON.parse() w JavaScript

### Przykład Odpowiedzi API
```json
{
  "id": 4,
  "name": "Produkty spożywcze i domowego użytku",
  "allowedTransactionTypes": "[\"free\", \"exchange\", \"sale\"]",
  "subcategories": [
    {
      "id": 1,
      "name": "Świeże owoce",
      "allowedTransactionTypes": "[\"free\", \"exchange\", \"sale\"]"
    },
    {
      "id": 2,
      "name": "Plony z działki (domowe)",
      "allowedTransactionTypes": "[\"free\", \"exchange\"]"
    }
  ]
}
```

## MIGRACJA FRONTENDU - KROK PO KROKU

### ⚠️ KRYTYCZNE - WYMAGANE ZMIANY W KODZIE

#### 1. Aktualizacja Typów TypeScript/Interfejsów

**PRZED (stare interfejsy):**
```typescript
interface Category {
  id: number;
  name: string;
  subcategories: Subcategory[];
}

interface Subcategory {
  id: number;
  name: string;
}
```

**PO (nowe interfejsy):**
```typescript
interface Category {
  id: number;
  name: string;
  allowedTransactionTypes: string; // JSON string
  subcategories: Subcategory[];
}

interface Subcategory {
  id: number;
  name: string;
  allowedTransactionTypes: string; // JSON string
  category?: {
    id: number;
    name: string;
  };
}
```

#### 2. Aktualizacja Parsowania Danych

**PRZED (stary kod):**
```javascript
// Bezpośrednie użycie kategorii
const categoryName = category.name;
const subcategoryName = subcategory.name;
```

**PO (nowy kod):**
```javascript
// Parsowanie JSON z allowedTransactionTypes
const allowedTypes = JSON.parse(category.allowedTransactionTypes);
const subcategoryAllowedTypes = JSON.parse(subcategory.allowedTransactionTypes);

// Sprawdzenie czy typ transakcji jest dozwolony
const isTransactionAllowed = (category, subcategory, transactionType) => {
  const types = JSON.parse(subcategory?.allowedTransactionTypes || category.allowedTransactionTypes);
  return types.includes(transactionType);
};
```

#### 3. Aktualizacja Komponentów Formularza

**PRZED (stary formularz):**
```jsx
<select value={selectedCategory} onChange={setSelectedCategory}>
  {categories.map(cat => (
    <option key={cat.id} value={cat.id}>{cat.name}</option>
  ))}
</select>

<select value={transactionType} onChange={setTransactionType}>
  <option value="free">Darowizna</option>
  <option value="exchange">Wymiana</option>
  <option value="sale">Sprzedaż</option>
</select>
```

**NOWA WALIDACJA PODKATEGORII:**
```jsx
// Sprawdź czy kategoria ma podkategorie
const categoryHasSubcategories = (categoryId) => {
  const category = categories.find(cat => cat.id === categoryId);
  return category && category.subcategories && category.subcategories.length > 0;
};

// Walidacja przed wysłaniem
const validateForm = () => {
  if (categoryHasSubcategories(selectedCategory) && !selectedSubcategory) {
    setError("Ta kategoria wymaga wyboru podkategorii");
    return false;
  }
  if (!categoryHasSubcategories(selectedCategory) && selectedSubcategory) {
    setError("Ta kategoria nie ma podkategorii - usuń wybór podkategorii");
    return false;
  }
  return true;
};
```

**PO (nowy formularz z walidacją):**
```jsx
<select value={selectedCategory} onChange={handleCategoryChange}>
  {categories.map(cat => (
    <option key={cat.id} value={cat.id}>{cat.name}</option>
  ))}
</select>

<select value={transactionType} onChange={setTransactionType}>
  {getAllowedTransactionTypes(selectedCategory, selectedSubcategory).map(type => (
    <option key={type} value={type} disabled={!isTransactionAllowed(selectedCategory, selectedSubcategory, type)}>
      {type === 'free' ? 'Darowizna' : type === 'exchange' ? 'Wymiana' : 'Sprzedaż'}
      {!isTransactionAllowed(selectedCategory, selectedSubcategory, type) && ' (niedostępne)'}
    </option>
  ))}
</select>

{restrictionMessage && (
  <div className="alert alert-warning">{restrictionMessage}</div>
)}
```

#### 4. Aktualizacja Listy Ofert

**PRZED (stary kod):**
```jsx
{offers.map(offer => (
  <div key={offer.id}>
    <h3>{offer.name}</h3>
    <p>Kategoria: {offer.category.name}</p>
    <p>Podkategoria: {offer.subcategory.name}</p>
    <p>Typ: {offer.transactionType}</p>
  </div>
))}
```

**PO (nowy kod z nowymi polami):**
```jsx
{offers.map(offer => (
  <div key={offer.id}>
    <h3>{offer.name}</h3>
    <p>Kategoria: {offer.category.name}</p>
    <p>Podkategoria: {offer.subcategory.name}</p>
    <p>Typ: {offer.transactionType}</p>
    {/* Nowe pola - jeśli potrzebne */}
    <p>Dozwolone typy: {JSON.parse(offer.category.allowedTransactionTypes).join(', ')}</p>
  </div>
))}
```

#### 5. Aktualizacja Ulubionych Kategorii

**PRZED (stary kod):**
```javascript
// Bezpośrednie używanie ID kategorii
const favoriteCategories = [1, 2, 3];
const favoriteSubcategories = [5, 6, 7];
```

**PO (nowy kod z resetem):**
```javascript
// Reset ulubionych kategorii - użytkownicy muszą ponownie wybrać
const [favoriteCategories, setFavoriteCategories] = useState([]);
const [favoriteSubcategories, setFavoriteSubcategories] = useState([]);

// Komunikat o konieczności ponownego wyboru
useEffect(() => {
  if (favoriteCategories.length === 0 && favoriteSubcategories.length === 0) {
    showNotification("Ulubione kategorie zostały zresetowane. Wybierz nowe kategorie.");
  }
}, []);
```

#### 6. Aktualizacja Filtrowania

**PRZED (stary kod):**
```javascript
const filterOffers = (offers, selectedCategories, selectedTransactionTypes) => {
  return offers.filter(offer => 
    selectedCategories.includes(offer.category.id) &&
    selectedTransactionTypes.includes(offer.transactionType)
  );
};
```

**PO (nowy kod z walidacją):**
```javascript
const filterOffers = (offers, selectedCategories, selectedTransactionTypes) => {
  return offers.filter(offer => {
    const categoryAllowed = selectedCategories.includes(offer.category.id);
    const transactionAllowed = selectedTransactionTypes.includes(offer.transactionType);
    
    // Dodatkowa walidacja - sprawdź czy typ transakcji jest dozwolony dla kategorii
    const allowedTypes = JSON.parse(offer.category.allowedTransactionTypes);
    const isTransactionValidForCategory = allowedTypes.includes(offer.transactionType);
    
    return categoryAllowed && transactionAllowed && isTransactionValidForCategory;
  });
};
```

## Implementacja Frontend

### 1. Parsowanie Typów Transakcji
```javascript
// Parsowanie JSON string do tablicy
const allowedTypes = JSON.parse(category.allowedTransactionTypes);
// allowedTypes = ["free", "exchange", "sale"]
```

### 2. Walidacja Formularza
```javascript
// Sprawdzenie czy typ transakcji jest dozwolony
function isTransactionTypeAllowed(category, subcategory, transactionType) {
  const allowedTypes = JSON.parse(subcategory?.allowedTransactionTypes || category.allowedTransactionTypes);
  return allowedTypes.includes(transactionType);
}
```

### 3. Ukrywanie Opcji Sprzedaży
```javascript
// Ukryj opcję sprzedaży dla ograniczonych kategorii
function shouldHideSaleOption(category, subcategory) {
  const allowedTypes = JSON.parse(subcategory?.allowedTransactionTypes || category.allowedTransactionTypes);
  return !allowedTypes.includes('sale');
}
```

### 4. Sprawdzanie Konta Firmowego
```javascript
// Sprawdź czy użytkownik może sprzedawać w kategorii firmowej
function canSellInCategory(userType, categoryName) {
  if (categoryName === 'Nadwyżki restauracyjne/sklepowe') {
    return userType === 'COMPANY';
  }
  return true;
}
```

### 5. Komunikaty dla Użytkownika
```javascript
// Wyświetl odpowiedni komunikat o ograniczeniach
function getTransactionTypeMessage(category, subcategory) {
  const allowedTypes = JSON.parse(subcategory?.allowedTransactionTypes || category.allowedTransactionTypes);
  
  if (!allowedTypes.includes('sale')) {
    return "Ta kategoria nie pozwala na sprzedaż - dostępne tylko darowizna i wymiana";
  }
  
  if (category.name === 'Nadwyżki restauracyjne/sklepowe' && userType !== 'COMPANY') {
    return "Sprzedaż w tej kategorii dostępna tylko dla kont firmowych";
  }
  
  return null;
}
```

## UI/UX Wskazówki

### 1. Formularz Tworzenia Oferty
- **Dynamiczne ukrywanie**: Ukryj opcję sprzedaży dla kategorii z ograniczeniami
- **Walidacja w czasie rzeczywistym**: Sprawdź dozwolone typy przy zmianie kategorii
- **Komunikaty**: Wyświetl informacje o ograniczeniach

### 2. Lista Kategorii
- **Wizualne oznaczenia**: Oznacz kategorie z ograniczeniami
- **Tooltips**: Dodaj podpowiedzi o ograniczeniach typów transakcji

### 3. Filtrowanie Ofert
- **Filtry typów transakcji**: Uwzględnij ograniczenia kategorii
- **Inteligentne filtry**: Automatycznie ukryj niedostępne opcje

### 4. Ulubione Kategorie
- **Reset po migracji**: Użytkownicy będą musieli ponownie wybrać ulubione
- **Komunikaty**: Poinformuj o konieczności ponownego wyboru

## Migracja Danych

### Co Zostało Usunięte
- Wszystkie stare kategorie i podkategorie
- Ulubione kategorie użytkowników
- Powiązania z ofertami (zachowane, ale mogą wymagać aktualizacji)

### Co Trzeba Zrobić
1. **Aktualizacja formularzy** - dodanie walidacji typów transakcji
2. **Reset ulubionych** - użytkownicy wybiorą nowe kategorie
3. **Komunikaty** - poinformowanie o zmianach
4. **Testy** - sprawdzenie wszystkich scenariuszy

## Przykłady Implementacji

### React Component - Wybór Typu Transakcji
```jsx
function TransactionTypeSelector({ category, subcategory, value, onChange }) {
  const allowedTypes = JSON.parse(subcategory?.allowedTransactionTypes || category.allowedTransactionTypes);
  
  return (
    <div>
      <label>Typ transakcji:</label>
      {['free', 'exchange', 'sale'].map(type => {
        const isAllowed = allowedTypes.includes(type);
        const isDisabled = !isAllowed;
        
        return (
          <label key={type}>
            <input
              type="radio"
              value={type}
              checked={value === type}
              onChange={onChange}
              disabled={isDisabled}
            />
            {type === 'free' ? 'Darowizna' : 
             type === 'exchange' ? 'Wymiana' : 'Sprzedaż'}
            {isDisabled && <span className="text-muted"> (niedostępne)</span>}
          </label>
        );
      })}
    </div>
  );
}
```

### Vue Component - Walidacja Kategorii
```vue
<template>
  <div>
    <select v-model="selectedCategory" @change="onCategoryChange">
      <option v-for="category in categories" :key="category.id" :value="category">
        {{ category.name }}
      </option>
    </select>
    
    <div v-if="restrictionMessage" class="alert alert-warning">
      {{ restrictionMessage }}
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      selectedCategory: null,
      restrictionMessage: null
    }
  },
  methods: {
    onCategoryChange() {
      const allowedTypes = JSON.parse(this.selectedCategory.allowedTransactionTypes);
      if (!allowedTypes.includes('sale')) {
        this.restrictionMessage = "Ta kategoria nie pozwala na sprzedaż";
      } else {
        this.restrictionMessage = null;
      }
    }
  }
}
</script>
```

## Testowanie

### Scenariusze Testowe
1. **Kategoria z ograniczeniami** - sprawdź ukrywanie opcji sprzedaży
2. **Konto firmowe vs prywatne** - sprawdź dostęp do sprzedaży w kategoriach firmowych
3. **Walidacja formularza** - sprawdź błędy przy niedozwolonych kombinacjach
4. **Filtrowanie** - sprawdź działanie filtrów z nowymi ograniczeniami
5. **Ulubione kategorie** - sprawdź reset i ponowny wybór

### Checklist
- [ ] Parsowanie JSON z `allowedTransactionTypes`
- [ ] Walidacja typów transakcji w formularzach
- [ ] Ukrywanie opcji sprzedaży dla ograniczonych kategorii
- [ ] Sprawdzanie typu konta użytkownika
- [ ] Komunikaty o ograniczeniach
- [ ] Reset ulubionych kategorii
- [ ] Testy wszystkich scenariuszy

## CHECKLISTA MIGRACJI FRONTENDU

### ⚠️ KRYTYCZNE - WYMAGANE ZMIANY

#### 1. Aktualizacja Typów/Interfejsów
- [ ] **Dodano**: `allowedTransactionTypes: string` do interfejsu Category
- [ ] **Dodano**: `allowedTransactionTypes: string` do interfejsu Subcategory  
- [ ] **Dodano**: `category?: object` do interfejsu Subcategory
- [ ] **Zaktualizowano**: Wszystkie komponenty używające starych interfejsów

#### 2. Parsowanie JSON
- [ ] **Dodano**: `JSON.parse(category.allowedTransactionTypes)` w komponentach
- [ ] **Dodano**: Obsługa błędów parsowania JSON
- [ ] **Dodano**: Fallback dla pustych/null wartości

#### 3. Formularze Tworzenia/Edycji Ofert
- [ ] **Dodano**: Walidacja typów transakcji przed wysłaniem
- [ ] **Dodano**: Walidacja podkategorii - sprawdzenie czy kategoria ma podkategorie
- [ ] **Dodano**: Dynamiczne ukrywanie opcji sprzedaży
- [ ] **Dodano**: Komunikaty o ograniczeniach dla użytkownika
- [ ] **Dodano**: Sprawdzanie typu konta użytkownika
- [ ] **Zaktualizowano**: Obsługa błędów 400 z nowymi komunikatami
- [ ] **Dodano**: Obsługa błędów walidacji podkategorii

#### 4. Lista Kategorii
- [ ] **Zaktualizowano**: Obsługa nowych nazw kategorii
- [ ] **Zaktualizowano**: Obsługa nowych ID kategorii
- [ ] **Dodano**: Wizualne oznaczenia kategorii z ograniczeniami
- [ ] **Dodano**: Tooltips z informacjami o ograniczeniach

#### 5. Lista Ofert
- [ ] **Zaktualizowano**: Obsługa nowych struktur odpowiedzi
- [ ] **Dodano**: Parsowanie `allowedTransactionTypes` w ofertach
- [ ] **Zaktualizowano**: Filtrowanie z uwzględnieniem ograniczeń

#### 6. Ulubione Kategorie
- [ ] **Dodano**: Komunikat o resetowaniu ulubionych kategorii
- [ ] **Dodano**: Możliwość ponownego wyboru kategorii
- [ ] **Zaktualizowano**: Obsługa nowych struktur odpowiedzi

#### 7. Filtrowanie i Wyszukiwanie
- [ ] **Zaktualizowano**: Filtry kategorii z nowymi ID
- [ ] **Dodano**: Walidacja typów transakcji w filtrach
- [ ] **Zaktualizowano**: Filtry geograficzne z nowymi kategoriami

#### 8. Testowanie
- [ ] **Przetestowano**: Wszystkie kombinacje kategoria/typ transakcji
- [ ] **Przetestowano**: Konta firmowe vs prywatne
- [ ] **Przetestowano**: Walidacja formularzy
- [ ] **Przetestowano**: Obsługa błędów API
- [ ] **Przetestowano**: Parsowanie JSON

#### 9. Komunikaty dla Użytkowników
- [ ] **Dodano**: Informacja o zmianie kategorii
- [ ] **Dodano**: Komunikat o resetowaniu ulubionych
- [ ] **Dodano**: Wyjaśnienia ograniczeń typów transakcji
- [ ] **Dodano**: Pomoc dla kont firmowych

### 🔧 TECHNICZNE SZCZEGÓŁY

#### Nowe Funkcje do Dodania
```javascript
// Parsowanie typów transakcji
const parseAllowedTypes = (allowedTypesString) => {
  try {
    return JSON.parse(allowedTypesString);
  } catch (error) {
    console.error('Błąd parsowania allowedTransactionTypes:', error);
    return ['free', 'exchange', 'sale']; // fallback
  }
};

// Sprawdzanie czy typ jest dozwolony
const isTransactionAllowed = (category, subcategory, transactionType) => {
  const types = parseAllowedTypes(subcategory?.allowedTransactionTypes || category.allowedTransactionTypes);
  return types.includes(transactionType);
};

// Pobieranie dozwolonych typów dla formularza
const getAllowedTransactionTypes = (category, subcategory) => {
  const types = parseAllowedTypes(subcategory?.allowedTransactionTypes || category.allowedTransactionTypes);
  return ['free', 'exchange', 'sale'].filter(type => types.includes(type));
};
```

#### Obsługa Błędów API
```javascript
// Nowe błędy do obsłużenia
const handleApiError = (error) => {
  if (error.message.includes('Typ transakcji') && error.message.includes('nie jest dozwolony')) {
    showError('Wybrany typ transakcji nie jest dostępny dla tej kategorii');
  } else if (error.message.includes('konta firmowe')) {
    showError('Sprzedaż w tej kategorii dostępna tylko dla kont firmowych');
  } else {
    showError('Wystąpił błąd podczas przetwarzania żądania');
  }
};
```

## Wsparcie

W przypadku problemów z implementacją:
1. Sprawdź logi konsoli pod kątem błędów parsowania JSON
2. Zweryfikuj czy `allowedTransactionTypes` jest poprawnie parsowane
3. Sprawdź czy walidacja działa dla wszystkich kombinacji kategorii/typów
4. Przetestuj z różnymi typami kont użytkowników
5. **Sprawdź czy wszystkie endpointy zwracają nowe pola**
6. **Zweryfikuj czy ID kategorii zostały zaktualizowane w kodzie**
