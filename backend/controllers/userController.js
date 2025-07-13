const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

// User registration
const register = async (req, res) => {
  let { username, email, password } = req.body;

  // If username is not provided, use email as username
  if (!username) {
    username = email;
  }

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", 
      [username, email, hashedPassword], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Username or email already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      
      const token = jwt.sign({ id: this.lastID, username }, process.env.JWT_SECRET || 'indivar-jwt-secret');
      req.session.token = token;
      
      res.json({ 
        message: 'User registered successfully',
        user: { id: this.lastID, username, email },
        token
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error hashing password' });
  }
};

// User login
const login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    try {
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'indivar-jwt-secret');
      req.session.token = token;

      res.json({
        message: 'Login successful',
        user: { id: user.id, username: user.username, email: user.email },
        token
      });
    } catch (error) {
      res.status(500).json({ error: 'Error comparing passwords' });
    }
  });
};

// User logout
const logout = (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logout successful' });
};

// Get current user info
const getCurrentUser = (req, res) => {
  db.get("SELECT id, username, email FROM users WHERE id = ?", [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  });
};

module.exports = {
  register,
  login,
  logout,
  getCurrentUser
}; 