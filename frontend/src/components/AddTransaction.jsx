import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { Upload, Loader2 } from 'lucide-react';

export default function AddTransaction({ onAdd }) {
  const { token } = useAuth();
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // CSV Upload State
  const [csvFile, setCsvFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || !description || !amount) return alert("Please fill all fields");
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('http://127.0.0.1:5000/api/transactions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ date, description, amount })
      });

      if (res.ok) {
        // Clear form
        setDate('');
        setDescription('');
        setAmount('');
        // Notify Dashboard to refresh data
        onAdd();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to add transaction");
      }
    } catch (err) {
      console.error(err);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) return;

    setUploading(true);
    setUploadError('');
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('csv', csvFile);

      const res = await fetch('http://127.0.0.1:5000/api/upload-csv', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setCsvFile(null);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
        onAdd(); // Refresh dashboard
      } else {
        setUploadError(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
      setUploadError('Network error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-lg mb-6">
      <h3 className="text-lg font-semibold text-white mb-6">Quick Add Options</h3>
      
      {/* CSV Upload Section */}
      <div className="mb-6 p-4 bg-slate-900/50 border-2 border-dashed border-slate-600 rounded-xl hover:border-indigo-500 transition-colors">
        <label className="flex flex-col items-center justify-center w-full h-32 cursor-pointer group">
          <Upload className="w-10 h-10 text-slate-400 group-hover:text-indigo-400 transition-colors mb-2" />
          <span className="text-sm font-medium text-slate-300 group-hover:text-indigo-300">
            {csvFile ? csvFile.name : '📁 Upload Bank Statement CSV'}
          </span>
          <span className="text-xs text-slate-500 mt-1">Supports date,description,amount columns</span>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            className="hidden"
          />
        </label>
        {uploadError && <div className="text-red-400 mt-2 text-sm">{uploadError}</div>}
        {csvFile && (
          <button
            onClick={handleCsvUpload}
            disabled={uploading}
            className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload CSV'
            )}
          </button>
        )}
      </div>

      {uploadSuccess && (
        <div className="mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-300 text-sm font-medium flex items-center gap-2">
          ✅ CSV uploaded successfully! Dashboard will refresh.
        </div>
      )}

      {error && <div className="text-red-400 mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <input 
          type="date" 
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required
        />
        <input 
          type="text" 
          placeholder="Description (e.g., Salary, Rent)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required
        />
        <input 
          type="number" 
          placeholder="Amount (e.g., 3500 or -1200)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required
        />
        <button 
          type="submit"
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg py-2 transition-colors disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add'}
        </button>
      </form>
    </div>
  );
}
