-- Adiciona campo hora às partidas (formato HH:MM, obrigatório)
-- Valor padrão '10:50' para não quebrar registos existentes.
ALTER TABLE partidas ADD COLUMN hora TEXT NOT NULL DEFAULT '11:00';
