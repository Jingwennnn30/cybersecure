// API Configuration - works on both localhost and production
const getApiUrl = () => {
  // If running on localhost, use localhost:4000
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:4000';
  }
  // For production (csnet.my), use the production backend URL
  return 'http://cybersecure.csnet.my:4000';
};

export const API_BASE_URL = getApiUrl();
