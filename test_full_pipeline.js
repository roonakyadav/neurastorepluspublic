#!/usr/bin/env node

const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3000';

async function uploadProducts() {
    console.log('📁 Uploading products.json...');

    const formData = new FormData();
    const fileStream = fs.createReadStream('../products.json');
    formData.append('file', fileStream, 'products.json');

    try {
        const response = await fetch(`${API_BASE_URL}/api/upload`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(`Upload failed: ${result.error}`);
        }

        console.log('✅ Upload successful');
        console.log('📊 Category:', result.category);
        console.log('🔗 File ID:', result.file_id);

        return result;
    } catch (error) {
        console.error('❌ Upload failed:', error.message);
        return null;
    }
}

async function getFileData(fileId) {
    console.log('📋 Getting file data for analysis...');

    try {
        const response = await fetch(`${API_BASE_URL}/api/file-metadata?fileId=${fileId}`);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(`Metadata fetch failed: ${result.error}`);
        }

        console.log('✅ Metadata fetched');

        // Get the file content from Supabase storage
        const publicUrl = result.metadata.public_url;
        const contentResponse = await fetch(publicUrl);
        const jsonData = await contentResponse.json();

        console.log('✅ JSON data fetched');

        return {
            metadata: result.metadata,
            jsonData
        };
    } catch (error) {
        console.error('❌ Failed to get file data:', error.message);
        return null;
    }
}

async function analyzeJSON(jsonData) {
    console.log('🔍 Analyzing JSON data...');

    try {
        const response = await fetch(`${API_BASE_URL}/api/analyze-json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonData })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(`Analysis failed: ${result.error}`);
        }

        console.log('✅ Analysis complete');
        console.log('📊 Classification:', result.classification);

        return result;
    } catch (error) {
        console.error('❌ Analysis failed:', error.message);
        return null;
    }
}

async function createSQLTable(fileId, tableName, schema) {
    console.log(`🏗️ Creating SQL table: ${tableName}`);

    try {
        const response = await fetch(`${API_BASE_URL}/api/create-sql-table`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileId,
                tableName,
                schema
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(`Table creation failed: ${result.error}`);
        }

        console.log('✅ Table creation result:', result.code || 'SUCCESS');

        return result;
    } catch (error) {
        console.error('❌ Table creation failed:', error.message);
        return null;
    }
}

async function updateMetadata(fileId, updates) {
    console.log('📝 Updating file metadata...');

    try {
        const response = await fetch(`${API_BASE_URL}/api/file-metadata`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileId,
                updates
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(`Metadata update failed: ${result.error}`);
        }

        console.log('✅ Metadata updated');

        return result;
    } catch (error) {
        console.error('❌ Metadata update failed:', error.message);
        return null;
    }
}

async function insertSQLRows(fileId, tableName, records) {
    console.log(`📥 Inserting ${records.length} rows into ${tableName}`);

    try {
        const response = await fetch(`${API_BASE_URL}/api/insert-sql-rows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileId,
                tableName,
                records
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(`Insert failed: ${result.error}`);
        }

        console.log('✅ Insert successful');
        console.log('📊 Rows inserted:', result.insertedRows);

        return result;
    } catch (error) {
        console.error('❌ Insert failed:', error.message);
        return null;
    }
}

async function checkTableData(tableName) {
    console.log(`🔍 Checking data in table: ${tableName}`);

    try {
        const response = await fetch(`${API_BASE_URL}/api/query-table`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tableName,
                query: `SELECT * FROM ${tableName} LIMIT 10`
            })
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('❌ Query failed:', result.error);
            return null;
        }

        console.log('✅ Query successful');
        console.log('📊 Rows found:', result.data?.length || 0);

        if (result.data && result.data.length > 0) {
            console.log('📋 Sample data:');
            result.data.forEach((row, idx) => {
                console.log(`   Row ${idx + 1}:`, JSON.stringify(row, null, 2));
            });
        }

        return result;
    } catch (error) {
        console.error('❌ Query error:', error.message);
        return null;
    }
}

async function runFullPipeline() {
    console.log('🚀 Testing full products.json pipeline\n');

    try {
        // Step 1: Upload products.json
        const uploadResult = await uploadProducts();
        if (!uploadResult) {
            throw new Error('Upload failed');
        }

        const fileId = uploadResult.file_id;

        // Step 2: Get file data
        const fileData = await getFileData(fileId);
        if (!fileData) {
            throw new Error('Failed to get file data');
        }

        const { metadata, jsonData } = fileData;

        // Step 3: Analyze JSON
        const analysis = await analyzeJSON(jsonData);
        if (!analysis) {
            throw new Error('Analysis failed');
        }

        if (analysis.classification !== 'SQL JSON') {
            throw new Error(`Expected SQL JSON, got ${analysis.classification}`);
        }

        // Step 4: Create schema from analysis
        const schema = {};
        Object.entries(analysis.dataTypes || {}).forEach(([field, types]) => {
            schema[field] = types[0] || 'string';
        });

        // Step 5: Derive table name
        const tableName = 'data_products';

        // Step 6: Create SQL table
        const createResult = await createSQLTable(fileId, tableName, schema);
        if (!createResult) {
            throw new Error('Table creation failed');
        }

        // Step 7: Update metadata
        const metadataUpdate = await updateMetadata(fileId, {
            storage_type: 'SQL',
            table_name: tableName
        });
        if (!metadataUpdate) {
            throw new Error('Metadata update failed');
        }

        // Step 8: Insert rows
        const records = Array.isArray(jsonData) ? jsonData : [jsonData];
        const insertResult = await insertSQLRows(fileId, tableName, records);
        if (!insertResult) {
            throw new Error('Insert failed');
        }

        // Step 9: Verify data
        const tableData = await checkTableData(tableName);
        if (!tableData || !tableData.data || tableData.data.length === 0) {
            throw new Error('No data found in table');
        }

        console.log('\n🎉 SUCCESS: Full pipeline completed!');
        console.log('✅ Table created:', tableName);
        console.log('✅ Records inserted:', insertResult.insertedRows);
        console.log('✅ Data verified in table');

    } catch (error) {
        console.error('\n❌ Pipeline failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    runFullPipeline().catch(console.error);
}
