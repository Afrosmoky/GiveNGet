"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { environment } from "../../config";
import { authorizedFetch } from "../../utils/auth";
import OfferTile from "../../components/OfferTile";
import { OfferTileSkeleton } from "../../components/offer/OfferTileSkeleton";
import { OfferListRow } from "../../components/offer/OfferListRow";
import { OfferTileProps, ApiOffer } from "../../types/offer";
import { AuthGuard } from "../../components/AuthGuard";
import { LuCircleAlert, LuEye, LuHeart, LuLayoutGrid, LuList, LuSlidersHorizontal } from "react-icons/lu";
import { Alert, Button, Card, CardHeader, Chip, Dialog, IconButton, PageHeader, cn, pageContainer } from "../../components/ui";

const OFFER_GRID = "grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-4";

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

  // Oferty z obserwowanych kategorii po filtrach (bez filtrów — wszystkie)
  const filteredWatchedOffers = watchedOffers.filter((offer) => {
    if (categoryFilters.categoryIds.length === 0 && categoryFilters.subcategoryIds.length === 0) {
      return true;
    }
    const matchesCategory = categoryFilters.categoryIds.includes(offer.categoryId || 0);
    const matchesSubcategory = categoryFilters.subcategoryIds.includes(offer.subcategoryId || 0);
    return matchesCategory || matchesSubcategory;
  });

  const renderOffers = (list: OfferTileProps[]) =>
    view === "tiles" ? (
      <div className={OFFER_GRID}>
        {list.map((offer) => (
          <OfferTile key={offer.id} {...offer} showStatus />
        ))}
      </div>
    ) : (
      <ul className="flex flex-col gap-2">
        {list.map((offer) => (
          <li key={offer.id}>
            <OfferListRow offer={offer} href={`/offers/${offer.id}/${encodeURIComponent(offer.name)}`} showStatus />
          </li>
        ))}
      </ul>
    );

  const skeletons = (
    <div className={OFFER_GRID} aria-busy="true" aria-label="Wczytywanie ofert">
      {Array.from({ length: 4 }, (_, i) => (
        <OfferTileSkeleton key={i} />
      ))}
    </div>
  );

  if (error) {
    return (
      <div className={cn(pageContainer, "py-8")}>
        <Card padding="lg" role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger">
            <LuCircleAlert size={22} aria-hidden />
          </span>
          <h2 className="text-base font-semibold text-ink">Nie udało się wczytać ulubionych</h2>
          <p className="text-sm text-ink-muted">{error}</p>
          <Button onClick={() => window.location.reload()}>Spróbuj ponownie</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn(pageContainer, "py-6 sm:py-8")}>
      <PageHeader title="Ulubione" description="Zapisane oferty i kategorie, które obserwujesz." />

      {/* Zakładki + przełącznik widoku */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div role="tablist" aria-label="Ulubione" className="flex gap-2 overflow-x-auto">
          <Chip
            role="tab"
            aria-selected={activeTab === "favorites"}
            selected={activeTab === "favorites"}
            icon={<LuHeart size={15} aria-hidden />}
            count={loading ? undefined : offers.length}
            onClick={() => setActiveTab("favorites")}
            className="shrink-0"
          >
            Ulubione oferty
          </Chip>
          <Chip
            role="tab"
            aria-selected={activeTab === "watched"}
            selected={activeTab === "watched"}
            icon={<LuEye size={15} aria-hidden />}
            onClick={() => setActiveTab("watched")}
            className="shrink-0"
          >
            Obserwowane kategorie
          </Chip>
        </div>
        {!isMobile && (
          <div className="flex shrink-0 gap-1 rounded-ui-md border border-line bg-surface p-0.5">
            <IconButton label="Widok kafelków" icon={<LuLayoutGrid size={18} />} active={view === "tiles"} onClick={() => setView("tiles")} className="h-8 w-8" />
            <IconButton label="Widok listy" icon={<LuList size={18} />} active={view === "list"} onClick={() => setView("list")} className="h-8 w-8" />
          </div>
        )}
      </div>

      {activeTab === "favorites" ? (
        /* Zakładka: Ulubione oferty */
        loading ? (
          skeletons
        ) : offers.length === 0 ? (
          <Card padding="lg" className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
              <LuHeart size={22} aria-hidden />
            </span>
            <p className="text-sm text-ink-muted">Nie masz jeszcze żadnych ulubionych ofert. Kliknij serduszko przy ofercie, żeby ją tu zapisać.</p>
            <Button href="/offers/search">Przeglądaj oferty</Button>
          </Card>
        ) : (
          renderOffers(offers)
        )
      ) : (
        /* Zakładka: Obserwowane kategorie */
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-muted">Nowe oferty z wybranych kategorii pojawią się tutaj.</p>
            <Button
              leftIcon={<LuSlidersHorizontal size={16} />}
              onClick={() => {
                fetchFavoriteCategories();
                setShowCategoryModal(true);
              }}
              className="sm:shrink-0"
            >
              Wybierz obserwowane kategorie
            </Button>
          </div>

          {/* Komunikat o resetowaniu ulubionych kategorii */}
          {selectedCategories.length === 0 && selectedSubcategories.length === 0 && (
            <Alert tone="info">
              <p className="font-medium text-ink">Ulubione kategorie zostały zresetowane</p>
              <p className="mt-0.5">
                W związku z aktualizacją kategorii, Twoje ulubione kategorie zostały zresetowane. Wybierz nowe kategorie, które Cię
                interesują, aby otrzymywać powiadomienia o nowych ofertach.
              </p>
            </Alert>
          )}

          {/* Filtry kategorii */}
          {watchedOffers.length > 0 && availableCategoriesFromOffers.categoryIds.length > 0 && (
            <Card>
              <CardHeader title="Filtry kategorii" className="mb-3" />
              <div className="flex flex-col gap-3">
                {categories
                  .filter((category) => availableCategoriesFromOffers.categoryIds.includes(category.id))
                  .map((category) => {
                    const availableSubcategories = category.subcategories.filter((subcategory) =>
                      availableCategoriesFromOffers.subcategoryIds.includes(subcategory.id)
                    );
                    return (
                      <div key={category.id} className="flex flex-col gap-2">
                        <div>
                          <Chip
                            selected={categoryFilters.categoryIds.includes(category.id)}
                            onClick={() => handleCategoryFilterToggle(category.id)}
                          >
                            {category.name}
                          </Chip>
                        </div>
                        {availableSubcategories.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pl-4">
                            {availableSubcategories.map((subcategory) => (
                              <Chip
                                key={subcategory.id}
                                selected={categoryFilters.subcategoryIds.includes(subcategory.id)}
                                onClick={() => handleSubcategoryFilterToggle(subcategory.id)}
                                className="h-8 px-3 text-xs"
                              >
                                {subcategory.name}
                              </Chip>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </Card>
          )}

          {/* Lista obserwowanych ofert */}
          {watchedLoading ? (
            skeletons
          ) : watchedOffers.length === 0 ? (
            <Card padding="lg" className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
                <LuEye size={22} aria-hidden />
              </span>
              <p className="text-sm text-ink">Nie masz jeszcze żadnych obserwowanych kategorii lub nie ma pasujących ofert.</p>
              <p className="text-sm text-ink-muted">Kliknij „Wybierz obserwowane kategorie”, aby dodać kategorie do obserwowania.</p>
            </Card>
          ) : (
            renderOffers(filteredWatchedOffers)
          )}
        </div>
      )}

      {/* Wybór obserwowanych kategorii */}
      <Dialog
        open={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Wybierz obserwowane kategorie"
        description="Zaznacz kategorie i podkategorie, które chcesz obserwować."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCategoryModal(false)}>
              Anuluj
            </Button>
            <Button onClick={saveWatchedCategories} loading={savingCategories}>
              {savingCategories ? "Zapisywanie…" : "Zapisz"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {categories.map((category) => (
            <fieldset key={category.id} className="rounded-ui-md border border-line p-3 sm:p-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category.id)}
                  onChange={() => handleCategoryToggle(category.id)}
                  className="h-4 w-4 rounded border-line-strong accent-[rgb(var(--brand))]"
                />
                <span className="text-sm font-semibold text-ink sm:text-base">{category.name}</span>
              </label>
              {category.subcategories.length > 0 && (
                <div className="mt-2 grid gap-1.5 pl-7 sm:grid-cols-2">
                  {category.subcategories.map((subcategory) => (
                    <label key={subcategory.id} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedSubcategories.includes(subcategory.id)}
                        onChange={() => handleSubcategoryToggle(subcategory.id)}
                        className="h-4 w-4 rounded border-line-strong accent-[rgb(var(--brand))]"
                      />
                      <span className="text-sm text-ink-muted">{subcategory.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          ))}
        </div>
      </Dialog>
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
