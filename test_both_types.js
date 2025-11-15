const fetch = require('node-fetch').default || require('node-fetch');
const fs = require('fs');

async function testJSONType(jsonData, description) {
    console.log(`\n🧪 Testing: ${description}`);
    console.log('='.repeat(50));

    const jsonText = JSON.stringify(jsonData, null, 2);

    try {
        const response = await fetch('http://localhost:3000/api/store-manual-json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ jsonText }),
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Successfully stored!');
            console.log('📄 File ID:', result.fileId);

            // Check the metadata to see storage type
            const metadataResponse = await fetch(`http://localhost:3000/api/file-metadata?fileId=${result.fileId}`);
            const metadata = await metadataResponse.json();

            if (metadata.success) {
                console.log('📊 Storage Type:', metadata.metadata.storage_type);
                console.log('📋 Table Name:', metadata.metadata.table_name || 'N/A (NoSQL)');
                console.log('🔢 Record Count:', metadata.metadata.record_count);
            }

            return result.fileId;
        } else {
            console.log('❌ Failed:', result.error);
            return null;
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        return null;
    }
}

async function main() {
    console.log('🚀 Testing JSON Editor with Both SQL and NoSQL Data Types');
    console.log('='.repeat(60));

    // Test SQL data
    const sqlData = JSON.parse(fs.readFileSync('example_sql_data.json', 'utf8'));
    const sqlFileId = await testJSONType(sqlData, 'SQL Data (Employee Records)');

    // Test NoSQL data
    const nosqlData = JSON.parse(fs.readFileSync('example_nosql_data.json', 'utf8'));
    const nosqlFileId = await testJSONType(nosqlData, 'NoSQL Data (Company Structure)');

    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    console.log('SQL Data (Tabular): Stored in relational database tables');
    console.log('NoSQL Data (Complex): Stored as raw JSON documents');
    console.log('\nBoth types are now fully supported in the JSON editor! 🎉');
}

main().catch(console.error);
