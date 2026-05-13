-- Szablon emaila dla zablokowania użytkownika
INSERT INTO mail_templates (name, template) VALUES ('ban-user', '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Konto Zablokowane</title>
    <style>
        /* Proste style CSS dla lepszej kompatybilności */
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
            color: #b30000;
            font-size: 24px;
            margin-bottom: 15px;
        }
        p {
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 15px;
        }
        .reason {
            background-color: #ffe6e6;
            color: #b30000;
            border: 1px solid #ffcccc;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }
        .footer {
            font-size: 12px;
            color: #777777;
            margin-top: 30px;
            padding: 10px 20px;
            background-color: #e9e9e9;
            border-top: 1px solid #dddddd;
        }
    </style>
</head>
<body>
    <table>
        <tr>
            <td>
                <h1>Twoje konto zostało zablokowane</h1>
                <p>Witaj ${username},</p>
                <p>Informujemy, że Twoje konto na platformie GNG zostało tymczasowo lub trwale zablokowane.</p>
                <p>Poniżej znajduje się powód blokady:</p>
                <div class="reason">
                    ${reason}
                </div>
                <p>Jeśli uważasz, że blokada została nałożona niesłusznie, możesz skontaktować się z naszym zespołem wsparcia, odpowiadając na tę wiadomość lub korzystając z formularza kontaktowego na stronie GNG.</p>
                <p>Pozdrawiamy,<br>Zespół GNG</p>
            </td>
        </tr>
        <tr>
            <td class="footer">
                <p>Otrzymałeś tę wiadomość, ponieważ posiadasz konto na stronie GNG.</p>
                <p>&copy; 2025 GNG. Wszelkie prawa zastrzeżone.</p>
            </td>
        </tr>
    </table>
</body>
</html>');

-- Szablon emaila dla odblokowania użytkownika
INSERT INTO mail_templates (name, template) VALUES ('unban-user', '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Konto Odblokowane</title>
    <style>
        /* Proste style CSS dla lepszej kompatybilności */
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
            color: #138000;
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
            background-color: #1fa02b;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            font-size: 18px;
            font-weight: bold;
        }
        .note {
            background-color: #f0fff3;
            color: #0b6a2b;
            border: 1px solid #d6f2d9;
            padding: 12px;
            border-radius: 5px;
            margin: 18px 0;
        }
        .footer {
            font-size: 12px;
            color: #777777;
            margin-top: 30px;
            padding: 10px 20px;
            background-color: #e9e9e9;
            border-top: 1px solid #dddddd;
        }
    </style>
</head>
<body>
    <table>
        <tr>
            <td>
                <h1>Twoje konto zostało odblokowane</h1>
                <p>Witaj ${username},</p>
                <p>Z przyjemnością informujemy, że Twoje konto na platformie GNG zostało odblokowane.</p>

                <p>Powód odblokowania:</p>
                <div class="note">
                    ${reason}
                </div>

                <a href="${loginLink}" class="button">Zaloguj się teraz</a>

                <p style="margin-top: 20px;">
                    Jeśli chcesz więcej informacji lub masz pytania, możesz odpowiedzieć na tę wiadomość lub skontaktować się z naszym zespołem wsparcia.
                </p>

                <!-- opcjonalna, krótka notatka od zespołu (np. zasady, przypomnienie) -->
                <div style="margin-top:12px;">
                    ${note}
                </div>

                <p>Pozdrawiamy,<br/>Zespół GNG</p>
            </td>
        </tr>
        <tr>
            <td class="footer">
                <p>Otrzymałeś tę wiadomość, ponieważ posiadasz konto na stronie GNG.</p>
                <p>&copy; 2025 GNG. Wszelkie prawa zastrzeżone.</p>
            </td>
        </tr>
    </table>
</body>
</html>');
