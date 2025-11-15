# File Types in NeuraStore Project

This document explains the various file types and extensions used in this TypeScript-based Next.js project.

## TypeScript Files (.ts)

TypeScript source files contain JavaScript code with type annotations.

- Pure TypeScript files that are not React components
- Commonly used for:
  - API routes (e.g., `src/app/api/.../route.ts`)
  - Utility functions (e.g., `src/lib/schemaUtils.ts`)
  - Configuration files (e.g., `next.config.ts`)
- Examples in this project: `src/app/api/analyze-json/route.ts`, `src/lib/supabaseClient.ts`

## TypeScript React Files (.tsx)

TypeScript files containing React components or JSX.

- React component definitions with TypeScript support
- Used for all UI components and pages
- Examples in this project: `src/app/page.tsx`, `src/components/JSONVisualizer.tsx`

## JavaScript Files (.js)

Standard JavaScript files, without TypeScript.

- Test scripts and utilities
- Sometimes used for configuration
- Examples in this project: `package.json` is JSON, but `test_json_pipeline.js`, `verify_json_storage.js` are JS

## JSON Files (.json)

JavaScript Object Notation files for data and configuration.

- Package configuration (e.g., `package.json`)
- Test data files (e.g., `test1.json`, `sample_data.json`)
- TypeScript config schema

## Markdown Files (.md)

Documentation files written in Markdown format.

- README files (e.g., `README.md`)
- Developer guides (e.g., `docs/developer-guide.md`)
- Examples (e.g., `JSON_EDITOR_EXAMPLES.md`)

## SQL Files (.sql)

Database schema and setup scripts.

- Supabase database setup (e.g., `supabase_setup.sql`)

## CSS Files (.css)

Cascading Style Sheets for styling.

- Global styles (e.g., `src/app/globals.css`)

## Configuration Files

- `tsconfig.json`: TypeScript compiler configuration
- `package.json`: Node.js project dependencies and scripts
- `next.config.ts`: Next.js framework configuration
- `postcss.config.mjs`: PostCSS configuration for CSS processing

## Other Directories

- `src/`: Source code directory
- `public/`: Static assets (images, icons)
- `supabase/`: Backend functions and configs
- `docs/`: Project documentation
- `src/components/ui/`: UI component library (likely using shadcn/ui)

This project uses TypeScript extensively for type safety in a Next.js React application with Supabase as the backend.
