
# Admin Library Vault — Library Management System

A full-stack library management system for administrators to manage books, members, and book lending — built with React, TypeScript, and Supabase.

---

## What does it do?

Admin Library Vault is a role-based admin panel for a library. Only authenticated users with the **admin** role can access the dashboard. From there, they can manage the entire lifecycle of the library:

- Add, edit, and delete books in the catalog
- Manage library members
- Issue books to members and track return dates
- Monitor overdue books
- View real-time availability counts for each book

---

## Features

| Feature | Description |
|---|---|
| **Authentication** | Email/password sign-up and sign-in via Supabase Auth |
| **Role-Based Access** | Only `admin`-role users can access the dashboard; enforced by Supabase Row Level Security (RLS) |
| **Books Management** | Add, edit, delete books with title, author, ISBN, category, published year, and quantity tracking |
| **Members Management** | Add, edit, delete library members with contact info and membership status |
| **Book Issuing** | Issue a book to a member with a due date; automatically decrements available quantity |
| **Book Returns** | Mark issued books as returned; automatically restores available quantity |
| **Overdue Tracking** | Issues tab shows issued, returned, and overdue status for every transaction |
| **Landing Page** | Public-facing landing page with a sign-in CTA |

---

## Tech Stack

**Frontend**
- React 18 + TypeScript + Vite
- [shadcn/ui](https://ui.shadcn.com/) (built on Radix UI primitives)
- Tailwind CSS
- TanStack Query (`@tanstack/react-query`) for server state management
- React Hook Form + Zod for form validation
- React Router DOM for navigation
- Lucide React for icons
- Sonner / custom toast for notifications

**Backend / Database**
- [Supabase](https://supabase.com/) (PostgreSQL + Auth + Row Level Security)
- 3 migrations define the full schema
- All data access is protected by RLS policies scoped to admin roles

**Tooling**
- Bun (package manager / lockfile)
- ESLint

---

## Database Schema

```
┌──────────────────┐       ┌──────────────────┐
│     books        │       │     members      │
│──────────────────│       │──────────────────│
│ id (uuid)        │       │ id (uuid)        │
│ title            │       │ full_name        │
│ author           │       │ email (unique)   │
│ isbn (unique)    │       │ phone            │
│ category         │       │ address          │
│ published_year   │       │ membership_date  │
│ quantity         │       │ status           │
│ available_qty    │       │ created_at       │
│ description      │       └──────────────────┘
│ created_at       │                │
└──────────────────┘                │
         │                          │
         └─────────┬────────────────┘
                   │
          ┌────────────────┐
          │  book_issues   │
          │────────────────│
          │ id (uuid)      │
          │ book_id (fk)   │
          │ member_id (fk) │
          │ issue_date     │
          │ due_date       │
          │ return_date    │
          │ status         │  ← 'issued' | 'returned' | 'overdue'
          │ created_at     │
          └────────────────┘

┌──────────────────┐    ┌──────────────────┐
│   user_roles     │    │  admin_profiles  │
│──────────────────│    │──────────────────│
│ user_id (fk)     │    │ user_id (fk)     │
│ role (enum)      │    │ full_name        │
│  'admin'|'member'│    │ email            │
└──────────────────┘    └──────────────────┘
```

**RLS Policies:** All tables enforce Row Level Security. Admins (verified via `has_role()` function) can perform full CRUD. Public read access is granted to books/members for listing purposes.

---

## Project Structure

```
admin-library-vault/
├── .env                       # Supabase project credentials
├── components.json            # shadcn/ui config
├── tailwind.config.ts
├── vite.config.ts
├── supabase/
│   └── migrations/            # PostgreSQL schema migrations
├── src/
│   ├── App.tsx                # Routes: /, /auth, /dashboard
│   ├── pages/
│   │   ├── Index.tsx          # Landing page
│   │   ├── Auth.tsx           # Login / Sign-up page
│   │   ├── Dashboard.tsx      # Protected admin dashboard
│   │   └── NotFound.tsx       # 404 page
│   ├── components/
│   │   ├── layout/            # DashboardLayout (sidebar/header)
│   │   ├── dashboard/
│   │   │   ├── BooksTab.tsx         # Books list + search + CRUD
│   │   │   ├── BookModal.tsx        # Add/edit book form modal
│   │   │   ├── MembersTab.tsx       # Members list + search + CRUD
│   │   │   ├── MemberModal.tsx      # Add/edit member form modal
│   │   │   ├── IssuesTab.tsx        # Book issues list + status filter
│   │   │   └── IssueBookModal.tsx   # Issue a book to a member modal
│   │   └── ui/                # shadcn/ui primitives (button, dialog, table, etc.)
│   ├── hooks/
│   │   ├── use-toast.ts
│   │   └── use-mobile.tsx
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts      # Supabase client initialisation
│   │       └── types.ts       # Auto-generated DB types
│   └── lib/
│       └── utils.ts           # cn() utility
```

---

## Getting Started

### Prerequisites
- Node.js ≥ 18 (or Bun)
- A [Supabase](https://supabase.com/) project

### 1. Clone the repo

```bash
git clone https://github.com/rahilkm/admin-library-vault.git
cd admin-library-vault
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com).
2. Run the migrations in `supabase/migrations/` against your project (via the Supabase SQL Editor or the Supabase CLI).
3. In your Supabase project, go to **Authentication → Policies** and verify RLS is enabled on all tables.
4. Create your first admin user via **Authentication → Users**, then manually insert their role:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<your-user-uuid>', 'admin');
```

### 3. Configure environment

Create a `.env` file in the root (or update the existing one):

```env
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_public_key
```

Both values are found in your Supabase project under **Settings → API**.

> [!CAUTION]
> The repo currently has a live `.env` file committed. Make sure to rotate your Supabase anon key and add `.env` to `.gitignore` before sharing or deploying.

### 4. Install & run

```bash
# Using npm
npm install
npm run dev        # http://localhost:5173

# Or using Bun
bun install
bun run dev
```

---

## Pages & Routes

| Route | Page | Access |
|---|---|---|
| `/` | Landing page | Public |
| `/auth` | Login / Register | Public |
| `/dashboard` | Admin dashboard (Books, Members, Issues tabs) | Auth required (admin role) |

---

## License

MIT
