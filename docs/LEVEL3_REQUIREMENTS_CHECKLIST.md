# Level 3 Requirements Checklist

Guideline-by-guideline audit against the official *DBMS Experiential Learning — Level 3*
requirements. Status: ✅ COMPLETE · ⬜ PENDING · ➖ NOT APPLICABLE (justified).

| # | Requirement | Mandatory | How we satisfy it | Files | Status |
|---|---|---|---|---|---|
| 1 | **Project Title** — unique, real-world, not simple CRUD | Yes | SmartCanteen: campus meal pre-ordering + pickup with transactional capacity/inventory | — | ✅ |
| 2 | **Team Formation** — 2 members, defined responsibilities | Yes | Sreekar (SQL + ordering) · Soha (NoSQL + auth/vendor) | `docs/06_team_contributions.md` | ✅ |
| 3 | **Database Requirement** — ≥2 paradigms (SQL mandatory) | Yes | MySQL + MongoDB (Option 1: SQL + NoSQL) | `db/`, `src/lib/` | ✅ |
| 4 | **Database Design** — ER, relational schema, PK/FK, constraints, relationships; NoSQL data model | Yes | ER + schema + data dictionary + Mongo model | `docs/02_database_design.md` | ✅ |
| 5 | **SQL Implementation** — CREATE/ALTER/DROP, keys, constraints, indexes, views | Yes | Full DDL incl. ALTER + controlled DROP, 9 indexes, 2 views | `db/schema.sql`, `db/reset.sql` | ✅ |
| 6 | **Database Operations** — INSERT/UPDATE/DELETE/SELECT, JOIN, GROUP BY, HAVING, ORDER BY, aggregates, subqueries | Yes | Across API + `db/queries.sql` (incl. correlated & derived-table subqueries) | `db/queries.sql`, `src/lib/` | ✅ |
| 7 | **Advanced Database Features** — ≥4 | Yes | **6**: transactions, procedures, trigger, views, indexing, Mongo aggregation | `docs/03_advanced_dbms_features.md` | ✅ |
| 8 | **Vector DB / Semantic Search** — optional | No | Data is structured/transactional, not unstructured; not needed under SQL+NoSQL | — | ➖ (justified) |
| 9 | **Web Application Interface** — Next.js, forms/tables/search/dashboards | Yes | Next.js App Router UI: forms, menu grid, search/filter, dashboards, tracking | `src/app/` | ✅ |
| 10 | **Database–Application Integration** — API layer, env-var credentials, no hard-coding | Yes | Route Handlers + `mysql2`/Mongo driver; creds in `.env.local` only | `src/app/api/`, `src/lib/`, `.env.example` | ✅ |
| 11 | **Authentication & Authorization** — roles (≥2) | Yes | Student + Vendor; bcrypt + signed cookie; server-side RBAC | `src/lib/auth.ts` | ✅ |
| 12 | **Data Validation & Integrity** — DB-level validation, consistency | Yes | 3 validation layers; CHECK/FK/UNIQUE/ENUM; transactional consistency | `src/lib/validation.ts`, `db/schema.sql` | ✅ |
| 13 | **Security** — no plain-text passwords/credentials | Yes | bcrypt hashes; parameterized SQL; secrets in env; `.env*` git-ignored | `src/lib/auth.ts`, `.gitignore` | ✅ |
| 14 | **Project Documentation** — problem, objectives, scope, ER, schema, data dictionary, DB justification, queries, architecture, screenshots, testing, conclusion | Yes | Full `docs/` set + screenshots | `docs/` | ✅ |
| 15 | **Git/GitHub** — repo, individual commits, README with setup | Yes | Git repo; README with setup/run; per-member commits | `README.md`, `.git/` | ✅ (push pending) |
| 16 | **Evaluation / Demonstration** — problem, ER, schema, implementation, queries, UI, integration, advanced features, tests, individual contribution | Yes | Demo script + viva prepared | `docs/07_demo_and_viva.md` | ✅ |
| 17 | **Originality** — original design/implementation | Yes | Original problem/schema/implementation; extends the team's own Lab 4 | — | ✅ |
| 18 | **Level 3 Expectation** — beyond CRUD; justified DB choice | Yes | Transactions/concurrency/analytics well beyond CRUD; SQL vs NoSQL justified | `docs/02_database_design.md` §2.7 | ✅ |

**Summary:** 16 mandatory requirements satisfied, 1 optional marked Not Applicable with
justification (vector search), and GitHub push is the only step awaiting the shared repo.
