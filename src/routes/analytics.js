const router = require('express').Router();
const { authenticate, authorize, requireVerified } = require('../middleware/auth');
const ctrl = require('../controllers/analyticsController');

router.use(authenticate, requireVerified);
router.post('/report', authorize('influencer'), ctrl.reportMetrics);
router.get('/campaign/:id', authorize('brand'), ctrl.getCampaignAnalytics);

module.exports = router;
