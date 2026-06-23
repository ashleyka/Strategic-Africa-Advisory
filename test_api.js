const sqlite3 = require('sqlite3').verbose();

async function test() {
    try {
        const res = await fetch('http://localhost:3000/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Jane Doe',
                email: 'jane@example.com',
                message: 'Looking for compliance services.'
            })
        });
        const data = await res.json();
        console.log('API Response:', data);

        const db = new sqlite3.Database('./database.sqlite');
        db.all('SELECT * FROM contacts', [], (err, rows) => {
            if (err) throw err;
            console.log('Database Rows:', rows);
        });
    } catch (err) {
        console.error('Error:', err);
    }
}
test();
