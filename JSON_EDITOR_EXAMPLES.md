# JSON Editor Examples

This document provides example JSON files for testing both SQL and NoSQL data types in the JSON Editor.

## Overview

The JSON Editor now intelligently analyzes your JSON data and stores it appropriately:

- **SQL Data**: Tabular data (arrays of objects with consistent structure) → Stored in relational database tables
- **NoSQL Data**: Complex hierarchical data → Stored as raw JSON documents

## Example Files

### 1. SQL Data Example (`example_sql_data.json`)

**Type**: Array of objects with consistent structure
**Storage**: Relational database table
**Use Case**: Employee records, product catalogs, transaction logs

```json
[
    {
        "name": "John Doe",
        "email": "john@example.com",
        "age": 30,
        "department": "Engineering",
        "salary": 75000
    },
    {
        "name": "Jane Smith",
        "email": "jane@example.com",
        "age": 28,
        "department": "Marketing",
        "salary": 65000
    },
    {
        "name": "Bob Johnson",
        "email": "bob@example.com",
        "age": 35,
        "department": "Sales",
        "salary": 80000
    }
]
```

**What happens**:
- Creates a table like `data_manual_[uuid]`
- Columns: `id` (UUID, auto-generated), `file_id`, `name`, `email`, `age`, `department`, `salary`, timestamps
- Each object becomes a row in the table

### 2. NoSQL Data Example (`example_nosql_data.json`)

**Type**: Complex hierarchical object with nested arrays and objects
**Storage**: Raw JSON document
**Use Case**: Company structures, configurations, complex API responses

```json
{
    "company": "TechCorp",
    "founded": 2010,
    "headquarters": {
        "city": "San Francisco",
        "state": "CA",
        "coordinates": {
            "lat": 37.7749,
            "lng": -122.4194
        }
    },
    "departments": [
        {
            "name": "Engineering",
            "head": "Alice Johnson",
            "teams": [
                {
                    "name": "Frontend",
                    "members": ["John", "Jane", "Bob"],
                    "technologies": ["React", "TypeScript", "Node.js"]
                }
            ]
        }
    ],
    "products": ["Cloud Platform", "Analytics Suite", "Mobile App"],
    "metadata": {
        "version": "2.1.0",
        "last_updated": "2024-01-15",
        "tags": ["technology", "saas", "enterprise"]
    }
}
```

**What happens**:
- Stored as raw JSON in the `raw_json` field
- Metadata indicates `storage_type: 'NoSQL'`
- No relational table created

## How to Test

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Open the JSON Editor**:
   - Go to `http://localhost:3000/json-editor`

3. **Test SQL Data**:
   - Copy the content from `example_sql_data.json`
   - Paste into the JSON editor
   - Click "Store Intelligently"
   - Should create a database table with 3 rows

4. **Test NoSQL Data**:
   - Copy the content from `example_nosql_data.json`
   - Paste into the JSON editor
   - Click "Store Intelligently"
   - Should store as raw JSON document

5. **Run Automated Test**:
   ```bash
   node test_both_types.js
   ```

## Classification Logic

The system automatically determines storage type based on:

### SQL (Relational Tables)
- Array of objects with consistent structure
- No deeply nested objects (>3 levels)
- No complex arrays within objects
- Reasonable number of fields per record (<50)

### NoSQL (Raw JSON)
- Single complex objects
- Inconsistent object structures in arrays
- Deep nesting (>3 levels)
- Complex nested arrays
- High number of fields per record (≥50)

## API Endpoints Used

- `POST /api/store-manual-json` - Main entry point
- `POST /api/create-sql-table` - Creates database tables
- `POST /api/insert-sql-rows` - Inserts data into tables
- `GET /api/file-metadata` - Retrieves storage information

## Database Schema

For SQL data, tables are created with:
- `id` (UUID PRIMARY KEY)
- `file_id` (UUID, references files_metadata)
- User-defined columns based on JSON schema
- `created_at`, `updated_at` timestamps

For NoSQL data:
- Raw JSON stored in `files_metadata.raw_json`
- `storage_type` set to 'NoSQL'
