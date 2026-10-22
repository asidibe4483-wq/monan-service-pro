const express = require('express');
const router = express.Router();
const { lireTransactions, ajouterTransaction } = require('../controleurs/controleurTransactions');

router.get('/', lireTransactions);
router.post('/', ajouterTransaction);

module.exports = router;