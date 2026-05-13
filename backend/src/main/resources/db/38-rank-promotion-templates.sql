-- Szablon emaila dla promocji na wyższą rangę
INSERT INTO mail_templates (name, template) VALUES ('rank-promotion', '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Awans Rangowy</title>
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
            color: #28a745;
            font-size: 24px;
            margin-bottom: 15px;
        }
        p {
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 15px;
        }
        .rank-info {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }
        .benefits {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
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
                <h1>🎉 Gratulacje! Awansowałeś!</h1>
                <p>Cześć ${username},</p>
                <p>Mamy świetne wiadomości! Twoja ranga została podwyższona dzięki Twoim doskonałym ocenom i aktywności na platformie.</p>
                
                <div class="rank-info">
                    <strong>Twoja nowa ranga:</strong><br>
                    ${newRank}<br>
                    <small>Średnia ocen: ${averageRating}⭐ | Punkty zaufania: ${trustPoints}</small>
                </div>
                
                <div class="benefits">
                    <strong>Nowe korzyści:</strong><br>
                    ${benefits}
                </div>
                
                <p>Dziękujemy za Twoją aktywność i wysoką jakość transakcji!</p>
                <div class="footer">
                    <p>Zespół GNG</p>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>');

-- Szablon emaila dla degradacji do niższej rangi
INSERT INTO mail_templates (name, template) VALUES ('rank-degradation', '<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zmiana Rangi</title>
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
        }
        .rank-info {
            background-color: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }
        .tips {
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
                <h1>📉 Zmiana Rangi</h1>
                <p>Cześć ${username},</p>
                <p>Informujemy, że Twoja ranga została zmieniona na podstawie aktualnych ocen i aktywności na platformie.</p>
                
                <div class="rank-info">
                    <strong>Twoja obecna ranga:</strong><br>
                    ${newRank}<br>
                    <small>Średnia ocen: ${averageRating}⭐ | Punkty zaufania: ${trustPoints}</small>
                </div>
                
                <div class="tips">
                    <strong>Jak poprawić swoją rangę:</strong><br>
                    • Staraj się o wysokie oceny (4-5⭐)<br>
                    • Bądź punktualny i komunikatywny<br>
                    • Opisuj oferty dokładnie i uczciwie<br>
                    • Odpowiadaj na wiadomości szybko
                </div>
                
                <p>Pamiętaj - każda dobra transakcja to krok w kierunku wyższej rangi!</p>
                <div class="footer">
                    <p>Zespół GNG</p>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>');
