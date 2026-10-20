"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
// import { format } from 'date-fns';
import { LuArrowLeft, LuCalendar, LuCamera, LuCrosshair, LuImagePlus, LuInfo, LuX } from "react-icons/lu";

import LocationMapModal from "./LocationMapModal";
import Image from "next/image";
import { environment } from "../config";
import { authorizedFetch, getUserData } from "../utils/auth";
import { getImageUrl } from "../utils/imageUtils";
import { TimePicker } from "./TimePicker";
import OfferDetailsView from "./OfferDetailsView";
import { categoryIcon } from "./offer/categoryIcons";
import { Button, Card, CardHeader, Chip, IconButton, Input, PageHeader, Select, Spinner, Textarea, cn } from "./ui";
import { usePageFrame } from "./shell/usePageFrame";
import { TransactionType, Category, isTransactionAllowed, getAllowedTransactionTypes, getTransactionTypeMessage, getProductRestrictions } from "../types/offer";

interface OfferFormData {
  categoryId: number;
  subcategoryId: number;
  name: string;
  location: string;
  lat?: number;
  lon?: number;
  coordinates?: string;
  description: string;
  offerType: TransactionType;
  /** Cena za sztukę jako string — input pozostaje kontrolowany podczas wpisywania. */
  price?: string;
  /** Waluta ceny (ISO 4217); wysyłana tylko dla ofert sprzedażowych. */
  currency?: string;
  /** Cena przed obniżką jako string — opcjonalna, tylko dla sprzedaży (docs/08 #7). */
  originalPrice?: string;
  pickupTimeFrom: string;
  pickupTimeTo: string;
  expiryDate: Date | null;
  images: File[];
  existingImages?: string[];
  originalImages?: string[]; // Dodane: oryginalne obrazy do porównania
}

interface LocationSuggestion {
  country: string;
  country_code: string;
  state: string;
  county: string | null;
  city: string;
  lon: number;
  lat: number;
  formatted: string;
}

interface OfferFormProps {
  initialData?: Partial<OfferFormData>;
  onSubmit: (data: OfferFormData, isPreview?: boolean) => Promise<void>;
  isEditing?: boolean;
  submitMessage?: { type: "success" | "error"; text: string } | null;
  setSubmitMessage?: (
    message: { type: "success" | "error"; text: string } | null
  ) => void;
}

