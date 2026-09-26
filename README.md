# EPM WebXterm UI

This is the Next.js version of the vsay-terminal React application, migrated from Vite + React Router to Next.js App Router.

## Migration Status

✅ **Completed:**
- Project structure and configuration files
- Root layout with all providers (Theme, Auth, QueryClient)
- Public pages: Login, Signup, Forgot Password
- Protected route layout (dashboard layout)
- Dashboard page
- Components, contexts, hooks, and lib directories copied and updated
- AppSidebar and Header components updated for Next.js routing

🔄 **To Complete:**
The following pages need to be converted from React Router to Next.js format:
- Machines page (`/machines`)
- Machine Details (`/machines/[id]`)
- Machine Add/Edit (`/machines/add`, `/machines/[id]/edit`)
- Community page (`/community`)
- Community Details (`/community/[id]`)
- Community Add/Edit (`/community/add`, `/community/[id]/edit`)
- Documentation page (`/documentation`)
- Profile page (`/profile`)
- Settings page (`/settings`) - currently maps to Profile
- NotFound page (`/not-found`)

## Key Changes from React Router to Next.js

1. **Routing:**
   - `react-router-dom` → Next.js App Router
   - `<Link to="...">` → `<Link href="...">`
   - `useNavigate()` → `useRouter()` from `next/navigation`
   - `useLocation()` → `usePathname()` from `next/navigation`
   - `useParams()` → `useParams()` from `next/navigation` (but it works differently)

2. **Layout Structure:**
   - Root layout: `app/layout.tsx`
   - Protected routes layout: `app/(dashboard)/layout.tsx`
   - Individual pages: `app/[route]/page.tsx`

3. **Client Components:**
   - All components that use hooks or interactivity need `'use client'` directive

## How to Convert Remaining Pages

For each page file in the original `Vsay-terminal/src/pages/` directory:

1. Replace React Router imports:
   ```tsx
   // OLD
   import { Link, useNavigate } from 'react-router-dom';
   
   // NEW
   'use client';
   import Link from 'next/link';
   import { useRouter } from 'next/navigation';
   ```

2. Update routing hooks:
   ```tsx
   // OLD
   const navigate = useNavigate();
   navigate('/path');
   
   // NEW
   const router = useRouter();
   router.push('/path');
   ```

3. Update Link components:
   ```tsx
   // OLD
   <Link to="/path">Text</Link>
   
   // NEW
   <Link href="/path">Text</Link>
   ```

4. For dynamic routes:
   - `/machines/:id` → `/machines/[id]/page.tsx`
   - Use `useParams()` from `next/navigation` (returns `{ id: string }`)

## Running the Project

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
vsay-terminal-next/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Home page (redirects)
│   ├── login/             # Public routes
│   ├── signup/
│   ├── forgot-password/
│   └── (dashboard)/       # Protected routes group
│       ├── layout.tsx     # Dashboard layout (sidebar + header)
│       ├── dashboard/
│       ├── machines/
│       ├── community/
│       ├── documentation/
│       └── profile/
├── components/            # React components
├── contexts/             # Context providers
├── hooks/                # Custom hooks
├── lib/                  # Utility functions
└── public/               # Static assets
```

## Next Steps

1. Convert remaining pages following the pattern above
2. Test all routes and functionality
3. Update any hardcoded paths or routing logic
4. Verify all components work with Next.js
5. Test authentication flow
6. Update any API calls if needed for SSR/SSG considerations
