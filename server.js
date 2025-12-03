const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb+srv://zdabderrahmen_db_user:lwsgi6cA3ByFFYmN@angularcluster.qpnvofw.mongodb.net/?appName=AngularCluster', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// Transaction Schema
const transactionSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['income', 'expense']
    },
    description: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    currency: {
        type: String,
        default: 'USD'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// Budget Schema
const budgetSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'USD'
    },
    month: {
        type: String,
        default: () => {
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Budget = mongoose.model('Budget', budgetSchema);

// Routes

// Get all transactions with optional filters
app.get('/api/transactions', async (req, res) => {
    try {
        const { type, category } = req.query;
        const filter = {};
        
        if (type) filter.type = type;
        if (category) filter.category = category;
        
        const transactions = await Transaction.find(filter).sort({ date: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single transaction
app.get('/api/transactions/:id', async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        res.json(transaction);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create transaction
app.post('/api/transactions', async (req, res) => {
    const transaction = new Transaction({
        type: req.body.type,
        description: req.body.description,
        amount: req.body.amount,
        category: req.body.category,
        date: req.body.date,
        currency: req.body.currency || 'USD'
    });
    
    try {
        const newTransaction = await transaction.save();
        res.status(201).json(newTransaction);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update transaction
app.put('/api/transactions/:id', async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        
        Object.assign(transaction, req.body);
        const updatedTransaction = await transaction.save();
        res.json(updatedTransaction);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete transaction
app.delete('/api/transactions/:id', async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        
        await Transaction.deleteOne({ _id: req.params.id });
        res.json({ message: 'Transaction deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get statistics
app.get('/api/statistics', async (req, res) => {
    try {
        const transactions = await Transaction.find();
        
        let totalIncome = 0;
        let totalExpenses = 0;
        const categoryExpenses = {};
        
        transactions.forEach(t => {
            if (t.type === 'income') {
                totalIncome += t.amount;
            } else {
                totalExpenses += t.amount;
                categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
            }
        });
        
        res.json({
            totalIncome,
            totalExpenses,
            balance: totalIncome - totalExpenses,
            categoryExpenses
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Budget Routes

// Get current budget
app.get('/api/budget', async (req, res) => {
    try {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const budget = await Budget.findOne({ month: currentMonth }).sort({ createdAt: -1 });
        res.json(budget);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Set budget
app.post('/api/budget', async (req, res) => {
    try {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        // Delete old budget for current month
        await Budget.deleteMany({ month: currentMonth });
        
        const budget = new Budget({
            amount: req.body.amount,
            currency: req.body.currency || 'USD',
            month: currentMonth
        });
        
        const newBudget = await budget.save();
        res.status(201).json(newBudget);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});