/**
 * AWS Lambda handler for Express.js backend
 * This wraps the Express app to work with API Gateway
 * 
 * Note: This requires the backend to be accessible from this location
 * You may need to adjust the path or bundle the backend with the Lambda function
 */

const serverless = require('serverless-http');

// Try to load the Express app
// Option 1: If backend is bundled with Lambda
let app;
try {
  // Path relative to Lambda function location
  app = require('../../../../../backend/src/server');
} catch (error) {
  // Option 2: If using Lambda Layers or different structure
  console.error('Error loading Express app:', error);
  
  // Fallback: Create a simple Express app for testing
  const express = require('express');
  app = express();
  app.use(express.json());
  
  app.get('/health', (req, res) => {
    res.json({
      status: 'OK',
      message: 'Lambda function is working. Backend integration needed.',
      timestamp: new Date().toISOString()
    });
  });
  
  app.all('*', (req, res) => {
    res.status(501).json({
      error: 'Backend not fully integrated. Please configure Lambda to include backend code.',
      path: req.path
    });
  });
}

// Wrap Express app with serverless-http
// This converts API Gateway events to Express requests
const handler = serverless(app, {
  binary: [
    'image/*',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ],
  request: (request, event, context) => {
    // Add API Gateway context to request
    request.context = event.requestContext;
    request.apiGateway = {
      event,
      context
    };
  }
});

module.exports = { handler };
