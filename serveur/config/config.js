require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  dbUrl: process.env.DATABASE_URL,
  
  // Origines autorisées par la politique CORS
  allowedOrigins: [
    'https://monan-frontend.onrender.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:19006'
  ]
};