# Tape portal (web)

Public tape designer + quote requests and the internal lead portal. See [ARCHITECTURE.md](./ARCHITECTURE.md).

```bash
cp .env.example .env.local   # fill in Supabase keys
npm install
npm run dev                  # http://localhost:3000
npm run typecheck && npm run lint && npm test
npm run db:start && npm run db:reset && npm run db:test   # needs Docker
```
