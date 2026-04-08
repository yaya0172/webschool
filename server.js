const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Sécurité et performance
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Trop de requêtes' }
});
app.use('/api/', limiter);

// Body parsing (important pour l'import JSON)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/', (req, res) => {
  res.json({
    status: '🎓 WebScool API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      eleves: '/api/eleves',
      import: '/api/import/eleves-json',
      paiements: '/api/inscriptions',
      educateurs: '/api/educateurs',
      photos: '/api/photos'
    }
  });
});

// Routes
app.use('/api/eleves', require('./routes/eleves'));
app.use('/api/import', require('./routes/import'));
app.use('/api/inscriptions', require('./routes/inscriptions'));
app.use('/api/educateurs', require('./routes/educateurs'));
app.use('/api/photos', require('./routes/photos'));

// Erreurs
app.use((err, req, res, next) => {
  console.error('❌ Erreur:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erreur serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 WebScool API sur le port ${PORT}`);
});