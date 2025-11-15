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

1. **Initial Setup**: Run the database migration script in your Supabase SQL Editor:

```bash
# Copy and paste the contents of supabase_setup.sql into your Supabase SQL Editor
# This will create all necessary tables, indexes, and functions
```

The setup script includes:
- Extensions (UUID, pg_stat_statements)
- New columns for `files_metadata` table
- `json_schemas` table for schema storage
- `schema_versions` table for version history
- `data_processing_logs` table for operation tracking
- Helper functions and views
- Performance indexes

2. **Deploy Edge Function**: Deploy the JSON processing Edge Function:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the Edge Function
supabase functions deploy process-json
```

3. **Verify Setup**:
```sql
-- Check that all tables were created
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('json_schemas', 'schema_versions', 'data_processing_logs');

-- Check the active data tables view
SELECT * FROM active_data_tables LIMIT 5;

-- Verify Edge Function deployment
SELECT * FROM data_processing_logs ORDER BY created_at DESC LIMIT 5;
```

## JSON Processing Features

### Automatic JSON Analysis
When you upload a JSON file, NeuraStore+ automatically:

1. **Detects Structure**: Determines if the JSON is a single object or array of objects
2. **Analyzes Complexity**: Evaluates nesting depth, data types, and consistency
3. **Chooses Storage Strategy**:
   - **SQL**: For tabular data with consistent structure (≤3 nesting levels, ≤50 fields)
   - **NoSQL**: For complex nested structures or irregular data

### SQL Table Generation
For SQL-compatible JSON:

- **Automatic Schema Inference**: Analyzes data types and relationships
- **Normalization**: Splits nested objects into separate related tables
- **Foreign Key Relationships**: Maintains data integrity with proper constraints
- **Batch Insertion**: Handles large datasets efficiently (1000+ records)
- **Naming Convention**: Tables named as `data_{filename}` (sanitized)

### Example Processing Flow

Upload `employees.json`:
```json
[
  {
    "id": 1,
    "name": "Alice Johnson",
    "department": "Engineering",
    "address": {
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA"
    }
  }
]
```

**Result**: Creates tables:
- `data_employees` (main table with employee data)
- `data_employees_address` (normalized address data)

### Data Querying Interface

- **Dashboard Integration**: "Query Data" buttons appear for processed JSON files
- **Advanced Filtering**: Search by any field with partial matching
- **Pagination**: Handle large datasets efficiently
- **Export Options**: Direct links to Supabase SQL Editor
- **Real-time Results**: Instant query execution with result counts

### Schema Evolution

- **Version History**: Tracks all schema changes over time
- **Conflict Detection**: Warns about incompatible schema changes
- **Migration Support**: Planned feature for schema updates

## Testing

### JSON Pipeline Regression Tests

Run comprehensive tests for the JSON processing pipeline:

```bash
# Run the regression test suite
npm run test:pipeline
```

The test suite includes:
- **Array of objects with nested data** (SQL storage)
- **Simple array of objects** (SQL storage)
- **Single object** (SQL storage)
- **Array of primitives** (NoSQL storage)
- **Deeply nested objects** (NoSQL storage)

Test files are automatically created and cleaned up after testing.

### Manual Testing

1. **Start the development server**:
```bash
npm run dev
```

2. **Upload test JSON files** via the web interface at `http://localhost:3000/upload`

3. **Verify processing** in the dashboard at `http://localhost:3000/dashboard`

4. **Query processed data** using the "Query Data" buttons

## Features

- **Unified File Upload**: Single interface for all file types (images, videos, audio, documents, code, archives)
- **Intelligent Organization**: Automatic categorization and directory structure based on content analysis
- **Local Processing**: No external API dependencies - all classification done client-side
- **Full JSON Processing**: Automatic SQL/NoSQL determination, table creation, and data insertion
- **Data Querying**: Built-in SQL query interface for processed JSON data
- **Schema Management**: Version history and conflict detection for evolving data structures
- **Real-time Dashboard**: Charts and analytics for uploaded files and data tables
- **File Preview**: Built-in preview for images, videos, PDFs, and text files
- **Schema Visualization**: Interactive graphs for JSON data structures
- **Search & History**: Full-text search and file management
- **Batch Processing**: Efficient handling of large JSON files (up to 50MB)

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
