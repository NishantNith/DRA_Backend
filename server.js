const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'admin123',
  database: 'user_login'
});

// Ensure Admin Exists
async function ensureAdminExists() {
  try {
    const [adminCheck] = await db.query("SELECT * FROM users WHERE role = 'admin'");
    if (adminCheck.length === 0) {
      await db.query(
        "INSERT INTO users (name, email, phone, department, password, role) VALUES (?, ?, ?, ?, ?, ?)",
        ['Admin', 'admin@example.com', '9999999999', 'Admin Dept', 'admin123', 'admin']
      );
      console.log("✅ Admin user created: admin@example.com / admin123");
    } else {
      console.log("✅ Admin user already exists");
    }
  } catch (err) {
    console.error("❌ Error ensuring admin user:", err);
  }
}

// LOGIN
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [results] = await db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
    if (results.length > 0) {
      const user = results[0];
      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          department: user.department,
          phone: user.phone,
          role: user.role
        }
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// ADD USER
app.post('/add-user', async (req, res) => {
  const { name, email, phone, department, password } = req.body;
  if (!name || !email || !phone || !department || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }
  try {
    const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    await db.query(
      'INSERT INTO users (name, email, phone, department, password, role) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, phone, department, password, 'user']
    );

    res.status(200).json({ success: true, message: 'User added successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database insert error' });
  }
});

// EDIT USER
app.put('/edit-user/:id', async (req, res) => {
  const userId = req.params.id;
  const { name, email, phone, department } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE users SET name=?, email=?, phone=?, department=? WHERE id=?',
      [name, email, phone, department, userId]
    );
    res.json({ success: result.affectedRows > 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating user' });
  }
});

// DELETE USER
app.delete('/delete-user/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const [check] = await db.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (check.length === 0) return res.json({ success: false, message: 'User not found' });
    if (check[0].role === 'admin') return res.json({ success: false, message: '❌ Cannot delete admin user' });

    const [result] = await db.query('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ success: result.affectedRows > 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting user' });
  }
});

// GET ALL USERS
app.get('/users', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// SUBMIT LEH DATA
app.post('/leh-data', async (req, res) => {
  try {
    let {
      user_id, location, description, permission_type, agency,
      applicable, registered, registration_number, remarks,
      quantity, validity
    } = req.body;

    if (!location || location.trim() === '') {
      return res.status(400).json({ success: false, message: 'Location is required' });
    }

    const toNA = val => (val === undefined || val === null || String(val).trim() === '' ? 'N/A' : String(val).trim());

    const cleaned = {
      user_id: user_id || null,
      location: toNA(location),
      description: toNA(description),
      permission_type: toNA(permission_type),
      agency: toNA(agency),
      applicable: toNA(applicable),
      registered: toNA(registered),
      registration_number: toNA(registration_number),
      remarks: toNA(remarks),
      quantity: (/^\d+$/.test(quantity)) ? parseInt(quantity) : null,
      validity: (validity && validity !== 'N/A') ? validity : null
    };

    await db.query(
      `INSERT INTO leh_data 
        (user_id, location, description, permission_type, agency, applicable, registered, registration_number, remarks, quantity, validity) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cleaned.user_id, cleaned.location, cleaned.description, cleaned.permission_type, cleaned.agency, cleaned.applicable, cleaned.registered, cleaned.registration_number, cleaned.remarks, cleaned.quantity, cleaned.validity]
    );

    res.json({ success: true, message: "Leh data submitted successfully" });
  } catch (err) {
    console.error("❌ Error saving leh data:", err);
    res.status(500).json({ success: false, message: "Error saving data" });
  }
});

// UPDATE LEH DATA
app.put('/leh-data/id/:id', async (req, res) => {
  const id = req.params.id;
  try {
    let {
      user_id, location, description, permission_type, agency,
      applicable, registered, registration_number, remarks,
      quantity, validity
    } = req.body;

    if (!location || location.trim() === '') {
      return res.status(400).json({ success: false, message: 'Location is required' });
    }

    const toNA = val => (val === undefined || val === null || String(val).trim() === '' ? 'N/A' : String(val).trim());

    const cleaned = {
      user_id: user_id || null,
      location: toNA(location),
      description: toNA(description),
      permission_type: toNA(permission_type),
      agency: toNA(agency),
      applicable: toNA(applicable),
      registered: toNA(registered),
      registration_number: toNA(registration_number),
      remarks: toNA(remarks),
      quantity: (/^\d+$/.test(quantity)) ? parseInt(quantity) : null,
      validity: (validity && validity !== 'N/A') ? validity : null
    };

    const [result] = await db.query(
      `UPDATE leh_data SET 
        user_id = ?, location = ?, description = ?, permission_type = ?, agency = ?, 
        applicable = ?, registered = ?, registration_number = ?, remarks = ?, 
        quantity = ?, validity = ? 
      WHERE id = ?`,
      [cleaned.user_id, cleaned.location, cleaned.description, cleaned.permission_type, cleaned.agency, cleaned.applicable, cleaned.registered, cleaned.registration_number, cleaned.remarks, cleaned.quantity, cleaned.validity, id]
    );

    res.json({
      success: result.affectedRows > 0,
      message: result.affectedRows > 0 ? "Updated successfully" : "No record found"
    });
  } catch (err) {
    console.error("❌ Error updating leh data:", err);
    res.status(500).json({ success: false, message: "Error updating data" });
  }
});

// DELETE LEH DATA
app.delete('/leh-data/id/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query("DELETE FROM leh_data WHERE id = ?", [id]);
    res.json({ success: result.affectedRows > 0 });
  } catch (err) {
    console.error("❌ Delete Error:", err);
    res.status(500).json({ success: false, message: "Error deleting record" });
  }
});

// GET ALL LEH DATA
app.get('/leh-data', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM leh_data ORDER BY created_at DESC');
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET LEH DATA BY LOCATION
app.get('/leh-data/location/:location', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM leh_data WHERE location = ? ORDER BY created_at DESC', [req.params.location]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch data' });
  }
});

// GET LEH DATA BY ID
app.get('/leh-data/id/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query("SELECT * FROM leh_data WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching record" });
  }
});

// RESET PASSWORD
app.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  const password = newPassword;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password required" });
  }

  try {
    const [result] = await db.query("UPDATE users SET password = ? WHERE email = ?", [password, email]);
    res.json({ success: result.affectedRows > 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error. Try again." });
  }
});

// START SERVER
app.listen(PORT, async () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  await ensureAdminExists();
});
