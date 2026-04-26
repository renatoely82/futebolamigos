# Skill: Log de Projeto

Registra uma nota rápida no vault Obsidian sobre o que foi feito no projeto Barcelombra.

## Uso

O usuário invoca `/log` seguido de uma descrição do que fez. Exemplo:
- `/log implementei votação de times pelos jogadores`
- `/log corrigi bug no filtro de temporada`

## Instruções

1. Pegar a mensagem que o usuário passou como argumento
2. Criar uma entrada no changelog do projeto no vault Obsidian com data e hora
3. O arquivo de destino é: `C:\Users\rsely\rselyAIBrain\03 Projects\Barcelombra\changelog.md`
4. Se o arquivo não existir, criar com o header `# Changelog — Barcelombra`
5. Adicionar a entrada no TOPO do arquivo (logo abaixo do header), formato:

```
- **YYYY-MM-DD HH:mm** — [mensagem do usuário]
```

6. Confirmar ao usuário que o log foi registrado
