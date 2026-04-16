# Create Match Record (Registrar Partida)

You are helping the user register a completed football match into the futebolamigos Supabase database (project_id: `ipdrhvjjdnfvwdgqefsu`).

## Step 1 — Collect match info

Ask the user for the following (can be provided in one message):
- **Date** of the match
- **Team names** (Time A and Time B) — defaults are 'Amarelo' and 'Azul'
- **Score** (placar_time_a and placar_time_b)
- **Players per team** (list of names/nicknames)
- **Goal scorers** (name + number of goals; ask if any own goals)

## Step 2 — Resolve players

For each player mentioned, search `jogadores` by name/nickname using ILIKE fuzzy matching:

```sql
SELECT id, nome FROM jogadores WHERE nome ILIKE '%<name>%' AND ativo = true;
```

- If a unique match is found → use that player's id
- If multiple matches → show options and ask user to confirm
- If no match → ask user to confirm creating a new player (collect: nome, posicao_principal)
- Known nicknames: 'Japa' = Okamoto, 'Santinha' = Ricardo Santa Cruz

## Step 3 — Get active temporada

```sql
SELECT id FROM temporadas WHERE ativa = true LIMIT 1;
```

## Step 4 — Create the partida record

Adjust date to the nearest Sunday if not already a Sunday.

```sql
INSERT INTO partidas (data, status, nome_time_a, nome_time_b, placar_time_a, placar_time_b, temporada_id, numero_jogadores)
VALUES ('<sunday_date>', 'realizada', '<time_a>', '<time_b>', <score_a>, <score_b>, '<temporada_id>', <total_players>)
RETURNING id;
```

## Step 5 — Add players (partida_jogadores)

Insert one row per player with their `partida_id` and `jogador_id`:

```sql
INSERT INTO partida_jogadores (partida_id, jogador_id, confirmado, adicionado_manualmente)
VALUES ('<partida_id>', '<jogador_id>', true, false);
```

## Step 6 — Record goals (gols)

Insert one row per goal scorer. If a player scored multiple goals, use `quantidade`:

```sql
INSERT INTO gols (partida_id, jogador_id, quantidade, gol_contra)
VALUES ('<partida_id>', '<jogador_id>', <qtd>, false);
```

For own goals set `gol_contra = true`.

## Step 7 — Verify and summarize

Run a verification query and display a clean summary to the user:

```sql
SELECT 
  p.data,
  p.nome_time_a || ' ' || p.placar_time_a || ' x ' || p.placar_time_b || ' ' || p.nome_time_b AS resultado,
  p.numero_jogadores,
  COUNT(DISTINCT pj.jogador_id) AS jogadores_registrados,
  COALESCE(SUM(g.quantidade), 0) AS total_gols
FROM partidas p
LEFT JOIN partida_jogadores pj ON pj.partida_id = p.id
LEFT JOIN gols g ON g.partida_id = p.id
WHERE p.id = '<partida_id>'
GROUP BY p.id, p.data, p.nome_time_a, p.nome_time_b, p.placar_time_a, p.placar_time_b, p.numero_jogadores;
```

Show: date, result, players count, top scorers list.
