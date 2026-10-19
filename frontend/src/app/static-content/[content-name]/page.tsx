export const dynamic = "force-dynamic";
import { LuFileText } from 'react-icons/lu';
import { serverApiUrl } from '../../../config/serverApi';
import { Button, Card, cn, pageContainer } from '../../../components/ui';

export async function generateStaticParams() {
  return [
    { 'content-name': 'terms-of-service' },
    { 'content-name': 'privacy-policy' },
    { 'content-name': 'about' },
    { 'content-name': 'contact' },
    { 'content-name': 'help' },
  ];
}

/** Nazwy stron do nagłówka i <title>. Treść (HTML) przychodzi z backendu bez zmian. */
const TITLES: Record<string, string> = {
  'terms-of-service': 'Regulamin',
  'privacy-policy': 'Polityka prywatności',
  about: 'O nas',
  contact: 'Kontakt',
  help: 'Pomoc',
};

export async function generateMetadata({ params }: { params: Promise<{ 'content-name': string }> }) {
  const { 'content-name': contentName } = await params;
  return { title: TITLES[contentName] ? `${TITLES[contentName]} — Biovlo` : 'Biovlo' };
}

/** null = treść niedostępna (błąd serwera albo sieci) — strona pokazuje stan błędu. */
async function getContent(contentName: string): Promise<string | null> {
  const fullUrl = `${serverApiUrl()}/api/static-content/${encodeURIComponent(contentName)}`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 sekund timeout

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/json,text/plain,*/*',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return await response.text();
    }

    console.error(`Treść statyczna ${fullUrl}: ${response.status} ${response.statusText}`);
    return null;
  } catch (e) {
    console.error(`Treść statyczna ${fullUrl}: błąd połączenia`, e);
    return null;
  }
}

export default async function StaticContentPage({ params }: { params: Promise<{ 'content-name': string }> }) {
  const { 'content-name': contentName } = await params;
  const content = await getContent(contentName);
  const title = TITLES[contentName];

  return (
    <div className={cn(pageContainer, 'py-6 sm:py-10')}>
      {title && (
        <p className="mb-3 text-sm font-medium text-brand">
          {title}
        </p>
      )}

      {content === null ? (
        <Card padding="lg" className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken text-ink-muted" aria-hidden>
            <LuFileText size={22} />
          </div>
          <h1 className="text-lg font-semibold text-ink">Nie udało się wczytać treści</h1>
          <p className="mt-1 text-sm text-ink-muted">Spróbuj odświeżyć stronę za chwilę.</p>
          <Button href="/" variant="secondary" className="mt-5">
            Strona główna
          </Button>
        </Card>
      ) : (
        <Card padding="none" className="p-5 sm:p-10">
          {/* Treść z backendu (redagowana przez administratora) — wygląd nadaje .static-prose w globals.css */}
          {/* Karta na całą szerokość kontenera, sam tekst ograniczony do wygodnej długości wiersza */}
          <article className="static-prose max-w-3xl" dangerouslySetInnerHTML={{ __html: content }} />
        </Card>
      )}
    </div>
  );
}
