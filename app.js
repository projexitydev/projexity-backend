const express = require('express');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const session = require('express-session');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware to allow CORS from your frontend
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3000/"],
  credentials: true
}));

// Express session middleware
app.use(session({
  secret: 'sdmoaisnduiasd29u912dasdias',
  resave: false,
  saveUninitialized: true,
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Passport GitHub Strategy
passport.use(new GitHubStrategy({
  clientID: 'Ov23liiLKljHQqIy9SgB',
  clientSecret: '737d696ad5fff79b43756b05f0dae10a5ed95ac5',
  callbackURL: 'http://localhost:5000/auth/github/callback'
},
function (accessToken, refreshToken, profile, done) {
  // You can add database integration here to find or create users
  return done(null, profile);
}));

// Serialization and deserialization of user sessions
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Route to start GitHub authentication
app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

// GitHub OAuth callback route
app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect(`http://localhost:3000/`);
  }
);

// Route to get current authenticated user
app.get('/auth/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

// Logout route
app.get('/auth/logout', (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err); // Handle the error properly
      }
      res.clearCookie('connect.sid');  // Clear the session cookie
      res.status(200).json({ message: 'Logged out' });  // Send a success response
    });
  });
  
  

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
