import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RecentTransactions({ onDelete }) {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [expanded, setExpanded] = useState(null);

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/_/backend/api/transactions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setTransactions(data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [token]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sorted = [...transactions].sort((a, b) => {
      if (key === 'date') {
        return direction === 'asc' ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date);
      }
      if (key === 'amount') {
        return direction === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
      return direction === 'asc' ? a[key].localeCompare(b[key]) : b[key].localeCompare(a[key]);
    });
    setTransactions(sorted);
  };

  const toggleExpand = (id) => setExpanded(expanded === id ? null : id);

  const amountColor = (amount) => amount >= 0 ? 'text-green-400' : 'text-red-400';

  if (loading) return <div>Loading transactions...</div>;
  if (error) return <div className="text-red-400">{error}</div>;
  if (transactions.length === 0) return <div className="text-slate-400">No transactions yet. Add some!</div>;

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-lg mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-white">Recent Transactions</h3>
        <button onClick={fetchTransactions} className="text-sm text-slate-400 hover:text-white">Refresh</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 cursor-pointer hover:text-indigo-400" onClick={() => handleSort('date')}>
                Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
              </th>
              <th className="text-left py-3 cursor-pointer hover:text-indigo-400" onClick={() => handleSort('description')}>
                Description {sortConfig.key === 'description' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
              </th>
              <th className="text-right py-3 cursor-pointer hover:text-indigo-400" onClick={() => handleSort('amount')}>
                Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
              </th>
              <th className="text-left py-3">Category</th>
              <th className="text-right py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {transactions.slice(0, 10).map((transaction, index) => (
                <motion.tr
                  key={transaction.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-slate-800 hover:bg-slate-700/50 transition-colors"
                >
                  <td className="py-3">{new Date(transaction.date).toLocaleDateString()}</td>
                  <td className="py-3">
                    <div>
                      <div className="font-medium">{transaction.description}</div>
                      <button onClick={() => toggleExpand(transaction.id)} className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        Details {expanded === transaction.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    <span className={`font-semibold ${amountColor(transaction.amount)}`}>
                      ${Math.abs(transaction.amount).toFixed(2)}
                      {transaction.amount < 0 ? '-' : '+'}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-1 bg-slate-700 text-xs rounded-full">{transaction.category}</span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onDelete(transaction.id)} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      {transactions.length > 10 && (
        <div className="mt-4 text-center text-sm text-slate-400">
          Showing 10 of {transactions.length} transactions
        </div>
      )}
    </div>
  );
}

