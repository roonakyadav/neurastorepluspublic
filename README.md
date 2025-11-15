This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, install dependencies:

```bash
npm ci
```

Then run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Setup

1. Copy the environment file:
```bash
cp .env.example .env.local
```

2. Update the `.env.local` file with your actual values:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

## Database Setup

Run the database migration to set up the required tables:

```sql
-- Execute this SQL in your Supabase SQL Editor
-- File: migrations/20251109_sync_json_schema.sql
```

## Features

- **Unified File Upload**: Single interface for all file types (images, videos, audio, documents, code, archives)
- **Intelligent Organization**: Automatic categorization and directory structure based on content analysis
- **Local Processing**: No external API dependencies - all classification done client-side
- **JSON Schema Intelligence**: Automatic SQL/NoSQL determination and table creation
- **Real-time Dashboard**: Charts and analytics for uploaded files
- **File Preview**: Built-in preview for images, videos, PDFs, and text files
- **Schema Visualization**: Interactive graphs for JSON data structures
- **Search & History**: Full-text search and file management

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
