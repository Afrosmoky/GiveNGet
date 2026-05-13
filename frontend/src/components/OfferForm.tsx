"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
// import { format } from 'date-fns';
import { FaLocationCrosshairs, FaCalendarDays } from "react-icons/fa6";

import LocationMapModal from "./LocationMapModal";
import Image from "next/image";
import { environment } from "../config";
import { authorizedFetch, getUserData } from "../utils/auth";
import { getImageUrl } from "../utils/imageUtils";
import { TimePicker } from "./TimePicker";
import OfferDetailsView from "./OfferDetailsView";
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
  const [isMobile, setIsMobile] = useState(false);

  // Sprawdź czy jesteśmy na urządzeniu mobilnym
  useEffect(() => {
    const updateIsMobile = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 640);
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [userData, setUserData] = useState<{ id: number; userType: string; [key: string]: unknown } | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(
    null
  );
  const [currentStep, setCurrentStep] = useState<"categories" | "details">(
    "categories"
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

      return newData;
    });

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

  const handleSubmit = async (isPreview: boolean = false) => {
    setSubmitMessage(null);

    // Walidacja wszystkich pól
    const newErrors = {
      name: validateField("name", formData.name),
      location: validateField("location", formData.location),
      description: validateField("description", formData.description),
      images: validateImages(),
      imageSize: errors.imageSize, // Zachowaj błąd rozmiaru jeśli istnieje
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
        if (value.trim() === "") return "Nazwa ogłoszenia jest wymagana";
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

  const handleLocationIconMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const icon = e.currentTarget;
    icon.classList.add("location-icon-hover");
  };

  const handleLocationIconMouseLeave = (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    const icon = e.currentTarget;
    icon.classList.remove("location-icon-hover");
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
      <div
        style={{
          minHeight: "calc(100vh - 160px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f7fafc",
          padding: "20px",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            padding: "40px",
            textAlign: "center",
            maxWidth: "500px",
            width: "100%",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              border: "4px solid #e2e8f0",
              borderTop: "4px solid #fbbf24",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 20px",
            }}
          />
          <h2
            style={{
              fontSize: "24px",
              color: "#2d3748",
              marginBottom: "8px",
            }}
          >
            Ładowanie kategorii...
          </h2>
          <p
            style={{
              color: "#4a5568",
              fontSize: "16px",
            }}
          >
            Pobieramy dostępne kategorie
          </p>
        </div>

        <style jsx>{`
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 160px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f7fafc",
          padding: "20px",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            padding: "40px",
            textAlign: "center",
            maxWidth: "500px",
            width: "100%",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              backgroundColor: "#f87171",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2
            style={{
              fontSize: "24px",
              color: "#dc2626",
              marginBottom: "16px",
            }}
          >
            Błąd ładowania
          </h2>
          <p
            style={{
              color: "#4a5568",
              fontSize: "16px",
              marginBottom: "30px",
              lineHeight: "1.5",
            }}
          >
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 24px",
              backgroundColor: "#fbbf24",
              color: "#1a202c",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "background-color 0.3s",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "#f59e0b")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "#fbbf24")
            }
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  // Krok 1: Wybór kategorii
  if (currentStep === "categories") {
    return (
      <div className="min-h-[calc(100vh-160px)] bg-gray-50 p-2 sm:p-5">
        <div className="max-w-4xl mx-auto w-full">
          <h1 className="text-2xl sm:text-3xl md:text-4xl text-gray-800 mb-6 sm:mb-10 text-center">
            {isEditing
              ? `Edytuj ogłoszenie - ${formData.name || "Ładowanie..."}`
              : "Dodaj ogłoszenie"}
          </h1>

          <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6 md:p-10">
            {/* Wybór kategorii */}
            <div className="mb-6 sm:mb-10">
              <h2 className="text-xl sm:text-2xl md:text-3xl text-gray-800 mb-4 sm:mb-6 text-center">
                Wybierz kategorię
              </h2>

              <select
                value={selectedCategory || ""}
                onChange={(e) => handleCategoryChange(Number(e.target.value))}
                className="w-full p-3 sm:p-4 text-base sm:text-lg border-2 border-gray-200 rounded-xl bg-white text-gray-800 cursor-pointer transition-colors focus:border-yellow-400"
              >
                <option value="">-- Wybierz kategorię --</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Wybór podkategorii - tylko jeśli kategoria ma podkategorie */}
            {selectedCategory && selectedCategoryData && selectedCategoryData.subcategories && selectedCategoryData.subcategories.length > 0 && (
              <div className="mb-6 sm:mb-10">
                <h2 className="text-xl sm:text-2xl md:text-3xl text-gray-800 mb-4 sm:mb-6 text-center">
                  Wybierz podkategorię
                </h2>

                <select
                  value={selectedSubcategory || ""}
                  onChange={(e) =>
                    handleSubcategoryChange(Number(e.target.value))
                  }
                  className="w-full p-3 sm:p-4 text-base sm:text-lg border-2 border-gray-200 rounded-xl bg-white text-gray-800 cursor-pointer transition-colors focus:border-yellow-400"
                >
                  <option value="">-- Wybierz podkategorię --</option>
                  {selectedCategoryData.subcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Przycisk Dalej */}
            {selectedCategory && (
              <div className="text-center">
                <button
                  onClick={handleNext}
                  className="px-6 sm:px-8 py-3 sm:py-4 bg-yellow-400 text-gray-900 border-none rounded-xl text-base sm:text-lg font-bold cursor-pointer transition-all duration-300 ease-in-out shadow-md hover:bg-yellow-500 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  Dalej
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Krok 2: Szczegóły ogłoszenia
  return (
    <div className="min-h-[calc(100vh-160px)] bg-gray-50 p-2 sm:p-5">
      <div className="max-w-5xl mx-auto w-full">
        <h1 className="text-2xl sm:text-3xl md:text-4xl text-gray-800 mb-6 sm:mb-10 text-center">
          {isEditing
            ? `Edytuj ogłoszenie - ${formData.name || "Ładowanie..."}`
            : "Szczegóły ogłoszenia"}
        </h1>

        {/* Informacja o pozostałych ofertach */}
        {!isEditing && userData && typeof userData.freeOffersCount === 'number' && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <p className="text-blue-800 font-medium">
                  Pozostało Ci {userData.freeOffersCount || 0} darmowych ofert w tym miesiącu
                </p>
                {userData.freeOffersCount === 0 && (
                  <p className="text-blue-600 text-sm mt-1">
                    Nie możesz utworzyć więcej darmowych ofert. Spróbuj ponownie w następnym miesiącu.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6 md:p-10">
          {/* Przycisk powrotu */}
          <div className="mb-6 sm:mb-8">
            <button
              onClick={handleBack}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 text-gray-600 border-none rounded-lg text-sm sm:text-base cursor-pointer transition-colors hover:bg-gray-300"
            >
              ← Powrót do kategorii
            </button>
          </div>

          {/* Drag & Drop dla zdjęć */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl text-gray-800 mb-4 sm:mb-6">
              Zdjęcia (maksymalnie 5, max 5MB każde)
            </h3>

            {/* Istniejące zdjęcia (dla edycji) */}
            {isEditing &&
              formData.existingImages &&
              formData.existingImages.length > 0 && (
                <div className="mb-4 sm:mb-6">
                  <h4 className="text-base sm:text-lg text-gray-700 mb-3 sm:mb-4">
                    Istniejące zdjęcia:
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                    {formData.existingImages.map((imageUrl, index) => (
                      <div
                        key={index}
                        className="relative border border-gray-200 rounded-lg overflow-hidden"
                      >
                        <Image
                          src={getImageUrl(imageUrl)}
                          alt={`Istniejące zdjęcie ${index + 1}`}
                          width={500}
                          height={120}
                          className="w-full h-24 sm:h-32 object-cover"
                        />
                        <button
                          onClick={() => removeExistingImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white border-none rounded-full w-6 h-6 text-xs cursor-pointer flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            <div
              {...getRootProps()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 sm:p-10 text-center bg-white cursor-pointer transition-all duration-300 ease-in-out hover:border-yellow-400"
              style={{ backgroundColor: isDragActive ? "#f7fafc" : "white" }}
            >
              <input {...getInputProps()} />
              <div className="text-4xl sm:text-5xl text-gray-300 mb-4 sm:mb-6">
                📷
              </div>
              <p className="text-base sm:text-lg text-gray-600 mb-2 sm:mb-4">
                {isDragActive
                  ? "Upuść pliki tutaj..."
                  : "Przeciągnij i upuść zdjęcia lub kliknij, aby wybrać"}
              </p>
              <p className="text-sm sm:text-base text-gray-500">
                Maksymalnie 5 zdjęć, każde do 5MB
              </p>
            </div>

            {/* Podgląd wybranych zdjęć */}
            {formData.images.length > 0 && (
              <div className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {formData.images.map((file, index) => (
                  <div
                    key={index}
                    className="relative border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <Image
                      src={URL.createObjectURL(file)}
                      alt={`Zdjęcie ${index + 1}`}
                      width={500}
                      height={120}
                      className="w-full h-24 sm:h-32 object-cover"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white border-none rounded-full w-6 h-6 text-xs cursor-pointer flex items-center justify-center"
                    >
                      ×
                    </button>
                    <div className="p-2 text-xs text-gray-600 text-center">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Błąd dla zdjęć */}
            {errors.images && (
              <div className="text-red-500 text-xs sm:text-sm mt-2">
                {errors.images}
              </div>
            )}
            
            {/* Błąd dla rozmiaru zdjęć */}
            {errors.imageSize && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Błąd walidacji plików
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      {errors.imageSize}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Nazwa i Lokalizacja */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div>
              <label className="block text-base sm:text-lg text-gray-800 mb-2 sm:mb-3 font-bold">
                Nazwa *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                onBlur={() => handleBlur("name")}
                placeholder="Wprowadź nazwę ogłoszenia"
                className={`w-full p-3 sm:p-4 text-base sm:text-lg border-2 rounded-lg transition-colors focus:border-yellow-400 focus:ring-5 focus:ring-yellow-300 focus:outline-none ${
                  errors.name ? "border-red-500" : "border-gray-200"
                }`}
              />
              {errors.name && (
                <div className="text-red-500 text-xs sm:text-sm mt-1">
                  {errors.name}
                </div>
              )}
            </div>

            <div>
              <label className="block text-base sm:text-lg text-gray-800 mb-2 sm:mb-3 font-bold">
                Lokalizacja *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    handleInputChange("location", e.target.value)
                  }
                  placeholder="Wprowadź lokalizację lub kliknij ikonę GPS"
                  className="w-full p-3 sm:p-4 pr-12 sm:pr-14 text-base sm:text-lg border-2 border-gray-200 rounded-lg transition-colors focus:border-yellow-400 focus:ring-5 focus:ring-yellow-300 focus:outline-none"
                />
                <div
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500 transition-all duration-200 hover:text-yellow-400 hover:scale-110 z-10"
                  onClick={() => setMapModalOpen(true)}
                  onMouseMove={handleLocationIconMouseMove}
                  onMouseLeave={handleLocationIconMouseLeave}
                  title="Wybierz lokalizację na mapie"
                >
                  <FaLocationCrosshairs size={20} />
                </div>
                {/* Lista sugestii */}
                {showLocationSuggestions && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {locationSearching ? (
                      <div className="p-3 text-center text-gray-500">
                        Wyszukiwanie...
                      </div>
                    ) : (
                      locationSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionSelect(suggestion)}
                          className="w-full p-3 border-none bg-transparent text-left text-sm sm:text-base text-gray-800 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                        >
                          {suggestion.formatted}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Opis */}
          <div className="mb-6 sm:mb-8">
            <label className="block text-base sm:text-lg text-gray-800 mb-2 sm:mb-3 font-bold">
              Opis *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              onBlur={() => handleBlur("description")}
              placeholder="Opisz szczegółowo swoje ogłoszenie..."
              className={`w-full min-h-48 p-4 text-base sm:text-lg border-2 rounded-lg resize-vertical font-inherit leading-relaxed transition-colors focus:border-yellow-400 focus:ring-5 focus:ring-yellow-300 focus:outline-none ${
                errors.description ? "border-red-500" : "border-gray-200"
              }`}
            />
            {errors.description && (
              <div className="text-red-500 text-xs sm:text-sm mt-1">
                {errors.description}
              </div>
            )}
            <div className="mt-2 text-sm sm:text-base text-gray-500">
              Możesz używać podstawowego formatowania tekstu. Dla lepszego
              formatowania (pogrubienie, kursywa, listy) zalecamy skopiowanie
              tekstu z edytora tekstu.
            </div>
          </div>

          {/* Typ oferty i termin ważności */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div>
              <label className="block text-base sm:text-lg text-gray-800 mb-2 sm:mb-3 font-bold">
                Typ oferty
              </label>
              <select
                value={formData.offerType}
                onChange={(e) => handleInputChange("offerType", e.target.value)}
                className="w-full p-3 sm:p-4 text-base sm:text-lg border-2 border-gray-200 rounded-lg bg-white cursor-pointer transition-colors focus:border-yellow-400"
              >
                {getAllowedTransactionTypes(
                  categories.find(c => c.id === formData.categoryId) || categories[0],
                  categories.find(c => c.id === formData.categoryId)?.subcategories.find(s => s.id === formData.subcategoryId) || null
                ).map(type => (
                  <option key={type} value={type}>
                    {type === 'free' ? 'Za darmo' : type === 'exchange' ? 'Wymiana' : 'Sprzedaż'}
                  </option>
                ))}
              </select>
              {getTransactionTypeMessage(
                categories.find(c => c.id === formData.categoryId) || categories[0],
                categories.find(c => c.id === formData.categoryId)?.subcategories.find(s => s.id === formData.subcategoryId) || null,
                userData?.userType
              ) && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  {getTransactionTypeMessage(
                    categories.find(c => c.id === formData.categoryId) || categories[0],
                    categories.find(c => c.id === formData.categoryId)?.subcategories.find(s => s.id === formData.subcategoryId) || null,
                    userData?.userType
                  )}
                </div>
              )}
              
              {/* Informacje o ograniczeniach produktów */}
              {getProductRestrictions(
                categories.find(c => c.id === formData.categoryId) || categories[0]
              ) && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">Ograniczenia produktów</p>
                      <p className="mt-1">
                        {getProductRestrictions(
                          categories.find(c => c.id === formData.categoryId) || categories[0]
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-base sm:text-lg text-gray-800 mb-2 sm:mb-3 font-bold">
                Termin ważności *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={
                    formData.expiryDate && !isNaN(formData.expiryDate.getTime())
                      ? formData.expiryDate.toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) => {
                    try {
                      const value = e.target.value
                        ? new Date(e.target.value)
                        : null;
                      handleInputChange("expiryDate", value);
                    } catch {
                      handleInputChange("expiryDate", null);
                    }
                  }}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full p-3 sm:p-4 pr-12 sm:pr-14 text-base sm:text-lg border-2 border-gray-200 rounded-lg transition-colors focus:border-yellow-400 focus:ring-5 focus:ring-yellow-300 focus:outline-none cursor-pointer"
                />
                <div
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500 transition-all duration-200 hover:text-yellow-400 hover:scale-110 z-10"
                  onClick={() => {
                    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
                    if (dateInput) {
                      dateInput.showPicker();
                    }
                  }}
                  title="Wybierz datę"
                >
                  <FaCalendarDays size={20} />
                </div>
              </div>
            </div>
          </div>

          {/* Godziny odbioru */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div>
              <label className="block text-base sm:text-lg text-gray-800 mb-2 sm:mb-3 font-bold">
                Godziny odbioru - Od
              </label>
              <TimePicker
                value={formData.pickupTimeFrom}
                onChange={(time) => handleInputChange("pickupTimeFrom", time)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-base sm:text-lg text-gray-800 mb-2 sm:mb-3 font-bold">
                Godziny odbioru - Do
              </label>
              <TimePicker
                value={formData.pickupTimeTo}
                onChange={(time) => handleInputChange("pickupTimeTo", time)}
                className="w-full"
              />
            </div>
          </div>

          {/* Komunikat o wyniku wysyłania */}
          {submitMessage && (
            <div
              className={`p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 text-center border ${
                submitMessage.type === "success"
                  ? "bg-green-50 border-green-300 text-gray-800"
                  : "bg-red-50 border-red-300 text-red-600"
              }`}
            >
              {submitMessage.text}
            </div>
          )}

          {/* Przyciski */}
          <div className={`flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center mt-8 sm:mt-10 ${isMobile ? 'mb-32' : ''}`}>
            <button
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gray-200 text-gray-600 border-none rounded-xl text-base sm:text-lg font-bold cursor-pointer transition-all duration-300 ease-in-out opacity-100 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-gray-300 hover:-translate-y-0.5"
            >
              Podgląd
            </button>

            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-yellow-400 text-gray-900 border-none rounded-xl text-base sm:text-lg font-bold cursor-pointer transition-all duration-300 ease-in-out shadow-md opacity-100 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-yellow-500 hover:-translate-y-0.5 hover:shadow-lg"
            >
              {submitting
                ? "Wysyłanie..."
                : isEditing
                ? "Zapisz zmiany"
                : "Wystaw ogłoszenie"}
            </button>
          </div>
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
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
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

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .location-icon.location-icon-hover {
          color: #fbbf24 !important;
          transform: translateY(-50%) scale(1.1) !important;
        }

        /* Ukryj natywną ikonę kalendarza */
        input[type="date"]::-webkit-calendar-picker-indicator {
          display: none;
        }
        
        input[type="date"]::-webkit-inner-spin-button,
        input[type="date"]::-webkit-outer-spin-button {
          display: none;
        }
        
        input[type="date"]::-webkit-clear-button {
          display: none;
        }
      `}</style>
    </div>
  );
}
