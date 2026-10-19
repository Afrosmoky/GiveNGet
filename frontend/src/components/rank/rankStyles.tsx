import type { IconType } from 'react-icons';
import { LuBadgeCheck, LuCrown, LuHeartHandshake, LuShieldCheck, LuSprout } from 'react-icons/lu';
import type { UserRank } from '../../types/offer';

export const RANKS: UserRank[] = ['STARTER', 'RELIABLE_SELLER', 'TRUSTED_PARTNER', 'LOCAL_HERO', 'AMBASSADOR'];

interface RankStyle {
  icon: IconType;
  /** Klasy pigułki: tło, tekst, obramowanie — wyłącznie tokeny marki. */
  pill: string;
}

/**
 * Wygląd rang — drabinka zieleni marki: od neutralnej (Nowicjusz) po pełny kolor (Ambasador).
 * Jedno źródło dla badge'a i okna z opisem rang.
 */
export const RANK_STYLES: Record<UserRank, RankStyle> = {
  STARTER: { icon: LuSprout, pill: 'border-line bg-surface-sunken text-ink-muted' },
  RELIABLE_SELLER: { icon: LuBadgeCheck, pill: 'border-brand/20 bg-brand-soft text-brand-strong' },
  TRUSTED_PARTNER: { icon: LuShieldCheck, pill: 'border-brand-teal/30 bg-brand-teal/10 text-brand-teal' },
  LOCAL_HERO: { icon: LuHeartHandshake, pill: 'border-brand-accent/30 bg-brand-accent/15 text-brand-accent-ink' },
  AMBASSADOR: { icon: LuCrown, pill: 'border-brand bg-brand text-brand-contrast' },
};

export function rankStyle(rank?: UserRank | string): RankStyle {
  return RANK_STYLES[rank as UserRank] ?? RANK_STYLES.STARTER;
}
