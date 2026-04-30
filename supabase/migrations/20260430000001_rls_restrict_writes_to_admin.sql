-- Restringe todas as escritas a utilizadores com role=admin no app_metadata.
-- Leituras (SELECT) continuam abertas a qualquer utilizador autenticado.
-- Todas as mutações da app passam por service_role (bypassa RLS), pelo que
-- este bloqueio afecta apenas chamadas directas à REST API com JWT de jogador.

-- ============================================================
-- Helper: is_admin() — lê role do JWT (sem query ao DB)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
$$;

-- ============================================================
-- jogadores
-- ============================================================
DROP POLICY IF EXISTS "jogadores_insert" ON jogadores;
DROP POLICY IF EXISTS "jogadores_update" ON jogadores;
DROP POLICY IF EXISTS "jogadores_delete" ON jogadores;

CREATE POLICY "jogadores_insert" ON jogadores FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "jogadores_update" ON jogadores FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "jogadores_delete" ON jogadores FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- temporadas
-- ============================================================
DROP POLICY IF EXISTS "temporadas_insert" ON temporadas;
DROP POLICY IF EXISTS "temporadas_update" ON temporadas;
DROP POLICY IF EXISTS "temporadas_delete" ON temporadas;

CREATE POLICY "temporadas_insert" ON temporadas FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "temporadas_update" ON temporadas FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "temporadas_delete" ON temporadas FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- partidas
-- ============================================================
DROP POLICY IF EXISTS "partidas_insert" ON partidas;
DROP POLICY IF EXISTS "partidas_update" ON partidas;
DROP POLICY IF EXISTS "partidas_delete" ON partidas;

CREATE POLICY "partidas_insert" ON partidas FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "partidas_update" ON partidas FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "partidas_delete" ON partidas FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- partida_jogadores
-- ============================================================
DROP POLICY IF EXISTS "partida_jogadores_insert" ON partida_jogadores;
DROP POLICY IF EXISTS "partida_jogadores_update" ON partida_jogadores;
DROP POLICY IF EXISTS "partida_jogadores_delete" ON partida_jogadores;

CREATE POLICY "partida_jogadores_insert" ON partida_jogadores FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "partida_jogadores_update" ON partida_jogadores FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "partida_jogadores_delete" ON partida_jogadores FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- propostas_times
-- ============================================================
DROP POLICY IF EXISTS "propostas_times_insert" ON propostas_times;
DROP POLICY IF EXISTS "propostas_times_update" ON propostas_times;
DROP POLICY IF EXISTS "propostas_times_delete" ON propostas_times;

CREATE POLICY "propostas_times_insert" ON propostas_times FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "propostas_times_update" ON propostas_times FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "propostas_times_delete" ON propostas_times FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- gols
-- ============================================================
DROP POLICY IF EXISTS "gols_insert" ON gols;
DROP POLICY IF EXISTS "gols_update" ON gols;
DROP POLICY IF EXISTS "gols_delete" ON gols;

CREATE POLICY "gols_insert" ON gols FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "gols_update" ON gols FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "gols_delete" ON gols FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- temporada_mensalistas
-- ============================================================
DROP POLICY IF EXISTS "temporada_mensalistas_insert" ON temporada_mensalistas;
DROP POLICY IF EXISTS "temporada_mensalistas_update" ON temporada_mensalistas;
DROP POLICY IF EXISTS "temporada_mensalistas_delete" ON temporada_mensalistas;

CREATE POLICY "temporada_mensalistas_insert" ON temporada_mensalistas FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "temporada_mensalistas_update" ON temporada_mensalistas FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "temporada_mensalistas_delete" ON temporada_mensalistas FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- pagamentos_mensalistas
-- ============================================================
DROP POLICY IF EXISTS "pagamentos_mensalistas_insert" ON pagamentos_mensalistas;
DROP POLICY IF EXISTS "pagamentos_mensalistas_update" ON pagamentos_mensalistas;
DROP POLICY IF EXISTS "pagamentos_mensalistas_delete" ON pagamentos_mensalistas;

CREATE POLICY "pagamentos_mensalistas_insert" ON pagamentos_mensalistas FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "pagamentos_mensalistas_update" ON pagamentos_mensalistas FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "pagamentos_mensalistas_delete" ON pagamentos_mensalistas FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- pagamentos_diaristas
-- ============================================================
DROP POLICY IF EXISTS "pagamentos_diaristas_insert" ON pagamentos_diaristas;
DROP POLICY IF EXISTS "pagamentos_diaristas_update" ON pagamentos_diaristas;
DROP POLICY IF EXISTS "pagamentos_diaristas_delete" ON pagamentos_diaristas;

