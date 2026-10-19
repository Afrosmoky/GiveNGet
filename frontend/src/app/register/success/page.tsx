import { LuMailCheck } from 'react-icons/lu';
import { AuthCard, AuthNotice } from '../../../components/auth/AuthCard';
import { Button } from '../../../components/ui';

export default function RegisterSuccessPage() {
  return (
    <AuthCard
      icon={<LuMailCheck size={26} />}
      tone="success"
      showLogo={false}
      title="Rejestracja zakończona sukcesem!"
      description={
        <>
          <p>Twoje konto zostało utworzone pomyślnie.</p>
          <p className="mt-2">
            Na podany adres e-mail wysłaliśmy <strong className="font-semibold text-ink">link aktywacyjny</strong>.
            Kliknij go, aby aktywować konto. Sprawdź też folder spam.
          </p>
        </>
      }
    >
      <div className="space-y-4">
        <Button href="/login" size="lg" fullWidth>
          Przejdź do logowania
        </Button>
        <p className="text-center text-xs text-ink-muted">Po aktywacji konta będziesz mógł się zalogować.</p>
        <AuthNotice tone="info">
          <strong className="font-semibold text-ink">Uwaga:</strong> link aktywacyjny ma ograniczony czas ważności.
          Jeśli e-mail nie dotrze w ciągu kilku minut, spróbuj zarejestrować się ponownie.
        </AuthNotice>
      </div>
    </AuthCard>
  );
}
