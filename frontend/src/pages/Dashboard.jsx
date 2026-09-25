import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, AlertTriangle, Wallet, ClipboardList, Truck, Users, Building2 } from 'lucide-react';
import { api } from '../api/client';

const currency = (n) => Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

function StatCard({ label, value, icon: Icon, tone = 'default' }) {
  const tones = {
    default: 'text-foreground',
    warn: 'text-warning',
  };
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon size={15} className="text-muted-foreground" strokeWidth={1.75} />
      </div>
      <p className={`text-2xl font-semibold tracking-tight ${tones[tone]}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
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
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Resumen general</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Estado actual de la operación de Bridacero del Centro</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Productos activos" value={summary.totalProducts} icon={Boxes} />
        <StatCard
          label="Stock bajo"
          value={summary.lowStockCount}
          icon={AlertTriangle}
          tone={summary.lowStockCount > 0 ? 'warn' : 'default'}
        />
        <StatCard label="Valor de inventario" value={currency(summary.inventoryValue)} icon={Wallet} />
        <StatCard label="Órdenes de compra abiertas" value={summary.openPurchaseOrders} icon={ClipboardList} />
        <StatCard label="Pedidos abiertos" value={summary.openSalesOrders} icon={Truck} />
        <StatCard label="Proveedores" value={summary.totalSuppliers} icon={Building2} />
        <StatCard label="Clientes" value={summary.totalCustomers} icon={Users} />
      </div>

      {summary.lowStockCount > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
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
