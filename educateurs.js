const express = require('express');
const router = express.Router();
const { pool } = require('../database');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ie.*, e.nom, e.prenom, e.matricule, e.classe
      FROM inscriptions_educateurs ie
      JOIN eleves e ON e.id = ie.eleve_id
      ORDER BY e.nom, e.prenom
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const {
    eleve_id, extrait, chemise_rabat, enveloppe_timbree, bulletin,
    photos_identite, fiche_renseignement, fiche_inscription_ligne,
    carnet_correspondance, livret_scolaire, diplome, observations
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO inscriptions_educateurs
        (eleve_id, extrait, chemise_rabat, enveloppe_timbree, bulletin,
         photos_identite, fiche_renseignement, fiche_inscription_ligne,
         carnet_correspondance, livret_scolaire, diplome, observations, date_inscription)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
       ON CONFLICT (eleve_id) DO UPDATE SET
         extrait = EXCLUDED.extrait, chemise_rabat = EXCLUDED.chemise_rabat,
         enveloppe_timbree = EXCLUDED.enveloppe_timbree, bulletin = EXCLUDED.bulletin,
         photos_identite = EXCLUDED.photos_identite, fiche_renseignement = EXCLUDED.fiche_renseignement,
         fiche_inscription_ligne = EXCLUDED.fiche_inscription_ligne,
         carnet_correspondance = EXCLUDED.carnet_correspondance,
         livret_scolaire = EXCLUDED.livret_scolaire, diplome = EXCLUDED.diplome,
         observations = EXCLUDED.observations, date_inscription = NOW()
       RETURNING *`,
      [
        eleve_id, !!extrait, !!chemise_rabat, !!enveloppe_timbree, !!bulletin,
        !!photos_identite, !!fiche_renseignement, !!fiche_inscription_ligne,
        !!carnet_correspondance, !!livret_scolaire, !!diplome, observations || ''
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;