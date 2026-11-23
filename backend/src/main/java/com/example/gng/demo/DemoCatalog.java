package com.example.gng.demo;

import com.example.gng.offer.entity.TransactionType;
import com.example.gng.register.model.UserType;
import com.example.gng.user.entity.UserRank;

import java.time.LocalDate;
import java.util.List;

/**
 * Treść instancji demonstracyjnej: konta, oferty, oceny, rozmowy.
 *
 * <p>Same dane, zero logiki — zapisuje je {@link DemoDataSeeder}. Wszystkie adresy e-mail są
 * w domenie {@code example.com} (RFC 2606), więc nie należą do nikogo prawdziwego, a prefiks
 * {@code demo.} pozwala seederowi rozpoznać „swoje" konta przy odświeżaniu.
 *
 * <p>Kategorie i podkategorie wskazujemy nazwami z migracji 31. Seeder sprawdza przy starcie,
 * czy istnieją i czy dopuszczają dany typ transakcji — literówka tutaj kończy się czytelnym
 * błędem zamiast oferty, której nie da się potem edytować.
 */
final class DemoCatalog {

    private DemoCatalog() {
    }

    static final String EMAIL_PREFIX = "demo.";
    static final String EMAIL_DOMAIN = "@example.com";

    /** Konto, po którego istnieniu seeder poznaje, że dane już są. */
    static final String MARKER_ACCOUNT = "sklep";

    /** Sklep, wokół którego zbudowany jest scenariusz rezerwacja → odbiór → raport. */
    static final String MAIN_STORE = "sklep";

    /** Konto klienta, któremu seeder pilnuje aktywnych rezerwacji do potwierdzenia. */
    static final String MAIN_CUSTOMER = "klient";

    static String email(String key) {
        return EMAIL_PREFIX + key + EMAIL_DOMAIN;
    }

    // ------------------------------------------------------------------
    // Konta
    // ------------------------------------------------------------------

    /**
     * @param login        czy konto jest „do logowania" — dostaje hasło z konfiguracji
     *                     i jest przywracane przy każdym odświeżeniu; pozostałe to tło
     *                     marketplace'u z losowym, nieznanym nikomu hasłem
     * @param storeKey     dla {@code STORE_EMPLOYEE}: klucz sklepu
     * @param active       dla {@code STORE_EMPLOYEE}: czy firma dopuszcza pracownika
     */
    record AccountSpec(String key, UserType type, boolean login,
                       String firstName, String lastName, String companyName,
                       String phone, String district, double lat, double lon,
                       String bio, int createdDaysAgo, int trustPoints, UserRank rank,
                       LocalDate dateOfBirth, String storeKey, boolean active) {
    }

