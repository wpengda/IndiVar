const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { initializeDatabase } = require('./config/database');
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const userArticleRoutes = require('./routes/userArticles');
const testProgressRoutes = require('./routes/testProgress');
const testResultsRoutes = require('./routes/testResults');
const lifeNarrativeRoutes = require('./routes/lifeNarrative');
const transcribeRoutes = require('./routes/transcribe');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'indivar-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Passport session setup
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  const { db } = require('./config/database');
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, (accessToken, refreshToken, profile, done) => {
  const { db } = require('./config/database');
  const email = profile.emails[0].value;
  // Use email as username
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return done(err);
    if (user) return done(null, user);
    // Create new user
    db.run('INSERT INTO users (username, email, password) VALUES (?, ?, NULL)', [email, email], function(err) {
      if (err) return done(err);
      db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, newUser) => {
        if (err) return done(err);
        return done(null, newUser);
      });
    });
  });
}));

app.use(passport.initialize());
app.use(passport.session());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/user-articles', userArticleRoutes);
app.use('/api/test-progress', testProgressRoutes);
app.use('/api/test-results', testResultsRoutes);
app.use('/api/life-narrative', lifeNarrativeRoutes);
app.use('/api/transcribe', transcribeRoutes);

// Google OAuth routes
app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/api/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
  const jwt = require('jsonwebtoken');
  const user = req.user;
  const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'indivar-jwt-secret');
  req.session.token = token;
  // Redirect to frontend with token as query param
  res.redirect('/?token=' + token);
});

// Serve frontend pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/index.html'));
});

app.get('/articles', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/articles.html'));
});

app.get('/tests', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/tests.html'));
});

app.get('/chatbots', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/chatbots.html'));
});

app.get('/life-narrative-chatbot', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/life-narrative-chatbot.html'));
});

app.get('/article', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/article.html'));
});

app.get('/article.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/article.html'));
});

app.get('/login', (req, res) => {
  // Redirect to home page - login is now handled via modal
  res.redirect('/');
});

app.get('/register', (req, res) => {
  // Redirect to home page - register is now handled via modal
  res.redirect('/');
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/profile.html'));
});

app.get('/profile.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/profile.html'));
});

// Test page routes
app.get('/tests/bfi2-test.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/tests/bfi2-test.html'));
});

app.get('/tests/hexaco-test.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/tests/hexaco-test.html'));
});

app.get('/test-history', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/test-history.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`IndiVar server running on port ${PORT}`);
      console.log(`Visit http://localhost:${PORT} to view the application`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 