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

async function main() {
    console.log('🚀 Testing products.json pipeline\n');

    // Upload products.json
    const uploadResult = await uploadProducts();

    if (!uploadResult) {
        console.error('❌ Upload failed, exiting');
        process.exit(1);
    }

    // Wait a bit for processing
    console.log('⏳ Waiting for processing to complete...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if data_products table exists and has data
    const tableResult = await checkTableData('data_products');

    if (tableResult && tableResult.data && tableResult.data.length > 0) {
        console.log('🎉 SUCCESS: Rows found in data_products table!');
        console.log('✅ Pipeline working correctly');
    } else {
        console.log('⚠️  No data found in data_products table');
        console.log('🔍 Checking if table exists...');

        // Try to query table existence
        try {
            const response = await fetch(`${API_BASE_URL}/api/query-table`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tableName: 'data_products',
                    query: 'SELECT COUNT(*) as count FROM data_products'
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('📊 Table exists, row count:', result.data?.[0]?.count || 0);
            } else {
                console.log('❌ Table does not exist or query failed');
            }
        } catch (error) {
            console.log('❌ Error checking table:', error.message);
        }
    }
}

if (require.main === module) {
    main().catch(console.error);
}
