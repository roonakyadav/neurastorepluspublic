# NeuraStore+ System Architecture

## Overview

NeuraStore+ is an advanced file analysis and storage platform built with Next.js 14+, TypeScript, and Supabase. The system provides intelligent file organization, JSON schema analysis, automatic SQL/NoSQL determination, and real-time data visualization.

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (Next.js)     │◄──►│   (Next.js)     │◄──►│   (Supabase)    │
│                 │    │                 │    │                 │
│ • File Upload   │    │ • /api/upload   │    │ • files_metadata│
│ • Dashboard     │    │ • /api/analyze  │    │ • json_schemas  │
│ • Search        │    │ • /api/search   │    │ • Dynamic SQL   │
│ • Visualization │    │ • /api/create   │    │ • Storage       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Full Folder Structure

```
.
├── public/                          # Static assets
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── api/                    # API routes
│   │   │   ├── analyze/            # File analysis endpoint
│   │   │   │   └── route.ts
│   │   │   ├── analyze-json/       # JSON schema analysis
│   │   │   │   └── route.ts
│   │   │   ├── check-schema/       # Schema checking
│   │   │   ├── check-schemas/      # Multiple schema checking
│   │   │   ├── create-sql-table/   # SQL table creation
│   │   │   │   └── route.ts
│   │   │   ├── handle-schema-conflict/ # Schema conflict resolution
│   │   │   │   └── route.ts
│   │   │   ├── infer-schema/       # Schema inference
│   │   │   │   └── route.ts
│   │   │   ├── insert-sql-rows/    # Data insertion
│   │   │   │   └── route.ts
│   │   │   ├── process-json/       # JSON processing
│   │   │   │   └── route.ts
│   │   │   ├── query-table/        # Data querying
│   │   │   │   └── route.ts
│   │   │   ├── search/             # Search functionality
│   │   │   │   └── route.ts
│   │   │   └── upload/             # File upload
│   │   │       └── route.ts
│   │   ├── dashboard/              # Dashboard page
│   │   │   └── page.tsx
│   │   ├── history/                # History page
│   │   │   └── page.tsx
│   │   ├── search/                 # Search page
│   │   │   └── page.tsx
│   │   ├── settings/               # Settings page
│   │   │   └── page.tsx
│   │   ├── upload/                 # Upload page
│   │   │   └── page.tsx
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx                # Home page
│   ├── components/                 # React components
│   │   ├── ui/                     # Reusable UI components
│   │   │   ├── badge.tsx           # Badge component
│   │   │   ├── button.tsx          # Button component
│   │   │   ├── card.tsx            # Card component
│   │   │   ├── dialog.tsx          # Dialog component
│   │   │   ├── input.tsx           # Input component
│   │   │   ├── label.tsx           # Label component
│   │   │   ├── progress.tsx        # Progress component
│   │   │   ├── select.tsx          # Select component
│   │   │   ├── sheet.tsx           # Sheet component
│   │   │   ├── switch.tsx          # Switch component
│   │   │   ├── table.tsx           # Table component
│   │   │   ├── textarea.tsx        # Textarea component
│   │   │   └── toast.tsx           # Toast component
│   │   ├── ChartVisualizer.tsx     # Chart visualization
│   │   ├── ClientProviders.tsx     # Client-side providers
│   │   ├── ClientToastProvider.tsx # Toast notifications
│   │   ├── ConfirmUploadDialog.tsx # Upload confirmation
│   │   ├── DashboardCharts.tsx     # Dashboard charts
│   │   ├── DataQueryModal.tsx      # Data querying interface
│   │   ├── FileCard.tsx            # File display card
│   │   ├── FilePreview.tsx         # File preview component
│   │   ├── FileTreeView.tsx        # File tree visualization
│   │   ├── FileUpload.tsx          # File upload component
│   │   ├── IntelligenceSidebar.tsx # Intelligence sidebar
│   │   ├── JSONVisualizer.tsx      # JSON visualization
│   │   ├── MainLayout.tsx          # Main application layout
│   │   ├── ObjectView.tsx          # Object display
│   │   ├── SchemaGraph.tsx         # Schema graph visualization
│   │   ├── SchemaView.tsx          # Schema view
│   │   ├── SearchBar.tsx           # Search bar component
│   │   ├── Sidebar.tsx             # Application sidebar
│   │   ├── StatsCard.tsx           # Statistics cards
│   │   ├── Topbar.tsx              # Top navigation bar
│   │   └── UploadAnalysisModal.tsx # Upload analysis modal
│   ├── lib/                        # Utility libraries
│   │   ├── utils/                  # Utility functions
│   │   │   ├── buildFileTree.ts    # File tree building
│   │   │   ├── fileHandler.ts      # File handling utilities
│   │   │   ├── jsonProcessor.ts    # JSON processing
│   │   │   └── schemaGenerator.ts  # Schema generation
│   │   ├── classifyJsonServer.ts   # JSON classification
│   │   ├── fileClassifier.ts       # File classification
│   │   ├── i18n.ts                 # Internationalization
│   │   ├── schemaUtils.ts          # Schema utilities
│   │   ├── supabaseClient.ts       # Supabase client
│   │   └── utils.ts                # General utilities
│   └── utils/                      # Additional utilities
│       └── jsonAnalyzer.ts         # JSON analysis
├── supabase/                       # Supabase Edge Functions
│   └── functions/
│       └── process-json/           # JSON processing function
│           └── index.ts
├── docs/                           # Documentation
│   ├── architecture.md             # This file
│   └── developer-guide.md          # Developer guide
├── ARCHITECTURE.md                 # Legacy architecture docs
├── components.json                 # Component configuration
├── eslint.config.mjs               # ESLint configuration
├── next.config.ts                  # Next.js configuration
├── package.json                    # Project dependencies
├── postcss.config.mjs              # PostCSS configuration
├── sample_data.json                # Sample data for testing
├── supabase_setup.sql              # Database setup script
├── test_json_pipeline.js           # Test pipeline script
├── tsconfig.json                   # TypeScript configuration
└── .env.example                    # Environment variables template
```

