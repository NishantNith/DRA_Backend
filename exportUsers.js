const fs = require('fs');
const mysql = require('mysql2');

// MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'admin123', // Use your own MySQL password
  database: 'user_login'
});

// Connect and export data
db.connect(err => {
  if (err) {
    console.error('❌ Database connection failed:', err);
    return;
  }

  db.query('SELECT * FROM users', (err, results) => {
    if (err) {
      console.error('❌ Failed to fetch users:', err);
    } else {
      fs.writeFile('users.json', JSON.stringify(results, null, 2), err => {
        if (err) {
          console.error('❌ Failed to write file:', err);
        } else {
          console.log('✅ User data saved to users.json');
        }
      });
    }

    db.end(); // Always close DB
  });
});
