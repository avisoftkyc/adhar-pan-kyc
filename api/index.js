// Vercel API entry point
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import backend server
const backendApp = require('../backend/src/server');

// Create a new Express app for Vercel
const app = express();

// Enable CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [
        'https://kyc-aadhaar-v8lep6th9-ashuls-projects-2dabf902.vercel.app',
        'https://kyc-aadhaar-l9sni800e-ashuls-projects-2dabf902.vercel.app',
        /\.vercel\.app$/,
        /\.netlify\.app$/
      ]
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma'],
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Use the backend app for all routes
app.use('/', backendApp);

// Export for Vercel
module.exports = app;
