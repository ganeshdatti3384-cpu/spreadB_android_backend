const router = require('express').Router();
const { authenticate, authorize, requireVerified } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const ctrl = require('../controllers/profileController');

router.use(authenticate, requireVerified);

router.get('/brand', authorize('brand'), ctrl.getBrandProfile);
router.post('/brand', authorize('brand'), upload.single('logo'), ctrl.createOrUpdateBrandProfile);

router.get('/influencer', authorize('influencer'), ctrl.getInfluencerProfile);
router.get('/influencer/:userId', ctrl.getInfluencerProfile);
router.post('/influencer', authorize('influencer'), upload.single('avatar'), ctrl.createOrUpdateInfluencerProfile);

router.post('/portfolio', authorize('influencer'), upload.single('media'), ctrl.addPortfolioItem);
router.delete('/portfolio/:id', authorize('influencer'), ctrl.deletePortfolioItem);

router.get('/influencers', authorize('brand', 'admin'), ctrl.browseInfluencers);

module.exports = router;
