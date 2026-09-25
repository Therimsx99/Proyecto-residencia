import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '../api/client';
import { exportCsv } from '../lib/exportCsv';

const currency = (n) => Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
const COLORS = ['#1e3a5f', '#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed'];

function Card({ title, action, children }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function Reports() {
  const [range, setRange] = useState(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  });
  const [sales, setSales] = useState(null);
  const [purchases, setPurchases] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const qs = `?from=${range.from}&to=${range.to}`;
      const [s, p, i] = await Promise.all([
        api.get(`/reports/sales${qs}`),
        api.get(`/reports/purchases${qs}`),
        api.get('/reports/inventory'),
      ]);
      setSales(s);
      setPurchases(p);
      setInventory(i);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <p className="text-destructive text-sm">{error}</p>;
  if (!sales || !purchases || !inventory) return <p className="text-muted-foreground text-sm">Cargando…</p>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Reportes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Ventas, compras e inventario</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          className="flex items-center gap-2"
        >
          <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} className="input" />
          <span className="text-muted-foreground text-sm">a</span>
          <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} className="input" />
          <button type="submit" className="bg-secondary text-secondary-foreground text-sm font-medium px-3.5 py-2 rounded-md hover:bg-secondary/70 transition">
            Aplicar
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card title="Ingresos por ventas">
          <p className="text-2xl font-semibold tracking-tight text-foreground">{currency(sales.totalRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">{sales.orderCount} pedidos</p>
        </Card>
        <Card title="Gasto en compras">
          <p className="text-2xl font-semibold tracking-tight text-foreground">{currency(purchases.totalSpend)}</p>
          <p className="text-xs text-muted-foreground mt-1">{purchases.orderCount} órdenes</p>
        </Card>
        <Card title="Valor de inventario">
          <p className="text-2xl font-semibold tracking-tight text-foreground">{currency(inventory.totalValue)}</p>
          <p className="text-xs text-muted-foreground mt-1">al costo</p>
        </Card>
        <Card title="Stock bajo">
          <p className="text-2xl font-semibold tracking-tight text-warning">{inventory.lowStockCount}</p>
          <p className="text-xs text-muted-foreground mt-1">productos por reponer</p>
        </Card>
      </div>

      <Card
        title="Ventas por día"
        action={
          <button
            onClick={() => exportCsv('ventas_por_dia.csv', sales.byDay)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <Download size={13} /> Exportar CSV
          </button>
        }
      >
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={sales.byDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
            <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
            <Tooltip formatter={(v) => currency(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Line type="monotone" dataKey="total" stroke="#1e3a5f" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid lg:grid-cols-2 gap-3">
        <Card
          title="Productos más vendidos"
          action={
            <button
              onClick={() => exportCsv('productos_mas_vendidos.csv', sales.topProducts)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <Download size={13} /> CSV
            </button>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={sales.topProducts} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
              <Tooltip formatter={(v) => currency(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="total" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card
          title="Valor de inventario por categoría"
          action={
            <button
              onClick={() => exportCsv('inventario_por_categoria.csv', inventory.byCategory)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <Download size={13} /> CSV
            </button>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={inventory.byCategory} dataKey="value" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={{ fontSize: 10 }}>
                {inventory.byCategory.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => currency(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        <Card
          title="Compras por proveedor"
          action={
            <button
              onClick={() => exportCsv('compras_por_proveedor.csv', purchases.bySupplier)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <Download size={13} /> CSV
            </button>
          }
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={purchases.bySupplier}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" hide />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <Tooltip formatter={(v) => currency(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="total" fill="#0891b2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card
          title="Rotación (salidas últimos 30 días)"
          action={
            <button
              onClick={() => exportCsv('rotacion_productos.csv', inventory.topMoving)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <Download size={13} /> CSV
            </button>
          }
        >
          {inventory.topMoving.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Sin movimientos de salida en el periodo.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={inventory.topMoving} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="qty" fill="#059669" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
