const router = require('express').Router();
const { authenticate, authorize, requireVerified } = require('../middleware/auth');
const ctrl = require('../controllers/dashboardController');

router.use(authenticate, requireVerified);

router.get('/influencer', authorize('influencer'), ctrl.getInfluencerDashboard);
router.get('/brand', authorize('brand'), ctrl.getBrandDashboard);
router.get('/admin', authorize('admin'), ctrl.getAdminDashboard);

module.exports = router;
