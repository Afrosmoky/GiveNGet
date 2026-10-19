-- Rebranding maili: „GNG” → „Biovlo” w treści szablonów (stopki „Zespół GNG”, „na stronie GNG”, „© 2025 GNG”).
-- REPLACE w MySQL rozróżnia wielkość liter, więc podmieniamy tylko nazwę marki pisaną wielkimi
-- literami — adresy w rodzaju support@gng.example i nazwy techniczne zostają bez zmian.
UPDATE mail_templates
SET template = REPLACE(template, 'GNG', 'Biovlo')
WHERE template LIKE BINARY '%GNG%';
