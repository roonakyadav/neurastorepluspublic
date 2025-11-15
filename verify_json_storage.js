const fetch = require('node-fetch').default || require('node-fetch');

async function verifyJSONStorage(fileId) {
    console.log('Verifying JSON storage for fileId:', fileId);

    try {
        // Check files_metadata
        const metadataResponse = await fetch(`http://localhost:3000/api/file-metadata?fileId=${fileId}`);
        const metadata = await metadataResponse.json();

        console.log('Files metadata:', JSON.stringify(metadata, null, 2));

        if (metadata.table_name) {
            console.log('Table name:', metadata.table_name);
            console.log('✅ Data successfully stored in Supabase!');
            console.log('📊 Storage type: SQL');
            console.log('📋 Table name:', metadata.table_name);
            console.log('🔢 Record count:', metadata.record_count);
        }

    } catch (error) {
        console.error('Verification error:', error.message);
    }
}

// Use the fileId from the previous test
verifyJSONStorage('e70d1faf-74ca-4ccf-abd5-f3d5106813ed');