## Component Breakdown

### Frontend Architecture

#### Component Hierarchy

```
App (Root Layout)
├── MainLayout
│   ├── Sidebar (Navigation)
│   ├── Topbar
│   └── Page Content
│       ├── UploadPage
│       │   ├── FileUpload (Drag & Drop)
│       │   ├── UploadAnalysisModal
│       │   └── ConfirmUploadDialog
│       ├── DashboardPage
│       │   ├── DashboardCharts
│       │   ├── JSONVisualizer
│       │   └── File Cards
│       ├── SearchPage
│       │   ├── SearchBar
│       │   └── Search Results
│       └── HistoryPage
```

#### Key Components

**MainLayout**
- Responsive layout with sidebar and topbar
- Mobile-friendly with collapsible navigation
- Theme provider integration

**FileUpload**
- Drag-and-drop interface
- Progress tracking with real-time updates
- Batch upload support
- File validation and error handling

**DashboardCharts**
- Upload trend visualization (bar chart)
- Category distribution (pie chart)
- File cards with analysis capabilities
- JSON validity checking

**UploadAnalysisModal**
- Post-upload analysis summary
- File type distribution charts
- AI tag assignment
- Local classification logic

## Key Backend Routes + Purpose

### File Management
- `POST /api/upload` - Unified file upload and initial processing
  - Form data parsing and validation
  - File buffer reading and checksum calculation
  - Duplicate detection via checksum
  - MIME type detection
  - Intelligent folder path determination
  - Supabase Storage upload
  - File categorization and metadata saving

- `GET /api/search` - Full-text search with filtering
  - Case-insensitive text search
  - Category and MIME type filtering
  - Size and date range filtering
  - Pagination support

### JSON Processing Pipeline
- `POST /api/analyze-json` - JSON schema analysis and storage type determination
  - JSON parsing and validation
  - Schema inference (recursive)
  - SQL vs NoSQL determination logic
  - Schema storage in `json_schemas` table
  - Metadata update in `files_metadata`

- `POST /api/create-sql-table` - Automatic SQL table creation from JSON schemas
  - Schema retrieval from database
  - SQL CREATE TABLE generation
  - Table creation in Supabase
  - Data insertion from original JSON
  - Metadata updates

- `POST /api/insert-sql-rows` - Batch data insertion into SQL tables
  - Data validation against schema
  - Batch insertion with error handling
  - Foreign key relationship management
  - Performance optimization for large datasets

- `POST /api/process-json` - Complete JSON processing pipeline
  - Orchestrates the entire JSON processing workflow
  - Calls analyze-json, create-sql-table, and insert-sql-rows
  - Error handling and rollback capabilities

### Data Querying
- `POST /api/query-table` - Query data from processed JSON tables
  - SQL query execution on dynamic tables
  - Result formatting and pagination
  - Schema validation for queries

- `POST /api/infer-schema` - Schema inference from existing data
  - Reverse engineering of table schemas
  - Data type detection and validation

### Schema Management
- `POST /api/handle-schema-conflict` - Schema conflict detection and resolution
  - Version comparison and conflict detection
  - Migration path suggestions
  - Schema evolution tracking

### Analysis
- `POST /api/analyze` - General file analysis
  - MIME type detection
  - Content analysis
  - Metadata extraction

## Data Flow Diagram

### File Upload Flow
```
User Upload → Client Validation → API/upload → MIME Detection → Storage Upload → Categorization → DB Insert → Response
```

### JSON Processing Flow
```
JSON Upload → API/analyze-json → Schema Inference → Storage Type Determination → Schema Storage → Metadata Update
     ↓
API/create-sql-table → Table Generation → Data Insertion → Metadata Update → Completion
```

### Complete System Data Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │   Next.js   │    │ Supabase    │    │   Client    │
│   Upload    │───►│   API       │───►│ Database    │───►│   Response  │
│             │    │   Routes    │    │ & Storage   │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
  File Selection    Processing Logic    Data Storage     UI Updates
  Drag & Drop       Validation         Table Creation   Real-time
  Progress          Categorization     File Storage     Analytics
  Preview           Schema Analysis    Query Execution  Charts
