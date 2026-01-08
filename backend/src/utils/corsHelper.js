/**
 * CORS Helper Utility
 * Provides consistent CORS origin resolution across the application
 */

/**
 * Normalize URL by removing trailing slashes for CORS comparison
 * @param {string} url - URL to normalize
 * @returns {string} Normalized URL
 */
const normalizeOrigin = (url) => {
  if (!url) return url;
  return url.replace(/\/+$/, ''); // Remove trailing slashes
};

/**
 * Get allowed origins based on environment configuration
 * @returns {Array<string|RegExp>} Array of allowed origins
 */
const getAllowedOrigins = () => {
  const origins = [];
  
  // Always add avihridsys domains (works in both dev and production)
  origins.push(
    'https://www.avihridsys.info',
    'https://avihridsys.info',
    'https://www.avihridsys.in',
    'https://avihridsys.in',
    /^https:\/\/(www\.)?avihridsys\.(in|info)$/
  );
  
  if (process.env.NODE_ENV === 'production') {
    // Add environment variable origins (comma-separated)
    if (process.env.ALLOWED_ORIGINS) {
      origins.push(...process.env.ALLOWED_ORIGINS.split(',').map(origin => normalizeOrigin(origin.trim())));
    }
    
    // Add FRONTEND_URL if specified (normalized)
    if (process.env.FRONTEND_URL) {
      origins.push(normalizeOrigin(process.env.FRONTEND_URL));
    }
    
    // Always add Vercel/Netlify/Amplify regex patterns for flexibility
    origins.push(
      /^https:\/\/.*\.vercel\.app$/,
      /^https:\/\/.*\.netlify\.app$/,
      /^https:\/\/.*\.amplifyapp\.com$/
    );
    
    // Add default Vercel URLs if no custom origins specified
    if (origins.filter(o => typeof o === 'string').length === 0) {
      origins.push(
        'https://kyc-aadhaar-app.vercel.app',
        'https://kyc-aadhaar-app-ashuls-projects-2dabf902.vercel.app',
        'https://adhar-pan-kyc.vercel.app'
      );
    }
    
    return origins;
  } else {
    // Development origins
    const devOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
    
    // Add custom dev origins if specified
    if (process.env.DEV_ALLOWED_ORIGINS) {
      devOrigins.push(...process.env.DEV_ALLOWED_ORIGINS.split(',').map(origin => normalizeOrigin(origin.trim())));
    }
    
    // Merge with avihridsys domains
    return [...origins, ...devOrigins];
  }
};

/**
 * Get the allowed origin for a specific request
 * @param {string} requestOrigin - The origin from the request headers
 * @returns {string} The allowed origin for the response header
 */
const getAllowedOrigin = (requestOrigin) => {
  if (!requestOrigin) {
    const frontendUrl = process.env.FRONTEND_URL;
    return normalizeOrigin(frontendUrl) || (process.env.NODE_ENV === 'production' ? '*' : 'http://localhost:3000');
  }
  
  // Normalize the request origin for comparison
  const normalizedRequestOrigin = normalizeOrigin(requestOrigin);
  const allowedOrigins = getAllowedOrigins();
  
  // Check if origin matches any allowed origin
  for (const allowedOrigin of allowedOrigins) {
    if (typeof allowedOrigin === 'string') {
      const normalizedAllowedOrigin = normalizeOrigin(allowedOrigin);
      if (normalizedRequestOrigin === normalizedAllowedOrigin) {
        return requestOrigin; // Return original requestOrigin (with or without trailing slash)
      }
    } else if (allowedOrigin instanceof RegExp) {
      if (allowedOrigin.test(normalizedRequestOrigin)) {
        return requestOrigin; // Return original requestOrigin
      }
    }
  }
  
  // In development, allow any origin for flexibility
  if (process.env.NODE_ENV !== 'production') {
    return requestOrigin;
  }
  
  // Fallback for production
  const frontendUrl = process.env.FRONTEND_URL;
  return normalizeOrigin(frontendUrl) || '*';
};

/**
 * Get the frontend URL for QR codes and redirects
 * Priority: FRONTEND_URL env var > Production detection > localhost
 * @returns {string} Frontend URL
 */
const getFrontendUrl = () => {
  const logger = require('./logger');
  
  // First priority: FRONTEND_URL environment variable
  if (process.env.FRONTEND_URL) {
    const url = normalizeOrigin(process.env.FRONTEND_URL);
    logger.info(`QR Code: Using FRONTEND_URL from env: ${url}`);
    return url;
  }
  
  // Second priority: Check multiple production indicators
  // If we're on Render, Vercel, Railway, or any cloud platform, assume production
  // Also check if we're NOT on common localhost ports
  const port = process.env.PORT ? parseInt(process.env.PORT) : null;
  const isLocalPort = port === 3000 || port === 3002;
  // Note: PORT 5000 is also considered local for backward compatibility, but if PORT is set to anything else, assume production
  
  // Check for Render-specific environment variables (Render sets these automatically)
  const isRender = !!(
    process.env.RENDER ||
    process.env.RENDER_SERVICE_NAME ||
    process.env.RENDER_SERVICE_ID ||
    process.env.RENDER_EXTERNAL_URL
  );
  
  const isProduction = 
    process.env.NODE_ENV === 'production' ||
    isRender || // Any Render indicator
    process.env.VERCEL === '1' || // Vercel deployment indicator
    process.env.VERCEL_URL || // Vercel URL exists
    process.env.RAILWAY_ENVIRONMENT === 'production' || // Railway indicator
    process.env.RAILWAY_ENVIRONMENT_NAME || // Railway environment name exists
    (port && port !== 3000 && port !== 3002 && port !== 5000); // Any port that's not a common dev port
  
  // CRITICAL: If we're on Render OR PORT is set to a non-local value, use production
  // Render deployments should ALWAYS use production URL
  if (isProduction || isRender || (port && port !== 3000 && port !== 3002 && port !== 5000)) {
    // Default production URL - use .info as primary
    const url = 'https://www.avihridsys.info';
    logger.info(`QR Code: Using production URL (detected production environment): ${url}`);
    logger.info(`QR Code: NODE_ENV=${process.env.NODE_ENV}, isRender=${isRender}, RENDER=${process.env.RENDER}, RENDER_SERVICE_NAME=${process.env.RENDER_SERVICE_NAME}, PORT=${process.env.PORT}, isLocalPort=${isLocalPort}, isProduction=${isProduction}`);
    return url;
  }
  
  // Development fallback - only use if we're definitely on a local port (3000 or 3002)
  // AND PORT is explicitly set to one of those values
  if (isLocalPort) {
    const url = 'http://localhost:3000';
    logger.info(`QR Code: Using development URL: ${url}`);
    logger.warn(`QR Code: Development mode detected. NODE_ENV=${process.env.NODE_ENV}, PORT=${process.env.PORT}, isLocalPort=${isLocalPort}`);
    return url;
  }
  
  // Final fallback: if we can't determine, default to production for safety
  // (Better to have production URL in dev than localhost in production)
  // This catches cases where PORT might not be set but we're still in production
  const url = 'https://www.avihridsys.info';
  logger.warn(`QR Code: Ambiguous environment, defaulting to production URL for safety: ${url}`);
  logger.warn(`QR Code: NODE_ENV=${process.env.NODE_ENV}, PORT=${process.env.PORT}, isRender=${isRender}`);
  return url;
};

module.exports = {
  getAllowedOrigins,
  getAllowedOrigin,
  normalizeOrigin,
  getFrontendUrl
};

