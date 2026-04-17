ALTER TABLE partidas ADD COLUMN votacao_enquete_id UUID REFERENCES enquetes(id) ON DELETE SET NULL;
