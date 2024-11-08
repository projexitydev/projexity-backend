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

// Trust first proxy
app.set('trust proxy', 1);

// Add debugging middleware at the top of your routes
app.use((req, res, next) => {
  console.log('Session:', req.session);
  console.log('User:', req.user);
  console.log('Cookies:', req.cookies);
  console.log('Headers:', req.headers);
  next();
});

// Express session middleware
app.use(session({
  secret: 'sdmoaisnduiasd29u912dasdias',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'none'
    // Remove domain setting completely
  },
  name: 'projexity.sid',
  proxy: true
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Updated CORS configuration
app.use(cors({
  origin: ['https://projexity.dev', 'https://www.projexity.dev', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));

app.use(express.json());
connectDatabase();
app.use('/api', projectRoutes);
app.use('/api', userRoutes);

// Updated GitHub Strategy configuration
passport.use(new GitHubStrategy({
  clientID: 'Ov23liiLKljHQqIy9SgB',
  clientSecret: '737d696ad5fff79b43756b05f0dae10a5ed95ac5',
  callbackURL: 'https://projexity-backend-2chk.onrender.com/auth/github/callback'
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
    user.accessToken = accessToken;
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user, done) => {
  done(null, {
    id: user._id,
    github_username: user.github_username,
    accessToken: user.accessToken
  });
});

passport.deserializeUser(async (userData, done) => {
  try {
    const user = await User.findOne({ github_username: userData.github_username });
    if (!user) {
      return done(null, null);
    }
    // Maintain the access token from the session
    user.accessToken = userData.accessToken;
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Route to start GitHub authentication
app.get('/auth/github', passport.authenticate('github', { 
  scope: ['user:email', 'repo', 'codespace', 'codespaces']
}));
// GitHub OAuth callback route
app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/' }),
  (req, res) => {
    console.log('Auth successful, user:', req.user);
    console.log('Session after auth:', req.session);
    
    // Set a specific cookie to test cookie handling
    res.cookie('test_auth', 'true', {
      secure: true,
      httpOnly: true,
      sameSite: 'none'
    });
    
    res.redirect('https://projexity.dev/');
  }
);

// Add a test endpoint
app.get('/auth/test', (req, res) => {
  res.json({
    session: req.session,
    user: req.user,
    cookies: req.cookies,
    isAuthenticated: req.isAuthenticated()
  });
});

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
    if (err) return next(err);
    res.clearCookie('connect.sid', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    res.status(200).json({ message: 'Logged out' });
  });
});

// Update the getCodespace route to include better error handling and logging
app.get('/getCodespace', async (req, res) => {
  // Check authentication
  if (!req.isAuthenticated() || !req.user) {
    console.log('User not authenticated');
    return res.status(401).json({ message: 'Not authenticated' });
  }

  // Verify access token
  if (!req.user.accessToken) {
    console.log('No access token found for user:', req.user.github_username);
    return res.status(401).json({ message: 'No access token available' });
  }

  const repositoryId = parseInt(req.query.repoId);
  const accessToken = req.user.accessToken;

  try {
    const response = await axios.get('https://api.github.com/user/codespaces', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Projexity-App'
      }
    });

    const codespaces = response.data.codespaces || [];
    console.log('Found codespaces:', codespaces.length);

    const existingCodespace = codespaces.find(cs => cs.repository.id === repositoryId);

    if (existingCodespace) {
      console.log('Found existing codespace:', existingCodespace.web_url);
      return res.json({ url: existingCodespace.web_url });
    } else {
      console.log('Creating new codespace for repo:', repositoryId);
      const createResponse = await axios.post(
        codespaceUrl,
        {
          repository_id: repositoryId,
          ref: 'main',
          geo: 'UsEast',
        },
        {
          headers: {
            'Authorization': `token ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Projexity-App'
          },
        }
      );

      console.log('Created new codespace:', createResponse.data.web_url);
      return res.json({ url: createResponse.data.web_url });
    }
  } catch (error) {
    console.error('Codespace error:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      documentation_url: error.response?.data?.documentation_url
    });
    
    if (error.response?.status === 401) {
      // Clear session on authentication error
      req.logout((err) => {
        if (err) console.error('Logout error:', err);
      });
    }
    
    return res.status(error.response?.status || 500).json({
      message: 'Error with codespace operation',
      error: error.response?.data || error.message
    });
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