```

## Database Schema Tables with Columns

### Core Tables

#### `files_metadata`
Primary table for storing file information and processing metadata.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, auto-generated |
| name | TEXT | Original file name |
| size | BIGINT | File size in bytes |
| mime_type | TEXT | MIME type (e.g., 'application/json') |
| category | TEXT | Intelligent categorization (images, documents, etc.) |
| confidence | REAL | AI classification confidence score |
| ai_tags | TEXT[] | Array of AI-generated tags |
| uploaded_at | TIMESTAMPTZ | Upload timestamp |
| public_url | TEXT | Supabase Storage public URL |
| folder_path | TEXT | Intelligent folder organization path |
| storage_type | TEXT | 'SQL' or 'NoSQL' for JSON files |
| schema_id | UUID | Reference to json_schemas table |
| table_name | TEXT | Generated SQL table name |
| record_count | INTEGER | Number of records (for JSON arrays) |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### `json_schemas`
Stores JSON schema information for processed JSON files.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, auto-generated |
| file_id | UUID | Foreign key to files_metadata |
| schema | JSONB | Complete JSON schema structure |
| storage_type | TEXT | 'SQL' or 'NoSQL' determination |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### `schema_versions`
Tracks schema evolution and versioning for JSON files.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, auto-generated |
| file_id | UUID | Foreign key to files_metadata |
| schema_id | UUID | Foreign key to json_schemas |
| version_number | INTEGER | Incremental version number |
| schema | JSONB | Schema at this version |
| storage_type | TEXT | Storage type for this version |
| table_name | TEXT | Associated table name |
| record_count | INTEGER | Record count for this version |
| changes_description | TEXT | Description of changes |
| created_at | TIMESTAMPTZ | Version creation timestamp |

#### `data_processing_logs`
Audit log for all data processing operations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, auto-generated |
| file_id | UUID | Foreign key to files_metadata |
| operation_type | TEXT | Type of operation performed |
| status | TEXT | 'STARTED', 'SUCCESS', or 'FAILED' |
| details | JSONB | Additional operation details |
| error_message | TEXT | Error message if failed |
| processing_time_ms | INTEGER | Processing duration |
| created_at | TIMESTAMPTZ | Log entry timestamp |

### Dynamic SQL Tables
Generated automatically from JSON schemas following pattern: `data_{file_id_suffix}`

Example table structure for employees.json:
```sql
CREATE TABLE data_employees (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER,
    name TEXT NOT NULL,
    department TEXT,
    salary DECIMAL(10,2),
    hire_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE data_employees_address (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES data_employees(id),
    street TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Views

#### `active_data_tables`
Provides a consolidated view of all active data tables and their metadata.

#### `data_processing_stats`
Aggregates processing statistics by file.

## File Processing Pipeline

### 1. Upload Phase
- **Client**: File selection via drag-drop or file picker
- **Validation**: Size limits (50MB), duplicate detection
- **Processing**: Buffer reading, MIME detection, checksum calculation

### 2. Content-Based Storage Decision
- **JSON Files**: Parse content and store directly in database tables (not as files)
- **Other Files**: Intelligent folder assignment and Supabase Storage upload
- **Metadata Creation**: Comprehensive file information storage

### 3. JSON Processing (Special Case)
- **Direct Database Storage**: JSON content parsed and stored as structured data
- **Schema Inference**: Recursive structure analysis for table creation
- **Automatic Table Generation**: Dynamic CREATE TABLE from JSON schema
- **Data Insertion**: JSON objects stored as database records
- **No File Storage**: JSON files are not kept as files, only their structured data

### 4. Traditional File Storage (Non-JSON)
- **Supabase Upload**: Secure file storage with public URLs
- **Intelligent Organization**: Content-based folder assignment
- **Metadata Linking**: Database references to stored files

### 5. Analysis Phase (All Files)
- **Storage Determination**: SQL vs NoSQL recommendation based on:
  - Data structure complexity
  - Nesting depth
  - Field consistency
  - Array vs object patterns
- **Schema Storage**: Analysis results stored in json_schemas table

## Security Considerations

- **File Validation**: Size limits, type checking, malware scanning
- **Authentication**: Supabase auth integration
- **Data Sanitization**: Input validation and SQL injection prevention
- **Access Control**: Public/private file access management
- **Audit Logging**: Upload and access tracking

## Performance Optimizations

- **Client-side Classification**: Local file analysis before upload
- **Batch Processing**: Efficient handling of multiple files
- **Lazy Loading**: Progressive data loading
- **Caching**: Supabase CDN for file delivery
- **Pagination**: Efficient search result handling

## Scalability Features

- **Supabase Infrastructure**: Auto-scaling database and storage
- **Serverless APIs**: Automatic scaling with Next.js
- **CDN Integration**: Global file delivery
- **Background Processing**: Asynchronous analysis tasks
