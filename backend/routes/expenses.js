const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const auth = require('../middleware/auth');
const { syncExpense, deleteFromMySQL } = require('../mysql_sync');

// GET /api/expenses - List all expenses with optional category and date filtering
router.get('/', auth, (req, res) => {
  try {
    const { category, startDate, endDate } = req.query;
    let expenses = db
      .get('expenses')
      .filter({ businessId: req.businessId })
      .value() || [];

    if (category && category !== 'ALL') {
      expenses = expenses.filter((e) => e.category?.toLowerCase() === category.toLowerCase());
    }

    if (startDate) {
      const start = new Date(startDate);
      expenses = expenses.filter((e) => new Date(e.date) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      expenses = expenses.filter((e) => new Date(e.date) <= end);
    }

    // Sort newest first
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching expenses', error: err.message });
  }
});

// GET /api/expenses/stats - Summary statistics by category & monthly totals
router.get('/stats', auth, (req, res) => {
  try {
    const expenses = db
      .get('expenses')
      .filter({ businessId: req.businessId })
      .value() || [];

    const totalExpense = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Group by category
    const categoryMap = {};
    expenses.forEach((e) => {
      const cat = e.category || 'Other';
      categoryMap[cat] = (categoryMap[cat] || 0) + (Number(e.amount) || 0);
    });

    const categoryBreakdown = Object.keys(categoryMap).map((cat) => ({
      category: cat,
      total: categoryMap[cat],
      percentage: totalExpense > 0 ? ((categoryMap[cat] / totalExpense) * 100).toFixed(1) : 0
    }));

    // This month expenses
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthExpense = expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    res.json({
      totalExpense,
      thisMonthExpense,
      categoryBreakdown,
      recentExpenses: expenses.slice(0, 5)
    });
  } catch (err) {
    res.status(500).json({ message: 'Error calculating expense stats', error: err.message });
  }
});

// POST /api/expenses - Add a new business expense
router.post('/', auth, (req, res) => {
  try {
    const { title, category, amount, paymentMode, date, receiptNo, notes } = req.body;

    if (!title || !amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Title and positive amount are required.' });
    }

    const newExpense = {
      id: uuidv4(),
      businessId: req.businessId,
      title: title.trim(),
      category: category || 'Miscellaneous',
      amount: parseFloat(amount),
      paymentMode: paymentMode || 'CASH',
      date: date || new Date().toISOString(),
      receiptNo: receiptNo ? receiptNo.trim() : '',
      notes: notes ? notes.trim() : '',
      createdAt: new Date().toISOString()
    };

    db.get('expenses').push(newExpense).write();
    syncExpense(newExpense);
    res.status(201).json(newExpense);
  } catch (err) {
    res.status(500).json({ message: 'Error adding expense', error: err.message });
  }
});

// DELETE /api/expenses/:id - Delete an expense record
router.delete('/:id', auth, (req, res) => {
  try {
    const expense = db
      .get('expenses')
      .find({ id: req.params.id, businessId: req.businessId })
      .value();

    if (!expense) {
      return res.status(404).json({ message: 'Expense record not found.' });
    }

    db.get('expenses')
      .remove({ id: req.params.id, businessId: req.businessId })
      .write();

    deleteFromMySQL('expenses', req.params.id);
    res.json({ message: 'Expense deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting expense', error: err.message });
  }
});

module.exports = router;