CREATE POLICY "pagamentos_diaristas_insert" ON pagamentos_diaristas FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "pagamentos_diaristas_update" ON pagamentos_diaristas FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "pagamentos_diaristas_delete" ON pagamentos_diaristas FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- regras
-- ============================================================
DROP POLICY IF EXISTS "regras_insert" ON regras;
DROP POLICY IF EXISTS "regras_update" ON regras;
DROP POLICY IF EXISTS "regras_delete" ON regras;

CREATE POLICY "regras_insert" ON regras FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "regras_update" ON regras FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "regras_delete" ON regras FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- substituicoes
-- ============================================================
DROP POLICY IF EXISTS "sub_insert" ON substituicoes;
DROP POLICY IF EXISTS "sub_update" ON substituicoes;
DROP POLICY IF EXISTS "sub_delete" ON substituicoes;

CREATE POLICY "sub_insert" ON substituicoes FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "sub_update" ON substituicoes FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "sub_delete" ON substituicoes FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- despesas (sem RLS até agora)
-- ============================================================
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE despesas FORCE ROW LEVEL SECURITY;

CREATE POLICY "despesas_select" ON despesas FOR SELECT TO authenticated USING (true);
CREATE POLICY "despesas_insert" ON despesas FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "despesas_update" ON despesas FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "despesas_delete" ON despesas FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- enquetes (sem RLS até agora)
-- ============================================================
ALTER TABLE enquetes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquetes FORCE ROW LEVEL SECURITY;

CREATE POLICY "enquetes_select" ON enquetes FOR SELECT TO authenticated USING (true);
CREATE POLICY "enquetes_insert" ON enquetes FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "enquetes_update" ON enquetes FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "enquetes_delete" ON enquetes FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- enquete_opcoes (sem RLS até agora)
-- ============================================================
ALTER TABLE enquete_opcoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquete_opcoes FORCE ROW LEVEL SECURITY;

CREATE POLICY "enquete_opcoes_select" ON enquete_opcoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "enquete_opcoes_insert" ON enquete_opcoes FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "enquete_opcoes_update" ON enquete_opcoes FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "enquete_opcoes_delete" ON enquete_opcoes FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- enquete_tokens (sem RLS até agora)
-- ============================================================
ALTER TABLE enquete_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquete_tokens FORCE ROW LEVEL SECURITY;

CREATE POLICY "enquete_tokens_select" ON enquete_tokens FOR SELECT TO authenticated USING (true);
CREATE POLICY "enquete_tokens_insert" ON enquete_tokens FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "enquete_tokens_update" ON enquete_tokens FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "enquete_tokens_delete" ON enquete_tokens FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- enquete_votos (sem RLS até agora)
-- ============================================================
ALTER TABLE enquete_votos ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquete_votos FORCE ROW LEVEL SECURITY;

CREATE POLICY "enquete_votos_select" ON enquete_votos FOR SELECT TO authenticated USING (true);
CREATE POLICY "enquete_votos_insert" ON enquete_votos FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "enquete_votos_update" ON enquete_votos FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "enquete_votos_delete" ON enquete_votos FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- push_subscriptions (sem RLS até agora)
-- ============================================================
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions FORCE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_select" ON push_subscriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "push_subscriptions_insert" ON push_subscriptions FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "push_subscriptions_update" ON push_subscriptions FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "push_subscriptions_delete" ON push_subscriptions FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- temporada_diretoria (sem RLS até agora)
-- ============================================================
ALTER TABLE temporada_diretoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporada_diretoria FORCE ROW LEVEL SECURITY;

CREATE POLICY "temporada_diretoria_select" ON temporada_diretoria FOR SELECT TO authenticated USING (true);
CREATE POLICY "temporada_diretoria_insert" ON temporada_diretoria FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "temporada_diretoria_update" ON temporada_diretoria FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "temporada_diretoria_delete" ON temporada_diretoria FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- temporada_valores_mes (sem RLS até agora)
-- ============================================================
ALTER TABLE temporada_valores_mes ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporada_valores_mes FORCE ROW LEVEL SECURITY;

CREATE POLICY "temporada_valores_mes_select" ON temporada_valores_mes FOR SELECT TO authenticated USING (true);
CREATE POLICY "temporada_valores_mes_insert" ON temporada_valores_mes FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "temporada_valores_mes_update" ON temporada_valores_mes FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "temporada_valores_mes_delete" ON temporada_valores_mes FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- user_profiles (sem RLS até agora)
-- ============================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles FORCE ROW LEVEL SECURITY;

-- Utilizador pode ler o próprio perfil; admin lê todos
CREATE POLICY "user_profiles_select" ON user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "user_profiles_insert" ON user_profiles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "user_profiles_update" ON user_profiles FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "user_profiles_delete" ON user_profiles FOR DELETE TO authenticated USING (public.is_admin());
