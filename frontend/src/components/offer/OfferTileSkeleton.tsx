import { cn } from '../ui';

/** Szkielet kafelka oferty — ten sam układ co OfferTile, żeby siatka nie skakała po załadowaniu. */
export function OfferTileSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('flex animate-pulse flex-col overflow-hidden rounded-ui-xl border border-line bg-surface shadow-card', className)}
    >
      <div className="aspect-[4/3] bg-surface-sunken" />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="h-4 w-4/5 rounded bg-surface-sunken" />
        <div className="h-4 w-1/2 rounded bg-surface-sunken" />
        <div className="h-3 w-1/3 rounded bg-surface-sunken" />
        <div className="mt-3 flex items-center justify-between">
          <div className="h-5 w-16 rounded bg-surface-sunken" />
          <div className="h-8 w-24 rounded-ui-sm bg-surface-sunken" />
        </div>
      </div>
    </div>
  );
}
