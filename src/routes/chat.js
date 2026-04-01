const router = require('express').Router();
const { authenticate, requireVerified } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const ctrl = require('../controllers/chatController');

router.use(authenticate, requireVerified);

router.get('/conversations', ctrl.getConversations);
router.get('/conversations/:id/messages', ctrl.getMessages);
router.post('/conversations/:id/messages', upload.single('media'), ctrl.sendMessage);
router.post('/direct', ctrl.startDirectConversation);

module.exports = router;
