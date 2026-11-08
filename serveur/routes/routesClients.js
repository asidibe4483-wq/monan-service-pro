const express = require('express');
const router = express.Router();
const { lireClients, ajouterClient } = require('../controleurs/controleurClients');

// GET: Pour récupérer (lire) la liste des clients
router.get('/', lireClients);

// POST: Pour envoyer (ajouter) un nouveau client
router.post('/', ajouterClient);

module.exports = router;