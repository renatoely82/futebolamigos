#!/bin/bash
# Log rápido de atividade no vault Obsidian
# Uso: ./scripts/log.sh "mensagem do que foi feito"

VAULT_CHANGELOG="/c/Users/rsely/rselyAIBrain/03 Projects/Barcelombra/changelog.md"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M")
MSG="$*"

if [ -z "$MSG" ]; then
  echo "Uso: ./scripts/log.sh \"mensagem do que foi feito\""
  exit 1
fi

# Criar arquivo se não existir
if [ ! -f "$VAULT_CHANGELOG" ]; then
  echo "# Changelog — Barcelombra" > "$VAULT_CHANGELOG"
  echo "" >> "$VAULT_CHANGELOG"
fi

# Inserir entrada no topo (abaixo do header)
ENTRY="- **${TIMESTAMP}** — ${MSG}"
HEADER=$(head -2 "$VAULT_CHANGELOG")
BODY=$(tail -n +3 "$VAULT_CHANGELOG")

{
  echo "$HEADER"
  echo "$ENTRY"
  echo "$BODY"
} > "$VAULT_CHANGELOG"

echo "Registrado no vault: $ENTRY"
