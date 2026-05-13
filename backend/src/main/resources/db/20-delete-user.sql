-- Dodanie kolumny deleteDate do tabeli users
-- Ta kolumna będzie przechowywać datę, od której konto użytkownika ma zostać usunięte
ALTER TABLE users ADD COLUMN delete_date TIMESTAMP NULL;

-- Dodanie szablonu emaila dla usunięcia konta
INSERT INTO mail_templates (name, template) VALUES ('delete-user', '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Potwierdzenie zgłoszenia usunięcia konta</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
            color: #333333;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        td {
            padding: 20px;
            text-align: center;
        }
        h1 {
            color: #0056b3;
            font-size: 24px;
            margin-bottom: 15px;
        }
        p {
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 15px;
        }
        .button {
            display: inline-block;
            padding: 12px 25px;
            margin-top: 20px;
            background-color: #007bff;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            font-size: 18px;
            font-weight: bold;
        }
        .danger {
            color: #cc0000;
            font-weight: bold;
        }
        .muted {
            font-size: 14px;
            color: #666666;
        }
        .footer {
            font-size: 12px;
            color: #777777;
            margin-top: 30px;
            padding: 10px 20px;
            background-color: #e9e9e9;
            border-top: 1px solid #dddddd;
        }
        .actions {
            margin-top: 10px;
        }
        .secondary {
            display: inline-block;
            padding: 10px 18px;
            margin-top: 12px;
            background-color: #f0f0f0;
            color: #333333;
            text-decoration: none;
            border-radius: 5px;
            font-size: 15px;
            border: 1px solid #dddddd;
        }
    </style>
</head>
<body>
    <table>
        <tr>
            <td>
                <h1>Zgłoszenie usunięcia konta otrzymane</h1>

                <p>Otrzymaliśmy zgłoszenie chęci usunięcia Twojego konta w serwisie GNG.</p>

                <p>Twoje konto zostanie automatycznie usunięte <strong>po 14 dniach nieaktywności</strong> (2 tygodniach) od chwili otrzymania tego zgłoszenia. Jeśli w tym czasie zalogujesz się na swoje konto, proces usunięcia zostanie anulowany i konto pozostanie aktywne.</p>

                <p class="danger">Jeżeli nie zgłaszałeś chęci usunięcia konta lub podejrzewasz, że ktoś inny próbował usunąć Twoje konto — natychmiast zaloguj się i zmień hasło lub skontaktuj się z administracją.</p>

                <div class="actions">
                    <a class="button" href="${frontendAppUrl}/login" target="_blank" rel="noopener">Zaloguj się teraz</a>
                    <br/>
                    <a class="secondary" href="mailto:support@gng.example">Skontaktuj się z pomocą</a>
                </div>

                <p class="muted">W razie pytań nasz zespół wsparcia chętnie pomoże. W wiadomości podaj adres email powiązany z kontem, abyśmy mogli szybko zweryfikować zgłoszenie.</p>

                <p>Pozdrawiamy,<br/>Zespół GNG</p>
            </td>
        </tr>
        <tr>
            <td class="footer">
                <p>Otrzymałeś tę wiadomość, ponieważ zarejestrowałeś się na stronie GNG lub zlecono usunięcie konta powiązanego z tym adresem email.</p>
                <p>&copy; 2025 GNG. Wszelkie prawa zastrzeżone.</p>
            </td>
        </tr>
    </table>
</body>
</html>');

