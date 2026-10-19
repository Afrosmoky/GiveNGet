"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { environment } from "../../config";
import { saveAuthData } from "../../utils/auth";
import { AuthGuard } from "../../components/AuthGuard";
import { LuEye, LuEyeOff, LuLock, LuMail } from "react-icons/lu";
import { AuthCard, AuthNotice, authLinkClass } from "../../components/auth/AuthCard";
import { Button, IconButton, Input, cn } from "../../components/ui";
import { describeErrorCode, parseApiError } from "../../utils/apiErrors";

/** Kody dla odpowiedzi bez treści w formacie 6.3 (backend sprzed zmiany kontraktu logowania). */
const LEGACY_STATUS_CODES: Record<number, string> = {
  400: "INVALID_CREDENTIALS",
  401: "ACCOUNT_NOT_CONFIRMED",
  429: "RATE_LIMIT_EXCEEDED",
};

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });

  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });

  const [showPassword, setShowPassword] = useState(false);

  // Sprawdź parametry URL po załadowaniu komponentu
  useEffect(() => {
    const message = searchParams.get('message');
    if (message === 'password-reset-success') {
      setSubmitMessage({
        type: 'success',
        text: 'Hasło zostało pomyślnie zmienione! Możesz się teraz zalogować.'
      });
      
      // Usuń komunikat po 5 sekundach
      setTimeout(() => {
        setSubmitMessage(null);
      }, 5000);
    } else if (message === 'auth-required') {
      setSubmitMessage({
        type: 'error',
        text: 'Musisz być zalogowany, aby uzyskać dostęp do tej strony.'
      });
    } else if (message === 'account-deletion-started') {
      setSubmitMessage({
        type: 'success',
        text: 'Zainicjowano usuwanie konta. Twoje konto zostanie usunięte po 14 dniach nieaktywności.'
      });
      
      // Usuń komunikat po 8 sekundach
      setTimeout(() => {
        setSubmitMessage(null);
      }, 8000);
    }
  }, [searchParams]);

  const validateField = (name: string, value: string) => {
    switch (name) {
      case "email":
        if (value.trim() === "") return "Email jest wymagany";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !emailRegex.test(value) ? "Podaj prawidłowy adres email" : "";
      case "password":
        if (value.trim() === "") return "Hasło jest wymagane";
        return value.length < 6 ? "Hasło musi mieć co najmniej 6 znaków" : "";
      default:
        return "";
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Jeśli pole było już touched, waliduj na bieżąco
    if (touched[name as keyof typeof touched]) {
      const error = validateField(name, value);
      setErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));

    const error = validateField(name, value);
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Wyczyść poprzednie komunikaty
    setSubmitMessage(null);

    // Waliduj wszystkie pola naraz
    const newErrors = {
      email: validateField("email", formData.email),
      password: validateField("password", formData.password),
    };

    // Oznacz wszystkie pola jako touched
    setTouched({
      email: true,
      password: true,
    });

    setErrors(newErrors);

    // Sprawdź czy są jakieś błędy
    const hasErrors = Object.values(newErrors).some((error) => error !== "");

    if (!hasErrors) {
      setIsSubmitting(true);

      try {
        const dataToSend = {
          email: formData.email,
          password: formData.password,
        };


        const response = await fetch(`${environment.apiUrl}/api/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dataToSend),
          mode: "cors",
        });


        if (response.ok) {
          const result = await response.json();

          // Walidacja userType
          // STORE_EMPLOYEE = pracownik sklepu (potwierdzanie odbioru rezerwacji).
          // Bez tej wartości logowanie takiego konta kończy się błędem walidacji.
          const validUserTypes = ['REGULAR', 'COMPANY', 'EMPLOYEE', 'STORE_EMPLOYEE', 'ADMIN'];
          
          if (!result.userType || !validUserTypes.includes(result.userType)) {
            console.error(`Błąd walidacji userType: otrzymano nieprawidłową wartość '${result.userType}'. Dozwolone wartości: ${validUserTypes.join(', ')}`);
            
            setSubmitMessage({
              type: "error",
              text: "Wystąpił problem z danymi użytkownika. Prosimy skontaktować się z administratorem.",
            });
            
            // Odśwież stronę po 3 sekundach
            setTimeout(() => {
              window.location.reload();
            }, 3000);
            
            return;
          }

          if (result.token) {
            saveAuthData({
              token: result.token,
              tokenType: result.tokenType || "Bearer",
              email: result.email,
              firstName: result.firstName,
              lastName: result.lastName,
              phoneNumber: result.phoneNumber,
              id: result.id,
              profilePhotoUrl: result.profilePhotoUrl,
              userType: result.userType,
              lang: result.lang || 'pl',
              currency: result.currency || 'PLN',
              lat: result.lat || 0,
              lon: result.lon || 0,
              bio: result.description || result.bio || ''
            });
          }

          setSubmitMessage({
            type: "success",
            text: `Witaj ${result.firstName}! Logowanie przebiegło pomyślnie!`,
          });

          setTimeout(() => {
            // Sprawdź czy jest redirect URL w parametrach
            const redirectUrl = searchParams.get('redirect');
            if (redirectUrl) {
              router.push(redirectUrl);
            } else {
              window.location.replace(result.homeUrl);
            }
          }, 1500);
        } else {
          // Rozgałęzienie po `code` (format 6.3); status tylko jako fallback dla starszego backendu
          const body = await response.text().catch(() => '');
          const apiError = parseApiError(body);
          const code = apiError?.code ?? LEGACY_STATUS_CODES[response.status];

          if (code === 'ACCOUNT_NOT_CONFIRMED') {
            router.push(
              `/user-not-confirmed?email=${encodeURIComponent(formData.email)}`
            );
            return;
          }

          setSubmitMessage({
            type: "error",
            text: code
              ? describeErrorCode(code, apiError?.message ?? '')
              : "Wystąpił nieznany błąd. Spróbuj ponownie lub skontaktuj się z administratorem.",
          });
        }
      } catch (error) {
        console.error("Błąd połączenia:", error);
        setSubmitMessage({
          type: "error",
          text: "Błąd połączenia z serwerem. Sprawdź połączenie internetowe.",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <AuthCard
      title="Zaloguj się"
      description="Ratuj jedzenie z okolicy — taniej albo za darmo."
      footer={
        <>
          Nie masz konta?{" "}
          <Link href="/register" className={authLinkClass}>
            Załóż konto
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {submitMessage && <AuthNotice tone={submitMessage.type === "success" ? "success" : "danger"}>{submitMessage.text}</AuthNotice>}

        <Input
          label="E-mail"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          size="lg"
          value={formData.email}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder="ty@przyklad.pl"
          error={errors.email || undefined}
          leftIcon={<LuMail size={16} />}
        />

        <div>
          <Input
            label="Hasło"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            size="lg"
            value={formData.password}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder="Twoje hasło"
            error={errors.password || undefined}
            leftIcon={<LuLock size={16} />}
            rightSlot={
              <IconButton
                label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
                icon={showPassword ? <LuEyeOff size={16} /> : <LuEye size={16} />}
                onClick={() => setShowPassword(v => !v)}
                className="h-9 w-9"
              />
            }
          />
          <div className="mt-2 text-right">
            <Link href="/reset-password" className={cn(authLinkClass, "text-sm")}>
              Nie pamiętasz hasła?
            </Link>
          </div>
        </div>

        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          {isSubmitting ? "Logowanie…" : "Zaloguj"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <AuthGuard requireAuth={false}>
      <LoginPageContent />
    </AuthGuard>
  );
}