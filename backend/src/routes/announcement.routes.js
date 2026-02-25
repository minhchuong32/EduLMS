const express = require('express');
const router = express.Router();
const { getAnnouncements, createAnnouncement, deleteAnnouncement } = require('../controllers/index.controller');
const { authenticate } = require('../middleware/auth.middleware');
router.use(authenticate);
router.get('/', getAnnouncements);
router.post('/', createAnnouncement);
router.delete('/:id', deleteAnnouncement);
module.exports = router;
