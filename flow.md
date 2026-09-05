# Mr Pocket Application Flow

## 1. Entry and Authentication

```mermaid
flowchart TD
    A[Open Mr Pocket] --> B{Authenticated?}
    B -- No --> C[/login]
    B -- Yes --> D[/dashboard]
    C --> E{Choose action}
    E --> F[Sign in with email and password]
    E --> G[Sign in with Google]
    E --> H[/signup]
    E --> I[/forgot-password]
    H --> J[Create Supabase account]
    J --> K[Confirm email if required]
    K --> D
    F --> D
    G --> D
    I --> L[Receive password reset link]
    L --> M[/reset-password]
    M --> D
```

- The root route checks the current Supabase user and redirects to `/login` or `/dashboard`.
- Middleware refreshes the Supabase session and redirects unauthenticated users away from protected personal-finance routes.
- Supabase Auth owns email/password, Google OAuth, email confirmation, and password reset sessions.

## 2. Personal Finance Flow

```mermaid
flowchart LR
    A[/dashboard] --> B[Select reporting period]
    B --> C[Load transactions and categories]
    C --> D[Calculate inflow, outflow, net balance, trends, and category totals]
    D --> A
    A --> E[/transactions]
    E --> F[Create, edit, or delete transaction]
    F --> C
    E --> G[/goals]
    G --> H[Create and track savings goals]
    E --> I[/reminders]
    I --> J[Create reminders and mark payments paid or unpaid]
    E --> K[/profile]
    K --> L[Update profile, preferences, login methods, or delete account]
```

Personal records are stored in Supabase and should be restricted by `user_id` through Row Level Security policies.

## 3. Shared Expenses Flow

```mermaid
flowchart TD
    A[/groups] --> B{Group action}
    B --> C[Create group]
    C --> D[Insert group and owner membership]
    B --> E[Join with invite code]
    E --> F[POST /api/join-group]
    F --> D
    B --> G[Accept pending invite]
    G --> H[POST /api/accept-invite]
    H --> D
    D --> I[/groups/:id]
    I --> J[Add group expense]
    J --> K[Assign expense shares]
    K --> L[Calculate member balances]
    L --> M[Record settlement]
    M --> N[POST /api/settlement-receiver]
    N --> O[Mark balance as settled]
    O --> P[Undo settlement when needed]
    P --> Q[POST /api/undo-settlement]
```

- Group members can view the group and its expenses according to Supabase RLS policies.
- Group invitations can be accepted or declined from `/groups`.
- Settlement API routes perform server-side operations that should be limited to authorized group members.

## 4. Transaction Export Flow

```mermaid
flowchart LR
    A[/export] --> B[Choose all history or date range]
    B --> C[Load matching transactions and categories]
    C --> D[Preview paginated rows]
    D --> E[Select one or more formats]
    E --> F{Include profile information?}
    F --> G[Generate files in browser]
    G --> H[Excel]
    G --> I[PDF]
    G --> J[CSV]
    G --> K[JSON]
```

Exports are generated client-side from the authenticated user's transaction data. Profile details are included only when explicitly selected.

## 5. Account Deletion Flow

```mermaid
flowchart TD
    A[/profile] --> B[Confirm account deletion]
    B --> C[POST /api/delete-account]
    C --> D[Delete user-owned financial data]
    D --> E[Delete Supabase Auth user]
    E --> F[Sign out and return to /login]
```

## 6. Main Data Stores

| Area | Supabase tables |
| --- | --- |
| User identity and preferences | `profiles` |
| Personal finance | `categories`, `transactions`, `goals`, `reminders` |
| Shared expenses | `groups`, `group_members`, `group_invites`, `group_expenses`, `group_expense_shares`, `group_settlements` |

## 7. Security Boundary

1. The browser uses the public Supabase URL and anonymous key.
2. Supabase Auth identifies the current user.
3. Middleware protects the main personal-finance route family.
4. Supabase RLS must enforce ownership for personal rows and membership for group rows.
5. Server API routes validate the authenticated session before changing account, group, or settlement data.
6. Service-role credentials must remain server-only and must never be exposed through public environment variables.
