# Dokumentacja Struktury Kategorii

## Przegląd
Aplikacja GNG została zaktualizowana o nową strukturę kategorii i podkategorii z określonymi typami transakcji dla każdej kategorii.

## Struktura Kategorii

### 1. Dania domowe (prywatne)
- **Typy transakcji**: Darowizna/Wymiana (bez sprzedaży)
- **Opis**: Kategoria dla domowych potraw przygotowanych przez osoby prywatne
- **Podkategorie**: Dania domowe

### 2. Nadwyżki restauracyjne/sklepowe
- **Typy transakcji**: Sprzedaż dozwolona + darowizna/wymiana (konta firmowe)
- **Opis**: Kategoria dla nadwyżek z restauracji i sklepów
- **Podkategorie**: Nadwyżki restauracyjne, Nadwyżki sklepowe

### 3. Inne
- **Typy transakcji**: Wszystkie typy (darowizna/wymiana/sprzedaż)
- **Opis**: Kategoria ogólna dla produktów niepasujących do innych kategorii
- **Podkategorie**: Inne produkty

### 4. Produkty spożywcze i domowego użytku
- **Typy transakcji**: Wszystkie typy (darowizna/wymiana/sprzedaż)
- **Opis**: Główna kategoria spożywcza z wieloma podkategoriami
- **Podkategorie**: 11 głównych grup z 47 podkategoriami

## Podkategorie dla "Produkty spożywcze i domowego użytku"

### Owoce i warzywa
- Świeże owoce
- Świeże warzywa  
- Zioła i zielenina
- Grzyby
- **Plony z działki (domowe)** - *tylko darowizna/wymiana*

### Nabiał i alternatywy
- Mleko i napoje roślinne
- Sery
- Jogurty i desery mleczne
- Masło i smarowidła
- Jaja

### Mięso, drób i ryby
- Świeże mięso
- Drób
- Ryby i owoce morza
- Wędliny i wyroby wędliniarskie
- Mrożone mięso/ryby

### Pieczywo i wypieki
- Pieczywo i bułki
- Wypieki słodkie
- Wypieki wytrawne
- Wypieki bezglutenowe

### Spiżarnia i produkty suche
- Ryż i zboża
- Makarony i kluski
- Mąki i dodatki do pieczenia
- Oleje i octy
- Cukier, sól i przyprawy
- Konserwy i przetwory w słoikach

### Mrożonki
- Warzywa i owoce mrożone
- Lody i desery mrożone
- Dania gotowe mrożone
- Pieczywo i wypieki mrożone

### Dania gotowe i przygotowane
- **Dania domowe** - *tylko darowizna/wymiana*
- **Nadwyżki restauracyjne** - *sprzedaż/darowizna/wymiana (konta firmowe)*
- Sałatki i kanapki
- Zestawy do gotowania (meal kits)

### Słodycze i przekąski
- Czekolady i cukierki
- Chipsy i przekąski słone
- Orzechy i suszone owoce
- Płatki śniadaniowe i batoniki

### Napoje bezalkoholowe
- Woda i napoje gazowane
- Soki i smoothie
- Napoje słodzone
- Herbata i kawa (opakowane)

### Dziecko i niemowlę *(tylko zamknięte/opakowane)*
- Żywność dla niemowląt (słoiczki/tubki)
- Mleko modyfikowane (tylko zamknięte)
- Przekąski dla dzieci

### Karma dla zwierząt *(nie do spożycia przez ludzi, tylko zamknięte)*
- Karma sucha (zamknięte)
- Karma mokra (zamknięte)
- Przysmaki dla zwierząt (zamknięte)

### Chemia i artykuły domowe (non-food)
- Środki czystości i pranie
- Papier i artykuły jednorazowe
- Higiena osobista (zamknięte)
- Akcesoria kuchenne (folie, worki)

### Inne
- Kategoria ogólna dla produktów spożywczych

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

## Implementacja Techniczna

### Baza Danych
- Dodano pole `allowed_transaction_types` (JSON) do tabel `category` i `subcategory`
- JSON zawiera tablicę dozwolonych typów transakcji: `["free", "exchange", "sale"]`

### Encje Java
- `CategoryEntity` - dodano pole `allowedTransactionTypes`
- `SubcategoryEntity` - dodano pole `allowedTransactionTypes`

### Walidacja
- System sprawdza czy wybrany typ transakcji jest dozwolony dla danej kategorii/podkategorii
- Walidacja odbywa się podczas tworzenia i edycji ofert

## Migracja
- Wszystkie istniejące kategorie i podkategorie zostały usunięte
- Utworzono nową strukturę zgodną z wymaganiami
- Ulubione kategorie użytkowników zostały wyczyszczone (będą musiały być ponownie wybrane)

## Uwagi
- Kategorie "Dania domowe (prywatne)" i "Nadwyżki restauracyjne/sklepowe" mają specjalne ograniczenia dotyczące sprzedaży
- Produkty dla dzieci i zwierząt wymagają zamkniętych opakowań
- Nadwyżki restauracyjne mogą być sprzedawane tylko przez konta firmowe
