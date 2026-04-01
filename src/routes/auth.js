const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

router.post('/register',
  [body('email').isEmail(), body('password').isLength({ min: 8 }), body('role').isIn(['brand', 'influencer'])],
  validate, ctrl.register
);
router.post('/verify-otp',
  [body('userId').notEmpty(), body('otp').isLength({ min: 6, max: 6 })],
  validate, ctrl.verifyOTP
);
router.post('/resend-otp', [body('userId').notEmpty()], validate, ctrl.resendOTP);
router.post('/login',
  [body('email').isEmail(), body('password').notEmpty()],
  validate, ctrl.login
);
router.get('/me', authenticate, ctrl.getMe);
router.post('/fcm-token', authenticate, ctrl.updateFCMToken);
router.post('/change-password', authenticate,
  [body('currentPassword').notEmpty(), body('newPassword').isLength({ min: 8 })],
  validate, ctrl.changePassword
);
router.post('/forgot-password', [body('email').isEmail()], validate, ctrl.forgotPassword);
router.post('/reset-password',
  [body('userId').notEmpty(), body('otp').isLength({ min: 6, max: 6 }), body('newPassword').isLength({ min: 8 })],
  validate, ctrl.resetPassword
);

module.exports = router;
