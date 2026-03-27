import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <>
      {/* Global Logout Button - visible only when logged in */}
      {user && (
        <div className="fixed top-0 right-0 p-6 z-50 bg-slate-900/80 backdrop-blur-sm">
          <span className="text-slate-400 mr-4 text-sm">Hello, {user}</span>
          <button 
            onClick={logout}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      )}

      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
      </Routes>
    </>
  );
}

export default App;