-- Enable Row Level Security on all futebolamigos tables
-- Strategy: only authenticated users can read/write any data
-- The service_role key (used in API routes) bypasses RLS by default — no app code changes needed.

-- ============================================================
-- jogadores
-- ============================================================
ALTER TABLE jogadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE jogadores FORCE ROW LEVEL SECURITY;

CREATE POLICY "jogadores_select" ON jogadores FOR SELECT TO authenticated USING (true);
CREATE POLICY "jogadores_insert" ON jogadores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "jogadores_update" ON jogadores FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "jogadores_delete" ON jogadores FOR DELETE TO authenticated USING (true);

-- ============================================================
-- temporadas
-- ============================================================
ALTER TABLE temporadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporadas FORCE ROW LEVEL SECURITY;

CREATE POLICY "temporadas_select" ON temporadas FOR SELECT TO authenticated USING (true);
CREATE POLICY "temporadas_insert" ON temporadas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "temporadas_update" ON temporadas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "temporadas_delete" ON temporadas FOR DELETE TO authenticated USING (true);

-- ============================================================
-- partidas
-- ============================================================
ALTER TABLE partidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidas FORCE ROW LEVEL SECURITY;

CREATE POLICY "partidas_select" ON partidas FOR SELECT TO authenticated USING (true);
CREATE POLICY "partidas_insert" ON partidas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "partidas_update" ON partidas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "partidas_delete" ON partidas FOR DELETE TO authenticated USING (true);

-- ============================================================
-- partida_jogadores
-- ============================================================
ALTER TABLE partida_jogadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE partida_jogadores FORCE ROW LEVEL SECURITY;

CREATE POLICY "partida_jogadores_select" ON partida_jogadores FOR SELECT TO authenticated USING (true);
CREATE POLICY "partida_jogadores_insert" ON partida_jogadores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "partida_jogadores_update" ON partida_jogadores FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "partida_jogadores_delete" ON partida_jogadores FOR DELETE TO authenticated USING (true);

-- ============================================================
-- propostas_times
-- ============================================================
ALTER TABLE propostas_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE propostas_times FORCE ROW LEVEL SECURITY;

CREATE POLICY "propostas_times_select" ON propostas_times FOR SELECT TO authenticated USING (true);
CREATE POLICY "propostas_times_insert" ON propostas_times FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "propostas_times_update" ON propostas_times FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "propostas_times_delete" ON propostas_times FOR DELETE TO authenticated USING (true);

-- ============================================================
-- gols
-- ============================================================
ALTER TABLE gols ENABLE ROW LEVEL SECURITY;
ALTER TABLE gols FORCE ROW LEVEL SECURITY;

CREATE POLICY "gols_select" ON gols FOR SELECT TO authenticated USING (true);
CREATE POLICY "gols_insert" ON gols FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "gols_update" ON gols FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "gols_delete" ON gols FOR DELETE TO authenticated USING (true);

-- ============================================================
-- temporada_mensalistas
-- ============================================================
ALTER TABLE temporada_mensalistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporada_mensalistas FORCE ROW LEVEL SECURITY;

CREATE POLICY "temporada_mensalistas_select" ON temporada_mensalistas FOR SELECT TO authenticated USING (true);
CREATE POLICY "temporada_mensalistas_insert" ON temporada_mensalistas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "temporada_mensalistas_update" ON temporada_mensalistas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "temporada_mensalistas_delete" ON temporada_mensalistas FOR DELETE TO authenticated USING (true);

-- ============================================================
-- pagamentos_mensalistas
-- ============================================================
ALTER TABLE pagamentos_mensalistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos_mensalistas FORCE ROW LEVEL SECURITY;

CREATE POLICY "pagamentos_mensalistas_select" ON pagamentos_mensalistas FOR SELECT TO authenticated USING (true);
CREATE POLICY "pagamentos_mensalistas_insert" ON pagamentos_mensalistas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pagamentos_mensalistas_update" ON pagamentos_mensalistas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pagamentos_mensalistas_delete" ON pagamentos_mensalistas FOR DELETE TO authenticated USING (true);

-- ============================================================
-- pagamentos_diaristas
-- ============================================================
ALTER TABLE pagamentos_diaristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos_diaristas FORCE ROW LEVEL SECURITY;

CREATE POLICY "pagamentos_diaristas_select" ON pagamentos_diaristas FOR SELECT TO authenticated USING (true);
CREATE POLICY "pagamentos_diaristas_insert" ON pagamentos_diaristas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pagamentos_diaristas_update" ON pagamentos_diaristas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pagamentos_diaristas_delete" ON pagamentos_diaristas FOR DELETE TO authenticated USING (true);

-- ============================================================
-- regras
-- ============================================================
ALTER TABLE regras ENABLE ROW LEVEL SECURITY;
ALTER TABLE regras FORCE ROW LEVEL SECURITY;

CREATE POLICY "regras_select" ON regras FOR SELECT TO authenticated USING (true);
CREATE POLICY "regras_insert" ON regras FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "regras_update" ON regras FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "regras_delete" ON regras FOR DELETE TO authenticated USING (true);
