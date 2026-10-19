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
import Link from 'next/link';
import { LuCircleAlert, LuCircleCheck, LuExternalLink, LuImageOff, LuShieldAlert, LuTrash2 } from 'react-icons/lu';
import { Badge, Button, Card, CardHeader, IconButton, PageHeader, Select, Spinner, Textarea, cn, consolePage } from '../../../../components/ui';

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
  const allowedTypes: TransactionType[] = selectedCategoryData
    ? getAllowedTransactionTypes(
        selectedCategoryData,
        selectedSubcategory ? selectedCategoryData.subcategories.find(s => s.id === selectedSubcategory) || null : null
      )
    : ['free', 'exchange', 'sale'];

  if (loading || categoriesLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner className="h-6 w-6 text-brand" />
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className={cn(consolePage, '[&>*]:max-w-4xl')}>
        <Card role="alert" className="flex flex-col items-start gap-3">
          <p className="flex items-center gap-2 text-sm text-danger">
            <LuCircleAlert size={16} aria-hidden /> {error ?? 'Oferta nie została znaleziona.'}
          </p>
          <Button variant="secondary" size="sm" href="/admin/complaints">
            Wróć do skarg
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn(consolePage, 'space-y-4 [&>*]:max-w-4xl')}>
      {/* Wyraźny sygnał, że to nie zwykła edycja: zmiany idą do autora z powodem */}
      <div className="flex items-start gap-3 rounded-ui-xl border-2 border-warning/40 bg-warning-soft p-4 sm:p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning text-white">
          <LuShieldAlert size={20} aria-hidden />
        </span>
        <div className="min-w-0 text-sm">
          <p className="text-base font-semibold text-ink">Tryb moderacji</p>
          <p className="mt-1 text-ink-muted">
            Edytujesz cudzą ofertę jako moderator. Możesz zmienić opis, kategorię i typ transakcji oraz usunąć zdjęcia —
            nazwy, lokalizacji, terminu ważności i godzin odbioru nie zmienisz. Autor dostanie e-mail z powodem edycji.
          </p>
        </div>
      </div>

      <PageHeader
        className="!mb-0"
        title={<>Moderacja oferty <span className="text-ink-muted">— {offer.name}</span></>}
        actions={<Badge tone="warning" size="md" icon={<LuShieldAlert size={14} />}>Moderator</Badge>}
      />

      <Card>
        <CardHeader title="Dane bez zmian" description="Tylko do odczytu." className="mb-3" />
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <ReadOnlyField label="Nazwa" value={offer.name} />
          <ReadOnlyField label="Lokalizacja" value={offer.location} />
          {offer.expiryDate && <ReadOnlyField label="Termin ważności" value={offer.expiryDate} />}
          {offer.pickupDateFrom && offer.pickupDateTo && (
            <ReadOnlyField label="Godziny odbioru" value={`${offer.pickupDateFrom} – ${offer.pickupDateTo}`} />
          )}
        </dl>
        <Link href={`/offers/${offerId}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-hover">
          Zobacz ofertę <LuExternalLink size={14} aria-hidden />
        </Link>
      </Card>

      <Card>
        <CardHeader title="Treść i kategoria" className="mb-3" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Kategoria"
            value={selectedCategory || ''}
            onChange={(e) => handleCategoryChange(Number(e.target.value))}
            error={errors.categoryId || undefined}
          >
            <option value="">Wybierz kategorię…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          {selectedCategoryData && selectedCategoryData.subcategories && selectedCategoryData.subcategories.length > 0 ? (
            <Select label="Podkategoria" value={selectedSubcategory || ''} onChange={(e) => handleSubcategoryChange(Number(e.target.value))}>
              <option value="">Wybierz podkategorię…</option>
              {selectedCategoryData.subcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>
                  {subcategory.name}
                </option>
              ))}
            </Select>
          ) : (
            <div className="hidden sm:block" />
          )}
          <Select
            label="Typ transakcji"
            value={formData.offerType}
            onChange={(e) => handleInputChange('offerType', e.target.value as TransactionType)}
          >
            {allowedTypes.map(type => (
              <option key={type} value={type}>
                {TRANSACTION_LABELS[type]}
              </option>
            ))}
          </Select>
        </div>
        <Textarea
          containerClassName="mt-4"
          label="Opis"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Opis oferty…"
          rows={8}
          error={errors.description || undefined}
          hint={`${formData.description.trim().length} / 2000 znaków`}
        />
      </Card>

      <Card>
        <CardHeader
          title="Zdjęcia"
          description="Moderator może usuwać zdjęcia, ale nie może dodawać nowych."
          className="mb-3"
          actions={formData.removedImages.length > 0 && <Badge tone="danger">Do usunięcia: {formData.removedImages.length}</Badge>}
        />
        {formData.existingImages.length > 0 ? (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {formData.existingImages.map((imageUrl, index) => (
              <li key={imageUrl} className="relative aspect-square overflow-hidden rounded-ui-md border border-line bg-surface-sunken">
                <Image src={getImageUrl(imageUrl)} alt={`Zdjęcie ${index + 1}`} fill sizes="160px" className="object-cover" />
                <span className="absolute right-1.5 top-1.5">
                  <IconButton
                    label={`Usuń zdjęcie ${index + 1}`}
                    icon={<LuTrash2 size={14} />}
                    onClick={() => removeExistingImage(index)}
                    className="h-8 w-8 bg-surface/90 !text-danger shadow-card hover:!bg-danger hover:!text-white"
                  />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 rounded-ui-md border border-dashed border-line px-3 py-6 text-sm text-ink-muted">
            <LuImageOff size={16} aria-hidden /> Oferta nie ma zdjęć.
          </p>
        )}
      </Card>

      <Card className="border-warning/40">
        <Textarea
          label="Powód edycji"
          value={formData.reason}
          onChange={(e) => handleInputChange('reason', e.target.value)}
          placeholder="Np. zmieniono kategorię — produkt nie jest nabiałem"
          rows={3}
          error={errors.reason || undefined}
          hint="Wymagany. Trafi do autora oferty w e-mailu razem z informacją o zmianach."
        />
      </Card>

      {submitMessage && (
        <div
          role={submitMessage.type === 'error' ? 'alert' : 'status'}
          className={cn(
            'flex items-center gap-2 rounded-ui-md border px-3.5 py-3 text-sm',
            submitMessage.type === 'success' ? 'border-success/30 bg-success-soft text-brand-strong' : 'border-danger/30 bg-danger-soft text-danger'
          )}
        >
          {submitMessage.type === 'success' ? <LuCircleCheck size={16} aria-hidden /> : <LuCircleAlert size={16} aria-hidden />}
          {submitMessage.text}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" size="lg" onClick={() => router.push(`/offers/${offerId}`)}>
          Anuluj
        </Button>
        <Button size="lg" loading={submitting} onClick={handleSubmit} leftIcon={<LuShieldAlert size={18} />}>
          {submitting ? 'Zapisywanie…' : 'Zapisz jako moderator'}
        </Button>
      </div>
    </div>
  );
}

const TRANSACTION_LABELS: Record<TransactionType, string> = { free: 'Za darmo', exchange: 'Wymiana', sale: 'Sprzedaż' };

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-ink-muted">{label}:</dt>
      <dd className="min-w-0 truncate font-medium text-ink">{value || '—'}</dd>
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

