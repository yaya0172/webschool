const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { pool } = require('../database');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Upload multiple par matricule (nom de fichier = matricule)
router.post('/upload-multiple', upload.array('photos', 50), async (req, res) => {
  const resultats = [];
  const erreurs = [];

  for (const file of req.files) {
    try {
      // Extraire matricule du nom de fichier (sans extension)
      const matricule = file.originalname.replace(/\.[^/.]+$/, '').toUpperCase();
      
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            public_id: `webscool/eleves/${matricule}`,
            overwrite: true,
            transformation: [
              { width: 400, height: 500, crop: 'fill', gravity: 'face' },
              { quality: 'auto:good' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(file.buffer);
      });

      // Mettre à jour l'élève
      await pool.query(
        'UPDATE eleves SET photo_url = $1, updated_at = NOW() WHERE UPPER(matricule) = UPPER($2)',
        [result.secure_url, matricule]
      );

      resultats.push({ matricule, photo_url: result.secure_url });
    } catch (err) {
      erreurs.push({ fichier: file.originalname, error: err.message });
    }
  }

  res.json({
    success: true,
    uploaded: resultats.length,
    total: req.files.length,
    erreurs: erreurs.length > 0 ? erreurs : undefined
  });
});

module.exports = router;