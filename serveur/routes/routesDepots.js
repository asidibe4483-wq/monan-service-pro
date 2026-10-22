const express = require('express');
const router = express.Router();
const { lireDepots } = require('../controleurs/controleurDepots');

router.get('/', lireDepots);

module.exports = router;