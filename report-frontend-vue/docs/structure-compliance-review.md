# Feature-Sliced Design Compliance Review

## Overview
This document captures the current gaps between the repository layout and the FSD rules defined in `STRUCTURE.md`. The focus is on the NSI dashboard scope that was recently delivered as well as the surrounding NSI pages and shared infrastructure.

## Summary of Findings
- Multiple legacy root-level folders (`components/`, `services/`, `stores/`, `api/`, `composables/`, `types/`) coexist with the prescribed `app/shared/entities/features/widgets/pages/layouts` layers. They contain domain logic and are actively imported from pages, breaking the slice boundaries.
- Pages, including the refreshed NSI dashboard, access HTTP/RPC clients directly through ad-hoc service modules instead of consuming repositories exposed from the `entities` layer.
- Domain-specific UI such as the NSI Sources form still lives under the generic `src/components` tree and is imported directly by pages, bypassing the widget/feature layers.
- Shared RPC helper modules (`src/api/rpc.ts`) host business DTOs and transformation logic that should live inside entity repositories. Pages import from these helpers directly, coupling presentation with transport logic.
- Pinia stores remain in a global `src/stores` folder and are consumed directly; in FSD they should be wrapped by features or entities to avoid cross-layer dependencies.

## Details & Suggested Refactors

### 1. Normalise the root layer structure
- Consolidate the remaining legacy directories into the FSD layout. For example, move `src/components` content into `@widgets`/`@features` (depending on reuse) and expose them via barrel files; migrate `src/services` and `src/api` logic into `@entities` repositories; relocate `src/stores` behind feature facades.
- Once migrated, delete the legacy folders to enforce the desired import graph and simplify linting.

### 2. Route API access through entities
- Move `src/services/nsiDashboard.api.ts` into a dedicated entity module (e.g. `src/entities/nsi-dashboard/api/repository.ts`) and expose typed hooks or use-cases from features so that `NsiDashboardPage` consumes `@features/nsi-dashboard` instead of touching API clients directly.
- Apply the same pattern to other NSI pages: wrap RPC calls currently imported from `@/api/rpc` inside the relevant entity repositories (`entities/source`, `entities/department`, etc.) and provide page-level hooks/components through features.

### 3. Rehome domain UI into features/widgets
- Promote `src/components/nsi/SourcesForm.vue` into a feature/widget (e.g. `features/source-form`) since it encapsulates domain-specific validation and events. Pages should consume it via `@features` or `@widgets` barrels rather than `@/components`.
- Audit other components under `src/components` for domain coupling and relocate accordingly.

### 4. Encapsulate shared state management
- Pinia stores in `src/stores` should be surfaced through feature APIs (e.g. `features/auth/model/useAuth.ts` already exists—ensure consumers use it instead of importing the store directly). After wrapping, keep raw store definitions in `@entities` or `@shared` as appropriate and remove the public `@/stores` alias usage.

### 5. Tighten lint/enforcement
- After restructuring, update ESLint or custom lint rules to forbid direct imports from retired folders (`@/services`, `@/api`, `@/components`, `@/stores`) to prevent regressions.

Following these steps will align the codebase with the documented FSD layering and keep future NSI work consistent with the rest of the application.
