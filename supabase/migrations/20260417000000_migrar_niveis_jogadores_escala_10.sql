-- Migrar níveis de jogadores da escala 1-5 para escala 1-10
-- Regra: novo_nivel = nivel_atual * 2
-- 1→2, 2→4, 3→6, 4→8, 5→10
UPDATE jogadores
SET nivel = nivel * 2,
    atualizado_em = NOW()
WHERE nivel <= 5;
