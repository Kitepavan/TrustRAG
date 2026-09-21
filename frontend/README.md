# TrustRAG Web Frontend

React 19, strict TypeScript, Vite 8, Tailwind CSS v4 and React Router.
Updated September 17, 2026. See the [root README](../README.md) for backend setup and credentials.

## Development

Use Node.js 20.19+ or 22.12+ on supported release lines. From the repository root:

```bash
npm --prefix frontend install
npm --prefix frontend run dev -- --port 5173
```

Start the backend separately on port 8000, or use `./start.sh` to launch both after
dependencies are installed. Open [http://localhost:5173](http://localhost:5173).

The API base defaults to `http://localhost:8000`. For another backend address, set
`VITE_API_URL` in `frontend/.env.local` and restart Vite (rebuild for a production
bundle). `VITE_` values are public browser configuration: never put secrets there.
There is no Vite backend proxy. A remote browser needs a reachable backend URL and
its origin allowed in the backend's `TRUSTRAG_ALLOWED_ORIGINS`.

## Sign-in and authorization

`AuthGate` validates identity with `/auth/me` before mounting the application. Tokens
use sessionStorage; logout also removes legacy localStorage tokens. An API 401 clears
the token and unmounts protected pages. Sign out to switch accounts; there is no automatic
persona switcher or embedded password. Known demo credentials require explicit backend
`TRUSTRAG_DEMO_MODE=true`; otherwise configure the account's scrypt password hash.

Admin and IT_Security can use unfiltered baseline queries and read audit events.
Backend checks remain authoritative even where controls are hidden in the UI.

## Routes

| Route | Page | Behavior |
|---|---|---|
| `/` | Dashboard | Inventory statistics and pipeline overview |
| `/documents` | Documents | PDF/DOCX/TXT upload, classification, optional Ed25519 signature, trust badges |
| `/chat` | RAG Chat | Secure queries, privileged baseline toggle, citations and response pipeline traces |
| `/evaluation` | Security Benchmark | Four synthetic component checks, rerun, pass counts and suite duration |
| `/audit` | Audit Log | Privileged recent events, event/severity filters and expandable traces |
| `/knowledge` | Knowledge Base | Authorized document metadata |
| `/status` | System Status | Component statuses, including configured/not-checked indicators |

Documents defaults to INTERNAL classification. All classification choices are shown;
the backend rejects choices outside the uploader's clearance. Unsigned clean documents
are Suspicious; signing does not override content quarantine. Inventory uses five-row
pagination and document-ID keys.

`useApi` ignores stale results and invalidates outstanding results during cleanup; it
does not abort network requests. The shared API client uses a default 120-second timeout.
The Evaluation page uses separate request state, not this hook's stale-response guard.

## Honest interpretation of results

- Benchmark percentages describe fixed synthetic checks, not measured end-to-end LLM
  attack success. `suite_duration_ms` is check runtime, not RAG pipeline overhead.
- A successful query may contain a labelled context fallback if the provider fails.
  No eligible context skips the provider entirely. An unset key fails only if generation
  is reached; it does not prevent the frontend or backend from starting.
- Audit storage is mutable SQLite, not cryptographically tamper-evident. The page's
  “tamper-resistant” copy overstates the implemented guarantee. The API has cursor
  pagination; the UI only indicates older events rather than loading another page.
- Component configuration and `/health` do not establish live provider availability.

## Checks

```bash
npm --prefix frontend run build
npm --prefix frontend run lint
```

Both passed during the September 17 documentation update; lint reported zero warnings
and zero errors. Backend verification passed 68 tests with one dependency deprecation
warning. No browser GUI acceptance or live OpenRouter generation was run in this pass.

If the page hangs, inspect server logs, port ownership and process state before restarting.
A `T` process is suspended; resume the correct job in its owning terminal. See root
[troubleshooting](../README.md#troubleshooting) for the recorded server-recovery incident.
