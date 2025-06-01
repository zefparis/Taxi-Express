/**
 * Taxi-Express - Entry Point
 * This file serves as the main entry point for deployment platforms like Railway, Render, and Heroku
 */

// Load environment variables
require('dotenv').config();

// Import the main server application from the backend directory
try {
  // Load the server from the backend directory
  console.log('Starting Taxi-Express API server...');
  // We don't assign the require to a variable because server.js already exports its own objects
  require('./backend/src/server.js');
  console.log('Taxi-Express API server started successfully');
} catch (error) {
  console.error('Failed to load server from backend directory:', error.message);
  
  // Fallback to a simple Express server if the main application fails to load
  const express = require('express');
  const app = express();
  const PORT = process.env.PORT || 5000;
  
  app.get('/', (req, res) => {
    res.json({
      message: 'Taxi Express API is running',
      status: 'ok',
      version: '1.0.0',
      documentation: '/api-docs'
    });
  });
  
  app.listen(PORT, () => {
    console.log(`Fallback server running on port ${PORT}`);
  });
}
