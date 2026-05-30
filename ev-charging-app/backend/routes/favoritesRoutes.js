const express = require('express');
const router = express.Router();
const {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite,
  adoptAndFavorite,
} = require('../controllers/favoritesController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getFavorites);
router.post('/adopt', protect, adoptAndFavorite);
router.post('/:stationId', protect, addFavorite);
router.delete('/:stationId', protect, removeFavorite);
router.get('/check/:stationId', protect, checkFavorite);

module.exports = router;
