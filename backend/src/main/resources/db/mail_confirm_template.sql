insert into mail_templates (name, template)  value ('verifyEmail', '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Potwierdzenie Rejestracji</title>
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
                <h1>Dziękujemy za rejestrację!</h1>
                <p>Witaj ${user}!</p>
                <p>Dziękujemy za dołączenie do naszej społeczności. Aby aktywować swoje konto i rozpocząć korzystanie z naszych usług, kliknij poniższy przycisk:</p>
                <a href="${activationlink}" class="button">Aktywuj konto</a>
                <p style="margin-top: 25px;">Jeśli przycisk nie działa, możesz również skopiować i wkleić poniższy link do swojej przeglądarki:</p>
                <p><a href="${activationlink}">${activationlink}</a></p>
                <p>W razie jakichkolwiek pytań lub problemów, prosimy o kontakt z naszym wsparciem.</p>
                <p>Pozdrawiamy,<br>Zespół GNG</p>
            </td>
        </tr>
        <tr>
            <td class="footer">
                <p>Otrzymałeś tę wiadomość, ponieważ zarejestrowałeś się na stronie GNG.</p>
                <p>&copy; 2025 GNG. Wszelkie prawa zastrzeżone.</p>
            </td>
        </tr>
    </table>
</body>
</html>');