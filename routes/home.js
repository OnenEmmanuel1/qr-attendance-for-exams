const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const { isNotAuthenticated } = require('../middleware/auth');

router.get('/', isNotAuthenticated, homeController.getIndex);
router.get('/about', homeController.getAbout);
router.get('/contact', homeController.getContact);
router.post('/contact', homeController.postContact);

module.exports = router;