    static final List<AccountSpec> ACCOUNTS = List.of(
            // ── Konta do logowania ─────────────────────────────────────────
            new AccountSpec("klient", UserType.REGULAR, true,
                    "Anna", "Nowak", null, "+48 500 000 101", "Mokotów", 52.1987, 21.0215,
                    "Gotuję dla czwórki i nie znoszę wyrzucać jedzenia. Odbieram po pracy, zwykle po 17.",
                    94, 140, UserRank.RELIABLE_SELLER, LocalDate.of(1991, 4, 17), null, true),
            new AccountSpec("sklep", UserType.COMPANY, true,
                    "Marek", "Wiśniewski", "Zielony Koszyk", "+48 22 000 01 10", "Mokotów", 52.1935, 21.0131,
                    "Osiedlowy sklep z warzywami, nabiałem i pieczywem od lokalnych dostawców. "
                            + "Codziennie po 16:00 wystawiamy produkty z krótką datą — taniej o 40–70%. "
                            + "Odbiór przy kasie, wystarczy podać kod rezerwacji.",
                    120, 420, UserRank.TRUSTED_PARTNER, null, null, true),
            new AccountSpec("kasjer1", UserType.STORE_EMPLOYEE, true,
                    "Ola", "Zielińska", null, null, "Mokotów", 52.1935, 21.0131,
                    null, 110, 0, UserRank.STARTER, null, "sklep", true),
            new AccountSpec("kasjer2", UserType.STORE_EMPLOYEE, true,
                    "Tomasz", "Lewandowski", null, null, "Mokotów", 52.1935, 21.0131,
                    null, 75, 0, UserRank.STARTER, null, "sklep", true),
            // Były pracownik — pokazuje, że firma może odciąć dostęp bez kasowania konta
            new AccountSpec("kasjer3", UserType.STORE_EMPLOYEE, true,
                    "Jan", "Dąbrowski", null, null, "Mokotów", 52.1935, 21.0131,
                    null, 118, 0, UserRank.STARTER, null, "sklep", false),
            new AccountSpec("moderator", UserType.EMPLOYEE, true,
                    "Karolina", "Mazur", null, null, "Śródmieście", 52.2297, 21.0122,
                    null, 130, 0, UserRank.STARTER, null, null, true),
            new AccountSpec("admin", UserType.ADMIN, true,
                    "Piotr", "Admin", null, null, "Śródmieście", 52.2297, 21.0122,
                    null, 130, 0, UserRank.STARTER, null, null, true),

            // ── Tło: pozostałe firmy ──────────────────────────────────────
            new AccountSpec("piekarnia", UserType.COMPANY, false,
                    "Halina", "Kowalczyk", "Piekarnia Złoty Kłos", "+48 22 000 02 20", "Wola", 52.2330, 20.9702,
                    "Rzemieślnicza piekarnia na zakwasie. Pieczywo z dnia oddajemy wieczorem za ułamek ceny "
                            + "albo za darmo — wszystko, czego nie sprzedamy do 19:00.",
                    100, 310, UserRank.TRUSTED_PARTNER, null, null, true),
            new AccountSpec("bistro", UserType.COMPANY, false,
                    "Paweł", "Jankowski", "Bistro Pod Lipami", "+48 22 000 03 30", "Praga-Północ", 52.2512, 21.0391,
                    "Kuchnia domowa i lunche. Porcje, które zostały po obiadach, pakujemy na wynos "
                            + "w kompostowalne pudełka.",
                    85, 160, UserRank.RELIABLE_SELLER, null, null, true),

            // ── Tło: osoby prywatne ───────────────────────────────────────
            new AccountSpec("kasia", UserType.REGULAR, false,
                    "Katarzyna", "Wójcik", null, null, "Ursynów", 52.1501, 21.0453,
                    "Mam działkę na Kabatach — latem zawsze za dużo cukinii.",
                    70, 90, UserRank.STARTER, LocalDate.of(1985, 9, 2), null, true),
            new AccountSpec("pawel", UserType.REGULAR, false,
                    "Paweł", "Kamiński", null, null, "Żoliborz", 52.2689, 20.9831,
                    null, 55, 40, UserRank.STARTER, LocalDate.of(1988, 1, 23), null, true),
            new AccountSpec("ewa", UserType.REGULAR, false,
                    "Ewa", "Szymańska", null, null, "Ochota", 52.2121, 20.9749,
                    "Emerytka, lubię gotować na zapas. Jabłka z sadu brata.",
                    88, 210, UserRank.RELIABLE_SELLER, LocalDate.of(1956, 6, 11), null, true),
            new AccountSpec("michal", UserType.REGULAR, false,
                    "Michał", "Woźniak", null, null, "Bemowo", 52.2391, 20.9118,
                    null, 40, 20, UserRank.STARTER, LocalDate.of(1997, 11, 30), null, true)
    );

    // ------------------------------------------------------------------
    // Oferty aktualne
    // ------------------------------------------------------------------

    record OfferSpec(String key, String ownerKey, String name, String description,
                     String category, String subcategory, TransactionType type,
                     String price, String originalPrice, int quantity, int expiresInDays,
                     String pickupFrom, String pickupTo, boolean recommended) {
    }

