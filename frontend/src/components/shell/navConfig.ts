import type { IconType } from 'react-icons';
import {
  FiAlertTriangle,
  FiBarChart2,
  FiCalendar,
  FiCamera,
  FiGrid,
  FiHeadphones,
  FiHeart,
  FiMap,
  FiMessageSquare,
  FiPackage,
  FiPlusCircle,
  FiSearch,
  FiShoppingBag,
  FiSlash,
  FiTrendingUp,
  FiUpload,
  FiUser,
  FiUsers,
} from 'react-icons/fi';
import type { AuthTokenData } from '../../utils/auth';

export interface NavItem {
  label: string;
  icon: IconType;
  /** Brak href = pozycja „wkrótce” (strona jeszcze nie istnieje). */
  href?: string;
  /** Aktywna tylko przy dokładnym dopasowaniu ścieżki (np. /admin vs /admin/users). */
  exact?: boolean;
}

export type ShellVariant = 'pending' | 'consumer' | 'company' | 'admin' | 'store';

type UserType = AuthTokenData['userType'];

/** Wybór powłoki po typie konta. Gość i REGULAR → konsument. */
export function shellVariantFor(ready: boolean, userType: UserType | null): ShellVariant {
  if (!ready) return 'pending';
  switch (userType) {
    case 'COMPANY':
      return 'company';
    case 'ADMIN':
    case 'EMPLOYEE':
      return 'admin';
    case 'STORE_EMPLOYEE':
      return 'store';
    default:
      return 'consumer';
  }
}

export function isNavActive(pathname: string, item: NavItem): boolean {
  if (!item.href) return false;
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + '/');
}

// ---------- Konsument ----------

export const consumerTopNav: NavItem[] = [
  { label: 'Oferty', href: '/offers/search', icon: FiSearch },
  { label: 'Mapa', href: '/offers/map', icon: FiMap },
  { label: 'Moje rezerwacje', href: '/reservations', icon: FiCalendar },
  { label: 'Ulubione', href: '/favorites', icon: FiHeart },
];

export const consumerBottomNav: NavItem[] = [
  { label: 'Oferty', href: '/offers/search', icon: FiSearch },
  { label: 'Ulubione', href: '/favorites', icon: FiHeart },
  { label: 'Dodaj', href: '/create-offer', icon: FiPlusCircle },
  { label: 'Rezerwacje', href: '/reservations', icon: FiCalendar },
  { label: 'Konto', href: '/profile', icon: FiUser },
];

// ---------- Konsola firmy ----------

export function companyNav(userId?: number): NavItem[] {
  return [
    { label: 'Pulpit', href: '/dashboard', icon: FiGrid, exact: true },
    { label: 'Oferty', href: '/profile', icon: FiPackage, exact: true },
    { label: 'Dodaj ofertę', href: '/create-offer', icon: FiPlusCircle },
    { label: 'Import', href: '/offers/import', icon: FiUpload },
    { label: 'Rezerwacje', href: '/store/reservations', icon: FiCalendar },
    { label: 'Raport', href: '/reports/savings', icon: FiBarChart2 },
    { label: 'Pracownicy', href: '/store/employees', icon: FiUsers },
    { label: 'Profil sklepu', href: userId ? `/stores/${userId}` : undefined, icon: FiShoppingBag },
  ];
}

// ---------- Konsola admina / moderatora ----------

export function adminNav(isPlatformAdmin: boolean): NavItem[] {
  return [
    { label: 'Panel', href: '/admin', icon: FiGrid, exact: true },
    // Statystyki i raport tylko dla ADMIN — moderator (EMPLOYEE) ich nie widzi, jak w dotychczasowym menu
    ...(isPlatformAdmin ? [{ label: 'Statystyki pilotażu', href: '/admin/stats', icon: FiTrendingUp }] : []),
    // Lista użytkowników i wzorce stoją na /api/admin/** (tylko ADMIN) — moderatorowi dawały same błędy 403
    ...(isPlatformAdmin ? [{ label: 'Użytkownicy', href: '/admin/users', icon: FiUsers }] : []),
    { label: 'Skargi', href: '/admin/complaints', icon: FiAlertTriangle },
    ...(isPlatformAdmin ? [{ label: 'Słowa zakazane', href: '/admin/forbidden-words', icon: FiSlash }] : []),
    { label: 'Czaty z konsultantem', href: '/admin/consultant-chats', icon: FiHeadphones },
    ...(isPlatformAdmin ? [{ label: 'Raport oszczędności', href: '/reports/savings', icon: FiBarChart2 }] : []),
    { label: 'Przeglądaj oferty', href: '/offers/search', icon: FiSearch },
  ];
}

// ---------- Pracownik sklepu ----------

export const storeNav: NavItem[] = [{ label: 'Odbiór', href: '/store/pickup', icon: FiCamera }];

// ---------- Menu użytkownika (avatar) ----------

export function userMenuItems(variant: ShellVariant, userType: UserType | null): NavItem[] {
  const messages: NavItem = { label: 'Wiadomości', href: '/chats', icon: FiMessageSquare };
  const profile: NavItem = { label: 'Mój profil', href: '/profile', icon: FiUser };
  switch (variant) {
    case 'consumer':
      return [
        profile,
        messages,
        ...(userType === 'REGULAR' ? [{ label: 'Moje rezerwacje', href: '/reservations', icon: FiCalendar }] : []),
        { label: 'Dodaj ofertę', href: '/create-offer', icon: FiPlusCircle },
      ];
    case 'company':
    case 'admin':
      return [profile, messages];
    case 'store':
      return [{ label: 'Potwierdzanie odbioru', href: '/store/pickup', icon: FiCamera }];
    default:
      return [];
  }
}
