"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { environment } from "../../config";
import { saveAuthData } from "../../utils/auth";
import { AuthGuard } from "../../components/AuthGuard";
import Image from "next/image";

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

  const [isMobile, setIsMobile] = useState(false);

  // Sprawdź czy jesteśmy na urządzeniu mobilnym
  useEffect(() => {
    const updateIsMobile = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 640);
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

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

        console.log(
          "Wysyłam dane logowania na:",
          `${environment.apiUrl}/api/auth/login`
        );

        const response = await fetch(`${environment.apiUrl}/api/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dataToSend),
          mode: "cors",
        });

        console.log("Odpowiedź:", response);

        if (response.ok) {
          const result = await response.json();
          console.log("Sukces:", result);

          // Walidacja userType
          const validUserTypes = ['REGULAR', 'COMPANY', 'EMPLOYEE', 'ADMIN'];
          
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
          const errorData = await response.json().catch(() => ({}));
          console.error("Błąd serwera:", errorData);
          console.log("Status:", response.status);

          if (response.status === 400) {
            setSubmitMessage({
              type: "error",
              text: "Niepoprawny email lub hasło. Sprawdź swoje dane logowania.",
            });
          } else if (response.status === 401) {
            router.push(
              `/user-not-confirmed?email=${encodeURIComponent(formData.email)}`
            );
            return;
          } else {
            setSubmitMessage({
              type: "error",
              text: "Wystąpił nieznany błąd. Spróbuj ponownie. Lub skontaktuj się z administratorem.",
            });
          }
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

  const getInputStyle = (fieldName: keyof typeof errors) => ({
    width: "100%",
    padding: "16px",
    border: "none",
    borderBottom: `2px solid ${errors[fieldName] ? "#ef4444" : "#e2e8f0"}`,
    fontSize: "16px",
    backgroundColor: "transparent",
    outline: "none",
    transition: "border-color 0.3s",
    color: "#2d3748",
  });

  const handleInputFocus = (
    e: React.FocusEvent<HTMLInputElement>,
    fieldName: keyof typeof errors
  ) => {
    if (!errors[fieldName]) {
      e.target.style.borderBottomColor = "#fbbf24";
    }
  };



  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f7fafc",
        padding: "0px 20px",
        paddingTop: isMobile ? "20px" : "0px",
        paddingBottom: isMobile ? "120px" : "0px",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          width: "100%",
          maxWidth: "500px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Kontener z paddingiem dla zawartości */}
        <div style={{ padding: isMobile ? "20px" : "40px" }}>
          {/* Logo na górze */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: isMobile ? "20px" : "30px",
            }}
          >
            <Image
              src="/images/logo.png"
              alt="GnG Logo"
              width={isMobile ? 120 : 150}
              height={isMobile ? 60 : 75}
              style={{ objectFit: "contain" }}
            />
          </div>

          {/* Kolorowa grafika z jedzeniem */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: isMobile ? "20px" : "30px",
            }}
          >
            <Image
              src="/images/food-image.svg"
              alt="Food Image"
              width={isMobile ? 250 : 300}
              height={isMobile ? 150 : 200}
              style={{ objectFit: "contain", width: "100%" }}
            />
          </div>

          {/* Przyciski Logowanie i Rejestracja */}
          <div
            style={{
              display: "flex",
              gap: isMobile ? "12px" : "20px",
              marginBottom: isMobile ? "20px" : "30px",
            }}
          >
            <div
              style={{
                flex: 1,
                padding: "16px",
                backgroundColor: "#f7fafc",
                borderRadius: "8px",
                textAlign: "center",
                fontSize: "16px",
                fontWeight: "bold",
                color: "#2d3748",
                border: "2px solid #fbbf24",
              }}
            >
              Logowanie
            </div>
            <Link
              href="/register"
              style={{
                flex: 1,
                padding: "16px",
                backgroundColor: "#f7fafc",
                borderRadius: "8px",
                textAlign: "center",
                fontSize: "16px",
                fontWeight: "bold",
                color: "#4a5568",
                textDecoration: "none",
                border: "2px solid #e2e8f0",
                transition: "all 0.3s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = "#fbbf24";
                e.currentTarget.style.color = "#2d3748";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.color = "#4a5568";
              }}
            >
              Rejestracja
            </Link>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "#4a5568",
                  fontSize: "16px",
                }}
              >
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={handleBlur}
                style={getInputStyle("email")}
                onFocus={(e) => handleInputFocus(e, "email")}
                placeholder="Wprowadź swój email"
              />
              {errors.email && (
                <div
                  style={{ color: "red", fontSize: "12px", marginTop: "4px" }}
                >
                  {errors.email}
                </div>
              )}
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "#4a5568",
                  fontSize: "16px",
                }}
              >
                Hasło
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                onBlur={handleBlur}
                style={getInputStyle("password")}
                onFocus={(e) => handleInputFocus(e, "password")}
                placeholder="Wprowadź swoje hasło"
              />
              {errors.password && (
                <div
                  style={{ color: "red", fontSize: "12px", marginTop: "4px" }}
                >
                  {errors.password}
                </div>
              )}
            </div>

            {/* Link do resetowania hasła */}
            <div
              style={{
                textAlign: "center",
                marginBottom: "20px",
              }}
            >
              <span style={{ color: "#4a5568", fontSize: "14px" }}>
                Zapomniałeś/łaś hasła?{" "}
              </span>
              <Link
                href="/reset-password"
                style={{
                  color: "#fbbf24",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                Resetuj tutaj
              </Link>
            </div>

            {/* Komunikat o wyniku wysyłania */}
            {submitMessage && (
              <div
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  backgroundColor:
                    submitMessage.type === "success" ? "#f0fff4" : "#fef2f2",
                  border: `1px solid ${
                    submitMessage.type === "success" ? "#68d391" : "#f87171"
                  }`,
                  color:
                    submitMessage.type === "success" ? "#2d3748" : "#dc2626",
                  textAlign: "center",
                }}
              >
                {submitMessage.text}
              </div>
            )}

            {/* Przycisk Zaloguj */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`btn-primary ${isSubmitting ? 'btn-loading' : ''}`}
            >
              {isSubmitting && (
                <div className="loading-spinner" />
              )}
              {isSubmitting ? "Logowanie..." : "Zaloguj"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthGuard requireAuth={false}>
      <LoginPageContent />
    </AuthGuard>
  );
}