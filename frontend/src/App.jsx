import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';
import PageLayout from './components/layout/PageLayout';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Library from './pages/Library/Library';
import Sales from './pages/Sales/Sales';
import Inventory from './pages/Inventory/Inventory';
import Settings from './pages/Settings/Settings';

const ProtectedRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<ProtectedRoute><PageLayout /></ProtectedRoute>}>
            {/* Default Route */}
            <Route index element={<Dashboard />} />
            <Route path="sales/*" element={<Sales />} />
            <Route path="inventory/*" element={<Inventory />} />
            <Route path="library/*" element={<Library />} />
            <Route path="settings/*" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
