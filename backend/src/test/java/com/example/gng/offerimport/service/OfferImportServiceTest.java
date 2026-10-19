package com.example.gng.offerimport.service;

import com.example.gng.common.exception.ApiException;
import com.example.gng.common.exception.ForbiddenOperationException;
import com.example.gng.moderation.service.ForbiddenPatternService;
import com.example.gng.offer.entity.CategoryEntity;
import com.example.gng.offer.entity.OfferEntity;
import com.example.gng.offer.entity.OfferStatus;
import com.example.gng.offer.entity.SubcategoryEntity;
import com.example.gng.offer.entity.TransactionType;
import com.example.gng.offer.repository.CategoryEntityRepository;
import com.example.gng.offer.repository.OfferRepository;
import com.example.gng.offerimport.dto.OfferImportResult;
import com.example.gng.offerimport.dto.OfferImportRowError;
import com.example.gng.register.company.model.BusinessUserModel;
import com.example.gng.register.model.UserModel;
import com.example.gng.register.model.UserType;
import com.example.gng.register.repository.UserRepository;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.util.unit.DataSize;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Import ofert z pliku .xlsx (docs/08, pozycja 1). Pliki budujemy w pamięci przez POI,
 * więc test przechodzi przez prawdziwy parser, a mockowana jest tylko warstwa bazy.
 */
class OfferImportServiceTest {

