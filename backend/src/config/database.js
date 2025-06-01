/**
 * Database configuration for Taxi-Express
 * Uses Sequelize ORM with PostgreSQL
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database connection parameters
const DB_NAME = process.env.DB_NAME || 'taxi_express';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_DIALECT = 'postgres';

// Create Sequelize instance
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: DB_DIALECT,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Export the sequelize instance
module.exports = {
  sequelize,
  Sequelize
};
