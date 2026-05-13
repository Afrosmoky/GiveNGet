-- Szablon emaila dla powiadomienia o wygaśnięciu oferty
INSERT INTO mail_templates (name, template) VALUES ('offer-expiry-notification', '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Oferta Wygasła</title>
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
            color: #ff6600;
            font-size: 24px;
            margin-bottom: 15px;
        }
        p {
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 15px;
        }
        .offer-info {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .expiry-info {
            background-color: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }
        .action-info {
            background-color: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
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
                <h1>Oferta Wygasła</h1>
                <p>Cześć ${username},</p>
                <p>Informujemy, że Twoja oferta została automatycznie oznaczona jako nieaktywna z powodu przekroczenia daty ważności.</p>
                
                <div class="offer-info">
                    <strong>Szczegóły oferty:</strong><br>
                    Nazwa: ${offerName}<br>
                    Data wygaśnięcia: ${expiryDate}<br>
                    Status: Nieaktywna
                </div>
                
                <div class="expiry-info">
                    <strong>Co to oznacza?</strong><br>
                    Oferta nie jest już widoczna dla innych użytkowników i nie można na nią odpowiadać.
                </div>
                
                <div class="action-info">
                    <strong>Co możesz zrobić?</strong><br>
                    Jeśli chcesz ponownie opublikować ofertę, możesz ją edytować i ustawić nową datę wygaśnięcia.
                </div>
                
                <p>Dziękujemy za korzystanie z naszej platformy!</p>
                <div class="footer">
                    <p>Zespół GNG</p>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>');
