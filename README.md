# Mr Pocket

Mr Pocket is a personal finance dashboard for tracking money in, money out, savings goals, recurring reminders, and shared expenses. It provides a focused view of your financial activity and lets you export transaction data in several formats.

**Live Demo:** [mrpocket00.vercel.app](https://mrpocket00.vercel.app/)

## Features

- Secure email/password authentication with Supabase Auth
- Google sign-in and optional Google account linking
- Dashboard with inflow, outflow, net balance, trends, and category breakdowns
- Transaction management for income and expenses
- Automatic default categories for new members
- Savings goals with progress tracking and available-to-save calculations
- Payment reminders with paid/unpaid status
- Shared expense groups with invite codes, member management, balances, and settlements
- Transaction exports as Excel, PDF, CSV, or JSON
- Optional profile information in exported files
- Profile editing, password management, minimum balance preferences, and account deletion
- First-login onboarding tour for new members
- Responsive navigation for desktop and mobile screens

## Tech Stack

- [Next.js](https://nextjs.org/) 14 with the App Router
- [React](https://react.dev/) 18
- [Supabase](https://supabase.com/) for authentication and PostgreSQL data
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Recharts](https://recharts.org/) for dashboard charts
- [Lucide React](https://lucide.dev/) for icons
- [SheetJS](https://sheetjs.com/) for Excel exports
- [jsPDF](https://github.com/parallax/jsPDF) and AutoTable for PDF exports

## Requirements

- Node.js 18.17 or newer
- npm
- A Supabase project

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a file named `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Use the values from Supabase Dashboard > Project Settings > API. Never commit `.env.local` or service-role keys to source control.

### 4. Configure the Supabase database

Create the tables used by the application in your Supabase PostgreSQL database. The application expects these tables:

- `profiles`
- `categories`
- `transactions`
- `goals`
- `reminders`
- `groups`
- `group_members`
- `group_invites`
- `group_expenses`
- `group_expense_shares`
- `group_settlements`

Enable Row Level Security and add policies that restrict personal records to their owner. Group records should be accessible only to group members. The client uses the public Supabase key, so database policies are required for production security.

At minimum, the profile record is keyed by the authenticated user's ID. The application reads profile fields including `full_name`, `date_of_birth`, `bio`, and `min_balance`.

### 5. Configure authentication redirects

In Supabase Dashboard > Authentication > URL Configuration, add both local and deployed URLs:

```text
http://localhost:3000/**
https://mrpocket00.vercel.app/**
```

Set the Supabase Site URL to `https://mrpocket00.vercel.app`. OAuth and email confirmation links are generated from the current browser origin, so local development stays on localhost.

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## PWA Support

Mr Pocket includes a web app manifest and service worker, so it can be installed from supported browsers as a standalone app. The service worker caches static assets and uses a network-first strategy for page navigation. Authentication, API requests, and Supabase requests are intentionally excluded from caching.

To test installation locally:

1. Start the app with `npm run dev`.
2. Open `http://localhost:3000` in a browser that supports PWA installation.
3. Use the browser's install prompt or install option in the address bar.

PWAs require HTTPS in production. `localhost` is treated as a secure development origin by modern browsers.

### Use It On Your Phone

Yes. Open the [live app](https://mrpocket00.vercel.app/) on your phone and install it from your browser:

- **Android:** Open the site in Chrome, tap the three-dot menu, then choose **Install app** or **Add to Home screen**.
- **iPhone/iPad:** Open the site in Safari, tap **Share**, choose **Add to Home Screen**, and confirm.

After installation, Mr Pocket opens in a standalone app-like window with its own Home Screen icon. It is still a web app, so sign-in and live financial data require an internet connection. The installed app uses the same Supabase account as the browser version.

## Available Scripts

```bash
npm run dev      # Start the development server
npm run build    # Create a production build
npm run start    # Start the production server
npm run lint     # Run Next.js linting
```

On Windows PowerShell, use `npm.cmd` if PowerShell script execution policy blocks `npm`:

```powershell
npm.cmd run dev
npm.cmd run build
```

## Application Routes

| Route | Purpose |
| --- | --- |
| `/login` | Sign in with email/password or Google |
| `/signup` | Create an account |
| `/dashboard` | View financial summaries and charts |
| `/transactions` | Add, edit, and delete transactions |
| `/goals` | Create and track savings goals |
| `/reminders` | Manage upcoming payment reminders |
| `/groups` | Create groups, join with a code, and manage invitations |
| `/groups/[id]` | View group expenses, shares, balances, and settlements |
| `/export` | Preview and export transaction data |
| `/profile` | Manage personal details, login methods, preferences, and account deletion |
| `/forgot-password` | Request a password reset |
| `/reset-password` | Set a new password |

## Project Structure

```text
app/                 Next.js routes, pages, API routes, and global styles
components/          Reusable client components
lib/                 Supabase clients and finance, date, export, and calculation helpers
public/               Logos and application icons
middleware.js        Supabase session refresh and protected route checks
next.config.js        Next.js configuration
tailwind.config.js   Tailwind theme configuration
vercel.json           Vercel build and deployment configuration
```

## Authentication and Security

- Supabase manages user sessions and authentication.
- Middleware protects the dashboard, profile, transactions, and goals route families from unauthenticated access. Other authenticated pages load user data through Supabase and should also be protected with appropriate database RLS policies.
- Supabase Row Level Security must protect every user-owned and group-owned table.
- Keep `NEXT_PUBLIC_SUPABASE_ANON_KEY` limited to the browser-safe anonymous key.
- Do not expose a Supabase service-role key in client code or public environment variables.
- Account deletion is permanent and removes the user's financial data through the application API.

## Deploying to Vercel

1. Push the repository to GitHub.
2. Import the repository into [Vercel](https://vercel.com/).
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` under Project Settings > Environment Variables.
4. Deploy using the default Next.js settings.
5. Add `https://mrpocket00.vercel.app/**` to Supabase Authentication > URL Configuration and set it as the Site URL.
6. Test email confirmation, password reset, Google sign-in, and protected routes in the deployed environment.

The included `vercel.json` uses the following commands:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "npm install",
  "devCommand": "npm run dev"
}
```

## Data and Privacy

Mr Pocket handles personal financial information. Use a private Supabase project, configure strict RLS policies, avoid logging sensitive data, and protect all production credentials. Exported files are generated in the browser and should be stored securely.

## Contributing

1. Create a feature branch.
2. Make a focused change.
3. Run the relevant checks locally.
4. Open a pull request with a clear description and testing notes.

## License

No license has been specified for this repository yet. Add a license before accepting external contributions or distributing the project publicly.
