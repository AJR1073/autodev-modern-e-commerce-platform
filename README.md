# Modern E-Commerce Platform

A production-ready Next.js 14 e-commerce starter built with the App Router, TypeScript, Prisma, and PostgreSQL.

This project implements an MVP online storefront and admin workflow based on the provided product brief, including:

- Product catalog and category browsing
- Product detail pages
- Persistent shopping cart
- Stripe-powered checkout flow
- Order management APIs and admin screens
- Inventory tracking
- Email notification infrastructure
- Authentication endpoints
- Accessible, responsive UI with Tailwind CSS

## Tech Stack

- Next.js 14+ App Router
- TypeScript
- Prisma ORM
- PostgreSQL
- Tailwind CSS v3
- Stripe
- SendGrid
- Zod-style validation patterns and typed services
- Server-first architecture with API routes and service layer

## Features

### Storefront
- Home page with hero, featured products, and categories
- Product listing page
- Product detail page
- Category landing pages
- Cart page and cart drawer
- Checkout flow
- Checkout success page
- Account page scaffold

### Admin
- Admin dashboard
- Product management view
- Order management view
- Inventory management view

### APIs
- Products
- Categories
- Cart
- Checkout
- Orders
- Inventory
- Notifications
- Stripe webhook
- Auth endpoints

### Infrastructure
- Prisma schema and seed script
- Shared validators
- Service layer abstraction
- Email template utilities
- Rate limiting helpers
- Formatting, pagination, and search utilities

## Project Structure

app/
- Public pages, admin pages, API routes, layout, loading and error surfaces

components/
- Reusable UI primitives and domain components for storefront, cart, checkout, and admin

lib/
- Shared infrastructure such as Prisma client, auth/session helpers, env access, Stripe, SendGrid, validation, formatting, and utility functions

services/
- Business logic for products, cart, checkout, orders, inventory, shipping, and notifications

prisma/
- Database schema and seed script

emails/
- HTML email template generators

hooks/ and store/
- Client-side cart behavior and supporting hooks

## Getting Started

### 1. Install dependencies

```bash
npm install
```

If needed, this project is configured with a `.npmrc` using legacy peer dependency resolution.

### 2. Configure environment variables

Copy the example file:

```bash
cp .env.example .env
```

Update the values for your environment.

Typical variables include:

- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `JWT_SECRET`

Note: the codebase is designed to use safe fallbacks in development, but real integrations require valid credentials.

### 3. Set up the database

Generate Prisma client and run migrations:

```bash
npx prisma generate
npx prisma migrate dev
```

### 4. Seed sample data

```bash
npx prisma db seed
```

### 5. Start the development server

```bash
npm run dev
```

Open:

```bash
http://localhost:3000
```

## Database

This project uses PostgreSQL with Prisma.

Primary domain entities include:

- User
- Product
- Category
- Cart / Cart items
- Order / Order items
- Inventory records

To inspect your database locally:

```bash
npx prisma studio
```

## Environment Variables

See `.env.example` for the full template.

Recommended local setup:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ecommerce"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
JWT_SECRET="change-me"
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
SENDGRID_API_KEY=""
SENDGRID_FROM_EMAIL="noreply@example.com"
```

## Available Scripts

Typical scripts expected in this project:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

Database utilities:

```bash
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npx prisma studio
```

## Implementation Notes

### Authentication
The project includes API routes for login, registration, and session/user lookup. JWT/session handling is abstracted through the `lib/auth.ts` and `lib/session.ts` helpers.

### Checkout
Checkout is designed around Stripe. The checkout service and webhook route handle payment session creation and post-payment processing.

### Email Notifications
Notification services are wired for:
- Order confirmations
- Shipping updates
- Low stock alerts

Email templates are implemented as string-based HTML generators to keep server-side rendering simple and deployment-safe.

### Inventory
Inventory updates are exposed through dedicated services and admin APIs, supporting low-stock visibility and operational workflows.

## MVP Scope Covered

Aligned to the project brief, the MVP includes:

- Product catalog and search foundations
- Category browsing
- Cart persistence and management
- Secure checkout integration points
- Order management
- Inventory tracking
- Email notification support
- Mobile-first responsive UI
- Accessibility-focused component structure

## Accessibility and Performance Goals

This codebase is structured to support:

- WCAG 2.1 AA-conscious UI patterns
- Semantic HTML and reusable form controls
- Responsive layouts
- Server-rendered pages for strong SEO and initial performance
- Scalable service-based backend organization

## Deployment

This app is suitable for deployment on platforms such as:

- Vercel
- AWS
- Azure

### Production checklist
- Set all required environment variables
- Provision PostgreSQL
- Run Prisma migrations
- Configure Stripe webhook endpoint
- Configure SendGrid sender identity
- Verify admin access controls
- Test checkout, email, and order workflows
- Seed or import catalog data

## Recommended Build Order

If extending the project, implement in this order:

1. Product catalog hardening and search improvements
2. Cart persistence refinement
3. Stripe checkout production readiness
4. Admin order and inventory workflows
5. Notification coverage and template refinement
6. Security enhancements
7. Performance and scalability tuning

## Future Enhancements

Potential post-MVP improvements:

- Product reviews and ratings
- Advanced faceted search
- Wishlist support
- Multi-currency support
- Localization
- Promotions and discount codes
- Shipping provider integrations
- Analytics and customer segmentation
- Admin role-based access control
- MFA for privileged users

## Troubleshooting

### Prisma client issues
Try:

```bash
npx prisma generate
```

### Database connection issues
Verify:
- PostgreSQL is running
- `DATABASE_URL` is correct
- migrations have been applied

### Stripe webhook issues
Make sure:
- webhook secret matches your configured endpoint
- local forwarding is configured when testing locally

Example with Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Emails not sending
Check:
- `SENDGRID_API_KEY`
- verified sender address
- provider logs and suppression settings

## Notes

- This repository is organized for clarity and maintainability rather than premature optimization.
- Some integrations may run in mocked or fallback mode locally depending on environment configuration.
- The current architecture supports future extraction into separate services if deeper microservice boundaries are needed.

## License

Private/internal project starter unless otherwise specified.