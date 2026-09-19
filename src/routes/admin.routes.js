const { Router } = require('express');
const { adminAuth, localOnly, loginLimiter } = require('../middlewares/auth.middleware');
const c = require('../controllers/adminController');

const router = Router();

router.use(localOnly);
router.post('/login', loginLimiter, c.login);

router.use(adminAuth);

router.get('/info', c.info);
router.get('/overview', c.overview);

// Foydalanuvchilar
router.get('/users', c.listUsers);
router.get('/users/:id', c.getUser);
router.patch('/users/:id', c.updateUser);

// Amallar
router.get('/transactions', c.listTransactions);
router.get('/transactions/export', c.exportTransactions);
router.delete('/transactions/:id', c.deleteTransaction);

// Yo'nalishlar va kategoriyalar
router.get('/sectors', c.listSectors);
router.post('/sectors', c.createSector);
router.patch('/sectors/:id', c.updateSector);
router.delete('/sectors/:id', c.deleteSector);
router.post('/categories', c.createCategory);
router.patch('/categories/:id', c.updateCategory);
router.delete('/categories/:id', c.deleteCategory);

// Valyuta kurslari
router.get('/rates', c.listRates);
router.post('/rates/sync', c.syncRates);
router.patch('/rates/:code', c.updateRate);

// Ommaviy xabar
router.post('/broadcast', c.broadcast);

module.exports = router;
