@AGENTS.md
Add as a new top-level section ## Match Record Creation in CLAUDE.md\n\n## Match Record Creation
When creating football match records in Supabase:
1. ALWAYS search for existing players by nickname/partial name before creating new ones. Common nicknames: 'Japa' = Okamoto, 'Santinha' = Ricardo Santa Cruz.
2. ALWAYS create `propostas_times` (team) records before inserting match data.
3. Adjust match dates to the nearest Sunday if not already a Sunday.
4. When there are multiple players with similar names (e.g., multiple 'Ricardo'), ask the user to confirm before proceeding.
Add as a new top-level section ## Database Migrations in CLAUDE.md\n\n## Database Migrations
When adding new database columns or tables:
1. Always verify the column exists in the database BEFORE writing UI/API code that references it.
2. Execute the migration SQL via the Supabase MCP tool and confirm success before proceeding.
3. If migration cannot be executed, STOP and tell the user rather than continuing with code that will fail.
Add at the top of CLAUDE.md as the first section\n\n## Tech Stack
- Framework: Next.js with TypeScript
- Database: Supabase (PostgreSQL + RLS)
- Styling: CSS (globals.css)
- Deployment: Vercel
- App type: PWA with push notifications

Always use TypeScript. When editing components, check for type consistency across the full chain (API route → types → component props).