    private static final String VEG = "Owoce i warzywa";
    private static final String DAIRY = "Nabiał i alternatywy";
    private static final String MEAT = "Mięso, drób i ryby";
    private static final String BREAD = "Pieczywo i wypieki";
    private static final String PANTRY = "Spiżarnia i produkty suche";
    private static final String READY = "Dania gotowe i przygotowane";
    private static final String SWEETS = "Słodycze i przekąski";
    private static final String DRINKS = "Napoje bezalkoholowe";
    private static final String BABY = "Dziecko i niemowlę";
    private static final String PETS = "Karma dla zwierząt";

    private static final TransactionType SALE = TransactionType.sale;
    private static final TransactionType FREE = TransactionType.free;
    private static final TransactionType EXCHANGE = TransactionType.exchange;

    static final List<OfferSpec> OFFERS = List.of(
            // ── Zielony Koszyk ─────────────────────────────────────────────
            new OfferSpec("zk-paczka", "sklep", "Paczka ratunkowa: warzywa i owoce (ok. 3 kg)",
                    "Niespodzianka z dzisiejszej dostawy: to, co ma drobne skazy albo dojrzało szybciej. "
                            + "Zwykle pomidory, papryka, jabłka, banany i coś zielonego.",
                    VEG, "Świeże warzywa", SALE, "15.00", "40.00", 6, 1, "16:00", "20:00", true),
            new OfferSpec("zk-pomidory", "sklep", "Pomidory malinowe 1 kg",
                    "Bardzo dojrzałe, idealne na sos albo do zupy. Jutro już się nie obronią.",
                    VEG, "Świeże warzywa", SALE, "4.99", "11.99", 8, 2, "08:00", "20:00", false),
            new OfferSpec("zk-banany", "sklep", "Banany dojrzałe (ok. 1 kg)",
                    "Brązowe kropki = najsłodsze. Na koktajl, chlebek bananowy albo do zamrożenia.",
                    VEG, "Świeże owoce", SALE, "2.99", "6.49", 10, 1, "08:00", "20:00", false),
            new OfferSpec("zk-salata", "sklep", "Mix sałat 150 g",
                    "Rukola, roszponka i szpinak baby. Termin jutro, liście jędrne.",
                    VEG, "Zioła i zielenina", SALE, "3.49", "7.99", 6, 1, "08:00", "20:00", false),
            new OfferSpec("zk-jogurt", "sklep", "Jogurt grecki naturalny 400 g",
                    "Pełnotłusty, 10% tłuszczu. Data za 3 dni.",
                    DAIRY, "Jogurty i desery mleczne", SALE, "3.99", "7.49", 12, 3, "08:00", "20:00", false),
            new OfferSpec("zk-gouda", "sklep", "Ser gouda w plastrach 150 g",
                    "Opakowanie zamknięte, przechowywane w lodówce.",
                    DAIRY, "Sery", SALE, "4.49", "8.99", 9, 4, "08:00", "20:00", false),
            new OfferSpec("zk-owsiane", "sklep", "Napój owsiany 1 l",
                    "Bez dodatku cukru. Kartony z uszkodzonej zgrzewki — same w sobie całe.",
                    DAIRY, "Mleko i napoje roślinne", SALE, "4.99", "10.99", 6, 5, "08:00", "20:00", false),
            new OfferSpec("zk-kurczak", "sklep", "Filet z kurczaka 500 g",
                    "Termin do jutra. Najlepiej od razu ugotować albo zamrozić.",
                    MEAT, "Drób", SALE, "9.99", "19.99", 4, 1, "16:00", "20:00", false),
            new OfferSpec("zk-chleb", "sklep", "Chleb żytni na zakwasie",
                    "Z porannej dostawy od Złotego Kłosa. Do jutra spokojnie świeży.",
                    BREAD, "Pieczywo i bułki", SALE, "3.50", "8.50", 5, 1, "16:00", "20:00", false),
            new OfferSpec("zk-hummus", "sklep", "Hummus klasyczny 200 g",
                    "Zamknięte opakowanie, przechowywanie w lodówce.",
                    READY, "Sałatki i kanapki", SALE, "3.99", "8.49", 7, 3, "08:00", "20:00", false),
            new OfferSpec("zk-sok", "sklep", "Sok tłoczony jabłko-marchew 750 ml",
                    "Niepasteryzowany, od lokalnego sadownika. Data za 4 dni.",
                    DRINKS, "Soki i smoothie", SALE, "5.99", "12.99", 8, 4, "08:00", "20:00", false),
            new OfferSpec("zk-makaron", "sklep", "Makaron pełnoziarnisty 500 g",
                    "Pognieciony karton zbiorczy — torebki całe, data jeszcze odległa.",
                    PANTRY, "Makarony i kluski", SALE, "2.49", "5.99", 10, 120, "08:00", "20:00", false),
            new OfferSpec("zk-karma", "sklep", "Karma mokra dla kota 12 × 85 g",
                    "Wycofana z regularnej oferty, pełnowartościowa.",
                    PETS, "Karma mokra", SALE, "14.99", "29.99", 3, 30, "08:00", "20:00", false),
            new OfferSpec("zk-kanapki", "sklep", "Kanapki z lady (zestaw 3 szt.)",
                    "Zostały z dzisiejszej produkcji. Oddajemy za darmo — do odbioru do zamknięcia.",
                    READY, "Sałatki i kanapki", FREE, null, null, 3, 1, "18:00", "21:00", false),

            // ── Piekarnia Złoty Kłos ───────────────────────────────────────
            new OfferSpec("pk-chleb", "piekarnia", "Chleb pszenno-żytni 800 g",
                    "Z dzisiejszego wypieku, na zakwasie.",
                    BREAD, "Pieczywo i bułki", SALE, "4.00", "9.00", 6, 1, "18:00", "20:00", false),
            new OfferSpec("pk-drozdzowki", "piekarnia", "Drożdżówki z serem (4 szt.)",
                    "Puszyste, z twarogiem i kruszonką.",
                    BREAD, "Wypieki słodkie", SALE, "6.00", "14.00", 5, 1, "18:00", "20:00", true),
            new OfferSpec("pk-croissant", "piekarnia", "Croissanty maślane (3 szt.)",
                    "Na prawdziwym maśle. Jutro rano wystarczy podgrzać 3 minuty w piekarniku.",
                    BREAD, "Wypieki słodkie", SALE, "5.00", "12.00", 4, 1, "18:00", "20:00", false),
            new OfferSpec("pk-bagietki", "piekarnia", "Bagietki z dnia",
                    "Za darmo — lepiej zjeść niż wyrzucić. Świetne na grzanki.",
                    BREAD, "Pieczywo i bułki", FREE, null, null, 5, 1, "19:00", "20:00", false),
            new OfferSpec("pk-sernik", "piekarnia", "Sernik baskijski — kawałki (4 szt.)",
                    "Końcówki z blachy, smak bez zarzutu.",
                    BREAD, "Wypieki słodkie", SALE, "8.00", "18.00", 4, 2, "18:00", "20:00", false),
            new OfferSpec("pk-bezgluten", "piekarnia", "Chleb bezglutenowy 500 g",
                    "Pieczony w wydzielonej strefie. Termin 2 dni.",
                    BREAD, "Wypieki bezglutenowe", SALE, "7.99", "15.99", 3, 2, "18:00", "20:00", false),

            // ── Bistro Pod Lipami ──────────────────────────────────────────
            new OfferSpec("bi-zupa", "bistro", "Krem z dyni 0,5 l",
                    "Zupa dnia z imbirem i pestkami. Pakowana na ciepło do słoika.",
                    READY, "Nadwyżki restauracyjne", SALE, "6.00", "16.00", 6, 1, "15:00", "17:30", false),
            new OfferSpec("bi-pierogi", "bistro", "Pierogi ruskie (porcja 10 szt.)",
                    "Lepione ręcznie dziś rano. Do odsmażenia.",
                    READY, "Nadwyżki restauracyjne", SALE, "9.00", "24.00", 5, 1, "15:00", "17:30", true),
            new OfferSpec("bi-lunchbox", "bistro", "Lunchbox wege: kasza, pieczone warzywa, tahini",
                    "Porcja ok. 450 g. Kompostowalne pudełko.",
                    READY, "Nadwyżki restauracyjne", SALE, "10.00", "28.00", 4, 1, "15:00", "17:30", false),
            new OfferSpec("bi-salatka", "bistro", "Sałatka grecka",
                    "Feta, oliwki, pomidory, ogórek. Sos osobno.",
                    READY, "Sałatki i kanapki", SALE, "7.00", "19.00", 3, 1, "15:00", "17:30", false),
            new OfferSpec("bi-ciasto", "bistro", "Ciasto marchewkowe — 2 kawałki",
                    "Z kremem z mascarpone.",
                    SWEETS, "Czekolady i cukierki", SALE, "5.00", "14.00", 4, 2, "15:00", "17:30", false),

            // ── Osoby prywatne ─────────────────────────────────────────────
            new OfferSpec("pr-dynia", "kasia", "Dynie hokkaido z działki",
                    "Mam ich za dużo, oddam kilka sztuk. Każda ok. 1,5 kg.",
                    VEG, "Plony z działki (domowe)", FREE, null, null, 3, 14, "10:00", "18:00", false),
            new OfferSpec("pr-leczo", "kasia", "Domowe leczo w słoikach (0,9 l)",
                    "Wymienię na przetwory owocowe albo miód. Pasteryzowane we wrześniu.",
                    PANTRY, "Konserwy i przetwory w słoikach", EXCHANGE, null, null, 4, 60, "10:00", "18:00", false),
            new OfferSpec("pr-mleko", "pawel", "Mleko modyfikowane — 2 puszki, zamknięte",
                    "Córka zmieniła mleko, puszki nieotwierane, data za 3 miesiące.",
                    BABY, "Mleko modyfikowane (tylko zamknięte)", FREE, null, null, 2, 90, "17:00", "21:00", false),
            new OfferSpec("pr-ryz", "pawel", "Ryż basmati 2 kg",
                    "Kupiłem za dużo. Chętnie wymienię na kaszę gryczaną.",
                    PANTRY, "Ryż i zboża", EXCHANGE, null, null, 1, 200, "17:00", "21:00", false),
            new OfferSpec("pr-golabki", "ewa", "Gołąbki domowe (6 szt.)",
                    "Ugotowane dziś, z sosem pomidorowym. Przyda się własny pojemnik.",
                    READY, "Dania domowe", FREE, null, null, 2, 1, "12:00", "18:00", false),
            new OfferSpec("pr-jablka", "ewa", "Jabłka z sadu — skrzynka ok. 10 kg",
                    "Szampion i ligol, niepryskane. Część z obiciami — na szarlotkę idealne.",
                    VEG, "Świeże owoce", FREE, null, null, 2, 10, "12:00", "18:00", false),
            new OfferSpec("pr-karma", "michal", "Karma sucha dla psa 3 kg",
                    "Pies nie chce jeść, worek otwarty raz i zaklipsowany. Wymienię na inną markę.",
                    PETS, "Karma sucha", EXCHANGE, null, null, 1, 100, "18:00", "21:00", false),
            new OfferSpec("pr-czekolady", "michal", "Czekolady gorzkie (5 tabliczek)",
                    "Prezent, a ja nie jem słodyczy. Oddam w całości albo po sztuce.",
                    SWEETS, "Czekolady i cukierki", FREE, null, null, 5, 150, "18:00", "21:00", false),
            new OfferSpec("pr-ziola", "klient", "Pietruszka i koperek z balkonu",
                    "Duże pęczki, ścinam przy odbiorze.",
                    VEG, "Zioła i zielenina", FREE, null, null, 3, 5, "17:00", "20:00", false)
    );

