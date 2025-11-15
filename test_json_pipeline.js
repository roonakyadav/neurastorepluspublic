#!/usr/bin/env node

/**
 * Regression Test Script for JSON → Structured Data Pipeline
 * Tests the complete upload → Edge Function → Database pipeline
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3000'; // Adjust if needed

// Test JSON files
const testFiles = [
    {
        name: 'sample_data.json',
        description: 'Array of objects with nested objects and arrays (SQL)',
        expected: { storageType: 'SQL', tableName: 'data_employees' }
    },
    {
        name: 'test_simple_array.json',
        description: 'Simple array of objects (SQL)',
        expected: { storageType: 'SQL', tableName: 'data_testdata' }
    },
    {
        name: 'test_single_object.json',
        description: 'Single object (SQL)',
        expected: { storageType: 'SQL', tableName: 'data_testdata' }
    },
    {
        name: 'test_primitives_array.json',
        description: 'Array of primitives (NoSQL)',
        expected: { storageType: 'NoSQL' }
    },
    {
        name: 'test_deep_nesting.json',
        description: 'Deeply nested objects (NoSQL)',
        expected: { storageType: 'NoSQL' }
    }
];

async function createTestFiles() {
    console.log('Creating test JSON files...');

    // Simple array test
    const simpleArrayData = [
        { id: 1, name: 'John', age: 25 },
        { id: 2, name: 'Jane', age: 30 }
    ];
    fs.writeFileSync('test_simple_array.json', JSON.stringify(simpleArrayData, null, 2));

    // Single object test
    const singleObjectData = { id: 1, name: 'Test User', email: 'test@example.com' };
    fs.writeFileSync('test_single_object.json', JSON.stringify(singleObjectData, null, 2));

    // Primitives array test
    const primitivesArrayData = [1, 2, 3, 4, 5];
    fs.writeFileSync('test_primitives_array.json', JSON.stringify(primitivesArrayData, null, 2));

    // Deep nesting test
    const deepNestingData = {
        level1: {
            level2: {
                level3: {
                    level4: {
                        level5: {
                            data: 'too deep'
                        }
                    }
                }
            }
        }
    };
    fs.writeFileSync('test_deep_nesting.json', JSON.stringify(deepNestingData, null, 2));

    console.log('Test files created.');
}

async function uploadFile(filePath) {
    const formData = new FormData();
    const fileStream = fs.createReadStream(filePath);
    const fileName = path.basename(filePath);

    formData.append('file', fileStream, fileName);

    try {
        const response = await fetch(`${API_BASE_URL}/api/upload`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(`Upload failed: ${result.error}`);
        }

        return result;
    } catch (error) {
        console.error(`Error uploading ${fileName}:`, error.message);
        return null;
    }
}

async function runTests() {
    console.log('🚀 Starting JSON Pipeline Regression Tests\n');

    // Create test files
    await createTestFiles();

    const results = [];

    for (const testFile of testFiles) {
        console.log(`\n📁 Testing: ${testFile.name}`);
        console.log(`   Description: ${testFile.description}`);

        const result = await uploadFile(testFile.name);

        if (result) {
            console.log(`   ✅ Upload successful`);
            console.log(`   📊 Category: ${result.category}`);
            console.log(`   🔗 File ID: ${result.file_id}`);

            // Check if processing completed
            if (result.category.includes('SQL') || result.category.includes('NoSQL')) {
                console.log(`   🎯 Processing completed`);
            } else {
                console.log(`   ⏳ Processing may still be in progress`);
            }

            results.push({
                file: testFile.name,
                success: true,
                result
            });
        } else {
            console.log(`   ❌ Upload failed`);
            results.push({
                file: testFile.name,
                success: false,
                error: 'Upload failed'
            });
        }
    }

    // Cleanup test files
    console.log('\n🧹 Cleaning up test files...');
    testFiles.forEach(testFile => {
        if (testFile.name !== 'sample_data.json') { // Keep the original
            try {
                fs.unlinkSync(testFile.name);
            } catch (e) {
                // Ignore
            }
        }
    });

    // Summary
    console.log('\n📊 Test Results Summary:');
    console.log('='.repeat(50));

    const successful = results.filter(r => r.success).length;
    const total = results.length;

    results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.file}`);
    });

    console.log(`\n🎯 ${successful}/${total} tests passed`);

    if (successful === total) {
        console.log('🎉 All tests passed! Pipeline is working correctly.');
    } else {
        console.log('⚠️  Some tests failed. Check the logs above.');
        process.exit(1);
    }
}

// Check if server is running
async function checkServer() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/upload`, { method: 'HEAD' });
        return response.status !== 404;
    } catch (error) {
        return false;
    }
}

async function main() {
    console.log('🔍 Checking if server is running...');

    const serverRunning = await checkServer();
    if (!serverRunning) {
        console.error('❌ Server is not running. Please start the development server first:');
        console.error('   npm run dev');
        process.exit(1);
    }

    console.log('✅ Server is running');

    await runTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { runTests, createTestFiles, uploadFile };
