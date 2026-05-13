"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { environment } from "../../config";
import { authorizedFetch } from "../../utils/auth";
import OfferTileSection from "../../components/OfferTileSection";
import { OfferTileProps, ApiOffer, OfferStatus, STATUS_LABELS } from "../../types/offer";
import { AuthGuard } from "../../components/AuthGuard";
import { FaListUl, FaTableCells, FaHeart, FaEye } from "react-icons/fa6";
import Link from "next/link";
import Image from "next/image";
import { getImageUrl } from "../../utils/imageUtils";

import { Category } from '../../types/offer';

function FavoritesPageContent() {
  const [offers, setOffers] = useState<OfferTileProps[]>([]);
  const [watchedOffers, setWatchedOffers] = useState<OfferTileProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchedLoading, setWatchedLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"tiles" | "list">("tiles");
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<"favorites" | "watched">("favorites");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<number[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [savingCategories, setSavingCategories] = useState(false);
  const [categoryFilters, setCategoryFilters] = useState<{
    categoryIds: number[];
    subcategoryIds: number[];
  }>({
    categoryIds: [],
    subcategoryIds: []
  });
  const [availableCategoriesFromOffers, setAvailableCategoriesFromOffers] = useState<{
    categoryIds: number[];
    subcategoryIds: number[];
  }>({
    categoryIds: [],
    subcategoryIds: []
  });
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const fetchingRef = useRef(false);
  const fetchingCategoriesRef = useRef(false);

  // Sprawdź czy jesteśmy na urządzeniu mobilnym
  useEffect(() => {
    const updateIsMobile = () =>
      setIsMobile(typeof window !== "undefined" && window.innerWidth <= 640);
    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  // Automatycznie ustaw widok na listę na urządzeniach mobilnych
  useEffect(() => {
    if (isMobile && view === "tiles") {
      setView("list");
    }
  }, [isMobile, view]);

  // Pobieranie kategorii
  useEffect(() => {
    const fetchCategories = async () => {
      if (fetchingCategoriesRef.current) return;
      
      fetchingCategoriesRef.current = true;
      try {
        const response = await authorizedFetch(`${environment.apiUrl}/api/categories/all`, {
          method: 'GET'
        });
        
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        } else {
          console.error('Błąd pobierania kategorii:', response.status);
        }
      } catch (error) {
        console.error('Błąd połączenia podczas pobierania kategorii:', error);
      } finally {
        fetchingCategoriesRef.current = false;
      }
    };

    fetchCategories();
  }, []);

  const fetchFavoriteCategories = useCallback(async () => {
    try {
      const response = await authorizedFetch(`${environment.apiUrl}/api/favorite-categories`, {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Pobrane obserwowane kategorie:', data);
        
        // Sprawdź czy ulubione kategorie zostały zresetowane (nowa struktura)
        if (data.categories && data.categories.length === 0 && data.subcategories && data.subcategories.length === 0) {
          console.log('Ulubione kategorie zostały zresetowane - użytkownik musi ponownie wybrać');
          setSelectedCategories([]);
          setSelectedSubcategories([]);
          return;
        }
        
        // Ustaw zaznaczone podkategorie
        const subcategoryIds = data.subcategories?.map((sub: { id: number }) => sub.id) || [];
        setSelectedSubcategories(subcategoryIds);
        
        // Znajdź kategorie nadrzędne dla zaznaczonych podkategorii
        const parentCategoryIds = new Set<number>();
        subcategoryIds.forEach((subcategoryId: number) => {
          const category = categories.find(c => 
            c.subcategories.some(s => s.id === subcategoryId)
          );
          if (category) {
            parentCategoryIds.add(category.id);
          }
        });
        
        // Połącz kategorie z backendu z kategoriami nadrzędnymi podkategorii
        const allCategoryIds = [
          ...(data.categories?.map((cat: { id: number }) => cat.id) || []),
          ...Array.from(parentCategoryIds)
        ];
        const uniqueCategoryIds = Array.from(new Set(allCategoryIds));
        
        setSelectedCategories(uniqueCategoryIds);
      } else {
        console.error('Błąd pobierania obserwowanych kategorii:', response.status);
        // Jeśli nie ma obserwowanych kategorii, wyczyść zaznaczenia
        setSelectedCategories([]);
        setSelectedSubcategories([]);
      }
    } catch (error) {
      console.error('Błąd połączenia podczas pobierania obserwowanych kategorii:', error);
      // W przypadku błędu, wyczyść zaznaczenia
      setSelectedCategories([]);
      setSelectedSubcategories([]);
    }
  }, [categories]);

  // Pobierz obserwowane kategorie gdy kategorie są już załadowane i użytkownik jest na zakładce "watched"
  useEffect(() => {
    if (categories.length > 0 && activeTab === "watched") {
      fetchFavoriteCategories();
    }
  }, [categories, activeTab, fetchFavoriteCategories]);

  // Funkcja do uzyskiwania kolorów dla statusu
  const getStatusColors = (status?: OfferStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800';
      case 'PENDING_VERIFICATION':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Funkcje do zarządzania obserwowanymi kategoriami
  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        // Odznacz kategorię i wszystkie jej podkategorie
        const category = categories.find(c => c.id === categoryId);
        const subcategoryIds = category?.subcategories.map(s => s.id) || [];
        setSelectedSubcategories(prevSub => 
          prevSub.filter(id => !subcategoryIds.includes(id))
        );
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleSubcategoryToggle = (subcategoryId: number) => {
    setSelectedSubcategories(prev => {
      if (prev.includes(subcategoryId)) {
        return prev.filter(id => id !== subcategoryId);
      } else {
        // Znajdź kategorię dla tej podkategorii i zaznacz ją
        const category = categories.find(c => 
          c.subcategories.some(s => s.id === subcategoryId)
        );
        if (category && !selectedCategories.includes(category.id)) {
          setSelectedCategories(prev => [...prev, category.id]);
        }
        return [...prev, subcategoryId];
      }
    });
  };

  const saveWatchedCategories = async () => {
    setSavingCategories(true);
    try {
      // Przygotuj dane do wysłania
      const requestBody: {
        categoryIds?: number[];
        subcategories?: { categoryId: number; subcategoryId: number }[];
      } = {};

      // Znajdź kategorie, które mają zaznaczone podkategorie
      const categoriesWithSubcategories = new Set<number>();
      const subcategoriesData: { categoryId: number; subcategoryId: number }[] = [];

      if (selectedSubcategories.length > 0) {
        selectedSubcategories.forEach(subcategoryId => {
          const category = categories.find(c => 
            c.subcategories.some(s => s.id === subcategoryId)
          );
          if (category) {
            categoriesWithSubcategories.add(category.id);
            subcategoriesData.push({
              categoryId: category.id,
              subcategoryId: subcategoryId
            });
          }
        });
      }

      // Dodaj tylko te kategorie, które nie mają zaznaczonych podkategorii
      const categoriesWithoutSubcategories = selectedCategories.filter(
        categoryId => !categoriesWithSubcategories.has(categoryId)
      );

      if (categoriesWithoutSubcategories.length > 0) {
        requestBody.categoryIds = categoriesWithoutSubcategories;
      }

      if (subcategoriesData.length > 0) {
        requestBody.subcategories = subcategoriesData;
      }

      console.log('Wysyłane dane:', requestBody);

      // Wyślij jeden request z wszystkimi danymi
      const response = await authorizedFetch(`${environment.apiUrl}/api/favorite-categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const message = await response.text();
        console.log('Kategorie zapisane:', message);
        setShowCategoryModal(false);
        // Odśwież listę obserwowanych ofert
        if (activeTab === "watched") {
          fetchWatchedOffers();
        }
      } else {
        console.error('Błąd zapisywania kategorii:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Szczegóły błędu:', errorText);
      }
    } catch (error) {
      console.error('Błąd zapisywania obserwowanych kategorii:', error);
    } finally {
      setSavingCategories(false);
    }
  };


  const fetchWatchedOffers = async () => {
    setWatchedLoading(true);
    try {
      let url = `${environment.apiUrl}/api/favorite-categories/offers/latest`;
      
      // Pobierz lokalizację użytkownika jeśli ma pozwolenie
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000 // 5 minut
            });
          });
          
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          url += `?lat=${lat}&lon=${lon}`;
          console.log('Używam lokalizacji użytkownika:', lat, lon);
        } catch {
          console.log('Nie można pobrać lokalizacji użytkownika, pobieram oferty bez lokalizacji');
        }
      }
      
      const response = await authorizedFetch(url);

      if (response.ok) {
        const data = await response.json();
        console.log('Pobrane obserwowane oferty:', data);
        
        const convertedData = data.map((offer: ApiOffer) => ({
          ...offer,
          imageUrl:
            offer.imageUrl ||
            offer.image ||
            (offer.imageUrls && offer.imageUrls.length > 0
              ? offer.imageUrls[0]
              : null),
          location: offer.location || offer.location,
          lat: offer.lat || offer.latitude,
          lon: offer.lon || offer.longitude,
        }));
        setWatchedOffers(convertedData);
        
        // Pobierz unikalne kategorie i podkategorie z ofert
        const uniqueCategories = new Set<number>();
        const uniqueSubcategories = new Set<number>();
        
        data.forEach((offer: ApiOffer) => {
          if (offer.categoryId) {
            uniqueCategories.add(offer.categoryId);
          }
          if (offer.subcategoryId) {
            uniqueSubcategories.add(offer.subcategoryId);
          }
        });
        
        // Ustaw dostępne kategorie z ofert
        setAvailableCategoriesFromOffers({
          categoryIds: Array.from(uniqueCategories),
          subcategoryIds: Array.from(uniqueSubcategories)
        });
        
        // Zresetuj filtry kategorii tylko przy pierwszym ładowaniu (wszystkie kategorie będą domyślnie zaznaczone)
        if (isFirstLoad) {
          setCategoryFilters({
            categoryIds: Array.from(uniqueCategories),
            subcategoryIds: Array.from(uniqueSubcategories)
          });
          setIsFirstLoad(false);
        }
      }
    } catch (error) {
      console.error('Błąd pobierania obserwowanych ofert:', error);
    } finally {
      setWatchedLoading(false);
    }
  };

  const handleCategoryFilterToggle = (categoryId: number) => {
    setCategoryFilters(prev => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter(id => id !== categoryId)
        : [...prev.categoryIds, categoryId]
    }));
  };

  const handleSubcategoryFilterToggle = (subcategoryId: number) => {
    setCategoryFilters(prev => ({
      ...prev,
      subcategoryIds: prev.subcategoryIds.includes(subcategoryId)
        ? prev.subcategoryIds.filter(id => id !== subcategoryId)
        : [...prev.subcategoryIds, subcategoryId]
    }));
  };

  useEffect(() => {
    const fetchFavorites = async () => {
      // Zapobiegaj podwójnym zapytaniom
      if (fetchingRef.current) return;

      fetchingRef.current = true;
      try {
        setLoading(true);
        setError(null);

        let response = await authorizedFetch(
          `${environment.apiUrl}/api/favorites`
        );

        if (response.ok) {
          const data = await response.json();

          // Konwertuj dane do formatu OfferTile jeśli to potrzebne
          const convertedData = data.map((offer: ApiOffer) => ({
            ...offer,
            imageUrl:
              offer.imageUrl ||
              offer.image ||
              (offer.imageUrls && offer.imageUrls.length > 0
                ? offer.imageUrls[0]
                : null),
            location: offer.location || offer.location,
            lat: offer.lat || offer.latitude,
            lon: offer.lon || offer.longitude,
          }));

          console.log("Converted data:", convertedData);
          setOffers(convertedData);
        } else {
          console.log(
            "Endpoint /api/favorites not found, trying /api/offer/newest with filter"
          );

          // Jeśli endpoint /api/favorites nie istnieje, spróbuj endpoint /api/offer z parametrem favorites
          const params = new URLSearchParams();
          params.append("favorites", "true");
          response = await authorizedFetch(
            `${environment.apiUrl}/api/offer?${params.toString()}`
          );

          if (!response.ok) {
            // Jeśli to nie zadziała, pobierz wszystkie oferty i filtruj ulubione
            response = await authorizedFetch(
              `${environment.apiUrl}/api/offer/newest`
            );
          }

          if (response.ok) {
            const allOffers = await response.json();
            console.log("All offers data:", allOffers);

            // Filtruj tylko ulubione oferty
            const favoriteOffers = allOffers.filter(
              (offer: ApiOffer) => offer.isFavorite === true
            );
            console.log("Filtered favorite offers:", favoriteOffers);
            console.log(
              "First filtered offer imageUrl:",
              favoriteOffers[0]?.imageUrl
            );
            console.log(
              "First filtered offer imageUrls:",
              favoriteOffers[0]?.imageUrls
            );
            console.log(
              "First filtered offer image:",
              favoriteOffers[0]?.image
            );
            console.log(
              "All filtered offers fields:",
              favoriteOffers[0] ? Object.keys(favoriteOffers[0]) : []
            );
            console.log(
              "All filtered offers imageUrls:",
              favoriteOffers.map((offer: ApiOffer) => ({
                id: offer.id,
                name: offer.name,
                imageUrl: offer.imageUrl,
                imageUrls: offer.imageUrls,
                image: offer.image,
              }))
            );

            // Konwertuj dane do formatu OfferTile jeśli to potrzebne
            const convertedFavoriteOffers = favoriteOffers.map(
              (offer: ApiOffer) => ({
                ...offer,
                imageUrl:
                  offer.imageUrl ||
                  offer.image ||
                  (offer.imageUrls && offer.imageUrls.length > 0
                    ? offer.imageUrls[0]
                    : null),
                location: offer.location || offer.location,
                lat: offer.lat || offer.latitude,
                lon: offer.lon || offer.longitude,
              })
            );

            console.log("Converted favorite offers:", convertedFavoriteOffers);
            setOffers(convertedFavoriteOffers);
          } else {
            console.error(
              "Both endpoints failed:",
              response.status,
              response.statusText
            );
            const errorText = await response.text();
            console.error("Error text:", errorText);
            setError(`Błąd pobierania ulubionych ofert: ${response.status}`);
          }
        }
      } catch (error) {
        console.error("Błąd połączenia:", error);
        setError("Błąd połączenia z serwerem");
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    };

    fetchFavorites();
  }, []);

  // Pobierz obserwowane oferty gdy użytkownik przełączy na zakładkę
  useEffect(() => {
    if (activeTab === "watched") {
      fetchWatchedOffers();
    }
  }, [activeTab]);

  if (loading) {
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
            Ładowanie ulubionych...
          </h2>
          <p
            style={{
              color: "#4a5568",
              fontSize: "16px",
            }}
          >
            Pobieramy Twoje ulubione oferty
          </p>
        </div>

        {/* CSS dla animacji */}
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

  return (
    <div className="min-h-[calc(100vh-160px)] bg-gray-50 p-2 sm:p-5">
      <div className="max-w-6xl mx-auto w-full">
        {/* Zakładki */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("favorites")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === "favorites"
                  ? "bg-yellow-400 text-gray-900"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <FaHeart size={16} />
              Ulubione oferty
            </button>
            <button
              onClick={() => setActiveTab("watched")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === "watched"
                  ? "bg-yellow-400 text-gray-900"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <FaEye size={16} />
              Obserwowane kategorie
            </button>
          </div>
          {!isMobile && (
            <div className="flex gap-2">
              <button
                onClick={() => setView("tiles")}
                className={`p-2 rounded-lg border-2 transition-all ${
                  view === "tiles"
                    ? "border-yellow-400 bg-yellow-50 text-yellow-600"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
                aria-label="Widok kafelków"
              >
                <FaTableCells size={20} />
              </button>
              <button
                onClick={() => setView("list")}
                className={`p-2 rounded-lg border-2 transition-all ${
                  view === "list"
                    ? "border-yellow-400 bg-yellow-50 text-yellow-600"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
                aria-label="Widok listy"
              >
                <FaListUl size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Zawartość zakładek */}
        {activeTab === "favorites" ? (
          /* Zakładka: Ulubione oferty */
          <>
            {loading ? (
              <div className="flex justify-center items-center p-8">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-yellow-400 rounded-full animate-spin"></div>
              </div>
            ) : offers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">
                  Nie masz jeszcze żadnych ulubionych ofert
                </p>
              </div>
            ) : view === "tiles" ? (
              <OfferTileSection
                title=""
                offers={offers}
                loading={false}
                emptyMessage=""
                tileWidth={200}
                tileHeight={220}
                imageWidth={160}
                imageHeight={100}
                showCount={false}
                isEditing={false}
                showStatus={true}
              />
            ) : (
              <div className="space-y-4">
                {offers.map((offer) => (
                  <Link
                    key={offer.id}
                    href={`/offers/${offer.id}/${offer.name}`}
                    className="block"
                  >
                    <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-4 gap-4 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="w-24 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <Image
                          src={getImageUrl(offer.imageUrl)}
                          alt={offer.name}
                          width={96}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-lg truncate">
                          {offer.name}
                        </h3>
                        <p className="text-gray-600 text-sm mt-1">
                          {offer.location}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span
                            className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                              offer.transactionType === "free"
                                ? "bg-green-100 text-green-800"
                                : offer.transactionType === "sale"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {offer.transactionType === "free"
                              ? "Za darmo"
                              : offer.transactionType === "sale"
                              ? "Na sprzedaż"
                              : "Wymiana"}
                          </span>
                          {offer.status && (
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColors(offer.status)}`}>
                              {STATUS_LABELS[offer.status]}
                            </span>
                          )}
                          {offer.distance && (
                            <span className="text-blue-600 text-sm font-medium">
                              ({offer.distance})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Zakładka: Obserwowane kategorie */
          <>
            {/* Przycisk do wyboru kategorii */}
            <div className="mb-6">
              <button
                onClick={() => {
                  fetchFavoriteCategories();
                  setShowCategoryModal(true);
                }}
                className="bg-yellow-400 text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-yellow-500 transition-colors"
              >
                Wybierz obserwowane kategorie
              </button>
              
              {/* Komunikat o resetowaniu ulubionych kategorii */}
              {selectedCategories.length === 0 && selectedSubcategories.length === 0 && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Ulubione kategorie zostały zresetowane
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>
                          W związku z aktualizacją kategorii, Twoje ulubione kategorie zostały zresetowane. 
                          Wybierz nowe kategorie, które Cię interesują, aby otrzymywać powiadomienia o nowych ofertach.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Filtry kategorii */}
            {watchedOffers.length > 0 && availableCategoriesFromOffers.categoryIds.length > 0 && (
              <div className="mb-6 bg-white rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Filtry kategorii</h3>
                
                <div className="space-y-4">
                  {categories
                    .filter(category => availableCategoriesFromOffers.categoryIds.includes(category.id))
                    .map((category) => {
                      const availableSubcategories = category.subcategories.filter(
                        subcategory => availableCategoriesFromOffers.subcategoryIds.includes(subcategory.id)
                      );
                      
                      return (
                        <div key={category.id} className="border border-gray-200 rounded-lg p-3">
                          {/* Kategoria */}
                          <div className="mb-2">
                            <button
                              onClick={() => handleCategoryFilterToggle(category.id)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                categoryFilters.categoryIds.includes(category.id)
                                  ? 'bg-yellow-400 text-gray-900'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {category.name}
                            </button>
                          </div>
                          
                          {/* Podkategorie */}
                          {availableSubcategories.length > 0 && (
                            <div className="ml-4">
                              <div className="flex flex-wrap gap-2">
                                {availableSubcategories.map((subcategory) => (
                                  <button
                                    key={subcategory.id}
                                    onClick={() => handleSubcategoryFilterToggle(subcategory.id)}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                      categoryFilters.subcategoryIds.includes(subcategory.id)
                                        ? 'bg-yellow-300 text-gray-900'
                                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                    }`}
                                  >
                                    {subcategory.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Lista obserwowanych ofert */}
            {watchedLoading ? (
              <div className="flex justify-center items-center p-8">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-yellow-400 rounded-full animate-spin"></div>
              </div>
            ) : watchedOffers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">
                  Nie masz jeszcze żadnych obserwowanych kategorii lub nie ma pasujących ofert
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Kliknij &quot;Wybierz obserwowane kategorie&quot; aby dodać kategorie do obserwowania
                </p>
              </div>
            ) : view === "tiles" ? (
              <OfferTileSection
                title=""
                offers={watchedOffers.filter(offer => {
                  // Jeśli nie ma żadnych filtrów zaznaczonych, pokaż wszystkie oferty
                  if (categoryFilters.categoryIds.length === 0 && categoryFilters.subcategoryIds.length === 0) {
                    return true;
                  }
                  
                  // Sprawdź czy oferta pasuje do zaznaczonych kategorii lub podkategorii
                  const matchesCategory = categoryFilters.categoryIds.includes(offer.categoryId || 0);
                  const matchesSubcategory = categoryFilters.subcategoryIds.includes(offer.subcategoryId || 0);
                  
                  return matchesCategory || matchesSubcategory;
                })}
                loading={false}
                emptyMessage=""
                tileWidth={200}
                tileHeight={220}
                imageWidth={160}
                imageHeight={100}
                showCount={false}
                isEditing={false}
                showStatus={true}
              />
            ) : (
              <div className="space-y-4">
                {watchedOffers
                  .filter(offer => {
                    // Jeśli nie ma żadnych filtrów zaznaczonych, pokaż wszystkie oferty
                    if (categoryFilters.categoryIds.length === 0 && categoryFilters.subcategoryIds.length === 0) {
                      return true;
                    }
                    
                    // Sprawdź czy oferta pasuje do zaznaczonych kategorii lub podkategorii
                    const matchesCategory = categoryFilters.categoryIds.includes(offer.categoryId || 0);
                    const matchesSubcategory = categoryFilters.subcategoryIds.includes(offer.subcategoryId || 0);
                    
                    return matchesCategory || matchesSubcategory;
                  })
                  .map((offer) => (
                    <Link
                      key={offer.id}
                      href={`/offers/${offer.id}/${offer.name}`}
                      className="block"
                    >
                      <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-4 gap-4 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="w-24 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <Image
                            src={getImageUrl(offer.imageUrl)}
                            alt={offer.name}
                            width={96}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-lg truncate">
                            {offer.name}
                          </h3>
                          <p className="text-gray-600 text-sm mt-1">
                            {offer.location}
                          </p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span
                              className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                                offer.transactionType === "free"
                                  ? "bg-green-100 text-green-800"
                                  : offer.transactionType === "sale"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {offer.transactionType === "free"
                                ? "Za darmo"
                                : offer.transactionType === "sale"
                                ? "Na sprzedaż"
                                : "Wymiana"}
                            </span>
                            {offer.status && (
                              <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColors(offer.status)}`}>
                                {STATUS_LABELS[offer.status]}
                              </span>
                            )}
                            {offer.distance && (
                              <span className="text-blue-600 text-sm font-medium">
                                ({offer.distance})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            )}
          </>
        )}

        {/* Modal do wyboru kategorii */}
        {showCategoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 pt-4 sm:pt-4 pb-20 sm:pb-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[calc(100vh-6rem)] sm:max-h-[80vh] flex flex-col mt-0 sm:mt-0">
              <div className="p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Wybierz obserwowane kategorie</h2>
                <p className="text-gray-600 mt-2 text-sm sm:text-base">
                  Zaznacz kategorie i podkategorie, które chcesz obserwować.
                </p>
              </div>
              
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
                <div className="space-y-4">
                  {categories.map((category) => (
                    <div key={category.id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                      <div className="flex items-center mb-2 sm:mb-3">
                        <input
                          type="checkbox"
                          id={`category-${category.id}`}
                          checked={selectedCategories.includes(category.id)}
                          onChange={() => handleCategoryToggle(category.id)}
                          className="w-4 h-4 text-yellow-600 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500 focus:ring-2"
                        />
                        <label
                          htmlFor={`category-${category.id}`}
                          className="ml-3 text-base sm:text-lg font-semibold text-gray-800 cursor-pointer"
                        >
                          {category.name}
                        </label>
                      </div>
                      
                      {category.subcategories.length > 0 && (
                        <div className="ml-7 grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2">
                          {category.subcategories.map((subcategory) => (
                            <div key={subcategory.id} className="flex items-center">
                              <input
                                type="checkbox"
                                id={`subcategory-${subcategory.id}`}
                                checked={selectedSubcategories.includes(subcategory.id)}
                                onChange={() => handleSubcategoryToggle(subcategory.id)}
                                className="w-4 h-4 text-yellow-600 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500 focus:ring-2"
                              />
                              <label
                                htmlFor={`subcategory-${subcategory.id}`}
                                className="ml-2 text-xs sm:text-sm text-gray-700 cursor-pointer"
                              >
                                {subcategory.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="p-4 sm:p-6 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0 bg-white sticky bottom-0">
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm sm:text-base"
                >
                  Anuluj
                </button>
                <button
                  onClick={saveWatchedCategories}
                  disabled={savingCategories}
                  className="bg-yellow-400 text-gray-900 px-4 sm:px-6 py-2 rounded-lg font-medium hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {savingCategories ? "Zapisywanie..." : "Zapisz"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FavoritesPage() {
  return (
    <AuthGuard>
      <FavoritesPageContent />
    </AuthGuard>
  );
}
