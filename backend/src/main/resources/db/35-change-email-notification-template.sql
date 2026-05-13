-- Szablon emaila dla powiadomienia o zmianie adresu email
INSERT INTO mail_templates (name, template) VALUES ('change-email-notification', '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zmiana Adresu Email</title>
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
            color: #2c5aa0;
            font-size: 24px;
            margin-bottom: 15px;
        }
        p {
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 15px;
        }
        .warning {
            background-color: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }
        .info {
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
                <h1>Adres Email Został Zmieniony</h1>
                <p>Cześć ${username},</p>
                <p>Informujemy, że adres email powiązany z Twoim kontem został zmieniony.</p>
                <div class="warning">
                    <strong>Uwaga bezpieczeństwa:</strong><br>
                    Jeśli nie dokonywałeś tej zmiany, natychmiast skontaktuj się z naszym zespołem wsparcia.
                </div>
                <div class="info">
                    <strong>Szczegóły zmiany:</strong><br>
                    Stary adres: ${oldEmail}<br>
                    Nowy adres: ${newEmail}<br>
                    Data zmiany: ${changeDate}
                </div>
                <p>Wszystkie przyszłe powiadomienia będą wysyłane na nowy adres email.</p>
                <p>Jeśli masz pytania lub wątpliwości, skontaktuj się z naszym zespołem wsparcia.</p>
                <div class="footer">
                    <p>Zespół GNG</p>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>');
