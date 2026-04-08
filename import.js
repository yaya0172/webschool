const express = require('express');
const router = express.Router();
const { pool, transaction } = require('../database');

// ============================================================
// ROUTE PRINCIPALE : Import JSON depuis SheetJS (frontend)
// ============================================================
router.post('/eleves-json', async (req, res) => {
  const { eleves } = req.body;
  
  if (!eleves || !Array.isArray(eleves)) {
    return res.status(400).json({ error: 'Données invalides' });
  }
  
  if (eleves.length === 0) {
    return res.status(400).json({ error: 'Aucun élève fourni' });
  }
  
  if (eleves.length > 500) {
    return res.status(400).json({ error: 'Maximum 500 élèves par lot' });
  }

  try {
    const result = await transaction(async (client) => {
      // S'assurer que les colonnes existent
      await client.query(`
        ALTER TABLE eleves 
        ADD COLUMN IF NOT EXISTS date_naissance DATE,
        ADD COLUMN IF NOT EXISTS lieu_naissance VARCHAR(150),
        ADD COLUMN IF NOT EXISTS sexe VARCHAR(1) DEFAULT 'M',
        ADD COLUMN IF NOT EXISTS statut VARCHAR(50),
        ADD COLUMN IF NOT EXISTS qualite VARCHAR(50),
        ADD COLUMN IF NOT EXISTS nom_parent VARCHAR(100),
        ADD COLUMN IF NOT EXISTS telephone1 VARCHAR(20),
        ADD COLUMN IF NOT EXISTS telephone2 VARCHAR(20),
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      `).catch(() => {}); // Ignore si déjà existant

      const values = [];
      const params = [];
      let p = 1;
      const erreurs = [];

      eleves.forEach((e, idx) => {
        if (!e.matricule || !e.nom) {
          erreurs.push(`Ligne ${idx + 1}: matricule ou nom manquant`);
          return;
        }

        values.push(`($${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},NOW(),NOW())`);
        
        params.push(
          e.matricule.toString().toUpperCase().trim(),
          e.nom.toString().toUpperCase().trim(),
          e.prenom?.toString().trim() || null,
          e.date_naissance || null,
          e.lieu_naissance?.toString().trim() || null,
          e.sexe === 'F' ? 'F' : 'M',
          e.statut?.toString().trim() || null,
          e.qualite?.toString().trim() || null,
          e.classe?.toString().toUpperCase().trim() || null,
          e.nom_parent?.toString().trim() || null,
          e.telephone1?.toString().trim() || null,
          e.telephone2?.toString().trim() || null
        );
      });

      if (values.length === 0) {
        throw new Error('Aucune donnée valide à importer');
      }

      const sql = `
        INSERT INTO eleves (
          matricule, nom, prenom, date_naissance, lieu_naissance,
          sexe, statut, qualite, classe, nom_parent, telephone1, telephone2,
          created_at, updated_at
        ) VALUES ${values.join(',')}
        ON CONFLICT (matricule) DO UPDATE SET
          nom = EXCLUDED.nom,
          prenom = COALESCE(EXCLUDED.prenom, eleves.prenom),
          date_naissance = COALESCE(EXCLUDED.date_naissance, eleves.date_naissance),
          lieu_naissance = COALESCE(EXCLUDED.lieu_naissance, eleves.lieu_naissance),
          sexe = COALESCE(EXCLUDED.sexe, eleves.sexe),
          statut = COALESCE(EXCLUDED.statut, eleves.statut),
          qualite = COALESCE(EXCLUDED.qualite, eleves.qualite),
          classe = COALESCE(EXCLUDED.classe, eleves.classe),
          nom_parent = COALESCE(EXCLUDED.nom_parent, eleves.nom_parent),
          telephone1 = COALESCE(EXCLUDED.telephone1, eleves.telephone1),
          telephone2 = COALESCE(EXCLUDED.telephone2, eleves.telephone2),
          updated_at = NOW()
        RETURNING id
      `;

      const insertResult = await client.query(sql, params);
      
      return {
        imported: insertResult.rowCount,
        total: eleves.length,
        erreurs: erreurs.length > 0 ? erreurs : undefined
      };
    });

    res.json({
      success: true,
      imported: result.imported,
      total: result.total,
      message: `${result.imported} élève(s) importé(s) avec succès`,
      erreurs: result.erreurs
    });

  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Test endpoint
router.get('/eleves-json', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Endpoint import JSON actif',
    max_batch_size: 500,
    format_attendu: {
      eleves: [
        { matricule: '2024-0001', nom: 'KONE', prenom: 'Aminata', ... }
      ]
    }
  });
});

module.exports = router;