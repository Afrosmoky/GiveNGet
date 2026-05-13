-- Dodanie nowych statusów BLOCKED i PENDING do tabeli offer
ALTER TABLE offer MODIFY COLUMN status ENUM('ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING') NOT NULL DEFAULT 'ACTIVE';

-- Szablon emaila dla blokowania oferty
INSERT INTO mail_templates (name, template) VALUES ('block-offer', '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Oferta Zablokowana</title>
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
        .reason {
            background-color: #fff3e0;
            color: #ff6600;
            border: 1px solid #ffcc80;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }
        .offer-name {
            background-color: #f5f5f5;
            border: 1px solid #e0e0e0;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
            color: #333;
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
                <h1>Oferta Została Zablokowana</h1>
                <p>Cześć ${username},</p>
                <p>Informujemy, że Twoja oferta została tymczasowo zablokowana przez moderatora.</p>
                <div class="offer-name">
                    <strong>Nazwa oferty:</strong><br>
                    ${offerName}
                </div>
                <div class="reason">
                    <strong>Powód blokady:</strong><br>
                    ${reason}
                </div>
                <p>Aby przywrócić ofertę, prosimy o jej edycję zgodnie z naszymi wytycznymi. Po zapisaniu zmian, oferta zostanie ponownie przesłana do weryfikacji.</p>
                <p>Jeśli masz pytania dotyczące blokady, skontaktuj się z naszym zespołem wsparcia.</p>
                <div class="footer">
                    <p>Zespół GNG</p>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>');
