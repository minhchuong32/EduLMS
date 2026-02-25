// subject.routes.js
const express = require('express');
const router = express.Router();
const { getSubjects, createSubject, updateSubject } = require('../controllers/index.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
router.use(authenticate);
router.get('/', getSubjects);
router.post('/', authorize('admin'), createSubject);
router.put('/:id', authorize('admin'), updateSubject);
module.exports = router;
