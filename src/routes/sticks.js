const router = require('express').Router();
const { authenticate, authorize, requireVerified } = require('../middleware/auth');
const ctrl = require('../controllers/sticksController');

router.use(authenticate);

router.get('/balance', ctrl.getBalance);
router.get('/transactions', ctrl.getTransactions);
router.get('/packages', ctrl.getPackages);
router.post('/purchase', requireVerified, ctrl.purchaseSticks);
router.post('/verify-purchase', requireVerified, ctrl.verifyPurchase);
router.post('/deduct', requireVerified, authorize('influencer'), ctrl.deductForApplication);
router.post('/admin-reward', authorize('admin'), ctrl.adminReward);

module.exports = router;
