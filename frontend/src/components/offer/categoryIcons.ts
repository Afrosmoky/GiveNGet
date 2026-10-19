import type { IconType } from 'react-icons';
import {
  LuBaby,
  LuBeef,
  LuCandy,
  LuCarrot,
  LuChefHat,
  LuCroissant,
  LuCupSoda,
  LuMilk,
  LuPackage,
  LuPawPrint,
  LuSnowflake,
  LuSoup,
  LuSprayCan,
  LuStore,
  LuWheat,
} from 'react-icons/lu';

/**
 * Ikona kategorii na kafelku oferty bez zdjęcia.
 * ID kategorii są stałe — zakłada je migracja db/31-update-categories-structure.sql.
 * Nowa kategoria bez wpisu dostaje ikonę ogólną.
 */
const CATEGORY_ICONS: Record<number, IconType> = {
  1: LuChefHat, // Dania domowe (prywatne)
  2: LuStore, // Nadwyżki restauracyjne/sklepowe
  3: LuCarrot, // Owoce i warzywa
  4: LuMilk, // Nabiał i alternatywy
  5: LuBeef, // Mięso, drób i ryby
  6: LuCroissant, // Pieczywo i wypieki
  7: LuWheat, // Spiżarnia i produkty suche
  8: LuSnowflake, // Mrożonki
  9: LuSoup, // Dania gotowe i przygotowane
  10: LuCandy, // Słodycze i przekąski
  11: LuCupSoda, // Napoje bezalkoholowe
  12: LuBaby, // Dziecko i niemowlę
  13: LuPawPrint, // Karma dla zwierząt
  14: LuSprayCan, // Chemia i artykuły domowe (non-food)
};

export function categoryIcon(categoryId?: number | null): IconType {
  return (categoryId != null && CATEGORY_ICONS[categoryId]) || LuPackage;
}