    // ------------------------------------------------------------------
    // Historia — wzorce ofert, z których powstają zamknięte oferty z odebranymi rezerwacjami
    // ------------------------------------------------------------------

    record HistoricalTemplate(String name, String description, String category, String subcategory,
                              String price, String originalPrice) {
    }

    static final List<HistoricalTemplate> HISTORY_SKLEP = List.of(
            new HistoricalTemplate("Paczka ratunkowa: warzywa i owoce", "Niespodzianka z dostawy.",
                    VEG, "Świeże warzywa", "15.00", "40.00"),
            new HistoricalTemplate("Pomidory malinowe 1 kg", "Bardzo dojrzałe.",
                    VEG, "Świeże warzywa", "4.99", "11.99"),
            new HistoricalTemplate("Truskawki 500 g", "Na dżem albo koktajl.",
                    VEG, "Świeże owoce", "5.99", "12.99"),
            new HistoricalTemplate("Jogurt grecki 400 g", "Data za 2 dni.",
                    DAIRY, "Jogurty i desery mleczne", "3.99", "7.49"),
            new HistoricalTemplate("Twaróg półtłusty 250 g", "Krótka data.",
                    DAIRY, "Sery", "2.99", "5.99"),
            new HistoricalTemplate("Mleko 3,2% 1 l", "Data jutro.",
                    DAIRY, "Mleko i napoje roślinne", "2.49", "4.29"),
            new HistoricalTemplate("Filet z kurczaka 500 g", "Termin jutro.",
                    MEAT, "Drób", "9.99", "19.99"),
            new HistoricalTemplate("Chleb żytni na zakwasie", "Z porannej dostawy.",
                    BREAD, "Pieczywo i bułki", "3.50", "8.50"),
            new HistoricalTemplate("Hummus klasyczny 200 g", "Zamknięte opakowanie.",
                    READY, "Sałatki i kanapki", "3.99", "8.49"),
            new HistoricalTemplate("Sok tłoczony 750 ml", "Niepasteryzowany.",
                    DRINKS, "Soki i smoothie", "5.99", "12.99")
    );

