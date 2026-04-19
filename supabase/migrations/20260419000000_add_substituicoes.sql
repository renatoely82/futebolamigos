CREATE TABLE substituicoes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id            UUID NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
  jogador_ausente_id    UUID NOT NULL REFERENCES jogadores(id) ON DELETE RESTRICT,
  jogador_substituto_id UUID NOT NULL REFERENCES jogadores(id) ON DELETE RESTRICT,
  motivo                TEXT,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT sub_unique_ausente    UNIQUE (partida_id, jogador_ausente_id),
  CONSTRAINT sub_unique_substituto UNIQUE (partida_id, jogador_substituto_id),
  CONSTRAINT sub_different_players CHECK (jogador_ausente_id <> jogador_substituto_id)
);

CREATE INDEX substituicoes_partida_id_idx ON substituicoes (partida_id);

ALTER TABLE substituicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE substituicoes FORCE ROW LEVEL SECURITY;

CREATE POLICY "sub_select" ON substituicoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "sub_insert" ON substituicoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "sub_update" ON substituicoes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "sub_delete" ON substituicoes FOR DELETE TO authenticated USING (true);
