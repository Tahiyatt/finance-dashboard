import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Download, Plus, Edit2, Trash2, LogOut, User } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function FinanceDashboard() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Food',
    type: 'expense',
    date: new Date().toISOString().split('T')[0]
  });

  const categories = ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Salary', 'Other'];

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
      fetchTransactions(token);
    }
  }, []);

  const fetchTransactions = async (token) => {
    try {
      const response = await fetch(`${API_URL}/transactions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
    const body = authMode === 'login' 
      ? { email, password }
      : { name, email, password };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        fetchTransactions(data.token);
      } else {
        alert('Authentication failed');
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert('Server connection failed. Using demo mode with local storage.');
      
      // Demo mode fallback
      const demoUser = { id: 1, name: name || 'Demo User', email };
      setUser(demoUser);
      localStorage.setItem('user', JSON.stringify(demoUser));
      const saved = localStorage.getItem('demoTransactions');
      if (saved) setTransactions(JSON.parse(saved));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setTransactions([]);
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem('token');
    
    const transaction = {
      ...formData,
      amount: parseFloat(formData.amount),
      userId: user.id
    };

    try {
      if (editingId) {
        const response = await fetch(`${API_URL}/transactions/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(transaction)
        });

        if (response.ok) {
          const updated = await response.json();
          setTransactions(transactions.map(t => t.id === editingId ? updated : t));
        }
      } else {
        const response = await fetch(`${API_URL}/transactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(transaction)
        });

        if (response.ok) {
          const newTransaction = await response.json();
          setTransactions([...transactions, newTransaction]);
        }
      }
    } catch (error) {
      // Demo mode fallback
      if (editingId) {
        setTransactions(transactions.map(t => 
          t.id === editingId ? { ...transaction, id: editingId } : t
        ));
      } else {
        const newTransaction = { ...transaction, id: Date.now() };
        const updated = [...transactions, newTransaction];
        setTransactions(updated);
        localStorage.setItem('demoTransactions', JSON.stringify(updated));
      }
    }

    setShowModal(false);
    setEditingId(null);
    setFormData({
      description: '',
      amount: '',
      category: 'Food',
      type: 'expense',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_URL}/transactions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setTransactions(transactions.filter(t => t.id !== id));
      }
    } catch (error) {
      // Demo mode fallback
      const updated = transactions.filter(t => t.id !== id);
      setTransactions(updated);
      localStorage.setItem('demoTransactions', JSON.stringify(updated));
    }
  };

  const handleEdit = (transaction) => {
    setEditingId(transaction.id);
    setFormData({
      description: transaction.description,
      amount: transaction.amount.toString(),
      category: transaction.category,
      type: transaction.type,
      date: transaction.date
    });
    setShowModal(true);
  };

  const exportCSV = () => {
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount'];
    const rows = transactions.map(t => [
      t.date, t.description, t.category, t.type, t.amount
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const categoryData = categories.map(cat => ({
    name: cat,
    value: transactions.filter(t => t.category === cat && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
  })).filter(d => d.value > 0);

  const monthlyData = transactions.reduce((acc, t) => {
    const month = t.date.substring(0, 7);
    if (!acc[month]) acc[month] = { month, income: 0, expense: 0 };
    acc[month][t.type] += t.amount;
    return acc;
  }, {});

  const chartData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Finance Tracker</h1>
            <p className="text-gray-600 mt-2">Manage your personal finances</p>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 rounded-lg font-semibold ${authMode === 'login' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-2 rounded-lg font-semibold ${authMode === 'register' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Register
            </button>
          </div>

          <div className="space-y-4">
            {authMode === 'register' && (
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAuth}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>

          <p className="text-sm text-gray-500 mt-4 text-center">
            Demo mode: Works without backend server
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <DollarSign className="text-blue-600" size={28} />
            <h1 className="text-2xl font-bold text-gray-800">Finance Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-700">
              <User size={20} />
              <span className="font-medium">{user.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Balance</p>
                <p className={`text-3xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${balance.toFixed(2)}
                </p>
              </div>
              <div className={`p-3 rounded-full ${balance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <DollarSign className={balance >= 0 ? 'text-green-600' : 'text-red-600'} size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Income</p>
                <p className="text-3xl font-bold text-green-600">${totalIncome.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <TrendingUp className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Expenses</p>
                <p className="text-3xl font-bold text-red-600">${totalExpense.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <TrendingDown className="text-red-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            <Plus size={20} />
            Add Transaction
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
          >
            <Download size={20} />
            Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Monthly Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Spending by Category</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Recent Transactions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.slice().reverse().map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{transaction.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{transaction.description}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{transaction.category}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm font-semibold ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${transaction.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {editingId ? 'Edit Transaction' : 'Add Transaction'}
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Amount"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  {editingId ? 'Update' : 'Add'}
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                    setFormData({
                      description: '',
                      amount: '',
                      category: 'Food',
                      type: 'expense',
                      date: new Date().toISOString().split('T')[0]
                    });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}