"use client";

import React, { useState, useEffect } from 'react';
import { getUserData, authorizedFetch, logout, fetchCurrentUserData } from '../../utils/auth';
import { useSearchParams } from 'next/navigation'; 
import { environment } from '../../config';
import { getImageUrl } from '../../utils/imageUtils';
import { AuthGuard } from '../../components/AuthGuard';
import { ProfileDetailView } from '../../components/ProfileDetailView';
import { OrdersDetailView } from '../../components/OrdersDetailView';
import { NotificationsDetailView } from '../../components/NotificationsDetailView';
import { FavoritesDetailView } from '../../components/FavoritesDetailView';
import { MyOffersDetailView } from '../../components/MyOffersDetailView';
import { LuBell, LuChevronRight, LuHeart, LuArrowLeft, LuLogOut, LuReceipt, LuTag, LuTrash2, LuUser } from 'react-icons/lu';
import UserRankBadge from '../../components/UserRankBadge';
import FreeOffersCounter from '../../components/FreeOffersCounter';
import { Alert, Avatar, Button, Card, Dialog, IconButton, PageHeader, cn, pageContainer } from '../../components/ui';

type View = 'main' | 'profile' | 'orders' | 'notifications' | 'favorites' | 'myOffers';

const SUBVIEW_TITLES: Record<Exclude<View, 'main'>, string> = {
  profile: 'Dane konta',
  orders: 'Zamówienia',
  notifications: 'Powiadomienia',
  favorites: 'Ulubione',
  myOffers: 'Moje oferty',
};

/** Podstrona konta: przycisk powrotu + tytuł, treść w tej samej kolumnie co reszta konta. */
function SubPage({ title, description, onBack, children }: { title: string; description?: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className={cn(pageContainer, 'py-6 sm:py-8')}>
      <div className="mb-5 flex items-start gap-2 sm:mb-6">
        <IconButton label="Wróć do konta" icon={<LuArrowLeft size={20} />} onClick={onBack} className="-ml-2 shrink-0" />
        <div className="min-w-0 pt-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-brand-ink sm:text-[28px]">{title}</h1>
          {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

interface MenuRowProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
}

function MenuRow({ icon, label, description, onClick, tone = 'default' }: MenuRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none sm:px-5"
      >
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-brand-soft text-brand'
          )}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block text-sm font-semibold', tone === 'danger' ? 'text-danger' : 'text-ink')}>{label}</span>
          {description && <span className="block truncate text-xs text-ink-muted">{description}</span>}
        </span>
        {tone !== 'danger' && <LuChevronRight size={18} className="shrink-0 text-ink-subtle" aria-hidden />}
      </button>
    </li>
  );
}

