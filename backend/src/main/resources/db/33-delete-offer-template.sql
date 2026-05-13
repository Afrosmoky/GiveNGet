-- Szablon emaila dla usunięcia oferty
INSERT INTO mail_templates (name, template) VALUES ('delete-offer', '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Oferta Usunięta</title>
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
            background-color: #f8f8f8;
            color: #666666;
            font-size: 14px;
            padding: 15px;
            border-top: 1px solid #eeeeee;
        }
    </style>
</head>
<body>
    <table>
        <tr>
            <td>
                <h1>Oferta Została Usunięta</h1>
                <p>Cześć ${username},</p>
                <p>Informujemy, że Twoja oferta została usunięta z naszej platformy przez administratora.</p>
                <div class="reason">
                    <strong>Powód usunięcia:</strong><br>
                    {reason}
                </div>
                <p>Jeśli uważasz, że decyzja została podjęta niesłusznie, możesz skontaktować się z naszym zespołem wsparcia.</p>
                <p>Dziękujemy za korzystanie z naszej platformy.</p>
                <div class="footer">
                    <p>Zespół GNG</p>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>');
