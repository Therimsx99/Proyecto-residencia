import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Purchases from './pages/Purchases';
import Orders from './pages/Orders';
import Quotes from './pages/Quotes';
import PriceLists from './pages/PriceLists';
import Warehouses from './pages/Warehouses';
import Reports from './pages/Reports';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/inventario" element={<Inventory />} />
            <Route path="/compras" element={<Purchases />} />
            <Route path="/pedidos" element={<Orders />} />
            <Route path="/cotizaciones" element={<Quotes />} />
            <Route path="/listas-precios" element={<PriceLists />} />
            <Route path="/almacenes" element={<Warehouses />} />
            <Route path="/reportes" element={<Reports />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
