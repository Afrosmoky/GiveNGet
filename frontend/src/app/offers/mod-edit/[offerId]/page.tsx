"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { environment } from '../../../../config';
import { authorizedFetch, getUserData } from '../../../../utils/auth';
import { getImageUrl } from '../../../../utils/imageUtils';
import { AuthGuard } from '../../../../components/AuthGuard';
import { OfferDetails } from '../../../../types/offerDetails';
import { TransactionType, Category, getAllowedTransactionTypes } from '../../../../types/offer';
import Image from 'next/image';

interface ModeratorEditFormData {
  categoryId: number;
  subcategoryId: number;
  description: string;
  offerType: TransactionType;
  existingImages: string[];
  removedImages: string[];
  reason: string;
}

function ModeratorEditOfferPageContent() {
  const params = useParams();
  const router = useRouter();
  const { offerId } = params as { offerId: string };
  
  const [offer, setOffer] = useState<OfferDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(null);
  const categoriesInitialized = useRef(false);
  
  const [formData, setFormData] = useState<ModeratorEditFormData>({
    categoryId: 0,
    subcategoryId: 0,
    description: '',
    offerType: 'free',
    existingImages: [],
    removedImages: [],
    reason: ''
  });

  const [errors, setErrors] = useState({
    description: '',
    categoryId: '',
    reason: ''
  });

  // Pobieranie oferty
  useEffect(() => {
    const fetchOffer = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await authorizedFetch(`${environment.apiUrl}/api/offer/details/${offerId}`);
        
        if (response.ok) {
          const data = await response.json();
          setOffer(data);
          
          // Ustaw dane formularza z aktualnymi wartościami kategorii
          const categoryId = data.categoryId || 0;
          const subcategoryId = data.subcategoryId || 0;
          
          setFormData({
            categoryId: categoryId,
            subcategoryId: subcategoryId,
            description: data.description || '',
            offerType: data.transactionType as TransactionType || 'free',
            existingImages: data.imageUrls || [],
            removedImages: [],
            reason: ''
          });
          
          // Wartości w selectach zostaną ustawione w osobnym useEffect
          // gdy zarówno oferta jak i kategorie będą załadowane
        } else {
          setError('Błąd pobierania oferty');
        }
      } catch (error) {
        console.error('Błąd połączenia:', error);
        setError('Błąd połączenia z serwerem');
      } finally {
        setLoading(false);
      }
    };

    if (offerId) {
      fetchOffer();
    }
  }, [offerId]);

  // Pobieranie kategorii
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const response = await authorizedFetch(`${environment.apiUrl}/api/categories/all`);
        
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Błąd pobierania kategorii:', error);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Ustawianie wartości w selectach gdy zarówno oferta jak i kategorie są załadowane
  useEffect(() => {
    if (offer && categories.length > 0 && !categoriesInitialized.current) {
      const categoryId = offer.categoryId;
      const subcategoryId = offer.subcategoryId;
      
      // Ustaw kategorię jeśli jest dostępna w danych oferty
      if (categoryId && categoryId > 0) {
        const categoryExists = categories.some(cat => cat.id === categoryId);
        if (categoryExists) {
          setSelectedCategory(categoryId);
          setFormData(prev => ({ ...prev, categoryId }));
          
          // Jeśli mamy też podkategorię, ustaw ją natychmiast
          if (subcategoryId && subcategoryId > 0) {
            const category = categories.find(cat => cat.id === categoryId);
            if (category && category.subcategories) {
              const subcategoryExists = category.subcategories.some(sub => sub.id === subcategoryId);
              if (subcategoryExists) {
                setSelectedSubcategory(subcategoryId);
                setFormData(prev => ({ ...prev, subcategoryId }));
              }
            }
          }
          
          categoriesInitialized.current = true;
        }
      }
    }
  }, [offer, categories]);

  // Sprawdzenie uprawnień
  useEffect(() => {
    const user = getUserData();
    if (user && user.userType !== 'EMPLOYEE' && user.userType !== 'ADMIN') {
      router.push('/unauthorized');
    }
  }, [router]);


  const removeExistingImage = (index: number) => {
    const imageToRemove = formData.existingImages[index];
    setFormData((prev) => ({
      ...prev,
      existingImages: prev.existingImages.filter((_, i) => i !== index),
      removedImages: [...prev.removedImages, imageToRemove],
    }));
  };

  const handleCategoryChange = (categoryId: number) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory(null);
    setFormData(prev => ({
      ...prev,
      categoryId,
      subcategoryId: 0
    }));
  };

  const handleSubcategoryChange = (subcategoryId: number) => {
    setSelectedSubcategory(subcategoryId);
    setFormData(prev => ({
      ...prev,
      subcategoryId
    }));
  };

  const handleInputChange = (field: keyof ModeratorEditFormData, value: string | TransactionType) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Wyczyść błąd dla tego pola
    if (field === 'description' || field === 'reason') {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors = {
      description: '',
      categoryId: '',
      reason: ''
    };

    if (!formData.description.trim()) {
      newErrors.description = 'Opis jest wymagany';
    }
    if (formData.description.trim().length < 10) {
      newErrors.description = 'Opis musi mieć co najmniej 10 znaków';
    }
    if (formData.description.trim().length > 2000) {
      newErrors.description = 'Opis nie może przekraczać 2000 znaków';
    }

    if (!formData.categoryId || formData.categoryId === 0) {
      newErrors.categoryId = 'Kategoria jest wymagana';
    }

    if (!formData.reason.trim()) {
      newErrors.reason = 'Powód edycji jest wymagany';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setSubmitMessage({
        type: 'error',
        text: 'Proszę poprawić błędy w formularzu'
      });
      return;
    }

    try {
      setSubmitting(true);
      setSubmitMessage(null);

      const formDataToSend = new FormData();
      formDataToSend.append('categoryId', formData.categoryId.toString());
      if (formData.subcategoryId && formData.subcategoryId !== 0) {
        formDataToSend.append('subcategoryId', formData.subcategoryId.toString());
      }
      formDataToSend.append('description', formData.description);
      formDataToSend.append('offerType', formData.offerType);
      formDataToSend.append('reason', formData.reason);

      // Dodaj usunięte obrazy
      formData.removedImages.forEach((imageUrl) => {
        formDataToSend.append('removedImages', imageUrl);
      });

      const response = await authorizedFetch(`${environment.apiUrl}/api/mod/offers/${offerId}`, {
        method: 'PUT',
        body: formDataToSend
      });

      if (response.ok) {
        const responseText = await response.text();
        setSubmitMessage({
          type: 'success',
          text: responseText || 'Oferta została zaktualizowana pomyślnie'
        });
        
        setTimeout(() => {
          router.push(`/offers/${offerId}`);
        }, 2000);
      } else {
        const errorText = await response.text();
        setSubmitMessage({
          type: 'error',
          text: errorText || 'Błąd aktualizacji oferty'
        });
      }
    } catch (error) {
      console.error('Błąd podczas aktualizacji:', error);
      setSubmitMessage({
        type: 'error',
        text: 'Błąd połączenia z serwerem'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);

  if (loading || categoriesLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-yellow-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 py-10">
        {error}
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="text-center text-gray-600 py-10">
        Oferta nie została znaleziona
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-160px)] bg-gray-50 p-2 sm:p-5">
      <div className="max-w-5xl mx-auto w-full">
        <h1 className="text-2xl sm:text-3xl md:text-4xl text-gray-800 mb-6 sm:mb-10 text-center">
          Edycja oferty przez moderatora
        </h1>

        {/* Informacja o niedostępnych polach */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Ograniczenia edycji</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Jako moderator możesz edytować tylko: opis, kategorię i typ transakcji.</p>
                  <p className="mt-1">Możesz również usuwać istniejące zdjęcia, ale nie możesz dodawać nowych.</p>
                  <p className="mt-1">Nazwa, lokalizacja, termin ważności i godziny odbioru nie mogą być zmieniane.</p>
                </div>
              </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6 md:p-10">
          {/* Informacje o ofercie (tylko do odczytu) */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl text-gray-800 mb-4">Informacje o ofercie (tylko do odczytu)</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-700">Nazwa: </span>
                <span className="text-sm text-gray-900">{offer.name}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Lokalizacja: </span>
                <span className="text-sm text-gray-900">{offer.location}</span>
              </div>
              {offer.expiryDate && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Termin ważności: </span>
                  <span className="text-sm text-gray-900">{offer.expiryDate}</span>
                </div>
              )}
              {offer.pickupDateFrom && offer.pickupDateTo && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Godziny odbioru: </span>
                  <span className="text-sm text-gray-900">{offer.pickupDateFrom} - {offer.pickupDateTo}</span>
                </div>
              )}
            </div>
          </div>

          {/* Kategoria */}
          <div className="mb-6 sm:mb-8">
            <label className="block text-base sm:text-lg text-gray-800 mb-2 sm:mb-3 font-bold">
              Kategoria <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCategory || ''}
              onChange={(e) => handleCategoryChange(Number(e.target.value))}
              className={`w-full p-3 sm:p-4 text-base sm:text-lg border-2 rounded-xl bg-white text-gray-800 cursor-pointer transition-colors focus:border-yellow-400 ${
                errors.categoryId ? 'border-red-500' : 'border-gray-200'
              }`}
            >
              <option value="">-- Wybierz kategorię --</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <div className="text-red-500 text-xs sm:text-sm mt-1">
                {errors.categoryId}
              </div>
            )}
          </div>

          {/* Podkategoria */}
          {selectedCategory && selectedCategoryData && selectedCategoryData.subcategories && selectedCategoryData.subcategories.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <label className="block text-base sm:text-lg text-gray-800 mb-2 sm:mb-3 font-bold">
                Podkategoria
              </label>
              <select
                value={selectedSubcategory || ''}
                onChange={(e) => handleSubcategoryChange(Number(e.target.value))}
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

          {/* Typ transakcji */}
          <div className="mb-6 sm:mb-8">
            <label className="block text-base sm:text-lg text-gray-800 mb-2 sm:mb-3 font-bold">
              Typ transakcji
            </label>
            <select
              value={formData.offerType}
              onChange={(e) => handleInputChange('offerType', e.target.value as TransactionType)}
              className="w-full p-3 sm:p-4 text-base sm:text-lg border-2 border-gray-200 rounded-lg bg-white cursor-pointer transition-colors focus:border-yellow-400"
            >
              {selectedCategory && categories.find(c => c.id === selectedCategory) ? (
                getAllowedTransactionTypes(
                  categories.find(c => c.id === selectedCategory)!,
                  selectedSubcategory ? categories.find(c => c.id === selectedCategory)?.subcategories.find(s => s.id === selectedSubcategory) || null : null
                ).map(type => (
                  <option key={type} value={type}>
                    {type === 'free' ? 'Za darmo' : type === 'exchange' ? 'Wymiana' : 'Sprzedaż'}
                  </option>
                ))
              ) : (
                <>
                  <option value="free">Za darmo</option>
                  <option value="exchange">Wymiana</option>
                  <option value="sale">Sprzedaż</option>
                </>
              )}
            </select>
          </div>

          {/* Opis */}
          <div className="mb-6 sm:mb-8">
            <label className="block text-base sm:text-lg text-gray-800 mb-2 sm:mb-3 font-bold">
              Opis <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Opisz szczegółowo ofertę..."
              className={`w-full min-h-48 p-4 text-base sm:text-lg border-2 rounded-lg resize-vertical font-inherit leading-relaxed transition-colors focus:border-yellow-400 focus:ring-5 focus:ring-yellow-300 focus:outline-none ${
                errors.description ? 'border-red-500' : 'border-gray-200'
              }`}
            />
            {errors.description && (
              <div className="text-red-500 text-xs sm:text-sm mt-1">
                {errors.description}
              </div>
            )}
          </div>

          {/* Zdjęcia */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl text-gray-800 mb-4 sm:mb-6">
              Zdjęcia
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Jako moderator możesz tylko usuwać istniejące zdjęcia. Nie możesz dodawać nowych zdjęć.
            </p>

            {/* Istniejące zdjęcia */}
            {formData.existingImages.length > 0 ? (
              <div className="mb-4 sm:mb-6">
                <h4 className="text-base sm:text-lg text-gray-700 mb-3 sm:mb-4">
                  Istniejące zdjęcia (kliknij × aby usunąć):
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
                        className="absolute top-1 right-1 bg-red-500 text-white border-none rounded-full w-6 h-6 text-xs cursor-pointer flex items-center justify-center hover:bg-red-600 transition-colors"
                        title="Usuń zdjęcie"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-500">
                Brak zdjęć w ofercie
              </div>
            )}
          </div>

          {/* Powód edycji */}
          <div className="mb-6 sm:mb-8">
            <label className="block text-base sm:text-lg text-gray-800 mb-2 sm:mb-3 font-bold">
              Powód edycji <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              placeholder="Opisz powód modyfikacji oferty..."
              className={`w-full min-h-32 p-4 text-base sm:text-lg border-2 rounded-lg resize-vertical font-inherit leading-relaxed transition-colors focus:border-yellow-400 focus:ring-5 focus:ring-yellow-300 focus:outline-none ${
                errors.reason ? 'border-red-500' : 'border-gray-200'
              }`}
            />
            {errors.reason && (
              <div className="text-red-500 text-xs sm:text-sm mt-1">
                {errors.reason}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Powód edycji zostanie wysłany właścicielowi oferty w emailu
            </p>
          </div>

          {/* Komunikat o wyniku */}
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
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center mt-8 sm:mt-10">
            <button
              onClick={() => router.push(`/offers/${offerId}`)}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gray-200 text-gray-600 border-none rounded-xl text-base sm:text-lg font-bold cursor-pointer transition-all duration-300 ease-in-out hover:bg-gray-300"
            >
              Anuluj
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-yellow-400 text-gray-900 border-none rounded-xl text-base sm:text-lg font-bold cursor-pointer transition-all duration-300 ease-in-out shadow-md opacity-100 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-yellow-500 hover:-translate-y-0.5 hover:shadow-lg"
            >
              {submitting ? "Zapisywanie..." : "Zapisz zmiany"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ModeratorEditOfferPage() {
  return (
    <AuthGuard>
      <ModeratorEditOfferPageContent />
    </AuthGuard>
  );
}