export function OfferForm({
  initialData,
  onSubmit,
  isEditing = false,
  submitMessage: externalSubmitMessage,
  setSubmitMessage: externalSetSubmitMessage,
}: OfferFormProps) {
  const isMapUpdate = useRef(false);
  const { frame: pageFrame } = usePageFrame();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [userData, setUserData] = useState<{ id: number; userType: string; [key: string]: unknown } | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(
    null
  );
  // Edycja z wczytaną kategorią startuje od razu w szczegółach; „Zmień kategorię” wraca do kroku 1
  const [currentStep, setCurrentStep] = useState<"categories" | "details">(
    isEditing && initialData?.categoryId ? "details" : "categories"
  );
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Stan dla wyszukiwania lokalizacji
  const [locationSuggestions, setLocationSuggestions] = useState<
    LocationSuggestion[]
  >([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationSearching, setLocationSearching] = useState(false);

  // Modal z mapą
  const [isMapModalOpen, setMapModalOpen] = useState(false);
  
  // Stan dla podglądu
  const [showPreview, setShowPreview] = useState(false);

  // Walidacja
  const [errors, setErrors] = useState({
    name: "",
    location: "",
    description: "",
    images: "",
    imageSize: "", // Błąd dla rozmiaru zdjęć
    price: "",
    originalPrice: "",
  });

  const [touched, setTouched] = useState({
    name: false,
    location: false,
    description: false,
  });

  // Komunikaty - używaj zewnętrznych jeśli dostępne, w przeciwnym razie lokalne
  const [localSubmitMessage, setLocalSubmitMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const submitMessage = externalSubmitMessage || localSubmitMessage;
  const setSubmitMessage = externalSetSubmitMessage || setLocalSubmitMessage;

  // Formularz danych
  const [formData, setFormData] = useState<OfferFormData>({
    categoryId: 0,
    subcategoryId: 0,
    name: "",
    location: "",
    description: "",
    offerType: "free",
    price: "",
    currency: "PLN",
    originalPrice: "",
    pickupTimeFrom: "00:00",
    pickupTimeTo: "23:55",
    expiryDate: new Date(),
    images: [],
    existingImages: [],
    originalImages: [], // Dodane: oryginalne obrazy do porównania
    ...initialData,
  });

  // Pobieranie danych użytkownika
  useEffect(() => {
    const user = getUserData();
    if (user && user.id && user.userType) {
      setUserData(user as { id: number; userType: string; [key: string]: unknown });
    }
  }, []);

  // Pobieranie kategorii
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        setError(null);

        console.log(
          "Wysyłam request na:",
          `${environment.apiUrl}/api/categories/all`
        );

        const response = await authorizedFetch(
          `${environment.apiUrl}/api/categories/all`,
          {
            method: "GET",
          }
        );

        console.log("Odpowiedź:", response);
        console.log("Status:", response.status);

        if (response.ok) {
          const data = await response.json();
          setCategories(data);

          // Jeśli mamy dane początkowe, ustaw kategorię i podkategorię
          if (initialData?.categoryId) {
            setSelectedCategory(initialData.categoryId);
            setSelectedSubcategory(initialData.subcategoryId || null);
          } else {
            // Automatyczne uzupełnienie lokalizacji użytkownika tylko dla nowych ofert
            const userData = getUserData();
            if (
              userData &&
              userData.lat !== undefined &&
              userData.lon !== undefined &&
              userData.lat !== 0 &&
              userData.lon !== 0
            ) {
              try {
                const geocodeResponse = await authorizedFetch(
                  `${
                    environment.apiUrl
                  }/api/geocode/reverse?lat=${userData.lat!}&lon=${userData.lon!}`
                );
                if (geocodeResponse.ok) {
                  const geocodeData: LocationSuggestion =
                    await geocodeResponse.json();
                  const userAddress =
                    geocodeData.formatted ||
                    `${userData.lat!.toFixed(6)}, ${userData.lon!.toFixed(6)}`;

                  setFormData((prev) => ({
                    ...prev,
                    location: userAddress,
                    lat: userData.lat,
                    lon: userData.lon,
                    coordinates: `${userData.lon!},${userData.lat!}`,
                  }));
                } else {
                  // Fallback - użyj współrzędnych jako tekst
                  setFormData((prev) => ({
                    ...prev,
                    location: `${userData.lat!.toFixed(
                      6
                    )}, ${userData.lon!.toFixed(6)}`,
                    coordinates: `${userData.lon!},${userData.lat!}`,
                  }));
                }
              } catch (geocodeError) {
                console.error(
                  "Błąd reverse geocoding dla lokalizacji użytkownika:",
                  geocodeError
                );
                // Fallback - użyj współrzędnych jako tekst
                setFormData((prev) => ({
                  ...prev,
                  location: `${userData.lat!.toFixed(
                    6
                  )}, ${userData.lon!.toFixed(6)}`,
                  coordinates: `${userData.lon!},${userData.lat!}`,
                }));
              }
            }
          }
        } else if (response.status === 401) {
          console.log("Brak autoryzacji - przekierowuję na /unauthorized");
          window.location.href = "/unauthorized";
          return;
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Błąd serwera:", errorData);
          setError(errorData.message || `Błąd serwera: ${response.status}`);
        }
      } catch (error) {
        console.error("Błąd połączenia:", error);
        setError("Błąd połączenia z serwerem. Sprawdź połączenie internetowe.");
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, [initialData]);

  // Zaktualizowana funkcja wyszukiwania
  const searchLocation = useCallback(async (query: string) => {
    if (query.length < 3) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }
    try {
      setLocationSearching(true);
      const response = await authorizedFetch(
        `${environment.apiUrl}/api/geocode/search?text=${encodeURIComponent(
          query
        )}`
      );
      if (response.ok) {
        const data: LocationSuggestion[] = await response.json();
        setLocationSuggestions(data);
        setShowLocationSuggestions(data.length > 0);
      } else {
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
      }
    } catch (error) {
      console.error("Błąd połączenia z API lokalizacji:", error);
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
    } finally {
      setLocationSearching(false);
    }
  }, []);

  // Przywracamy debounced search z zabezpieczeniem
  useEffect(() => {
    if (isMapUpdate.current) {
      isMapUpdate.current = false;
      return;
    }
    const timeoutId = setTimeout(() => {
      if (formData.location.length >= 3) {
        searchLocation(formData.location);
      } else {
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [formData.location, searchLocation]);

  // Zaktualizowana funkcja do obsługi wyboru sugestii z listy
  const handleSuggestionSelect = (suggestion: LocationSuggestion) => {
    const locationText = suggestion.formatted;
    const { lon, lat } = suggestion;

    setFormData((prev) => ({
      ...prev,
      location: locationText,
      lat: lat,
      lon: lon,
      coordinates: `${lon},${lat}`,
    }));
    setShowLocationSuggestions(false);
  };

  // Zaktualizowana funkcja, która teraz nazywa się handleMapUpdate
  const handleMapUpdate = (lat: number, lon: number, address?: string) => {
    isMapUpdate.current = true; // Ustawiamy flagę
    const locationText = address || `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    setFormData((prev) => ({
      ...prev,
      location: locationText,
      lat: lat,
      lon: lon,
      coordinates: `${lon},${lat}`,
    }));
    setMapModalOpen(false);
  };

  const handleCategoryChange = (categoryId: number) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory(null);
  };

  const handleSubcategoryChange = (subcategoryId: number) => {
    setSelectedSubcategory(subcategoryId);
  };

  const handleNext = () => {
    if (selectedCategory) {
      const category = categories.find(c => c.id === selectedCategory);
      const hasSubcategories = category && category.subcategories && category.subcategories.length > 0;
      
      // Jeśli kategoria ma podkategorie, wymagaj wyboru podkategorii
      if (hasSubcategories && !selectedSubcategory) {
        return; // Nie przechodź dalej bez wyboru podkategorii
      }
      
      setFormData((prev) => ({
        ...prev,
        categoryId: selectedCategory,
        subcategoryId: selectedSubcategory || 0, // Użyj 0 jeśli brak podkategorii
      }));
      setCurrentStep("details");
    }
  };

  const handleBack = () => {
    setCurrentStep("categories");
  };

  // Funkcja walidacji plików (używana zarówno przez onDrop jak i onChange)
  const validateAndProcessFiles = useCallback((files: File[]) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles: string[] = [];
    const invalidTypeFiles: string[] = [];
    
    const validFiles = files.filter((file) => {
      const isValidSize = file.size <= maxSize;
      const isValidType = file.type.startsWith("image/");
      
      if (!isValidSize) {
        oversizedFiles.push(file.name);
      }
      if (!isValidType) {
        invalidTypeFiles.push(file.name);
      }
      
      return isValidSize && isValidType;
    });

    // Wyczyść poprzednie błędy
    setErrors(prev => ({
      ...prev,
      imageSize: ""
    }));

    // Sprawdź czy są pliki przekraczające rozmiar
    if (oversizedFiles.length > 0) {
      setErrors(prev => ({
        ...prev,
        imageSize: `Pliki przekraczające 5MB: ${oversizedFiles.join(', ')}. Proszę wybrać mniejsze pliki.`
      }));
    }

    // Jeśli są tylko pliki nieprawidłowego typu
    if (oversizedFiles.length === 0 && invalidTypeFiles.length > 0) {
      setErrors(prev => ({
        ...prev,
        imageSize: `Nieprawidłowy typ pliku: ${invalidTypeFiles.join(', ')}. Proszę wybrać tylko zdjęcia.`
      }));
    }

    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...validFiles].slice(0, 5), // Maksymalnie 5 zdjęć
    }));
  }, []);

  // Dropzone dla zdjęć
  const onDrop = useCallback((acceptedFiles: File[]) => {
    validateAndProcessFiles(acceptedFiles);
  }, [validateAndProcessFiles]);


  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    },
    // Usunięto maxSize - walidacja odbywa się w funkcji onDrop
    maxFiles: 5,
  });

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
    
    // Wyczyść błąd rozmiaru jeśli nie ma już zdjęć z błędem
    if (errors.imageSize) {
      setErrors(prev => ({
        ...prev,
        imageSize: ""
      }));
    }
  };

  const removeExistingImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      existingImages: prev.existingImages?.filter((_, i) => i !== index) || [],
    }));
  };

  // Obsługa formularza
  const handleInputChange = <K extends keyof OfferFormData>(
    field: keyof OfferFormData,
    value: OfferFormData[K]
  ) => {
    setFormData((prev) => {
      const newData = {
        ...prev,
        [field]: value,
      };

      // Jeśli zmieniono kategorię lub podkategorię, sprawdź czy aktualny typ transakcji jest dozwolony
      if (field === 'categoryId' || field === 'subcategoryId') {
        const category = categories.find(c => c.id === newData.categoryId);
        const subcategory = category?.subcategories.find(s => s.id === newData.subcategoryId);
        
        if (category && !isTransactionAllowed(category, subcategory || null, newData.offerType)) {
          // Jeśli aktualny typ nie jest dozwolony, ustaw pierwszy dostępny typ
          const allowedTypes = getAllowedTransactionTypes(category, subcategory || null);
          if (allowedTypes.length > 0) {
            newData.offerType = allowedTypes[0];
          }
        }
      }

      // Cena istnieje wyłącznie dla sprzedaży. Czyścimy ją także wtedy, gdy typ zmienił
      // się pośrednio — po zmianie kategorii, która nie dopuszcza sprzedaży. Inaczej
      // zostałaby w stanie i poszłaby na backend, który odrzuci ją jako
      // PRICE_NOT_ALLOWED_FOR_FREE.
      if (newData.offerType !== 'sale') {
        newData.price = "";
        newData.originalPrice = "";
      }

      return newData;
    });

    // Zmiana typu unieważnia błąd ceny
    if (field === 'offerType' || field === 'categoryId' || field === 'subcategoryId') {
      setErrors((prev) => ({ ...prev, price: "", originalPrice: "" }));
    }

    // Walidacja w czasie rzeczywistym dla pól tekstowych
    if (typeof value === "string" && touched[field as keyof typeof touched]) {
      const error = validateField(field, value);
      setErrors((prev) => ({
        ...prev,
        [field]: error,
      }));
    }
  };

  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));

    const value = formData[field as keyof OfferFormData];
    if (typeof value === "string") {
      const error = validateField(field, value);
      setErrors((prev) => ({
        ...prev,
        [field]: error,
      }));
    }
  };

  /**
   * Walidacja ceny po stronie klienta — te same reguły, co w backendzie
   * (OfferService.resolvePricingForCreate). Backend i tak je egzekwuje; tutaj chodzi
   * o to, żeby użytkownik nie wysyłał formularza po to, by dostać odmowę.
   */
  const validatePrice = (): string => {
    if (formData.offerType !== 'sale') {
      return "";
    }
    const raw = (formData.price || "").trim().replace(",", ".");
    if (!raw) {
      return "Podaj cenę";
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) {
      return "Cena musi być większa od zera";
    }
    if (!/^\d+([.]\d{1,2})?$/.test(raw)) {
      return "Cena może mieć najwyżej 2 miejsca po przecinku";
    }
    if (value > 99999999.99) {
      return "Cena jest zbyt wysoka";
    }
    return "";
  };

  /**
   * Cena przed obniżką — opcjonalna. Te same reguły co w backendzie
   * (OfferService: INVALID_ORIGINAL_PRICE / ORIGINAL_PRICE_NOT_HIGHER); backend i tak je egzekwuje.
   */
  const validateOriginalPrice = (): string => {
    if (formData.offerType !== 'sale') {
      return "";
    }
    const raw = (formData.originalPrice || "").trim().replace(",", ".");
    if (!raw) {
      return "";
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0 || !/^\d+([.]\d{1,2})?$/.test(raw)) {
      return "Podaj kwotę, np. 7.99 (maksymalnie 2 miejsca po przecinku)";
    }
    const price = Number((formData.price || "").trim().replace(",", "."));
    if (Number.isFinite(price) && price > 0 && value <= price) {
      return "Cena przed obniżką musi być wyższa od ceny";
    }
    return "";
  };

  const handleSubmit = async (isPreview: boolean = false) => {
    setSubmitMessage(null);

    // Walidacja wszystkich pól
    const newErrors = {
      name: validateField("name", formData.name),
      location: validateField("location", formData.location),
      description: validateField("description", formData.description),
      images: validateImages(),
      imageSize: errors.imageSize, // Zachowaj błąd rozmiaru jeśli istnieje
      price: validatePrice(),
      originalPrice: validateOriginalPrice(),
    };

    // Oznacz wszystkie pola jako touched
    setTouched({
      name: true,
      location: true,
      description: true,
    });

    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some((error) => error !== "");

    if (hasErrors) {
      setSubmitMessage({
        type: "error",
        text: "Proszę poprawić błędy w formularzu",
      });
      return;
    }

    if (isPreview) {
      // Pokaż podgląd
      setShowPreview(true);
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit(formData, false);
    } catch (error) {
      console.error("Błąd podczas zapisywania:", error);
      setSubmitMessage({
        type: "error",
        text:
          error instanceof Error && error.message
            ? `Błąd: ${error.message}`
            : "Błąd połączenia z serwerem. Sprawdź połączenie internetowe.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategoryData = categories.find(
    (cat) => cat.id === selectedCategory
  );

  // Walidacja pól
  const validateField = (name: string, value: string) => {
    switch (name) {
      case "name":
        if (value.trim() === "") return "Nazwa oferty jest wymagana";
        if (value.trim().length < 3)
          return "Nazwa musi mieć co najmniej 3 znaki";
        if (value.trim().length > 100)
          return "Nazwa nie może przekraczać 100 znaków";
        return "";
      case "location":
        if (value.trim() === "") return "Lokalizacja jest wymagana";
        return "";
      case "description":
        if (value.trim() === "") return "Opis jest wymagany";
        if (value.trim().length < 10)
          return "Opis musi mieć co najmniej 10 znaków";
        if (value.trim().length > 2000)
          return "Opis nie może przekraczać 2000 znaków";
        return "";
      default:
        return "";
    }
  };

  const validateImages = () => {
    if (
      formData.images.length === 0 &&
      (!formData.existingImages || formData.existingImages.length === 0)
    ) {
      return "Dodaj przynajmniej jedno zdjęcie";
    }
    return "";
  };

  const handleBackFromPreview = () => {
    setShowPreview(false);
  };

  // Konwertuj dane formularza na format OfferDetails dla podglądu
  const getPreviewOffer = () => {
    const userData = getUserData();
    
    return {
      id: isEditing ? 'preview' : undefined,
      name: formData.name,
      description: formData.description,
      transactionType: formData.offerType,
      price: formData.offerType === 'sale' && formData.price
        ? Number(formData.price.replace(",", "."))
        : undefined,
      currency: formData.offerType === 'sale' ? formData.currency : undefined,
      originalPrice: formData.offerType === 'sale' && formData.originalPrice
        ? Number(formData.originalPrice.replace(",", "."))
        : undefined,
      categoryId: formData.categoryId || undefined,
      expiryDate: formData.expiryDate ? formData.expiryDate.toISOString().split('T')[0] : undefined,
      pickupDateFrom: formData.pickupTimeFrom,
      pickupDateTo: formData.pickupTimeTo,
      location: formData.location,
      latitude: formData.lat,
      longitude: formData.lon,
      imageUrls: formData.existingImages || [],
      sellerId: userData?.id,
      sellerEmail: userData?.email,
      sellerPhoneNumber: userData?.phoneNumber,
      sellerAvatar: userData?.profilePhotoUrl,
      sellerName: userData ? `${userData.firstName} ${userData.lastName}`.trim() : undefined,
      sellerType: userData?.userType === 'REGULAR' || userData?.userType === 'COMPANY' ? userData.userType : 'REGULAR',
    };
  };

  if (categoriesLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-10">
        <Card padding="lg" className="flex w-full max-w-md flex-col items-center gap-3 text-center">
          <Spinner className="h-8 w-8 text-brand" />
          <h2 className="text-lg font-semibold text-ink">Ładowanie kategorii...</h2>
          <p className="text-sm text-ink-muted">Pobieramy dostępne kategorie</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-10">
        <Card padding="lg" className="flex w-full max-w-md flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
            <LuInfo size={24} aria-hidden />
          </span>
          <h2 className="text-lg font-semibold text-ink">Błąd ładowania</h2>
          <p className="text-sm text-ink-muted">{error}</p>
          <Button onClick={() => window.location.reload()}>Spróbuj ponownie</Button>
        </Card>
      </div>
    );
  }

  const title = isEditing ? `Edytuj ofertę — ${formData.name || "Ładowanie..."}` : "Dodaj ofertę";

  // Krok 1: Wybór kategorii
  if (currentStep === "categories") {
    const needsSubcategory = Boolean(selectedCategoryData?.subcategories?.length);
    return (
      <div className={pageFrame}>
        <PageHeader title={title} description="Krok 1 z 2 — wybierz kategorię produktu." />

        <Card padding="lg">
          <CardHeader title="Kategoria" description="Od kategorii zależą dostępne typy oferty." />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categories.map((category) => {
              const Icon = categoryIcon(category.id);
              const selected = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => handleCategoryChange(category.id)}
                  className={cn(
                    "flex min-h-[56px] items-center gap-2.5 rounded-ui-md border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                    selected
                      ? "border-brand/50 bg-brand-soft text-brand-strong"
                      : "border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-muted"
                  )}
                >
                  <Icon size={20} aria-hidden className={cn("shrink-0", selected ? "text-brand" : "text-ink-subtle")} />
                  <span className="min-w-0 leading-tight [overflow-wrap:anywhere]">{category.name}</span>
                </button>
              );
            })}
          </div>

          {/* Wybór podkategorii - tylko jeśli kategoria ma podkategorie */}
          {selectedCategory && needsSubcategory && selectedCategoryData && (
            <div className="mt-6 border-t border-line pt-5">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                Podkategoria
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedCategoryData.subcategories.map((subcategory) => (
                  <Chip
                    key={subcategory.id}
                    selected={selectedSubcategory === subcategory.id}
                    onClick={() => handleSubcategoryChange(subcategory.id)}
                  >
                    {subcategory.name}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end border-t border-line pt-4">
            <Button
              size="lg"
              onClick={handleNext}
              disabled={!selectedCategory || (needsSubcategory && !selectedSubcategory)}
              className="w-full sm:w-auto sm:min-w-[160px]"
            >
              Dalej
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const currentCategory = categories.find(c => c.id === formData.categoryId) || categories[0];
  const currentSubcategory = categories.find(c => c.id === formData.categoryId)?.subcategories.find(s => s.id === formData.subcategoryId) || null;
  const allowedTypes = getAllowedTransactionTypes(currentCategory, currentSubcategory);
  const transactionTypeMessage = getTransactionTypeMessage(currentCategory, currentSubcategory, userData?.userType);
  const productRestrictions = getProductRestrictions(currentCategory);

  // Krok 2: Szczegóły oferty
  return (
    <div className={pageFrame}>
      <PageHeader
        title={title}
        description="Krok 2 z 2 — opisz ofertę i ustal warunki odbioru."
        actions={
          <Button variant="ghost" size="sm" leftIcon={<LuArrowLeft size={16} />} onClick={handleBack}>
            Zmień kategorię
          </Button>
        }
      />

      {/* Informacja o pozostałych ofertach */}
      {!isEditing && userData && typeof userData.freeOffersCount === 'number' && (
        <div className="mb-4 flex items-start gap-3 rounded-ui-md border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-900">
          <LuInfo size={18} aria-hidden className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Pozostało Ci {userData.freeOffersCount || 0} darmowych ofert w tym miesiącu</p>
            {userData.freeOffersCount === 0 && (
              <p className="mt-0.5">Nie możesz utworzyć więcej darmowych ofert. Spróbuj ponownie w następnym miesiącu.</p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Zdjęcia */}
        <Card padding="lg">
          <CardHeader title="Zdjęcia" description="Maksymalnie 5 zdjęć, każde do 5 MB." />

          {(() => {
            const existing = isEditing ? formData.existingImages || [] : [];
            const thumbClass = "relative aspect-square overflow-hidden rounded-ui-md border border-line bg-surface-sunken";
            const removeClass = "h-7 w-7 bg-surface/90 shadow-card hover:bg-danger hover:text-white";
            return (existing.length > 0 || formData.images.length > 0) ? (
              <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3">
                {/* Istniejące zdjęcia (dla edycji) */}
                {existing.map((imageUrl, index) => (
                  <div key={`existing-${index}`} className={thumbClass}>
                    <Image src={getImageUrl(imageUrl)} alt={`Istniejące zdjęcie ${index + 1}`} fill sizes="160px" className="object-cover" />
                    <div className="absolute right-1 top-1"><IconButton label="Usuń zdjęcie" icon={<LuX size={14} />} onClick={() => removeExistingImage(index)} className={removeClass} /></div>
                  </div>
                ))}
                {/* Podgląd wybranych zdjęć */}
                {formData.images.map((file, index) => (
                  <div key={`new-${index}`} className={thumbClass}>
                    <Image src={URL.createObjectURL(file)} alt={`Zdjęcie ${index + 1}`} fill sizes="160px" className="object-cover" />
                    <div className="absolute right-1 top-1"><IconButton label="Usuń zdjęcie" icon={<LuX size={14} />} onClick={() => removeImage(index)} className={removeClass} /></div>
                    <span className="absolute bottom-1 left-1 rounded-full bg-neutral-900/70 px-1.5 py-px text-[10px] font-medium text-white">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                ))}
              </div>
            ) : null;
          })()}

          <div
            {...getRootProps()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-ui-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
              isDragActive ? "border-brand bg-brand-soft" : "border-line-strong bg-surface-muted hover:border-brand/60 hover:bg-brand-soft/50"
            )}
          >
            <input {...getInputProps()} />
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-brand shadow-card">
              {isDragActive ? <LuImagePlus size={22} aria-hidden /> : <LuCamera size={22} aria-hidden />}
            </span>
            <p className="text-sm font-medium text-ink">
              {isDragActive ? "Upuść pliki tutaj..." : "Przeciągnij i upuść zdjęcia lub kliknij, aby wybrać"}
            </p>
            <p className="text-xs text-ink-muted">JPG, PNG, GIF lub WEBP</p>
          </div>

          {/* Błąd dla zdjęć */}
          {errors.images && <p className="mt-2 text-xs text-danger">{errors.images}</p>}

          {/* Błąd dla rozmiaru zdjęć */}
          {errors.imageSize && (
            <div role="alert" className="mt-3 rounded-ui-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
              <p className="font-medium">Błąd walidacji plików</p>
              <p className="mt-0.5">{errors.imageSize}</p>
            </div>
          )}
        </Card>

        {/* Podstawowe informacje */}
        <Card padding="lg">
          <CardHeader title="Opis oferty" />
          <div className="flex flex-col gap-4">
            <Input
              label="Nazwa *"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              placeholder="Np. Chleb żytni na zakwasie"
              error={errors.name || undefined}
            />

            <div className="relative">
              <Input
                label="Lokalizacja *"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                placeholder="Wprowadź lokalizację lub wybierz na mapie"
                error={errors.location || undefined}
                rightSlot={
                  <IconButton
                    label="Wybierz lokalizację na mapie"
                    icon={<LuCrosshair size={18} />}
                    onClick={() => setMapModalOpen(true)}
                    className="h-8 w-8 hover:text-brand"
                  />
                }
              />
              {/* Lista sugestii */}
              {showLocationSuggestions && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-ui-md border border-line bg-surface shadow-pop">
                  {locationSearching ? (
                    <div className="p-3 text-center text-sm text-ink-muted">Wyszukiwanie...</div>
                  ) : (
                    locationSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSuggestionSelect(suggestion)}
                        className="w-full border-b border-line px-3 py-2.5 text-left text-sm text-ink transition-colors last:border-b-0 hover:bg-surface-muted"
                      >
                        {suggestion.formatted}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <Textarea
              label="Opis *"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              onBlur={() => handleBlur("description")}
              placeholder="Opisz produkt: skład, stan, ile sztuk w paczce…"
              rows={6}
              error={errors.description || undefined}
              hint="Możesz używać podstawowego formatowania tekstu. Dla lepszego formatowania (pogrubienie, kursywa, listy) zalecamy skopiowanie tekstu z edytora tekstu."
            />
          </div>
        </Card>

        {/* Typ i cena */}
        <Card padding="lg">
          <CardHeader title="Typ oferty i cena" />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Typ oferty">
            {allowedTypes.map(type => (
              <Chip
                key={type}
                selected={formData.offerType === type}
                onClick={() => handleInputChange("offerType", type)}
              >
                {type === 'free' ? 'Za darmo' : type === 'exchange' ? 'Wymiana' : 'Sprzedaż'}
              </Chip>
            ))}
          </div>

          {transactionTypeMessage && (
            <div className="mt-3 rounded-ui-md border border-warning/30 bg-warning-soft px-3 py-2.5 text-sm text-warning">
              {transactionTypeMessage}
            </div>
          )}

          {/* Informacje o ograniczeniach produktów */}
          {productRestrictions && (
            <div className="mt-3 flex items-start gap-2.5 rounded-ui-md border border-accent-200 bg-accent-50 px-3 py-2.5 text-sm text-accent-900">
              <LuInfo size={16} aria-hidden className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Ograniczenia produktów</p>
                <p className="mt-0.5">{productRestrictions}</p>
              </div>
            </div>
          )}

          {/* Cena — tylko dla ofert sprzedażowych. Dla „za darmo" i „wymiany" backend
              odrzuca cenę (PRICE_NOT_ALLOWED_FOR_FREE), więc blok nie tylko się ukrywa,
              ale wartość jest też czyszczona w handleInputChange. */}
          {formData.offerType === 'sale' && (
            <div className="mt-5 grid grid-cols-1 gap-4 border-t border-line pt-5 sm:grid-cols-[1fr_1fr_120px]">
              <Input
                id="offer-price"
                label="Cena za sztukę *"
                inputMode="decimal"
                value={formData.price || ""}
                onChange={(e) => handleInputChange("price", e.target.value)}
                onBlur={() => setErrors((prev) => ({ ...prev, price: validatePrice(), originalPrice: validateOriginalPrice() }))}
                placeholder="np. 4.99"
                error={errors.price || undefined}
                hint="Maksymalnie 2 miejsca po przecinku."
              />
              <Input
                id="offer-original-price"
                label="Cena przed obniżką"
                inputMode="decimal"
                value={formData.originalPrice || ""}
                onChange={(e) => handleInputChange("originalPrice", e.target.value)}
                onBlur={() => setErrors((prev) => ({ ...prev, originalPrice: validateOriginalPrice() }))}
                placeholder="np. 7.99"
                error={errors.originalPrice || undefined}
                hint="Opcjonalnie — klient zobaczy przekreśloną cenę i % rabatu."
              />
              <Select
                id="offer-currency"
                label="Waluta"
                value={formData.currency || "PLN"}
                onChange={(e) => handleInputChange("currency", e.target.value)}
              >
                <option value="PLN">PLN</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </Select>
            </div>
          )}
        </Card>

        {/* Termin i odbiór */}
        <Card padding="lg">
          <CardHeader title="Termin i odbiór" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              id="offer-expiry"
              type="date"
              label="Termin ważności *"
              value={
                formData.expiryDate && !isNaN(formData.expiryDate.getTime())
                  ? formData.expiryDate.toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) => {
                try {
                  const value = e.target.value ? new Date(e.target.value) : null;
                  handleInputChange("expiryDate", value);
                } catch {
                  handleInputChange("expiryDate", null);
                }
              }}
              min={new Date().toISOString().split("T")[0]}
              className="cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
              rightSlot={
                <IconButton
                  label="Wybierz datę"
                  icon={<LuCalendar size={18} />}
                  onClick={() => (document.getElementById("offer-expiry") as HTMLInputElement | null)?.showPicker()}
                  className="h-8 w-8 hover:text-brand"
                />
              }
            />
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink">Odbiór od</span>
              <TimePicker value={formData.pickupTimeFrom} onChange={(time) => handleInputChange("pickupTimeFrom", time)} label="Odbiór od" />
            </div>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink">Odbiór do</span>
              <TimePicker value={formData.pickupTimeTo} onChange={(time) => handleInputChange("pickupTimeTo", time)} label="Odbiór do" />
            </div>
          </div>
        </Card>

        {/* Komunikat o wyniku wysyłania */}
        {submitMessage && (
          <div
            role={submitMessage.type === "error" ? "alert" : "status"}
            className={cn(
              "rounded-ui-md border px-4 py-3 text-center text-sm",
              submitMessage.type === "success"
                ? "border-brand/30 bg-brand-soft text-brand-strong"
                : "border-danger/30 bg-danger-soft text-danger"
            )}
          >
            {submitMessage.text}
          </div>
        )}

        {/* Przyciski */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" size="lg" onClick={() => handleSubmit(true)} disabled={submitting} className="sm:min-w-[140px]">
            Podgląd
          </Button>
          <Button size="lg" onClick={() => handleSubmit(false)} loading={submitting} className="sm:min-w-[180px]">
            {submitting ? "Wysyłanie..." : isEditing ? "Zapisz zmiany" : "Wystaw ofertę"}
          </Button>
        </div>
      </div>

      {isMapModalOpen && (
        <LocationMapModal
          initialLat={formData.lat}
          initialLon={formData.lon}
          onLocationSelect={handleMapUpdate}
          onClose={() => setMapModalOpen(false)}
        />
      )}

      {/* Podgląd oferty */}
      {showPreview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-surface-muted">
          <OfferDetailsView
            offer={getPreviewOffer()}
            isPreview={true}
            onBackToEdit={handleBackFromPreview}
            previewImageUrls={[
              ...(formData.existingImages || []).map(imageUrl => getImageUrl(imageUrl)),
              ...formData.images.map((_, index) => URL.createObjectURL(formData.images[index]))
            ]}
          />
        </div>
      )}
    </div>
  );
}
