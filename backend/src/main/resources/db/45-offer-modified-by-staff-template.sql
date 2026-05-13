-- Szablon emaila dla modyfikacji oferty przez pracownika/moderatora
INSERT INTO mail_templates (name, template) VALUES ('offer-modified-by-staff', '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Oferta Zmodyfikowana</title>
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
            color: #ff6600;
            font-size: 24px;
            margin-bottom: 15px;
        }
        p {
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 15px;
            text-align: left;
        }
        .offer-name {
            background-color: #fff4e6;
            color: #cc6600;
            border: 1px solid #ffd9b3;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
            font-size: 18px;
        }
        .reason-box {
            background-color: #ffe6e6;
            color: #b30000;
            border: 1px solid #ffcccc;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            text-align: left;
        }
        .reason-label {
            font-weight: bold;
            margin-bottom: 8px;
        }
        .button {
            display: inline-block;
            padding: 12px 25px;
            margin-top: 20px;
            background-color: #ff6600;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            font-size: 18px;
            font-weight: bold;
        }
        .info {
            background-color: #e6f3ff;
            color: #0066cc;
            border: 1px solid #b3d9ff;
            padding: 12px;
            border-radius: 5px;
            margin: 18px 0;
            text-align: left;
            font-size: 14px;
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
                <h1>Twoja oferta została zmodyfikowana</h1>
                <p>Witaj ${username},</p>
                <p>Informujemy, że Twoja oferta została zmodyfikowana przez pracownika platformy GNG.</p>
                
                <div class="offer-name">
                    ${offerName}
                </div>

                <div class="reason-box">
                    <div class="reason-label">Powód modyfikacji:</div>
                    ${reason}
                </div>

                <div class="info">
                    <strong>Uwaga:</strong> Niektóre pola oferty (termin ważności, godziny odbioru) nie mogą być zmieniane przez pracowników i pozostały bez zmian.
                </div>

                <a href="${offerLink}" class="button">Zobacz zmodyfikowaną ofertę</a>

                <p style="margin-top: 20px;">
                    Jeśli masz pytania dotyczące modyfikacji, możesz skontaktować się z naszym zespołem wsparcia.
                </p>

                <p>Pozdrawiamy,<br>Zespół GNG</p>
            </td>
        </tr>
        <tr>
            <td class="footer">
                <p>Otrzymałeś tę wiadomość, ponieważ posiadasz ofertę na stronie GNG.</p>
                <p>&copy; 2025 GNG. Wszelkie prawa zastrzeżone.</p>
            </td>
        </tr>
    </table>
</body>
</html>');

