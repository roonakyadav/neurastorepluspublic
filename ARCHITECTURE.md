# NeuraStore+ System Architecture Documentation

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

## Frontend Architecture

### Component Hierarchy

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

### Key Components

#### MainLayout
- Responsive layout with sidebar and topbar
- Mobile-friendly with collapsible navigation
- Theme provider integration

#### FileUpload
- Drag-and-drop interface
- Progress tracking with real-time updates
- Batch upload support
- File validation and error handling

#### DashboardCharts
- Upload trend visualization (bar chart)
- Category distribution (pie chart)
- File cards with analysis capabilities
- JSON validity checking

#### UploadAnalysisModal
- Post-upload analysis summary
- File type distribution charts
- AI tag assignment
- Local classification logic

## Backend API Architecture

### API Endpoints

#### `/api/upload` (POST)
**Purpose**: Unified file upload and initial processing
**Flow**:
1. Form data parsing and validation
2. File buffer reading and checksum calculation
3. Duplicate detection via checksum
4. MIME type detection
5. Intelligent folder path determination
6. Supabase Storage upload
7. File categorization and metadata saving
8. Database insertion

**Response**: File metadata with public URL

#### `/api/analyze-json` (POST)
**Purpose**: JSON schema analysis and storage type determination
**Flow**:
1. JSON parsing and validation
2. Schema inference (recursive)
3. SQL vs NoSQL determination logic
4. Schema storage in `json_schemas` table
5. Metadata update in `files_metadata`

**Response**: Analysis result with storage recommendation

#### `/api/create-sql-table` (POST)
**Purpose**: Automatic SQL table creation from JSON schemas
**Flow**:
1. Schema retrieval from database
2. SQL CREATE TABLE generation
3. Table creation in Supabase
4. Data insertion from original JSON
5. Metadata updates

**Response**: Table creation confirmation

#### `/api/search` (GET/POST)
**Purpose**: Full-text search with filtering
**Features**:
- Case-insensitive text search
- Category and MIME type filtering
- Size and date range filtering
- Pagination support

### Data Processing Pipeline

```
File Upload → MIME Detection → Categorization → Storage → Analysis → Schema Generation → Table Creation
```

## Database Architecture

### Tables

#### `files_metadata`
```sql
CREATE TABLE files_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    category TEXT,
    confidence REAL,
    ai_tags TEXT[],
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    public_url TEXT NOT NULL,
    folder_path TEXT NOT NULL,
    storage_type TEXT, -- 'SQL' or 'NoSQL'
    schema_id UUID REFERENCES json_schemas(id),
    table_name TEXT,
    record_count INTEGER,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `json_schemas`
```sql
CREATE TABLE json_schemas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files_metadata(id),
    schema JSONB NOT NULL,
    storage_type TEXT NOT NULL CHECK (storage_type IN ('SQL', 'NoSQL')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Dynamic SQL Tables
Generated tables follow pattern: `data_{file_id_suffix}`
```sql
CREATE TABLE data_{suffix} (
    id SERIAL PRIMARY KEY,
    -- Dynamic columns based on JSON schema
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Storage Architecture

#### Supabase Storage Buckets
```
media/
├── images/
│   ├── photos/
│   ├── screenshots/
│   ├── logos/
│   └── diagrams/
├── videos/
├── audio/
├── documents/
├── data/
│   └── json/
└── archives/
```

## File Processing Pipeline

### 1. Upload Phase
- **Client**: File selection via drag-drop or file picker
- **Validation**: Size limits (50MB), duplicate detection
- **Processing**: Buffer reading, MIME detection, checksum calculation

### 2. Storage Phase
- **Intelligent Organization**: Content-based folder assignment
- **Supabase Upload**: Secure file storage with public URLs
- **Metadata Creation**: Comprehensive file information storage

### 3. Analysis Phase
- **JSON Detection**: Automatic JSON file identification
- **Schema Inference**: Recursive structure analysis
- **Storage Determination**: SQL vs NoSQL recommendation based on:
  - Data structure complexity
  - Nesting depth
  - Field consistency
  - Array vs object patterns

### 4. Table Creation Phase (SQL Only)
- **Schema Mapping**: JSON types → SQL types
- **Table Generation**: Dynamic CREATE TABLE statements
- **Data Insertion**: Original JSON data population
- **Relationship Updates**: Metadata linking

## Search and Visualization Features

### Search Capabilities
- **Full-text Search**: Name and category matching
- **Advanced Filters**:
  - MIME type filtering
  - Category filtering
  - Size range filtering
  - Date range filtering
- **Pagination**: Efficient result handling

### Visualization Components
- **Upload Trends**: Daily upload statistics (bar chart)
- **Category Distribution**: File type breakdown (pie chart)
- **File Cards**: Individual file information with actions
- **JSON Visualizer**: Interactive JSON structure display
- **Schema Graphs**: Relationship and structure visualization

## Key Technologies

### Frontend
- **Next.js 14+**: App Router, Server Components
- **React 19**: Latest React features
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible component primitives
- **Framer Motion**: Animations
- **React Dropzone**: File upload handling
- **Recharts**: Data visualization
- **React Flow**: Schema visualization

### Backend
- **Next.js API Routes**: Serverless functions
- **Supabase**: Database and file storage
- **PostgreSQL**: Primary database
- **SQL Generation**: Dynamic table creation

### Utilities
- **file-type**: MIME type detection
- **pdf-parse**: PDF text extraction
- **fluent-ffmpeg**: Media processing
- **crypto**: File checksums

## Data Flow Diagrams

### File Upload Flow
```
User Upload → Client Validation → API/upload → MIME Detection → Storage Upload → Categorization → DB Insert → Response
```

![File Upload Flow Diagram](https://mdn.alipayobjects.com/one_clip/afts/img/ZhzTQ4w8XjUAAAAAQ5AAAAgAoEACAQFr/original)

### JSON Analysis Flow
```
JSON Upload → API/analyze-json → Schema Inference → Storage Type Determination → Schema Storage → Metadata Update
```

### Table Creation Flow
```
SQL Schema → API/create-sql-table → Table Generation → Data Insertion → Metadata Update → Completion
```

### System Data Flow Architecture
![System Data Flow Architecture](https://mdn.alipayobjects.com/one_clip/afts/img/RCgyS6w2bucAAAAARqAAAAgAoEACAQFr/original)

### Frontend Component Relationships
![Frontend Component Relationships](https://mdn.alipayobjects.com/one_clip/afts/img/R_qVQ7rif-QAAAAASeAAAAgAoEACAQFr/original)

### API Architecture Hierarchy
![API Architecture Hierarchy](https://mdn.alipayobjects.com/one_clip/afts/img/B6DzQZ2v0AMAAAAAReAAAAgAoEACAQFr/original)

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

## Monitoring and Analytics

- **Upload Statistics**: Real-time metrics
- **Error Tracking**: Comprehensive error logging
- **Performance Metrics**: API response times
- **Storage Analytics**: Usage and quota monitoring

## Future Enhancements

- **AI/ML Integration**: Advanced content analysis
- **Collaboration Features**: Multi-user file sharing
- **Advanced Search**: Semantic search capabilities
- **Workflow Automation**: Custom processing pipelines
- **API Integrations**: Third-party service connections
