const express = require('express');
const router = express.Router();
const { getCourses, getCourseById, createCourse } = require('../controllers/index.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
router.use(authenticate);
router.get('/', getCourses);
router.post('/', authorize('admin'), createCourse);
router.get('/:id', getCourseById);
module.exports = router;
