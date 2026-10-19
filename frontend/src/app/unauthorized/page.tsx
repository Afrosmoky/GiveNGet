import { LuLock } from 'react-icons/lu';
import { AuthCard, AuthNotice, authLinkClass } from '../../components/auth/AuthCard';
import { Button } from '../../components/ui';
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <AuthCard
      icon={<LuLock size={24} />}
      tone="warning"
      showLogo={false}
      title="Brak autoryzacji"
      description="Ta strona jest dostępna tylko dla zalogowanych użytkowników. Zaloguj się, aby kontynuować."
      footer={
        <Link href="/" className={authLinkClass}>
          ← Wróć na stronę główną
        </Link>
      }
    >
      <div className="space-y-3">
        <Button href="/login" size="lg" fullWidth>
          Zaloguj się
        </Button>
        <Button href="/register" variant="secondary" size="lg" fullWidth>
          Utwórz nowe konto
        </Button>
        <AuthNotice tone="info" className="!mt-5">
          Jeśli masz już konto, a nadal widzisz ten komunikat, wyloguj się i zaloguj ponownie.
        </AuthNotice>
      </div>
    </AuthCard>
  );
}
