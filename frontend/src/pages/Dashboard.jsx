import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, AlertTriangle, Wallet, ClipboardList, Truck, Users, Building2, Warehouse, FileText } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const currency = (n) => Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const CARD_STYLES = {
  blue: 'badge-blue',
  orange: 'badge-orange',
  teal: 'badge-teal',
  red: 'badge-red',
  purple: 'badge-purple',
  green: 'badge-green',
};

function StatCard({ label, value, icon: Icon, tone = 'blue' }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
      <div className={`badge-icon ${CARD_STYLES[tone]}`}>
        <Icon size={19} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/dashboard/summary')
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="text-destructive text-sm">{error}</p>;
  if (!summary) return <p className="text-muted-foreground text-sm">Cargando…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl bg-gradient-to-r from-[#1d3a8f] via-[#2a4fc2] to-[#3b6bf0] p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-16 bottom-0 w-32 h-32 rounded-full bg-white/10 blur-xl" />
        <p className="text-white/70 text-sm">Bienvenido de nuevo</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight mt-1">{user?.name}</h1>
        <p className="text-white/70 text-sm mt-2 max-w-md">
          Este es el estado actual de inventario, compras y pedidos de Bridacero del Centro.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Productos activos" value={summary.totalProducts} icon={Boxes} tone="blue" />
        <StatCard label="Stock bajo" value={summary.lowStockCount} icon={AlertTriangle} tone="red" />
        <StatCard label="Valor de inventario" value={currency(summary.inventoryValue)} icon={Wallet} tone="teal" />
        <StatCard label="Órdenes de compra abiertas" value={summary.openPurchaseOrders} icon={ClipboardList} tone="orange" />
        <StatCard label="Pedidos abiertos" value={summary.openSalesOrders} icon={Truck} tone="purple" />
        <StatCard label="Proveedores" value={summary.totalSuppliers} icon={Building2} tone="green" />
        <StatCard label="Clientes" value={summary.totalCustomers} icon={Users} tone="blue" />
        <StatCard label="Almacenes" value={summary.totalWarehouses} icon={Warehouse} tone="teal" />
      </div>

      {summary.openQuotes > 0 && (
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
          <div className="badge-icon badge-orange shrink-0">
            <FileText size={17} />
          </div>
          <p className="text-sm text-foreground">
            Tienes <span className="font-semibold">{summary.openQuotes}</span> cotización(es) pendientes de respuesta.
          </p>
          <Link to="/cotizaciones" className="ml-auto text-xs font-medium text-primary hover:underline shrink-0">
            Ver cotizaciones →
          </Link>
        </div>
      )}

      {summary.lowStockCount > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
            <AlertTriangle size={14} className="text-warning" />
            <p className="text-sm font-semibold text-foreground">Productos con stock bajo</p>
          </div>
          <ul className="divide-y divide-border">
            {summary.lowStockProducts.map((p) => (
              <li key={p.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.sku}</p>
                </div>
                <p className="text-warning font-medium text-sm">
                  {Number(p.stock)} / {Number(p.minStock)} {p.unit}
                </p>
              </li>
            ))}
          </ul>
          <div className="px-5 py-3 border-t border-border">
            <Link to="/inventario?lowStock=true" className="text-xs font-medium text-primary hover:underline">
              Ver inventario con stock bajo →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