function ProfilePageContent() {
  const searchParams = useSearchParams();
  
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    userPhotoUrl: null as string | null,
    bio: '',
    userRank: 'STARTER' as string,
    trustPoints: 0,
    freeOffersCount: 5
  });
  
  const [currentView, setCurrentView] = useState<View>('main');
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const user = getUserData();

    if (user) {
      setUserData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        userPhotoUrl: user.profilePhotoUrl || null,
        bio: user.bio || '',
        userRank: user.userRank || 'STARTER',
        trustPoints: user.trustPoints || 0,
        freeOffersCount: user.freeOffersCount || 5
      });
      
      // Pobierz aktualne dane użytkownika z backendu
      fetchCurrentUserData().then(() => {
        // Po pobraniu danych z backendu, zaktualizuj stan
        const updatedUser = getUserData();
        if (updatedUser) {
        setUserData({
          firstName: updatedUser.firstName || '',
          lastName: updatedUser.lastName || '',
          email: updatedUser.email || '',
          phoneNumber: updatedUser.phoneNumber || '',
          userPhotoUrl: updatedUser.profilePhotoUrl || null,
          bio: updatedUser.bio || '',
          userRank: updatedUser.userRank || 'STARTER',
          trustPoints: updatedUser.trustPoints || 0,
          freeOffersCount: updatedUser.freeOffersCount || 5
        });
        }
      });
    }
  }, []);

  // Obsługa parametru URL view
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'myOffers') {
      setCurrentView('myOffers');
    }
  }, [searchParams]);

  // Funkcja do generowania URL obrazków
  const profileImageUrl = getImageUrl(userData.userPhotoUrl);

  const openView = (view: View) => {
    setCurrentView(view);
    // Podstrona zaczyna się od góry, nie w miejscu przewinięcia menu
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  };
  const handleBackClick = () => openView('main');

  const handlePhotoClick = () => {
    setShowPhotoUpload(true);
  };

  const handleAbortUpload = () => {
    setShowPhotoUpload(false);
    setSelectedPhoto(null);
    setIsDragOver(false);
  };

  // Usuwanie konta
  const openDeleteModal = () => {
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setShowDeleteModal(false);
    setDeleteError(null);
  };

  const confirmDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      setDeleteError(null);
      const response = await authorizedFetch(`${environment.apiUrl}/api/user/account`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const msg = await response.text();
        throw new Error(msg || 'Nie udało się zainicjować usuwania konta');
      }
      setShowDeleteModal(false);
      // Wyloguj użytkownika po potwierdzeniu usunięcia
      logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login?message=account-deletion-started';
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Wystąpił błąd';
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedPhoto(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setSelectedPhoto(file);
      }
    }
  };

  const handleChangePhoto = async () => {
    if (!selectedPhoto) return;
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('profilePhoto', selectedPhoto);
      
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${environment.apiUrl}/api/user/uploadPhoto`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        mode: 'cors'
      });
      
      if (response.ok) {
        const newPhotoUrl = await response.text();
        localStorage.setItem('userPhotoUrl', newPhotoUrl);
        setUserData(prev => ({
          ...prev,
          userPhotoUrl: newPhotoUrl
        }));
        
        setShowPhotoUpload(false);
        setSelectedPhoto(null);
      } else {
        console.error('Błąd podczas zmiany zdjęcia profilowego');
      }
    } catch (error) {
      console.error('Błąd połączenia:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const fullName = [userData.firstName, userData.lastName].filter(Boolean).join(' ');

  if (currentView === 'profile') {
    return (
      <SubPage title={SUBVIEW_TITLES.profile} description="Dane osobowe, logowanie i adres odbioru." onBack={handleBackClick}>
        <ProfileDetailView
          userData={userData}
          profileImageUrl={profileImageUrl}
          showPhotoUpload={showPhotoUpload}
          selectedPhoto={selectedPhoto}
          isDragOver={isDragOver}
          isUploading={isUploading}
          onPhotoClick={handlePhotoClick}
          onAbortUpload={handleAbortUpload}
          onFileSelect={handleFileSelect}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onChangePhoto={handleChangePhoto}
        />

        {/* Strefa niebezpieczna: usunięcie konta */}
        <Card className="mt-6 flex flex-col gap-3 border-danger/30 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Usuń konto</h2>
            <p className="mt-0.5 text-sm text-ink-muted">Konto zostanie usunięte po 14 dniach nieaktywności.</p>
          </div>
          <Button variant="danger" leftIcon={<LuTrash2 size={16} />} onClick={openDeleteModal} className="shrink-0">
            Usuń konto
          </Button>
        </Card>

        <Dialog
          open={showDeleteModal}
          onClose={closeDeleteModal}
          title="Usunąć konto?"
          footer={
            <>
              <Button variant="secondary" onClick={closeDeleteModal} disabled={isDeleting}>
                Anuluj
              </Button>
              <Button variant="danger" onClick={confirmDeleteAccount} loading={isDeleting}>
                {isDeleting ? 'Usuwanie…' : 'Usuń konto'}
              </Button>
            </>
          }
        >
          <p className="text-sm text-ink">
            Czy na pewno chcesz usunąć konto? Usunięcie zostanie zrealizowane po 14 dniach nieaktywności. Po kliknięciu
            przycisku <strong>Usuń konto</strong> zostaniesz natychmiast wylogowany.
          </p>
          {deleteError && (
            <Alert tone="danger" className="mt-3">
              {deleteError}
            </Alert>
          )}
        </Dialog>
      </SubPage>
    );
  }

  if (currentView === 'orders') {
    return (
      <SubPage title={SUBVIEW_TITLES.orders} onBack={handleBackClick}>
        <OrdersDetailView />
      </SubPage>
    );
  }

  if (currentView === 'notifications') {
    return (
      <SubPage title={SUBVIEW_TITLES.notifications} onBack={handleBackClick}>
        <NotificationsDetailView />
      </SubPage>
    );
  }

  if (currentView === 'favorites') {
    return (
      <SubPage title={SUBVIEW_TITLES.favorites} onBack={handleBackClick}>
        <FavoritesDetailView />
      </SubPage>
    );
  }

  if (currentView === 'myOffers') {
    return (
      <SubPage title={SUBVIEW_TITLES.myOffers} description="Kliknij ofertę, aby ją edytować." onBack={handleBackClick}>
        <MyOffersDetailView />
      </SubPage>
    );
  }

  // Widok główny konta
  return (
    <div className={cn(pageContainer, 'py-6 sm:py-8')}>
      <PageHeader title="Konto" description="Twoje dane, oferty i ustawienia." />

      <div className="grid gap-4 md:grid-cols-[300px_1fr] md:items-start">
        {/* Wizytówka */}
        <Card padding="lg" className="flex flex-col items-center gap-3 text-center">
          <Avatar name={fullName || userData.email} src={profileImageUrl} size="lg" className="!h-24 !w-24 !text-2xl" />
          <div className="min-w-0 max-w-full">
            <p className="truncate text-lg font-semibold text-ink">{fullName || 'Twoje konto'}</p>
            <p className="truncate text-sm text-ink-muted">{userData.email}</p>
          </div>
          <div className="flex flex-col items-center gap-2 border-t border-line pt-3">
            <UserRankBadge rank={userData.userRank} trustPoints={userData.trustPoints} showPoints size="medium" clickable />
            <FreeOffersCounter freeOffersCount={userData.freeOffersCount} size="medium" />
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card padding="none" className="overflow-hidden">
            <ul className="divide-y divide-line">
              <MenuRow icon={<LuUser size={18} />} label="Dane konta" description="Imię, zdjęcie, e-mail, hasło, adres" onClick={() => openView('profile')} />
              <MenuRow icon={<LuTag size={18} />} label="Moje oferty" description="Wystawione oferty i ich statusy" onClick={() => openView('myOffers')} />
              <MenuRow icon={<LuReceipt size={18} />} label="Zamówienia" description="Wkrótce" onClick={() => openView('orders')} />
              <MenuRow icon={<LuBell size={18} />} label="Powiadomienia" description="Powiadomienia push i ustawienia" onClick={() => openView('notifications')} />
              <MenuRow icon={<LuHeart size={18} />} label="Ulubione" description="Zapisane oferty i kategorie" onClick={() => openView('favorites')} />
            </ul>
          </Card>

          <Card padding="none" className="overflow-hidden">
            <ul>
              <MenuRow
                icon={<LuLogOut size={18} />}
                label="Wyloguj"
                tone="danger"
                onClick={() => {
                  logout();
                  if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                  }
                }}
              />
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfilePageContent />
    </AuthGuard>
  );
}
