const fetch = require('node-fetch').default || require('node-fetch');

async function testJSONEditor() {
    const jsonData = [
        {
            "title": "Book A",
            "price": 399
        },
        {
            "title": "Book B",
            "price": 249
        }
    ];

    const jsonText = JSON.stringify(jsonData, null, 2);

    console.log('Testing JSON Editor API with data:', jsonText);

    try {
        const response = await fetch('http://localhost:3000/api/store-manual-json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ jsonText }),
        });

        const result = await response.json();

        console.log('Response status:', response.status);
        console.log('Response:', JSON.stringify(result, null, 2));

        if (response.ok) {
            console.log('✅ JSON stored successfully!');
            console.log('File ID:', result.fileId);
        } else {
            console.log('❌ Failed to store JSON:', result.error);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testJSONEditor();
