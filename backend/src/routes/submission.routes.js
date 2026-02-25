const express = require('express');
const router = express.Router();
const { startSubmission, submitQuiz, submitEssay, gradeSubmission, getSubmissionsByAssignment, getSubmissionDetail, getMySubmission } = require('../controllers/submission.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { upload, setUploadType } = require('../middleware/upload.middleware');

router.use(authenticate);
router.post('/start', authorize('student'), startSubmission);
router.post('/:id/submit-quiz', authorize('student'), submitQuiz);
router.post('/:id/submit-essay', authorize('student'), setUploadType('submission'), upload.single('file'), submitEssay);
router.put('/:id/grade', authorize('teacher', 'admin'), gradeSubmission);
router.get('/assignment/:assignmentId', authorize('teacher', 'admin'), getSubmissionsByAssignment);
router.get('/my/:assignmentId', authorize('student'), getMySubmission);
router.get('/:id/detail', getSubmissionDetail);

module.exports = router;