    private static final String COMPANY_EMAIL = "sklep@example.com";
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 9);
    private static final String FUTURE = "2026-10-15";

    private static final String[] HEADERS = {
            "nazwa", "opis", "typ_transakcji", "cena", "waluta", "ilosc", "termin_waznosci",
            "godziny_odbioru_od", "godziny_odbioru_do", "kategoria", "podkategoria"};

    @Mock private UserRepository userRepository;
    @Mock private CategoryEntityRepository categoryRepository;
    @Mock private OfferRepository offerRepository;
    @Mock private ForbiddenPatternService forbiddenPatternService;

    private AutoCloseable mocks;
    private OfferImportService service;
    private BusinessUserModel company;

    @BeforeEach
    void setUp() {
        mocks = MockitoAnnotations.openMocks(this);
        service = serviceWithLimits(DataSize.ofMegabytes(2), 500);

        company = new BusinessUserModel();
        company.setId(7L);
        company.setEmail(COMPANY_EMAIL);
        company.setType(UserType.COMPANY);
        company.setCompanyName("Piekarnia Testowa");
        company.setLat(new BigDecimal("50.064700"));
        company.setLon(new BigDecimal("19.945000"));
        company.setAddress("Kraków, Rynek 1");

        lenient().when(userRepository.findByEmail(COMPANY_EMAIL)).thenReturn(Optional.of(company));
        lenient().when(categoryRepository.findAll()).thenReturn(categories());
        lenient().when(forbiddenPatternService.containsForbiddenContent(any(String[].class))).thenReturn(false);
    }

    @AfterEach
    void tearDown() throws Exception {
        mocks.close();
    }

    // ------------------------------------------------------------------
    // Poprawny plik
    // ------------------------------------------------------------------

    @Test
    void validFile_createsAllOffersOwnedByCompanyAtCompanyLocation() throws IOException {
        byte[] xlsx = workbook(
                row("Chleb żytni", "Świeży", "sprzedaz", "4.99", "", "10", FUTURE, "16:00", "19:00", "Pieczywo i wypieki", "Pieczywo i bułki"),
                row("Jabłka", "Obite", "za_darmo", "", "", "", FUTURE, "09:00", "18:00", "Owoce i warzywa", "Świeże owoce"),
                row("Ser", "Gouda", "wymiana", "", "", "2", FUTURE, "10:00", "17:00", "nabiał i alternatywy", "SERY"));

        OfferImportResult result = service.importOffers(COMPANY_EMAIL, xlsx("oferty.xlsx", xlsx));

        assertEquals(3, result.utworzone());
        assertTrue(result.bledy().isEmpty());
        assertTrue(result.doWeryfikacji().isEmpty());

        List<OfferEntity> saved = captureSaved();
        assertEquals(3, saved.size());
        for (OfferEntity offer : saved) {
            assertSame(company, offer.getUser(), "właścicielem jest firma wywołująca");
            assertEquals(0, new BigDecimal("50.064700").compareTo(offer.getLatitude()));
            assertEquals(0, new BigDecimal("19.945000").compareTo(offer.getLongitude()));
            assertEquals("Kraków, Rynek 1", offer.getLocation());
        }

        OfferEntity bread = saved.get(0);
        assertEquals(TransactionType.sale, bread.getTransactionType());
        assertEquals(new BigDecimal("4.99"), bread.getPrice());
        assertEquals("PLN", bread.getCurrency(), "brak waluty przy sprzedaży = PLN");
        assertEquals(10, bread.getQuantity());
        assertEquals(LocalDate.parse(FUTURE), bread.getExpiryDate());
        assertEquals("16:00", bread.getPickupDateFrom());
        assertEquals("Pieczywo i bułki", bread.getSubcategory().getName());

        OfferEntity apples = saved.get(1);
        assertEquals(TransactionType.free, apples.getTransactionType());
        assertNull(apples.getPrice());
        assertNull(apples.getCurrency());
        assertEquals(1, apples.getQuantity(), "brak ilości = 1");

        assertEquals("Sery", saved.get(2).getSubcategory().getName(), "kategorie bez względu na wielkość liter");
    }

    @Test
    void validFile_acceptsExcelDateAndTimeCellsAndCustomCoordinates() throws IOException {
        byte[] xlsx;
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet();
            String[] headers = Arrays.copyOf(HEADERS, HEADERS.length + 3);
            headers[HEADERS.length] = "lokalizacja";
            headers[HEADERS.length + 1] = "szerokosc_geo";
            headers[HEADERS.length + 2] = "dlugosc_geo";
            writeRow(sheet, 0, headers);
            writeRow(sheet, 1, "Bułki", "Opis", "sprzedaz", "", "EUR", "", "", "", "", "Pieczywo i wypieki", "Pieczywo i bułki",
                    "Warszawa, Marszałkowska 1", "", "");

            Row row = sheet.getRow(1);
            row.createCell(3).setCellValue(2.5);
            row.createCell(5).setCellValue(3);
            CellStyle dateStyle = wb.createCellStyle();
            dateStyle.setDataFormat(wb.getCreationHelper().createDataFormat().getFormat("dd.mm.yyyy"));
            Cell expiry = row.createCell(6);
            expiry.setCellValue(LocalDate.parse(FUTURE));
            expiry.setCellStyle(dateStyle);
            CellStyle timeStyle = wb.createCellStyle();
            timeStyle.setDataFormat(wb.getCreationHelper().createDataFormat().getFormat("hh:mm"));
            Cell from = row.createCell(7);
            from.setCellValue(9.5 / 24); // 09:30
            from.setCellStyle(timeStyle);
            Cell to = row.createCell(8);
            to.setCellValue(18.0 / 24);
            to.setCellStyle(timeStyle);
            row.createCell(12).setCellValue(52.2297);
            row.createCell(13).setCellValue(21.0122);
            wb.write(out);
            xlsx = out.toByteArray();
        }

        OfferImportResult result = service.importOffers(COMPANY_EMAIL, xlsx("oferty.xlsx", xlsx));

        assertEquals(1, result.utworzone(), () -> "błędy: " + result.bledy());
        OfferEntity offer = captureSaved().get(0);
        assertEquals(new BigDecimal("2.50"), offer.getPrice());
        assertEquals("EUR", offer.getCurrency());
        assertEquals(3, offer.getQuantity());
        assertEquals(LocalDate.parse(FUTURE), offer.getExpiryDate());
        assertEquals("09:30", offer.getPickupDateFrom());
        assertEquals("18:00", offer.getPickupDateTo());
        assertEquals(new BigDecimal("52.229700"), offer.getLatitude());
        assertEquals(new BigDecimal("21.012200"), offer.getLongitude());
        assertEquals("Warszawa, Marszałkowska 1", offer.getLocation());
    }

    @Test
    void templateFromEndpoint_importsWithoutErrors() {
        byte[] template = service.buildTemplate();

        OfferImportResult result = service.importOffers(COMPANY_EMAIL, xlsx("szablon.xlsx", template));

        assertEquals(3, result.utworzone(), () -> "szablon musi przechodzić własną walidację: " + result.bledy());
    }

    // ------------------------------------------------------------------
    // Częściowy sukces
    // ------------------------------------------------------------------

    @Test
    void invalidRows_areReportedAndValidRowsAreSaved() throws IOException {
        byte[] xlsx = workbook(
                row("OK 1", "Opis", "za_darmo", "", "", "1", FUTURE, "09:00", "10:00", "Owoce i warzywa", "Świeże owoce"),
                row("Zła kategoria", "Opis", "za_darmo", "", "", "1", FUTURE, "09:00", "10:00", "Elektronika", ""),
                row("Sprzedaż bez ceny", "Opis", "sprzedaz", "", "", "1", FUTURE, "09:00", "10:00", "Owoce i warzywa", "Świeże owoce"),
                row("Zła data", "Opis", "za_darmo", "", "", "1", "15.10.2026", "09:00", "10:00", "Owoce i warzywa", "Świeże owoce"),
                row("", "", "", "", "", "", "", "", "", "", ""), // pusty wiersz — pomijany bez błędu
                row("Przeterminowane", "Opis", "za_darmo", "", "", "1", "2026-10-08", "09:00", "10:00", "Owoce i warzywa", "Świeże owoce"),
                row("Brak podkategorii", "Opis", "za_darmo", "", "", "1", FUTURE, "09:00", "10:00", "Owoce i warzywa", ""),
                row("Zła godzina", "Opis", "za_darmo", "", "", "1", FUTURE, "25:00", "10:00", "Owoce i warzywa", "Świeże owoce"),
                row("Od po do", "Opis", "za_darmo", "", "", "1", FUTURE, "12:00", "10:00", "Owoce i warzywa", "Świeże owoce"),
                row("Ułamek sztuki", "Opis", "za_darmo", "", "", "1.5", FUTURE, "09:00", "10:00", "Owoce i warzywa", "Świeże owoce"),
                row("Sprzedaż w domowych", "Opis", "sprzedaz", "5", "", "1", FUTURE, "09:00", "10:00", "Dania domowe (prywatne)", ""),
                row("Zły typ", "Opis", "oddam", "", "", "1", FUTURE, "09:00", "10:00", "Owoce i warzywa", "Świeże owoce"),
                row("", "Bez nazwy", "za_darmo", "", "", "1", FUTURE, "09:00", "10:00", "Owoce i warzywa", "Świeże owoce"),
                row("OK 2", "Opis", "wymiana", "", "", "0", FUTURE, "09:00", "10:00", "Dania domowe (prywatne)", ""));

        OfferImportResult result = service.importOffers(COMPANY_EMAIL, xlsx("oferty.xlsx", xlsx));

        assertEquals(2, result.utworzone());
        assertEquals(List.of(
                new Err(3, "CATEGORY_NOT_FOUND"),
                new Err(4, "PRICE_REQUIRED"),
                new Err(5, "INVALID_DATE"),
                new Err(7, "EXPIRY_DATE_IN_PAST"),
                new Err(8, "SUBCATEGORY_REQUIRED"),
                new Err(9, "INVALID_PICKUP_TIME"),
                new Err(10, "INVALID_PICKUP_TIME"),
                new Err(11, "INVALID_QUANTITY"),
                new Err(12, "TRANSACTION_TYPE_NOT_ALLOWED"),
                new Err(13, "INVALID_TRANSACTION_TYPE"),
                new Err(14, "REQUIRED_FIELD_MISSING")
        ), errors(result));
        result.bledy().forEach(e -> assertTrue(!e.message().isBlank(), "każdy błąd ma komunikat"));

        List<OfferEntity> saved = captureSaved();
        assertEquals(List.of("OK 1", "OK 2"), saved.stream().map(OfferEntity::getName).toList());
    }

    @Test
    void allRowsInvalid_nothingIsSaved() throws IOException {
        byte[] xlsx = workbook(
                row("X", "Opis", "sprzedaz", "", "", "1", FUTURE, "09:00", "10:00", "Owoce i warzywa", "Świeże owoce"));

        OfferImportResult result = service.importOffers(COMPANY_EMAIL, xlsx("oferty.xlsx", xlsx));

        assertEquals(0, result.utworzone());
        assertEquals(1, result.bledy().size());
        verify(offerRepository, never()).saveAll(anyList());
    }

    @Test
    void forbiddenContent_isSavedAsPendingAndReported() throws IOException {
        when(forbiddenPatternService.containsForbiddenContent(any(String[].class)))
                .thenAnswer(inv -> Arrays.deepToString(inv.getArguments()).contains("zakazane"));
        byte[] xlsx = workbook(
                row("Normalna", "Opis", "za_darmo", "", "", "1", FUTURE, "09:00", "10:00", "Owoce i warzywa", "Świeże owoce"),
                row("Coś zakazane", "Opis", "za_darmo", "", "", "1", FUTURE, "09:00", "10:00", "Owoce i warzywa", "Świeże owoce"));

        OfferImportResult result = service.importOffers(COMPANY_EMAIL, xlsx("oferty.xlsx", xlsx));

        assertEquals(2, result.utworzone());
        assertEquals(List.of(3), result.doWeryfikacji());
        List<OfferEntity> saved = captureSaved();
        assertEquals(OfferStatus.ACTIVE, saved.get(0).getStatus());
        assertEquals(OfferStatus.PENDING, saved.get(1).getStatus());
    }

    @Test
    void formulaCell_isRejectedNotEvaluated() throws IOException {
        byte[] xlsx;
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet();
            writeRow(sheet, 0, HEADERS);
            writeRow(sheet, 1, row("Chleb", "Opis", "sprzedaz", "", "", "1", FUTURE, "09:00", "10:00", "Pieczywo i wypieki", "Pieczywo i bułki"));
            sheet.getRow(1).createCell(3).setCellFormula("2+2");
            wb.write(out);
            xlsx = out.toByteArray();
        }

        OfferImportResult result = service.importOffers(COMPANY_EMAIL, xlsx("oferty.xlsx", xlsx));

        assertEquals(List.of(new Err(2, "FORMULA_NOT_ALLOWED")), errors(result));
    }

    // ------------------------------------------------------------------
    // Cena (reguły P#6 z OfferService)
    // ------------------------------------------------------------------

    @Test
    void invalidPricing_isReportedWithOfferServiceCodes() throws IOException {
        byte[] xlsx = workbook(
                row("Cena zero", "Opis", "sprzedaz", "0", "", "1", FUTURE, "09:00", "10:00", "Pieczywo i wypieki", "Pieczywo i bułki"),
                row("Cena ujemna", "Opis", "sprzedaz", "-3", "", "1", FUTURE, "09:00", "10:00", "Pieczywo i wypieki", "Pieczywo i bułki"),
                row("Trzy miejsca", "Opis", "sprzedaz", "1.999", "", "1", FUTURE, "09:00", "10:00", "Pieczywo i wypieki", "Pieczywo i bułki"),
                row("Tekst", "Opis", "sprzedaz", "tanio", "", "1", FUTURE, "09:00", "10:00", "Pieczywo i wypieki", "Pieczywo i bułki"),
                row("Zła waluta", "Opis", "sprzedaz", "3", "USD", "1", FUTURE, "09:00", "10:00", "Pieczywo i wypieki", "Pieczywo i bułki"),
                row("Darmowa z ceną", "Opis", "za_darmo", "3", "", "1", FUTURE, "09:00", "10:00", "Pieczywo i wypieki", "Pieczywo i bułki"),
                row("Wymiana z walutą", "Opis", "wymiana", "", "PLN", "1", FUTURE, "09:00", "10:00", "Pieczywo i wypieki", "Pieczywo i bułki"),
                row("Przecinek", "Opis", "sprzedaz", "3,50", "eur", "1", FUTURE, "09:00", "10:00", "Pieczywo i wypieki", "Pieczywo i bułki"));

        OfferImportResult result = service.importOffers(COMPANY_EMAIL, xlsx("oferty.xlsx", xlsx));

        assertEquals(List.of(
                new Err(2, "INVALID_PRICE"),
                new Err(3, "INVALID_PRICE"),
                new Err(4, "INVALID_PRICE"),
                new Err(5, "INVALID_PRICE"),
                new Err(6, "INVALID_CURRENCY"),
                new Err(7, "PRICE_NOT_ALLOWED_FOR_FREE"),
                new Err(8, "PRICE_NOT_ALLOWED_FOR_FREE")
        ), errors(result));

        OfferEntity saved = captureSaved().get(0);
        assertEquals(new BigDecimal("3.50"), saved.getPrice(), "polski przecinek dziesiętny");
        assertEquals("EUR", saved.getCurrency());
    }

    @Test
    void originalPrice_isValidatedPerRowWithOfferServiceRules() throws IOException {
        byte[] xlsx;
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet();
            String[] headers = Arrays.copyOf(HEADERS, HEADERS.length + 1);
            headers[HEADERS.length] = "cena_przed_obnizka";
            writeRow(sheet, 0, headers);
            String b = "Pieczywo i wypieki", sb = "Pieczywo i bułki";
            writeRow(sheet, 1, "Przecena OK", "Opis", "sprzedaz", "4.50", "", "1", FUTURE, "09:00", "10:00", b, sb, "7,99");
            writeRow(sheet, 2, "Równa cenie", "Opis", "sprzedaz", "4.50", "", "1", FUTURE, "09:00", "10:00", b, sb, "4.50");
            writeRow(sheet, 3, "Niższa od ceny", "Opis", "sprzedaz", "4.50", "", "1", FUTURE, "09:00", "10:00", b, sb, "3");
            writeRow(sheet, 4, "Darmowa z przeceną", "Opis", "za_darmo", "", "", "1", FUTURE, "09:00", "10:00", b, sb, "5");
            writeRow(sheet, 5, "Tekst", "Opis", "sprzedaz", "4.50", "", "1", FUTURE, "09:00", "10:00", b, sb, "dużo");
            writeRow(sheet, 6, "Bez przeceny", "Opis", "sprzedaz", "4.50", "", "1", FUTURE, "09:00", "10:00", b, sb, "");
            wb.write(out);
            xlsx = out.toByteArray();
        }

        OfferImportResult result = service.importOffers(COMPANY_EMAIL, xlsx("oferty.xlsx", xlsx));

        assertEquals(List.of(
                new Err(3, "ORIGINAL_PRICE_NOT_HIGHER"),
                new Err(4, "ORIGINAL_PRICE_NOT_HIGHER"),
                new Err(5, "ORIGINAL_PRICE_NOT_ALLOWED"),
                new Err(6, "INVALID_ORIGINAL_PRICE")
        ), errors(result));

        List<OfferEntity> saved = captureSaved();
        assertEquals(2, saved.size());
        assertEquals(new BigDecimal("7.99"), saved.get(0).getOriginalPrice(), "polski przecinek dziesiętny");
        assertNull(saved.get(1).getOriginalPrice(), "pusta komórka = bez przeceny");
    }

    // ------------------------------------------------------------------
    // Plik
    // ------------------------------------------------------------------

    @Test
    void missingFile_isRejected() {
        assertCode("FILE_REQUIRED", HttpStatus.BAD_REQUEST, () -> service.importOffers(COMPANY_EMAIL, null));
        assertCode("FILE_REQUIRED", HttpStatus.BAD_REQUEST,
                () -> service.importOffers(COMPANY_EMAIL, new MockMultipartFile("file", "", null, new byte[0])));
    }

    @Test
    void wrongExtension_isRejected() throws IOException {
        byte[] valid = workbook(row("A", "B", "za_darmo", "", "", "1", FUTURE, "09:00", "10:00", "Owoce i warzywa", "Świeże owoce"));

        assertCode("INVALID_FILE_TYPE", HttpStatus.BAD_REQUEST,
                () -> service.importOffers(COMPANY_EMAIL, xlsx("oferty.csv", valid)));
        assertCode("INVALID_FILE_TYPE", HttpStatus.BAD_REQUEST,
                () -> service.importOffers(COMPANY_EMAIL, xlsx("oferty.xls", valid)));
        assertCode("INVALID_FILE_TYPE", HttpStatus.BAD_REQUEST,
                () -> service.importOffers(COMPANY_EMAIL, xlsx("oferty.xlsm", valid)));
        verify(offerRepository, never()).saveAll(anyList());
    }

    @Test
    void xlsxExtensionWithForeignContent_isRejected() {
        byte[] csv = "nazwa;opis\nChleb;Świeży\n".getBytes(StandardCharsets.UTF_8);
        assertCode("INVALID_FILE_TYPE", HttpStatus.BAD_REQUEST,
                () -> service.importOffers(COMPANY_EMAIL, xlsx("oferty.xlsx", csv)));

        // Stary format .xls (OLE2) przemianowany na .xlsx
        byte[] ole2 = {(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1};
        assertCode("INVALID_FILE_TYPE", HttpStatus.BAD_REQUEST,
                () -> service.importOffers(COMPANY_EMAIL, xlsx("oferty.xlsx", ole2)));

        // Sygnatura ZIP się zgadza, ale to nie jest arkusz
        byte[] brokenZip = {0x50, 0x4B, 0x03, 0x04, 1, 2, 3, 4, 5, 6, 7, 8};
        assertCode("FILE_UNREADABLE", HttpStatus.BAD_REQUEST,
                () -> service.importOffers(COMPANY_EMAIL, xlsx("oferty.xlsx", brokenZip)));

        // Obrazek z nagłówkiem Content-Type image/* — odrzucony zanim trafi do POI
        assertCode("INVALID_FILE_TYPE", HttpStatus.BAD_REQUEST,
                () -> service.importOffers(COMPANY_EMAIL,
                        new MockMultipartFile("file", "oferty.xlsx", "image/png", brokenZip)));
        verify(offerRepository, never()).saveAll(anyList());
    }

    @Test
    void emptyFile_isRejected() throws IOException {
        assertCode("EMPTY_FILE", HttpStatus.BAD_REQUEST,
                () -> service.importOffers(COMPANY_EMAIL, xlsx("oferty.xlsx", new byte[0])));

        byte[] noRows;
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            wb.createSheet();
            wb.write(out);
            noRows = out.toByteArray();
        }
        assertCode("EMPTY_FILE", HttpStatus.BAD_REQUEST,
                () -> service.importOffers(COMPANY_EMAIL, xlsx("oferty.xlsx", noRows)));

        byte[] headerOnly = workbook();
        assertCode("EMPTY_FILE", HttpStatus.BAD_REQUEST,
                () -> service.importOffers(COMPANY_EMAIL, xlsx("oferty.xlsx", headerOnly)));
        verify(offerRepository, never()).saveAll(anyList());
    }

    @Test
    void missingRequiredColumns_areListed() throws IOException {
        byte[] xlsx;
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet();
            writeRow(sheet, 0, "nazwa", "opis", "cena");
            writeRow(sheet, 1, "Chleb", "Świeży", "3");
            wb.write(out);
            xlsx = out.toByteArray();
        }

        ApiException ex = assertCode("MISSING_COLUMNS", HttpStatus.BAD_REQUEST,
                () -> service.importOffers(COMPANY_EMAIL, xlsx("oferty.xlsx", xlsx)));
        assertEquals(List.of("typ_transakcji", "termin_waznosci", "godziny_odbioru_od", "godziny_odbioru_do", "kategoria"),
                ex.getDetails().get("missing"));
    }

    @Test
    void fileOverSizeLimit_isRejectedBeforeParsing() throws IOException {
        service = serviceWithLimits(DataSize.ofBytes(100), 500);
        byte[] xlsx = workbook(row("A", "B", "za_darmo", "", "", "1", FUTURE, "09:00", "10:00", "Owoce i warzywa", "Świeże owoce"));

        assertCode("FILE_TOO_LARGE", HttpStatus.PAYLOAD_TOO_LARGE,
                () -> service.importOffers(COMPANY_EMAIL, xlsx("oferty.xlsx", xlsx)));
    }

    @Test
    void tooManyRows_rejectsWholeFile() throws IOException {
        service = serviceWithLimits(DataSize.ofMegabytes(2), 2);
        String[] r = row("A", "B", "za_darmo", "", "", "1", FUTURE, "09:00", "10:00", "Owoce i warzywa", "Świeże owoce");
        byte[] xlsx = workbook(r, r, r);

        assertCode("TOO_MANY_ROWS", HttpStatus.UNPROCESSABLE_ENTITY,
                () -> service.importOffers(COMPANY_EMAIL, xlsx("oferty.xlsx", xlsx)));
        verify(offerRepository, never()).saveAll(anyList());
    }

    // ------------------------------------------------------------------
    // Uprawnienia i lokalizacja
    // ------------------------------------------------------------------

    @Test
    void nonCompanyAccount_isForbidden() throws IOException {
        UserModel regular = new UserModel();
        regular.setEmail("jan@example.com");
        regular.setType(UserType.REGULAR);
        when(userRepository.findByEmail("jan@example.com")).thenReturn(Optional.of(regular));
        byte[] xlsx = workbook(row("A", "B", "za_darmo", "", "", "1", FUTURE, "09:00", "10:00", "Owoce i warzywa", "Świeże owoce"));

        assertThrows(ForbiddenOperationException.class,
                () -> service.importOffers("jan@example.com", xlsx("oferty.xlsx", xlsx)));
        verify(offerRepository, never()).saveAll(anyList());
    }

    @Test
    void companyWithoutLocation_requiresCoordinatesInFile() throws IOException {
        company.setLat(null);
        company.setLon(null);
        byte[] xlsx = workbook(row("A", "B", "za_darmo", "", "", "1", FUTURE, "09:00", "10:00", "Owoce i warzywa", "Świeże owoce"));

        OfferImportResult result = service.importOffers(COMPANY_EMAIL, xlsx("oferty.xlsx", xlsx));

        assertEquals(List.of(new Err(2, "LOCATION_REQUIRED")), errors(result));
    }

    // ------------------------------------------------------------------
    // Pomocnicze
    // ------------------------------------------------------------------

    private record Err(int wiersz, String code) {
    }

    private static List<Err> errors(OfferImportResult result) {
        List<Err> errors = new ArrayList<>();
        for (OfferImportRowError e : result.bledy()) {
            errors.add(new Err(e.wiersz(), e.code()));
        }
        return errors;
    }

    private OfferImportService serviceWithLimits(DataSize maxSize, int maxRows) {
        return new OfferImportService(userRepository, categoryRepository, offerRepository, forbiddenPatternService,
                maxSize, maxRows, Clock.fixed(TODAY.atStartOfDay().toInstant(ZoneOffset.UTC), ZoneOffset.UTC));
    }

    @SuppressWarnings("unchecked")
    private List<OfferEntity> captureSaved() {
        ArgumentCaptor<List<OfferEntity>> captor = ArgumentCaptor.forClass(List.class);
        verify(offerRepository).saveAll(captor.capture());
        return captor.getValue();
    }

    private static ApiException assertCode(String code, HttpStatus status, org.junit.jupiter.api.function.Executable call) {
        ApiException ex = assertThrows(ApiException.class, call);
        assertEquals(code, ex.getCode());
        assertEquals(status, ex.getStatus());
        return ex;
    }

    private static MockMultipartFile xlsx(String filename, byte[] content) {
        return new MockMultipartFile("file", filename,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", content);
    }

    private static String[] row(String... values) {
        return values;
    }

    /** Arkusz z nagłówkami szablonu i podanymi wierszami; pusta wartość = brak komórki. */
    private static byte[] workbook(String[]... rows) throws IOException {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Oferty");
            writeRow(sheet, 0, HEADERS);
            for (int i = 0; i < rows.length; i++) {
                writeRow(sheet, i + 1, rows[i]);
            }
            wb.write(out);
            return out.toByteArray();
        }
    }

    private static void writeRow(Sheet sheet, int index, String... values) {
        Row row = sheet.createRow(index);
        for (int i = 0; i < values.length; i++) {
            if (values[i] != null && !values[i].isEmpty()) {
                row.createCell(i).setCellValue(values[i]);
            }
        }
    }

    private static List<CategoryEntity> categories() {
        List<CategoryEntity> categories = new ArrayList<>();
        categories.add(category(1, "Dania domowe (prywatne)", "[\"free\", \"exchange\"]"));
        categories.add(category(3, "Owoce i warzywa", "[\"free\", \"exchange\", \"sale\"]", "Świeże owoce", "Świeże warzywa"));
        categories.add(category(4, "Nabiał i alternatywy", "[\"free\", \"exchange\", \"sale\"]", "Sery", "Jaja"));
        categories.add(category(6, "Pieczywo i wypieki", "[\"free\", \"exchange\", \"sale\"]", "Pieczywo i bułki"));
        return categories;
    }

    private static CategoryEntity category(int id, String name, String allowed, String... subcategoryNames) {
        CategoryEntity category = new CategoryEntity();
        category.setId(id);
        category.setName(name);
        category.setAllowedTransactionTypes(allowed);
        List<SubcategoryEntity> subcategories = new ArrayList<>();
        for (int i = 0; i < subcategoryNames.length; i++) {
            SubcategoryEntity sub = new SubcategoryEntity();
            sub.setId(id * 100 + i);
            sub.setName(subcategoryNames[i]);
            sub.setAllowedTransactionTypes(allowed);
            sub.setCategory(category);
            subcategories.add(sub);
        }
        category.setSubcategories(subcategories);
        return category;
    }
}
