const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize, requireVerified } = require('../middleware/auth');
const ctrl = require('../controllers/paymentController');

router.use(authenticate, requireVerified);

router.get('/wallet', ctrl.getWallet);
router.post('/create-order', [body('amount').isNumeric().isFloat({ min: 100 })], validate, ctrl.createOrder);
router.post('/verify', ctrl.verifyPayment);
router.post('/escrow', authorize('brand'), [body('applicationId').notEmpty(), body('amount').isNumeric()], validate, ctrl.createEscrow);
router.post('/escrow/:applicationId/release', authorize('brand'), ctrl.releaseEscrow);
router.post('/withdraw', authorize('influencer'),
  [body('amount').isNumeric().isFloat({ min: 500 }), body('bank_account').notEmpty(), body('ifsc').notEmpty()],
  validate, ctrl.requestWithdrawal
);

module.exports = router;
