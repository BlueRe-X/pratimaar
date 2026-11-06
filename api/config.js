/**
 * Vercel Serverless Function: /api/config
 * Mengembalikan konfigurasi client dan status Gemini API Key dari Vercel Environment Variables
 */

module.exports = (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY || '';
  const hasEnvKey = Boolean(apiKey && apiKey.length > 5);

  res.status(200).json({
    geminiApiKey: apiKey,
    hasEnvKey: hasEnvKey,
    nodeEnv: process.env.NODE_ENV || 'production'
  });
};
