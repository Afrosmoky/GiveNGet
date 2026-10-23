-- Rebranding stylu maili: niebieski → kolory Biovlo (zieleń #0C6B4C, nagłówki #083D2E).
-- Wspólny layout tabelowy z inline stylami (Gmail/Outlook), tekstowy znak „Biovlo” w nagłówku,
-- stopka bez twardego roku. Treść i placeholdery ${...} bez zmian (również {reason} w delete-offer).
-- Kolory semantyczne zostają: czerwień dla blokad/ostrzeżeń bezpieczeństwa, bursztyn dla uwag.

UPDATE mail_templates
SET template = '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Potwierdzenie Rejestracji</title>
    <style>
        /* Tylko uzupełnienie — wszystkie kolory są inline; hover działa tam, gdzie klient obsługuje <style> */
        a.btn-cta:hover, td.btn-cta:hover { background-color: #0A5740 !important; }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F7F5">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4F7F5" style="background-color:#F4F7F5">
        <tr>
            <td align="center" style="padding:24px 12px">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #E3EAE6;border-radius:12px">
                    <tr>
                        <td style="padding:22px 32px;border-bottom:3px solid #0C6B4C;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1;font-weight:700;letter-spacing:-0.5px;color:#0C6B4C">Biovlo</td>
                    </tr>
                    <tr>
                        <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;text-align:left">

                <h1 style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#083D2E">Dziękujemy za rejestrację!</h1>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Witaj ${user}!</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Dziękujemy za dołączenie do naszej społeczności. Aby aktywować swoje konto i rozpocząć korzystanie z naszych usług, kliknij poniższy przycisk:</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px"><tr><td class="btn-cta" bgcolor="#0C6B4C" style="border-radius:8px;background-color:#0C6B4C"><a class="btn-cta" href="${activationlink}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:8px;background-color:#0C6B4C">Aktywuj konto</a></td></tr></table>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;margin-top:25px">Jeśli przycisk nie działa, możesz również skopiować i wkleić poniższy link do swojej przeglądarki:</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333"><a href="${activationlink}" style="color:#0C6B4C;text-decoration:underline;word-break:break-all">${activationlink}</a></p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">W razie jakichkolwiek pytań lub problemów, prosimy o kontakt z naszym wsparciem.</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Pozdrawiamy,<br>Zespół Biovlo</p>
            
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px;border-top:1px solid #E3EAE6;background-color:#F4F7F5;border-radius:0 0 12px 12px;text-align:center">

                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">Otrzymałeś tę wiadomość, ponieważ zarejestrowałeś się na stronie Biovlo.</p>
                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">&copy; Biovlo. Wszelkie prawa zastrzeżone.</p>
            
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'
WHERE name = 'verifyEmail';

UPDATE mail_templates
SET template = '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Resetowanie Hasła</title>
    <style>
        /* Tylko uzupełnienie — wszystkie kolory są inline; hover działa tam, gdzie klient obsługuje <style> */
        a.btn-cta:hover, td.btn-cta:hover { background-color: #0A5740 !important; }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F7F5">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4F7F5" style="background-color:#F4F7F5">
        <tr>
            <td align="center" style="padding:24px 12px">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #E3EAE6;border-radius:12px">
                    <tr>
                        <td style="padding:22px 32px;border-bottom:3px solid #0C6B4C;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1;font-weight:700;letter-spacing:-0.5px;color:#0C6B4C">Biovlo</td>
                    </tr>
                    <tr>
                        <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;text-align:left">

                <h1 style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#083D2E">Resetowanie Hasła</h1>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Cześć ${userName}!</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta. Aby ustawić nowe hasło, kliknij poniższy przycisk:</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px"><tr><td class="btn-cta" bgcolor="#0C6B4C" style="border-radius:8px;background-color:#0C6B4C"><a class="btn-cta" href="${resetLink}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:8px;background-color:#0C6B4C">Zresetuj Hasło</a></td></tr></table>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;margin-top:25px">Jeśli przycisk nie działa, możesz również skopiować i wkleić poniższy link do swojej przeglądarki:</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333"><a href="${resetLink}" style="color:#0C6B4C;text-decoration:underline;word-break:break-all">${resetLink}</a></p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Jeśli to nie Ty prosiłeś o zresetowanie hasła, możesz zignorować tę wiadomość.</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">W razie jakichkolwiek pytań lub problemów, prosimy o kontakt z naszym wsparciem.</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Pozdrawiamy,<br>Zespół Biovlo</p>
            
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px;border-top:1px solid #E3EAE6;background-color:#F4F7F5;border-radius:0 0 12px 12px;text-align:center">

                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">Otrzymałeś tę wiadomość, ponieważ została zgłoszona prośba o reset hasła na stronie Biovlo.</p>
                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">&copy; Biovlo. Wszelkie prawa zastrzeżone.</p>
            
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'
WHERE name = 'reset-password';

UPDATE mail_templates
SET template = '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Potwierdzenie Zmiany Hasła</title>
    <style>
        /* Tylko uzupełnienie — wszystkie kolory są inline; hover działa tam, gdzie klient obsługuje <style> */
        a.btn-cta:hover, td.btn-cta:hover { background-color: #0A5740 !important; }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F7F5">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4F7F5" style="background-color:#F4F7F5">
        <tr>
            <td align="center" style="padding:24px 12px">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #E3EAE6;border-radius:12px">
                    <tr>
                        <td style="padding:22px 32px;border-bottom:3px solid #0C6B4C;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1;font-weight:700;letter-spacing:-0.5px;color:#0C6B4C">Biovlo</td>
                    </tr>
                    <tr>
                        <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;text-align:left">

                <h1 style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#083D2E">Twoje hasło zostało zmienione!</h1>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Jeśli to Ty dokonałeś tej zmiany, możesz zignorować tę wiadomość. Twoje konto jest bezpieczne.</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;color:#B42318;font-weight:700">Jeśli jednak nie Ty zmieniłeś hasło, prosimy o natychmiastowy kontakt z administratorem w celu zabezpieczenia konta.</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">W razie jakichkolwiek pytań lub problemów, prosimy o kontakt z naszym wsparciem technicznym.</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Pozdrawiamy,<br>Zespół Biovlo</p>
            
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px;border-top:1px solid #E3EAE6;background-color:#F4F7F5;border-radius:0 0 12px 12px;text-align:center">

                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">Otrzymałeś tę wiadomość, ponieważ zarejestrowałeś się na stronie Biovlo.</p>
                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">&copy; Biovlo. Wszelkie prawa zastrzeżone.</p>
            
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'
WHERE name = 'change-password-notification';

UPDATE mail_templates
SET template = '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Potwierdzenie Zmiany Adresu Email</title>
    <style>
        /* Tylko uzupełnienie — wszystkie kolory są inline; hover działa tam, gdzie klient obsługuje <style> */
        a.btn-cta:hover, td.btn-cta:hover { background-color: #0A5740 !important; }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F7F5">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4F7F5" style="background-color:#F4F7F5">
        <tr>
            <td align="center" style="padding:24px 12px">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #E3EAE6;border-radius:12px">
                    <tr>
                        <td style="padding:22px 32px;border-bottom:3px solid #0C6B4C;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1;font-weight:700;letter-spacing:-0.5px;color:#0C6B4C">Biovlo</td>
                    </tr>
                    <tr>
                        <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;text-align:left">

                <h1 style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#083D2E">Twój adres email został zmieniony!</h1>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Jeśli to Ty dokonałeś tej zmiany, możesz zignorować tę wiadomość. Twoje konto jest bezpieczne.</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;color:#B42318;font-weight:700">Jeśli jednak nie Ty zmieniłeś zmieniłeś adres email, prosimy o natychmiastowy kontakt z administratorem w celu zabezpieczenia konta.</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">W razie jakichkolwiek pytań lub problemów, prosimy o kontakt z naszym wsparciem technicznym.</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Pozdrawiamy,<br>Zespół Biovlo</p>
            
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px;border-top:1px solid #E3EAE6;background-color:#F4F7F5;border-radius:0 0 12px 12px;text-align:center">

                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">Otrzymałeś tę wiadomość, ponieważ zarejestrowałeś się na stronie Biovlo.</p>
                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">&copy; Biovlo. Wszelkie prawa zastrzeżone.</p>
            
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'
WHERE name = 'email-change';

UPDATE mail_templates
SET template = '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Potwierdzenie zgłoszenia usunięcia konta</title>
    <style>
        /* Tylko uzupełnienie — wszystkie kolory są inline; hover działa tam, gdzie klient obsługuje <style> */
        a.btn-cta:hover, td.btn-cta:hover { background-color: #0A5740 !important; }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F7F5">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4F7F5" style="background-color:#F4F7F5">
        <tr>
            <td align="center" style="padding:24px 12px">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #E3EAE6;border-radius:12px">
                    <tr>
                        <td style="padding:22px 32px;border-bottom:3px solid #0C6B4C;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1;font-weight:700;letter-spacing:-0.5px;color:#0C6B4C">Biovlo</td>
                    </tr>
                    <tr>
                        <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;text-align:left">

                <h1 style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#083D2E">Zgłoszenie usunięcia konta otrzymane</h1>

                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Otrzymaliśmy zgłoszenie chęci usunięcia Twojego konta w serwisie Biovlo.</p>

                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Twoje konto zostanie automatycznie usunięte <strong>po 14 dniach nieaktywności</strong> (2 tygodniach) od chwili otrzymania tego zgłoszenia. Jeśli w tym czasie zalogujesz się na swoje konto, proces usunięcia zostanie anulowany i konto pozostanie aktywne.</p>

                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;color:#B42318;font-weight:700">Jeżeli nie zgłaszałeś chęci usunięcia konta lub podejrzewasz, że ktoś inny próbował usunąć Twoje konto — natychmiast zaloguj się i zmień hasło lub skontaktuj się z administracją.</p>

                <div style="margin:8px 0 16px">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px"><tr><td class="btn-cta" bgcolor="#0C6B4C" style="border-radius:8px;background-color:#0C6B4C"><a class="btn-cta" href="${frontendAppUrl}/login" target="_blank" rel="noopener" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:8px;background-color:#0C6B4C">Zaloguj się teraz</a></td></tr></table>
                    <br/>
                    <a href="mailto:support@gng.example" style="display:inline-block;padding:10px 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#0C6B4C;text-decoration:none;border:1px solid #0C6B4C;border-radius:8px">Skontaktuj się z pomocą</a>
                </div>

                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;font-size:14px;color:#5F6F67">W razie pytań nasz zespół wsparcia chętnie pomoże. W wiadomości podaj adres email powiązany z kontem, abyśmy mogli szybko zweryfikować zgłoszenie.</p>

                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Pozdrawiamy,<br/>Zespół Biovlo</p>
            
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px;border-top:1px solid #E3EAE6;background-color:#F4F7F5;border-radius:0 0 12px 12px;text-align:center">

                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">Otrzymałeś tę wiadomość, ponieważ zarejestrowałeś się na stronie Biovlo lub zlecono usunięcie konta powiązanego z tym adresem email.</p>
                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">&copy; Biovlo. Wszelkie prawa zastrzeżone.</p>
            
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'
WHERE name = 'delete-user';

UPDATE mail_templates
SET template = '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Aktualizacja Oferty</title>
    <style>
        /* Tylko uzupełnienie — wszystkie kolory są inline; hover działa tam, gdzie klient obsługuje <style> */
        a.btn-cta:hover, td.btn-cta:hover { background-color: #0A5740 !important; }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F7F5">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4F7F5" style="background-color:#F4F7F5">
        <tr>
            <td align="center" style="padding:24px 12px">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #E3EAE6;border-radius:12px">
                    <tr>
                        <td style="padding:22px 32px;border-bottom:3px solid #0C6B4C;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1;font-weight:700;letter-spacing:-0.5px;color:#0C6B4C">Biovlo</td>
                    </tr>
                    <tr>
                        <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;text-align:left">

                <h1 style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#083D2E">Aktualizacja Oferty</h1>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Cześć ${username}!</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Oferta, którą obserwujesz, uległa zmianie:</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333"><strong>${offerName}</strong></p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px"><tr><td class="btn-cta" bgcolor="#0C6B4C" style="border-radius:8px;background-color:#0C6B4C"><a class="btn-cta" href="${offerLink}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:8px;background-color:#0C6B4C">Zobacz Ofertę</a></td></tr></table>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;margin-top:25px">Jeśli przycisk nie działa, możesz również skopiować i wkleić poniższy link do swojej przeglądarki:</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333"><a href="${offerLink}" style="color:#0C6B4C;text-decoration:underline;word-break:break-all">${offerLink}</a></p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Pozdrawiamy,<br>Zespół Biovlo</p>
            
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px;border-top:1px solid #E3EAE6;background-color:#F4F7F5;border-radius:0 0 12px 12px;text-align:center">

                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">Otrzymałeś tę wiadomość, ponieważ obserwujesz ofertę na stronie Biovlo.</p>
                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">&copy; Biovlo. Wszelkie prawa zastrzeżone.</p>
            
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'
WHERE name = 'offer-change';

UPDATE mail_templates
SET template = '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Konto Zablokowane</title>
    <style>
        /* Tylko uzupełnienie — wszystkie kolory są inline; hover działa tam, gdzie klient obsługuje <style> */
        a.btn-cta:hover, td.btn-cta:hover { background-color: #0A5740 !important; }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F7F5">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4F7F5" style="background-color:#F4F7F5">
        <tr>
            <td align="center" style="padding:24px 12px">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #E3EAE6;border-radius:12px">
                    <tr>
                        <td style="padding:22px 32px;border-bottom:3px solid #0C6B4C;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1;font-weight:700;letter-spacing:-0.5px;color:#0C6B4C">Biovlo</td>
                    </tr>
                    <tr>
                        <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;text-align:left">

                <h1 style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#083D2E">Twoje konto zostało zablokowane</h1>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Witaj ${username},</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Informujemy, że Twoje konto na platformie Biovlo zostało tymczasowo lub trwale zablokowane.</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Poniżej znajduje się powód blokady:</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0"><tr><td style="padding:14px 16px;border-radius:8px;background-color:#FEF3F2;border:1px solid #FECDCA;color:#B42318;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;text-align:left;font-weight:700">
                    ${reason}
                </td></tr></table>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Jeśli uważasz, że blokada została nałożona niesłusznie, możesz skontaktować się z naszym zespołem wsparcia, odpowiadając na tę wiadomość lub korzystając z formularza kontaktowego na stronie Biovlo.</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Pozdrawiamy,<br>Zespół Biovlo</p>
            
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px;border-top:1px solid #E3EAE6;background-color:#F4F7F5;border-radius:0 0 12px 12px;text-align:center">

                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">Otrzymałeś tę wiadomość, ponieważ posiadasz konto na stronie Biovlo.</p>
                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">&copy; Biovlo. Wszelkie prawa zastrzeżone.</p>
            
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'
WHERE name = 'ban-user';

UPDATE mail_templates
SET template = '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Konto Odblokowane</title>
    <style>
        /* Tylko uzupełnienie — wszystkie kolory są inline; hover działa tam, gdzie klient obsługuje <style> */
        a.btn-cta:hover, td.btn-cta:hover { background-color: #0A5740 !important; }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F7F5">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4F7F5" style="background-color:#F4F7F5">
        <tr>
            <td align="center" style="padding:24px 12px">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #E3EAE6;border-radius:12px">
                    <tr>
                        <td style="padding:22px 32px;border-bottom:3px solid #0C6B4C;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1;font-weight:700;letter-spacing:-0.5px;color:#0C6B4C">Biovlo</td>
                    </tr>
                    <tr>
                        <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;text-align:left">

                <h1 style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#083D2E">Twoje konto zostało odblokowane</h1>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Witaj ${username},</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Z przyjemnością informujemy, że Twoje konto na platformie Biovlo zostało odblokowane.</p>

                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Powód odblokowania:</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0"><tr><td style="padding:14px 16px;border-radius:8px;background-color:#EEF6F1;border:1px solid #CFE5D9;color:#083D2E;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;text-align:left">
                    ${reason}
                </td></tr></table>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px"><tr><td class="btn-cta" bgcolor="#0C6B4C" style="border-radius:8px;background-color:#0C6B4C"><a class="btn-cta" href="${loginLink}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:8px;background-color:#0C6B4C">Zaloguj się teraz</a></td></tr></table>

                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;margin-top:20px">
                    Jeśli chcesz więcej informacji lub masz pytania, możesz odpowiedzieć na tę wiadomość lub skontaktować się z naszym zespołem wsparcia.
                </p>

                <!-- opcjonalna, krótka notatka od zespołu (np. zasady, przypomnienie) -->
                <div style="margin-top:12px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">
                    ${note}
                </div>

                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Pozdrawiamy,<br/>Zespół Biovlo</p>
            
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px;border-top:1px solid #E3EAE6;background-color:#F4F7F5;border-radius:0 0 12px 12px;text-align:center">

                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">Otrzymałeś tę wiadomość, ponieważ posiadasz konto na stronie Biovlo.</p>
                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">&copy; Biovlo. Wszelkie prawa zastrzeżone.</p>
            
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'
WHERE name = 'unban-user';

UPDATE mail_templates
SET template = '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Oferta Usunięta</title>
    <style>
        /* Tylko uzupełnienie — wszystkie kolory są inline; hover działa tam, gdzie klient obsługuje <style> */
        a.btn-cta:hover, td.btn-cta:hover { background-color: #0A5740 !important; }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F7F5">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4F7F5" style="background-color:#F4F7F5">
        <tr>
            <td align="center" style="padding:24px 12px">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #E3EAE6;border-radius:12px">
                    <tr>
                        <td style="padding:22px 32px;border-bottom:3px solid #0C6B4C;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1;font-weight:700;letter-spacing:-0.5px;color:#0C6B4C">Biovlo</td>
                    </tr>
                    <tr>
                        <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;text-align:left">

                <h1 style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#083D2E">Oferta Została Usunięta</h1>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Cześć ${username},</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Informujemy, że Twoja oferta została usunięta z naszej platformy przez administratora.</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0"><tr><td style="padding:14px 16px;border-radius:8px;background-color:#FEF3F2;border:1px solid #FECDCA;color:#B42318;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;text-align:left;font-weight:700">
                    <strong>Powód usunięcia:</strong><br>
                    {reason}
                </td></tr></table>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Jeśli uważasz, że decyzja została podjęta niesłusznie, możesz skontaktować się z naszym zespołem wsparcia.</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Dziękujemy za korzystanie z naszej platformy.</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Zespół Biovlo</p>
            
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px;border-top:1px solid #E3EAE6;background-color:#F4F7F5;border-radius:0 0 12px 12px;text-align:center">

                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">&copy; Biovlo. Wszelkie prawa zastrzeżone.</p>
            
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'
WHERE name = 'delete-offer';

UPDATE mail_templates
SET template = '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Oferta Zablokowana</title>
    <style>
        /* Tylko uzupełnienie — wszystkie kolory są inline; hover działa tam, gdzie klient obsługuje <style> */
        a.btn-cta:hover, td.btn-cta:hover { background-color: #0A5740 !important; }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F7F5">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4F7F5" style="background-color:#F4F7F5">
        <tr>
            <td align="center" style="padding:24px 12px">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #E3EAE6;border-radius:12px">
                    <tr>
                        <td style="padding:22px 32px;border-bottom:3px solid #0C6B4C;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1;font-weight:700;letter-spacing:-0.5px;color:#0C6B4C">Biovlo</td>
                    </tr>
                    <tr>
                        <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;text-align:left">

                <h1 style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#083D2E">Oferta Została Zablokowana</h1>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Cześć ${username},</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Informujemy, że Twoja oferta została tymczasowo zablokowana przez moderatora.</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0"><tr><td style="padding:14px 16px;border-radius:8px;background-color:#F4F7F5;border:1px solid #E3EAE6;color:#333333;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;text-align:left;font-weight:700">
                    <strong>Nazwa oferty:</strong><br>
                    ${offerName}
                </td></tr></table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0"><tr><td style="padding:14px 16px;border-radius:8px;background-color:#FFF8EB;border:1px solid #FCE3B6;color:#8A4B08;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;text-align:left;font-weight:700">
                    <strong>Powód blokady:</strong><br>
                    ${reason}
                </td></tr></table>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Aby przywrócić ofertę, prosimy o jej edycję zgodnie z naszymi wytycznymi. Po zapisaniu zmian, oferta zostanie ponownie przesłana do weryfikacji.</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Jeśli masz pytania dotyczące blokady, skontaktuj się z naszym zespołem wsparcia.</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Zespół Biovlo</p>
            
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px;border-top:1px solid #E3EAE6;background-color:#F4F7F5;border-radius:0 0 12px 12px;text-align:center">

                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">&copy; Biovlo. Wszelkie prawa zastrzeżone.</p>
            
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'
WHERE name = 'block-offer';

UPDATE mail_templates
SET template = '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Zmiana Adresu Email</title>
    <style>
        /* Tylko uzupełnienie — wszystkie kolory są inline; hover działa tam, gdzie klient obsługuje <style> */
        a.btn-cta:hover, td.btn-cta:hover { background-color: #0A5740 !important; }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F7F5">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4F7F5" style="background-color:#F4F7F5">
        <tr>
            <td align="center" style="padding:24px 12px">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #E3EAE6;border-radius:12px">
                    <tr>
                        <td style="padding:22px 32px;border-bottom:3px solid #0C6B4C;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1;font-weight:700;letter-spacing:-0.5px;color:#0C6B4C">Biovlo</td>
                    </tr>
                    <tr>
                        <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;text-align:left">

                <h1 style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#083D2E">Adres Email Został Zmieniony</h1>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Cześć ${username},</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Informujemy, że adres email powiązany z Twoim kontem został zmieniony.</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0"><tr><td style="padding:14px 16px;border-radius:8px;background-color:#FFF8EB;border:1px solid #FCE3B6;color:#8A4B08;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;text-align:left;font-weight:700">
                    <strong>Uwaga bezpieczeństwa:</strong><br>
                    Jeśli nie dokonywałeś tej zmiany, natychmiast skontaktuj się z naszym zespołem wsparcia.
                </td></tr></table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0"><tr><td style="padding:14px 16px;border-radius:8px;background-color:#F4F7F5;border:1px solid #E3EAE6;color:#333333;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;text-align:left">
                    <strong>Szczegóły zmiany:</strong><br>
                    Stary adres: ${oldEmail}<br>
                    Nowy adres: ${newEmail}<br>
                    Data zmiany: ${changeDate}
                </td></tr></table>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Wszystkie przyszłe powiadomienia będą wysyłane na nowy adres email.</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Jeśli masz pytania lub wątpliwości, skontaktuj się z naszym zespołem wsparcia.</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Zespół Biovlo</p>
            
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px;border-top:1px solid #E3EAE6;background-color:#F4F7F5;border-radius:0 0 12px 12px;text-align:center">

                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">&copy; Biovlo. Wszelkie prawa zastrzeżone.</p>
            
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'
WHERE name = 'change-email-notification';

UPDATE mail_templates
SET template = '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Oferta Wygasła</title>
    <style>
        /* Tylko uzupełnienie — wszystkie kolory są inline; hover działa tam, gdzie klient obsługuje <style> */
        a.btn-cta:hover, td.btn-cta:hover { background-color: #0A5740 !important; }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F7F5">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4F7F5" style="background-color:#F4F7F5">
        <tr>
            <td align="center" style="padding:24px 12px">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #E3EAE6;border-radius:12px">
                    <tr>
                        <td style="padding:22px 32px;border-bottom:3px solid #0C6B4C;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1;font-weight:700;letter-spacing:-0.5px;color:#0C6B4C">Biovlo</td>
                    </tr>
                    <tr>
                        <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;text-align:left">

                <h1 style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#083D2E">Oferta Wygasła</h1>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Cześć ${username},</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Informujemy, że Twoja oferta została automatycznie oznaczona jako nieaktywna z powodu przekroczenia daty ważności.</p>
                
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0"><tr><td style="padding:14px 16px;border-radius:8px;background-color:#F4F7F5;border:1px solid #E3EAE6;color:#333333;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;text-align:left">
                    <strong>Szczegóły oferty:</strong><br>
                    Nazwa: ${offerName}<br>
                    Data wygaśnięcia: ${expiryDate}<br>
                    Status: Nieaktywna
                </td></tr></table>
                
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0"><tr><td style="padding:14px 16px;border-radius:8px;background-color:#FFF8EB;border:1px solid #FCE3B6;color:#8A4B08;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;text-align:left;font-weight:700">
                    <strong>Co to oznacza?</strong><br>
                    Oferta nie jest już widoczna dla innych użytkowników i nie można na nią odpowiadać.
                </td></tr></table>
                
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0"><tr><td style="padding:14px 16px;border-radius:8px;background-color:#F4F7F5;border:1px solid #E3EAE6;color:#333333;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;text-align:left">
                    <strong>Co możesz zrobić?</strong><br>
                    Jeśli chcesz ponownie opublikować ofertę, możesz ją edytować i ustawić nową datę wygaśnięcia.
                </td></tr></table>
                
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Dziękujemy za korzystanie z naszej platformy!</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Zespół Biovlo</p>
            
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px;border-top:1px solid #E3EAE6;background-color:#F4F7F5;border-radius:0 0 12px 12px;text-align:center">

                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">&copy; Biovlo. Wszelkie prawa zastrzeżone.</p>
            
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'
WHERE name = 'offer-expiry-notification';

UPDATE mail_templates
SET template = '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Awans Rangowy</title>
    <style>
        /* Tylko uzupełnienie — wszystkie kolory są inline; hover działa tam, gdzie klient obsługuje <style> */
        a.btn-cta:hover, td.btn-cta:hover { background-color: #0A5740 !important; }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F7F5">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4F7F5" style="background-color:#F4F7F5">
        <tr>
            <td align="center" style="padding:24px 12px">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #E3EAE6;border-radius:12px">
                    <tr>
                        <td style="padding:22px 32px;border-bottom:3px solid #0C6B4C;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1;font-weight:700;letter-spacing:-0.5px;color:#0C6B4C">Biovlo</td>
                    </tr>
                    <tr>
                        <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;text-align:left">

                <h1 style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#083D2E">🎉 Gratulacje! Awansowałeś!</h1>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Cześć ${username},</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Mamy świetne wiadomości! Twoja ranga została podwyższona dzięki Twoim doskonałym ocenom i aktywności na platformie.</p>
                
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0"><tr><td style="padding:14px 16px;border-radius:8px;background-color:#EEF6F1;border:1px solid #CFE5D9;color:#083D2E;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;text-align:left;font-weight:700">
                    <strong>Twoja nowa ranga:</strong><br>
                    ${newRank}<br>
                    <small style="font-size:13px;font-weight:400">Średnia ocen: ${averageRating}⭐ | Punkty zaufania: ${trustPoints}</small>
                </td></tr></table>
                
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0"><tr><td style="padding:14px 16px;border-radius:8px;background-color:#F4F7F5;border:1px solid #E3EAE6;color:#333333;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;text-align:left">
                    <strong>Nowe korzyści:</strong><br>
                    ${benefits}
                </td></tr></table>
                
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Dziękujemy za Twoją aktywność i wysoką jakość transakcji!</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Zespół Biovlo</p>
            
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px;border-top:1px solid #E3EAE6;background-color:#F4F7F5;border-radius:0 0 12px 12px;text-align:center">

                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">&copy; Biovlo. Wszelkie prawa zastrzeżone.</p>
            
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'
WHERE name = 'rank-promotion';

UPDATE mail_templates
SET template = '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Zmiana Rangi</title>
    <style>
        /* Tylko uzupełnienie — wszystkie kolory są inline; hover działa tam, gdzie klient obsługuje <style> */
        a.btn-cta:hover, td.btn-cta:hover { background-color: #0A5740 !important; }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F7F5">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4F7F5" style="background-color:#F4F7F5">
        <tr>
            <td align="center" style="padding:24px 12px">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #E3EAE6;border-radius:12px">
                    <tr>
                        <td style="padding:22px 32px;border-bottom:3px solid #0C6B4C;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1;font-weight:700;letter-spacing:-0.5px;color:#0C6B4C">Biovlo</td>
                    </tr>
                    <tr>
                        <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;text-align:left">

                <h1 style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#083D2E">📉 Zmiana Rangi</h1>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Cześć ${username},</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Informujemy, że Twoja ranga została zmieniona na podstawie aktualnych ocen i aktywności na platformie.</p>
                
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0"><tr><td style="padding:14px 16px;border-radius:8px;background-color:#FFF8EB;border:1px solid #FCE3B6;color:#8A4B08;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;text-align:left;font-weight:700">
                    <strong>Twoja obecna ranga:</strong><br>
                    ${newRank}<br>
                    <small style="font-size:13px;font-weight:400">Średnia ocen: ${averageRating}⭐ | Punkty zaufania: ${trustPoints}</small>
                </td></tr></table>
                
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0"><tr><td style="padding:14px 16px;border-radius:8px;background-color:#F4F7F5;border:1px solid #E3EAE6;color:#333333;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;text-align:left">
                    <strong>Jak poprawić swoją rangę:</strong><br>
                    • Staraj się o wysokie oceny (4-5⭐)<br>
                    • Bądź punktualny i komunikatywny<br>
                    • Opisuj oferty dokładnie i uczciwie<br>
                    • Odpowiadaj na wiadomości szybko
                </td></tr></table>
                
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Pamiętaj - każda dobra transakcja to krok w kierunku wyższej rangi!</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Zespół Biovlo</p>
            
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px;border-top:1px solid #E3EAE6;background-color:#F4F7F5;border-radius:0 0 12px 12px;text-align:center">

                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">&copy; Biovlo. Wszelkie prawa zastrzeżone.</p>
            
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'
WHERE name = 'rank-degradation';

UPDATE mail_templates
SET template = '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Konto Zablokowane</title>
    <style>
        /* Tylko uzupełnienie — wszystkie kolory są inline; hover działa tam, gdzie klient obsługuje <style> */
        a.btn-cta:hover, td.btn-cta:hover { background-color: #0A5740 !important; }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F7F5">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4F7F5" style="background-color:#F4F7F5">
        <tr>
            <td align="center" style="padding:24px 12px">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #E3EAE6;border-radius:12px">
                    <tr>
                        <td style="padding:22px 32px;border-bottom:3px solid #0C6B4C;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1;font-weight:700;letter-spacing:-0.5px;color:#0C6B4C">Biovlo</td>
                    </tr>
                    <tr>
                        <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;text-align:left">

                <h1 style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#083D2E">Twoje konto zostało zablokowane</h1>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Witaj ${username},</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Informujemy, że Twoje konto na platformie Biovlo zostało tymczasowo zablokowane.</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Poniżej znajduje się powód blokady:</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0"><tr><td style="padding:14px 16px;border-radius:8px;background-color:#FEF3F2;border:1px solid #FECDCA;color:#B42318;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;text-align:left;font-weight:700">
                    ${reason}
                </td></tr></table>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Data zakończenia blokady:</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0"><tr><td style="padding:14px 16px;border-radius:8px;background-color:#F4F7F5;border:1px solid #E3EAE6;color:#333333;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;text-align:left;font-weight:700">
                    ${endDate}
                </td></tr></table>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Po upływie tego czasu Twoje konto zostanie automatycznie odblokowane i będziesz mógł ponownie korzystać z platformy Biovlo.</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Jeśli uważasz, że blokada została nałożona niesłusznie, możesz skontaktować się z naszym zespołem wsparcia, odpowiadając na tę wiadomość lub korzystając z formularza kontaktowego na stronie Biovlo.</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Pozdrawiamy,<br>Zespół Biovlo</p>
            
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px;border-top:1px solid #E3EAE6;background-color:#F4F7F5;border-radius:0 0 12px 12px;text-align:center">

                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">Otrzymałeś tę wiadomość, ponieważ posiadasz konto na stronie Biovlo.</p>
                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">&copy; Biovlo. Wszelkie prawa zastrzeżone.</p>
            
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'
WHERE name = 'ban-user-temporary';

UPDATE mail_templates
SET template = '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Oferta Zmodyfikowana</title>
    <style>
        /* Tylko uzupełnienie — wszystkie kolory są inline; hover działa tam, gdzie klient obsługuje <style> */
        a.btn-cta:hover, td.btn-cta:hover { background-color: #0A5740 !important; }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F7F5">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4F7F5" style="background-color:#F4F7F5">
        <tr>
            <td align="center" style="padding:24px 12px">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #E3EAE6;border-radius:12px">
                    <tr>
                        <td style="padding:22px 32px;border-bottom:3px solid #0C6B4C;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1;font-weight:700;letter-spacing:-0.5px;color:#0C6B4C">Biovlo</td>
                    </tr>
                    <tr>
                        <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;text-align:left">

                <h1 style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#083D2E">Twoja oferta została zmodyfikowana</h1>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Witaj ${username},</p>
                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Informujemy, że Twoja oferta została zmodyfikowana przez pracownika platformy Biovlo.</p>
                
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0"><tr><td style="padding:14px 16px;border-radius:8px;background-color:#F4F7F5;border:1px solid #E3EAE6;color:#333333;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;text-align:left;font-weight:700">
                    ${offerName}
                </td></tr></table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0"><tr><td style="padding:14px 16px;border-radius:8px;background-color:#FEF3F2;border:1px solid #FECDCA;color:#B42318;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;text-align:left">
                    <div style="margin:0 0 8px;font-size:16px;font-weight:700">Powód modyfikacji:</div>
                    <div style="font-size:15px;line-height:1.5;white-space:pre-wrap">${reason}</div>
                </td></tr></table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0"><tr><td style="padding:14px 16px;border-radius:8px;background-color:#F4F7F5;border:1px solid #E3EAE6;color:#333333;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;text-align:left">
                    <strong>Uwaga:</strong> Niektóre pola oferty (nazwa, lokalizacja, termin ważności, godziny odbioru) nie mogą być zmieniane przez pracowników i pozostały bez zmian.
                </td></tr></table>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px"><tr><td class="btn-cta" bgcolor="#0C6B4C" style="border-radius:8px;background-color:#0C6B4C"><a class="btn-cta" href="${offerLink}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:8px;background-color:#0C6B4C">Zobacz zmodyfikowaną ofertę</a></td></tr></table>

                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;margin-top:20px">
                    Jeśli masz pytania dotyczące modyfikacji, możesz skontaktować się z naszym zespołem wsparcia.
                </p>

                <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333">Pozdrawiamy,<br>Zespół Biovlo</p>
            
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px;border-top:1px solid #E3EAE6;background-color:#F4F7F5;border-radius:0 0 12px 12px;text-align:center">

                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">Otrzymałeś tę wiadomość, ponieważ posiadasz ofertę na stronie Biovlo.</p>
                <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5F6F67">&copy; Biovlo. Wszelkie prawa zastrzeżone.</p>
            
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'
WHERE name = 'offer-modified-by-staff';
