import express from 'express';
import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import session from 'express-session';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { ChatGPTAPI } from 'chatgpt';
import connectDatabase from './db.js';
import projectRoutes from './routes/projectRoutes.js';
import userRoutes from './routes/userRoutes.js';
import rateLimit from 'express-rate-limit';
import User from './models/User.js';

dotenv.config();

const app = express();

// Enable CORS and JSON body parsing
app.use(express.json());
app.use(cors());

// Connect to MongoDB
connectDatabase();

// Use database API routes
app.use('/api', projectRoutes);
app.use('/api', userRoutes);

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
async function (accessToken, refreshToken, profile, done) {
  try {
    let user = await User.findOne({ github_username: profile.username });

    if (!user) {
      user = new User({
        github_username: profile.username,
        total_xp: 0,
        projects: []
      });
      await user.save();
    }

    // Add accessToken to the user object
    user.accessToken = accessToken;

    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Serialization of user sessions
passport.serializeUser((user, done) => {
  done(null, { github_username: user.github_username });
});

// Deserialization of user sessions
passport.deserializeUser(async (userData, done) => {
  try {
    const user = await User.findOne({ github_username: userData.github_username });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
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
app.get('/auth/user', async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const user = await User.findOne({ github_username: req.user.github_username });
      res.json({
        user: {
          github_username: user.github_username,
          total_xp: user.total_xp,
          projects: user.projects,
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching user data' });
    }
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

// Route to get Codespace URL
app.get('/getCodespace', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const repositoryId = parseInt(req.query.repoId); // repo id of the template for the project
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

    console.log(req.user.username + " just opened a codespace! repoId: " + repositoryId)

    if (existingCodespace) {
      // If a Codespace exists, return its URL
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

// Rate limiting middleware
const chatLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // every 24 hours
  max: 50, // Limit each IP to 3 requests per 24 hr
  message: 'You have exceeded the 50 requests in 24 hours limit!',
  standardHeaders: true,
  legacyHeaders: false, 
});

app.post('/api/chat', chatLimiter, async (req, res) => {
  const { prompt, conversationId, parentMessageId, apiBaseUrl, model } = req.body;
  
  console.log("New Chat Request")

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.flushHeaders(); // Make sure headers are sent immediately
  
  const api = new ChatGPTAPI({
    apiKey: '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',
    apiBaseUrl: apiBaseUrl,
    completionParams: {
      model: model
    },
  });

  try {
    const response = await api.sendMessage(prompt, {
      conversationId,
      parentMessageId,
      onProgress: (partialResponse) => {
        res.write(JSON.stringify(partialResponse));
        res.flush();
      },
    });

    res.end(JSON.stringify(response));
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
