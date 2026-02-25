const express = require('express');
const router = express.Router();
const { getUsers, getUserById, createUser, updateUser, updateProfile } = require('../controllers/index.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { upload, setUploadType } = require('../middleware/upload.middleware');

router.use(authenticate);
router.get('/', authorize('admin'), getUsers);
router.post('/', authorize('admin'), createUser);
router.get('/profile', updateProfile); // GET own profile
router.put('/profile', setUploadType('avatar'), upload.single('avatar'), updateProfile);
router.get('/:id', getUserById);
router.put('/:id', authorize('admin'), setUploadType('avatar'), upload.single('avatar'), updateUser);

module.exports = router;
