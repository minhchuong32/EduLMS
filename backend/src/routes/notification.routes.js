const express = require('express');
const router = express.Router();
const { getNotifications, markRead } = require('../controllers/index.controller');
const { authenticate } = require('../middleware/auth.middleware');
router.use(authenticate);
router.get('/', getNotifications);
router.put('/read-all', markRead);
module.exports = router;
