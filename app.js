const express = require('express');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const session = require('express-session');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const connectDatabase = require('./db');
const projectRoutes = require('./routes/projectRoutes');
dotenv.config();

const app = express();

// Enable CORS and JSON body parsing
app.use(express.json());
app.use(cors());

// Connect to MongoDB
connectDatabase();

// Use database API routes
app.use('/api', projectRoutes);

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
  profile.accessToken = accessToken;  
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
app.get('/auth/github', passport.authenticate('github', { scope: ['user:email', 'repo', 'codespace'] }));

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
  

  app.get('/getCodespace', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
  
    const repositoryId = parseInt(req.query.repoId); // repo id of the template for the project
    console.log("repositoryId", repositoryId);
    const accessToken = req.user.accessToken; // Get authenticated user's access token

    const codespaceUrl = `https://api.github.com/user/codespaces`;
  
    try {
      // Step 1: Check for existing codespaces
      const response = await axios.get(codespaceUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`, // Use the user's access token
          Accept: 'application/vnd.github.v3+json',
        },
      });
  
      const codespaces = response.data.codespaces || [];
  
      // Find if there is a codespace with the repository ID
      const existingCodespace = codespaces.find(cs => cs.repository.id === repositoryId);
  
      if (existingCodespace) {
        // If a Codespace exists, return its URL
        console.log("existingCodespace", existingCodespace);
        return res.json({ url: existingCodespace.web_url });
      } else {
        // Step 2: If no Codespace exists, create a new one
        const createCodespaceUrl = `https://api.github.com/user/codespaces`;
        const createResponse = await axios.post(
          createCodespaceUrl,
          {
            repository_id: repositoryId, // Required repository ID
            ref: 'main', 
            geo: 'UsEast', // Optionally specify the geographic location
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );
  
        // Return the newly created Codespace URL
        return res.json({ url: createResponse.data.web_url });
      }
    } catch (error) {
      console.error('Error checking or creating codespace:', error);
      return res.status(500).json({ message: 'Error checking or creating codespace' });
    }
  });
  

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
