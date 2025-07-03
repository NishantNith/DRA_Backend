const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect('mongodb+srv://ranjanashish9992:Mongo9992@cluster0.1l8hj.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Schemas
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  phone: String,
  department: String,
  role: { type: String, default: 'user' }
});

const lehDataSchema = new mongoose.Schema({
  user_id: mongoose.Schema.Types.ObjectId,
  location: String,
  description: String,
  permission_type: String,
  agency: String,
  applicable: String,
  registered: String,
  registration_number: String,
  remarks: String,
  quantity: Number,
  validity: String,
  created_at: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('UserLogin', userSchema);
const LehData = mongoose.model('LehData', lehDataSchema);

// Ensure admin exists
async function ensureAdminExists() {
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    await User.create({
      name: 'Admin',
      email: 'admin@example.com',
      phone: '9999999999',
      department: 'Admin Dept',
      password: 'admin123',
      role: 'admin'
    });
    console.log('✅ Admin created');
  } else {
    console.log('✅ Admin already exists');
  }
}

// Routes

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, password });
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch {
    res.status(500).json({ success: false, message: 'Login error' });
  }
});

// Add user
app.post('/add-user', async (req, res) => {
  const { name, email, phone, department, password } = req.body;
  if (!name || !email || !phone || !department || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }
  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }
    await User.create({ name, email, phone, department, password, role: 'user' });
    res.json({ success: true, message: 'User added successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Error creating user' });
  }
});

// Edit user
app.put('/edit-user/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, department } = req.body;
  try {
    const result = await User.findByIdAndUpdate(id, { name, email, phone, department });
    res.json({ success: !!result });
  } catch {
    res.status(500).json({ success: false, message: 'Error updating user' });
  }
});

// Delete user
app.delete('/delete-user/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) return res.json({ success: false, message: 'User not found' });
    if (user.role === 'admin') return res.json({ success: false, message: '❌ Cannot delete admin user' });

    await User.findByIdAndDelete(id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Delete error' });
  }
});

// Get all users
app.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch {
    res.status(500).json({ message: 'Fetch error' });
  }
});

// Submit LEH data
app.post('/leh-data', async (req, res) => {
  try {
    const {
      user_id, location, description, permission_type, agency,
      applicable, registered, registration_number, remarks,
      quantity, validity
    } = req.body;

    if (!location || location.trim() === '') {
      return res.status(400).json({ success: false, message: 'Location is required' });
    }

    const cleaned = {
      user_id,
      location: location || 'N/A',
      description: description || 'N/A',
      permission_type: permission_type || 'N/A',
      agency: agency || 'N/A',
      applicable: applicable || 'N/A',
      registered: registered || 'N/A',
      registration_number: registration_number || 'N/A',
      remarks: remarks || 'N/A',
      quantity: /^\d+$/.test(quantity) ? parseInt(quantity) : null,
      validity: validity || 'N/A'
    };

    await LehData.create(cleaned);
    res.json({ success: true, message: 'LEH data submitted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Submission error' });
  }
});

// Edit LEH data
app.put('/leh-data/id/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }
  try {
    const result = await LehData.findByIdAndUpdate(id, req.body);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ success: false, message: 'Update error' });
  }
});

// Delete LEH data
app.delete('/leh-data/id/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await LehData.findByIdAndDelete(id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Delete error' });
  }
});

// Get all LEH data
app.get('/leh-data', async (req, res) => {
  try {
    const data = await LehData.find().sort({ created_at: -1 });
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get LEH data by location
app.get('/leh-data/location/:location', async (req, res) => {
  try {
    const data = await LehData.find({ location: req.params.location }).sort({ created_at: -1 });
    res.json(data);
  } catch {
    res.status(500).json({ success: false, message: 'Fetch error' });
  }
});

// Get LEH data by ID
app.get('/leh-data/id/:id', async (req, res) => {
  try {
    const record = await LehData.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Not found' });
    res.json(record);
  } catch {
    res.status(500).json({ success: false, message: 'Fetch error' });
  }
});

// Reset password
app.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ success: false, message: 'Email and new password required' });
  }

  try {
    const result = await User.findOneAndUpdate({ email }, { password: newPassword });
    res.json({ success: !!result });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server live at http://localhost:${PORT}`);
  await ensureAdminExists();
});
