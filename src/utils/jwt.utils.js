import jwt from 'jsonwebtoken';
import authConfig from '../config/auth.config.js';

/**
 * Generate Access Token
 * @param {Object} payload - User data to encode in the token
 * @returns {string} - JWT Access Token
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, authConfig.accessSecret, {
    expiresIn: authConfig.accessExpiry,
  });
};

/**
 * Generate Refresh Token
 * @param {Object} payload - User data to encode in the token
 * @returns {string} - JWT Refresh Token
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, authConfig.refreshSecret, {
    expiresIn: authConfig.refreshExpiry,
  });
};

/**
 * Verify Access Token
 * @param {string} token - The token to verify
 * @returns {Object|null} - Decoded payload or null if invalid
 */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, authConfig.accessSecret);
  } catch (error) {
    return null;
  }
};

/**
 * Verify Refresh Token
 * @param {string} token - The token to verify
 * @returns {Object|null} - Decoded payload or null if invalid
 */
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, authConfig.refreshSecret);
  } catch (error) {
    return null;
  }
};
