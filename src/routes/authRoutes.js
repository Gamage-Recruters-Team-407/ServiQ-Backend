const router = require('express').Router();
const auth = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');

router.post('/register', auth.register);
router.post('/login', auth.login);
router.get('/me', authenticate, auth.me);

module.exports = router;
