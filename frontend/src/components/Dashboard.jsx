import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ShieldCheck, AlertTriangle, Lightbulb, ShoppingBag, UtensilsCrossed, PiggyBank, AlertCircle } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { useAuth } from '../AuthContext';
import AddTransaction from './AddTransaction';
import RecentTransactions from './RecentTransactions';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

function Dashboard() {
  const { token } = useAuth();
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
fetch(`https://ishika1608.pythonanywhere.com/api/insights`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setFinancialData(data);
      } else {
        setError(data.error || "Failed to load data");
        setFinancialData(null);
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xl">Loading Dashboard...</div>;

  // Helper to render empty state nicely
  const renderEmptyState = () => (
    <div className="text-center py-20">
      <h2 className="text-2xl font-bold text-white mb-4">No Transactions Found</h2>
      <p className="text-slate-400 mb-8">Add your first transaction below to get started!</p>
      <AddTransaction onAdd={fetchData} />
    </div>
  );

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 p-6 md:p-10">
        <div className="max-w-7xl mx-auto">
          {renderEmptyState()}
        </div>
      </div>
    );
  }

  // Normal Dashboard Render
  const { summary, spending_by_category, recommendations, balance_timeline } = financialData;

  const chartLabels = Object.keys(spending_by_category);
  const chartDataPoints = Object.values(spending_by_category);
  const colorPalette = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'];
  
  const doughnutData = {
    labels: chartLabels,
    datasets: [{ data: chartDataPoints, backgroundColor: colorPalette, borderColor: '#1e293b', borderWidth: 4, hoverOffset: 10 }],
  };
  const doughnutOptions = { 
    responsive: true, 
    maintainAspectRatio: false, 
    plugins: { legend: { position: 'right', labels: { color: '#cbd5e1', font: { size: 14 }, padding: 20 } } }, 
    cutout: '70%' 
  };

  const lineLabels = balance_timeline.map(item => item.date);
  const lineDataPoints = balance_timeline.map(item => item.running_balance);
  const lineData = {
    labels: lineLabels,
    datasets: [{ 
      label: 'Balance', 
      data: lineDataPoints, 
      borderColor: '#22c55e', 
      backgroundColor: 'rgba(34, 197, 94, 0.1)', 
      tension: 0.4, 
      fill: true, 
      pointBackgroundColor: '#22c55e', 
      pointBorderColor: '#fff', 
      pointHoverRadius: 7 
    }]
  };
  const lineOptions = {
    responsive: true, 
    maintainAspectRatio: false,
    scales: { 
      y: { 
        grid: { color: 'rgba(255, 255, 255, 0.1)' }, 
        ticks: { color: '#94a3b8', callback: (value) => '$' + value } 
      }, 
      x: { grid: { display: false }, ticks: { color: '#94a3b8' } } 
    },
    plugins: { 
      legend: { display: false }, 
      tooltip: { 
        backgroundColor: '#1e293b', 
        titleColor: '#fff', 
        bodyColor: '#fff', 
        borderColor: '#334155', 
        borderWidth: 1 
      } 
    }
  };

  const getRiskColorClass = (color) => {
    if (color === 'green') return 'text-green-400 bg-green-400/10';
    if (color === 'yellow') return 'text-yellow-400 bg-yellow-400/10';
    return 'text-red-400 bg-red-400/10';
  };
  const renderIcon = (iconName) => {
    const props = { className: "w-5 h-5" };
    switch (iconName) { 
      case 'alert': return <AlertCircle {...props} />; 
      case 'utensils': return <UtensilsCrossed {...props} />; 
      case 'shopping-bag': return <ShoppingBag {...props} />; 
      case 'savings': return <PiggyBank {...props} />; 
      default: return <Lightbulb {...props} />; 
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-white">Financial Health</h1>
          <p className="text-slate-400 mt-1">Your personal cashflow assistant</p>
        </div>

        <AddTransaction onAdd={fetchData} />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-lg hover:border-slate-600 hover:scale-[1.02] transition-all backdrop-blur-sm"
            whileHover={{ y: -4 }}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">Total Income</p>
                <p className="text-3xl font-bold text-white">${summary.total_income.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">+12.5% from last month</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-lg hover:border-slate-600 hover:scale-[1.02] transition-all backdrop-blur-sm"
            whileHover={{ y: -4 }}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">Total Expenses</p>
                <p className="text-3xl font-bold text-white">${summary.total_expense.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-red-500/20 rounded-xl">
                <TrendingDown className="w-6 h-6 text-red-400" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">↑8.2% from last month</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-lg hover:border-slate-600 hover:scale-[1.02] transition-all backdrop-blur-sm"
            whileHover={{ y: -4 }}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">Net Savings</p>
                <p className="text-3xl font-bold text-white">${summary.net_savings.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">Great progress!</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-lg hover:border-slate-600 hover:scale-[1.02] transition-all backdrop-blur-sm"
            whileHover={{ y: -4 }}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">Health Status</p>
                <p className={`text-3xl font-bold mt-1 ${getRiskColorClass(summary.risk_color).split(' ')[0]}`}>{summary.risk_status}</p>
              </div>
              <div className={`p-3 rounded-xl ${getRiskColorClass(summary.risk_color).split(' ')[1]}`}>
                {summary.risk_color === 'green' ? <ShieldCheck className={`w-6 h-6 ${getRiskColorClass(summary.risk_color).split(' ')[0]}`} /> : <AlertTriangle className={`w-6 h-6 ${getRiskColorClass(summary.risk_color).split(' ')[0]}`} />}
              </div>
            </div>
          </motion.div>
        </div>

        <RecentTransactions onDelete={(id) => fetchData()} />

        {/* Timeline Chart */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-lg mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Cashflow Timeline</h3>
          <div className="h-64 w-full"><Line data={lineData} options={lineOptions} /></div>
        </div>

        {/* Doughnut + Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-6">Spending Breakdown</h3>
            <div className="h-80 w-full relative"><Doughnut data={doughnutData} options={doughnutOptions} /></div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-6">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              <h3 className="text-lg font-semibold text-white">Smart Insights</h3>
            </div>
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
                  <div className={`mt-1 ${rec.icon === 'savings' ? 'text-green-400' : 'text-yellow-400'}`}>{renderIcon(rec.icon)}</div>
                  <div><h4 className="font-semibold text-white">{rec.text}</h4><p className="text-sm text-slate-400 mt-1">{rec.detail}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;