    static final List<HistoricalTemplate> HISTORY_PIEKARNIA = List.of(
            new HistoricalTemplate("Chleb pszenno-żytni 800 g", "Z dzisiejszego wypieku.",
                    BREAD, "Pieczywo i bułki", "4.00", "9.00"),
            new HistoricalTemplate("Drożdżówki (4 szt.)", "Z serem i kruszonką.",
                    BREAD, "Wypieki słodkie", "6.00", "14.00"),
            new HistoricalTemplate("Croissanty maślane (3 szt.)", "Na maśle.",
                    BREAD, "Wypieki słodkie", "5.00", "12.00")
    );

    static final List<HistoricalTemplate> HISTORY_BISTRO = List.of(
            new HistoricalTemplate("Zupa dnia 0,5 l", "Pakowana na ciepło.",
                    READY, "Nadwyżki restauracyjne", "6.00", "16.00"),
            new HistoricalTemplate("Pierogi (porcja 10 szt.)", "Lepione ręcznie.",
                    READY, "Nadwyżki restauracyjne", "9.00", "24.00"),
            new HistoricalTemplate("Lunchbox dnia", "Porcja ok. 450 g.",
                    READY, "Nadwyżki restauracyjne", "10.00", "28.00")
    );

    // ------------------------------------------------------------------
    // Oceny
    // ------------------------------------------------------------------

