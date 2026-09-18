const { Router } = require('express');
const { telegramAuth } = require('../middlewares/auth.middleware');
const c = require('../controllers/clientController');

const router = Router();

router.use(telegramAuth);

// Profil
router.get('/bootstrap', c.bootstrap);
router.patch('/me', c.updateMe);

// Hisobotlar
router.get('/summary', c.summary);
router.get('/stats', c.stats);
router.get('/sectors/:id/summary', c.sectorDetail);
router.post('/export', c.exportExcel);

// Amallar (kirim / chiqim)
router.get('/transactions', c.listTransactions);
router.get('/transactions/:id', c.getTransaction);
router.post('/transactions', c.createTransaction);
router.patch('/transactions/:id', c.updateTransaction);
router.delete('/transactions/:id', c.deleteTransaction);

// Qarz daftari
router.get('/debts', c.listDebts);
router.post('/debts', c.createDebt);
router.patch('/debts/:id', c.updateDebt);
router.post('/debts/:id/pay', c.payDebt);
router.delete('/debts/:id', c.deleteDebt);

// Oylik reja
router.get('/budgets', c.getBudgets);
router.put('/budgets', c.saveBudgets);
router.post('/budgets/copy', c.copyBudgets);

// Valyuta kurslari
router.get('/rates', c.listRates);

module.exports = router;
