-- Szablon emaila dla zablokowania użytkownika na czas określony
INSERT INTO mail_templates (name, template) VALUES ('ban-user-temporary', '<!DOCTYPE html>
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
        .duration {
            background-color: #fff4e6;
            color: #cc6600;
            border: 1px solid #ffd9b3;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }
        .end-date {
            background-color: #e6f3ff;
            color: #0066cc;
            border: 1px solid #b3d9ff;
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
                <p>Informujemy, że Twoje konto na platformie GNG zostało tymczasowo zablokowane.</p>
                <p>Poniżej znajduje się powód blokady:</p>
                <div class="reason">
                    ${reason}
                </div>
                <p>Data zakończenia blokady:</p>
                <div class="end-date">
                    ${endDate}
                </div>
                <p>Po upływie tego czasu Twoje konto zostanie automatycznie odblokowane i będziesz mógł ponownie korzystać z platformy GNG.</p>
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