    record RateSpec(String ratedKey, int cleanliness, int quality, int transaction,
                    String comment, int daysAgo) {
    }

    static final List<RateSpec> RATES = List.of(
            new RateSpec("sklep", 5, 5, 5, "Paczka ratunkowa wypchana po brzegi, wszystko jadalne.", 3),
            new RateSpec("sklep", 5, 4, 5, "Szybki odbiór, kasjerka od razu znalazła rezerwację.", 9),
            new RateSpec("sklep", 5, 5, 5, "Super pomysł z produktami z krótką datą. Będę wracać.", 14),
            new RateSpec("sklep", 4, 5, 5, null, 21),
            new RateSpec("sklep", 5, 5, 4, "Kurczak świeży, tylko trochę czekałam przy kasie.", 30),
            new RateSpec("sklep", 5, 5, 5, "Zawsze uprzejmie i bez problemu.", 41),
            new RateSpec("sklep", 5, 4, 5, null, 55),
            new RateSpec("sklep", 5, 5, 5, "Najlepsze miejsce na Mokotowie do ratowania jedzenia.", 68),
            new RateSpec("piekarnia", 5, 5, 5, "Croissanty na drugi dzień nadal świetne.", 6),
            new RateSpec("piekarnia", 5, 5, 5, null, 19),
            new RateSpec("piekarnia", 4, 5, 5, "Darmowe bagietki — złoto.", 33),
            new RateSpec("bistro", 5, 5, 4, "Pierogi jak u babci.", 8),
            new RateSpec("bistro", 4, 4, 5, "Lunchbox duży, odbiór sprawny.", 27),
            new RateSpec("ewa", 5, 5, 5, "Pani Ewa bardzo miła, jabłka pyszne.", 12),
            new RateSpec("kasia", 5, 5, 5, "Dynia piękna, dziękuję!", 18),
            new RateSpec("klient", 5, 5, 5, "Koperek pachnący, odbiór bez problemu.", 25)
    );

