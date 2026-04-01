const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/adminController');
const analyticsCtrl = require('../controllers/analyticsController');

router.use(authenticate, authorize('admin'));

router.get('/users', ctrl.getUsers);
router.put('/users/:id/toggle', ctrl.toggleUserStatus);
router.get('/campaigns', ctrl.getAllCampaigns);
router.put('/campaigns/:id/status', ctrl.updateCampaignStatus);
router.get('/transactions', ctrl.getTransactions);
router.put('/transactions/:id/process-withdrawal', ctrl.processWithdrawal);

module.exports = router;
