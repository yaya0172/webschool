const express = require('express');
const router = express.Router();
const { pool } = require('../database');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*, e.nom, e.prenom, e.matricule, e.classe
      FROM inscriptions i
      JOIN eleves e ON e.id = i.eleve_id
      ORDER BY i.date_paiement DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { eleve_id, montant, date_paiement } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO inscriptions (eleve_id, montant, date_paiement, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (eleve_id) DO UPDATE SET
         montant = EXCLUDED.montant,
         date_paiement = EXCLUDED.date_paiement,
         updated_at = NOW()
       RETURNING *`,
      [eleve_id, montant, date_paiement]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:eleve_id', async (req, res) => {
  try {
    await pool.query('DELETE FROM inscriptions WHERE eleve_id = $1', [req.params.eleve_id]);
    res.json({ message: 'Paiement supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;