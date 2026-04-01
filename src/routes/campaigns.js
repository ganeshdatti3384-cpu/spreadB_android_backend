const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize, requireVerified } = require('../middleware/auth');
const ctrl = require('../controllers/campaignController');

router.use(authenticate, requireVerified);

router.get('/', ctrl.getCampaigns);
router.get('/brand', authorize('brand'), ctrl.getBrandCampaigns);
router.get('/applications/my', authorize('influencer'), ctrl.getMyApplications);
router.get('/:id', ctrl.getCampaignById);
router.get('/:id/applications', authorize('brand'), ctrl.getCampaignApplications);

router.post('/', authorize('brand'),
  [body('title').notEmpty(), body('budget').isNumeric(), body('platform').notEmpty()],
  validate, ctrl.createCampaign
);
router.put('/:id', authorize('brand'), ctrl.updateCampaign);
router.delete('/:id', authorize('brand'), ctrl.deleteCampaign);

router.post('/:id/apply', authorize('influencer'),
  [body('proposal').isLength({ min: 50 })],
  validate, ctrl.applyToCampaign
);
router.put('/applications/:applicationId/status', authorize('brand'),
  [body('status').isIn(['accepted', 'rejected'])],
  validate, ctrl.updateApplicationStatus
);

module.exports = router;