    // ------------------------------------------------------------------
    // Rozmowy
    // ------------------------------------------------------------------

    /** Wiadomość w rozmowie: kto pisze (klucz konta) i ile minut przed „teraz". */
    record MessageSpec(String senderKey, String content, int minutesAgo) {
    }

    record ChatSpec(String firstKey, String secondKey, List<MessageSpec> messages) {
    }

    static final List<ChatSpec> CHATS = List.of(
            new ChatSpec("klient", "sklep", List.of(
                    new MessageSpec("klient", "Dzień dobry, czy w paczce ratunkowej będą też ziemniaki?", 190),
                    new MessageSpec("sklep", "Dzień dobry! Dziś raczej pomidory, papryka i jabłka — ziemniaki mamy w osobnej ofercie jutro.", 175),
                    new MessageSpec("klient", "Super, i tak biorę. Odbiorę ok. 18:00.", 170),
                    new MessageSpec("sklep", "Czekamy, kod rezerwacji wystarczy pokazać przy kasie.", 160)
            )),
            new ChatSpec("klient", "ewa", List.of(
                    new MessageSpec("klient", "Pani Ewo, czy gołąbki są jeszcze dostępne?", 320),
                    new MessageSpec("ewa", "Tak, proszę przyjść z pojemnikiem, najlepiej przed 18.", 300)
            ))
    );

    // ------------------------------------------------------------------
    // Zgłoszenia (panel moderatora)
    // ------------------------------------------------------------------

    record ComplaintSpec(String reporterKey, String offerKey, String explanation,
                         int hoursAgo, boolean resolved) {
    }

    static final List<ComplaintSpec> COMPLAINTS = List.of(
            new ComplaintSpec("kasia", "pr-karma",
                    "Karma jest otwarta — regulamin chyba dopuszcza tylko zamknięte opakowania?", 5, false),
            new ComplaintSpec("michal", "pr-golabki",
                    "Danie domowe bez informacji o alergenach.", 20, false),
            new ComplaintSpec("pawel", "zk-kurczak",
                    "Termin w ofercie inny niż na opakowaniu (sklep poprawił po kontakcie).", 70, true)
    );

    // ------------------------------------------------------------------
    // Ulubione
    // ------------------------------------------------------------------

    record FavoriteSpec(String userKey, String offerKey) {
    }

    static final List<FavoriteSpec> FAVORITES = List.of(
            new FavoriteSpec("klient", "zk-paczka"),
            new FavoriteSpec("klient", "pk-croissant"),
            new FavoriteSpec("klient", "bi-pierogi"),
            new FavoriteSpec("klient", "pr-jablka"),
            new FavoriteSpec("kasia", "zk-paczka"),
            new FavoriteSpec("pawel", "pk-drozdzowki"),
            new FavoriteSpec("ewa", "zk-sok"),
            new FavoriteSpec("michal", "bi-lunchbox")
    );
}
