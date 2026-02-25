const express = require('express');
const router = express.Router();
const { getAssignmentsByCourse, getAssignment, createAssignment, updateAssignment, publishAssignment, deleteAssignment } = require('../controllers/assignment.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/course/:courseId', getAssignmentsByCourse);
router.get('/:id', getAssignment);
router.post('/', authorize('teacher', 'admin'), createAssignment);
router.put('/:id', authorize('teacher', 'admin'), updateAssignment);
router.patch('/:id/publish', authorize('teacher', 'admin'), publishAssignment);
router.delete('/:id', authorize('teacher', 'admin'), deleteAssignment);

module.exports = router;
