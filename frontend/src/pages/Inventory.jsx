import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import { api } from '../api/client';
import Modal from '../components/Modal';

const emptyProduct = {
  sku: '',
  name: '',
  category: '',
  unit: 'pieza',
  minStock: 0,
  unitCost: 0,
  unitPrice: 0,
  location: '',
};

export default function Inventory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get('lowStock') === 'true');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyProduct);
  const [formError, setFormError] = useState('');

  const [movementProduct, setMovementProduct] = useState(null);
  const [movement, setMovement] = useState({ type: 'ENTRADA', quantity: '', reason: '', reference: '' });
  const [movementError, setMovementError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (lowStockOnly) params.set('lowStock', 'true');
      const data = await api.get(`/products?${params.toString()}`);
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lowStockOnly]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    load();
  }

  function toggleLowStock() {
    const next = !lowStockOnly;
    setLowStockOnly(next);
    setSearchParams(next ? { lowStock: 'true' } : {});
  }

  async function handleCreateProduct(e) {
    e.preventDefault();
    setFormError('');
    try {
      await api.post('/products', form);
      setShowForm(false);
      setForm(emptyProduct);
      load();
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function handleRegisterMovement(e) {
    e.preventDefault();
    setMovementError('');
    try {
      await api.post(`/products/${movementProduct.id}/movements`, movement);
      setMovementProduct(null);
      setMovement({ type: 'ENTRADA', quantity: '', reason: '', reference: '' });
      load();
    } catch (err) {
      setMovementError(err.message);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Inventario</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{products.length} productos en catálogo</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-3.5 py-2 rounded-md hover:opacity-90 transition"
        >
          <Plus size={15} />
          Nuevo producto
        </button>
      </div>

      <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o SKU"
            className="input pl-9"
          />
        </div>
        <button type="submit" className="bg-secondary text-secondary-foreground text-sm font-medium px-3.5 py-2 rounded-md hover:bg-secondary/70 transition">
          Buscar
        </button>
        <button
          type="button"
          onClick={toggleLowStock}
          className={`inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-md border transition ${
            lowStockOnly
              ? 'bg-warning/15 text-warning border-warning/30'
              : 'bg-card text-muted-foreground border-border hover:bg-secondary/60'
          }`}
        >
          <AlertTriangle size={14} />
          Stock bajo
        </button>
      </form>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {loading ? (
        <p className="text-muted-foreground text-sm">Cargando…</p>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-muted-foreground text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Producto</th>
                  <th className="text-left px-5 py-3 font-medium">Categoría</th>
                  <th className="text-right px-5 py-3 font-medium">Stock</th>
                  <th className="text-right px-5 py-3 font-medium">Precio</th>
                  <th className="text-right px-5 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((p) => {
                  const low = Number(p.stock) <= Number(p.minStock);
                  return (
                    <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.sku} · {p.location || 'sin ubicación'}</p>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{p.category}</td>
                      <td className={`px-5 py-3 text-right font-medium ${low ? 'text-warning' : 'text-foreground'}`}>
                        {Number(p.stock)} {p.unit}
                      </td>
                      <td className="px-5 py-3 text-right text-muted-foreground">
                        {Number(p.unitPrice).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => setMovementProduct(p)}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Registrar movimiento
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground text-sm">
                      No se encontraron productos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <Modal title="Nuevo producto" description="Registra un artículo en el catálogo de inventario" onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreateProduct} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="SKU">
                <input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input" />
              </Field>
              <Field label="Categoría">
                <input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input" />
              </Field>
            </div>
            <Field label="Nombre">
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Unidad">
                <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="input" />
              </Field>
              <Field label="Stock mínimo">
                <input type="number" min="0" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} className="input" />
              </Field>
              <Field label="Costo unitario">
                <input type="number" min="0" step="0.01" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} className="input" />
              </Field>
              <Field label="Precio de venta">
                <input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} className="input" />
              </Field>
            </div>
            <Field label="Ubicación">
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input" />
            </Field>

            {formError && <p className="text-destructive text-sm">{formError}</p>}
            <button type="submit" className="bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium hover:opacity-90 transition">
              Guardar producto
            </button>
          </form>
        </Modal>
      )}

      {movementProduct && (
        <Modal title={`Movimiento de inventario`} description={movementProduct.name} onClose={() => setMovementProduct(null)}>
          <p className="text-sm text-muted-foreground mb-4">
            Stock actual: <span className="font-semibold text-foreground">{Number(movementProduct.stock)} {movementProduct.unit}</span>
          </p>
          <form onSubmit={handleRegisterMovement} className="flex flex-col gap-3">
            <Field label="Tipo de movimiento">
              <select value={movement.type} onChange={(e) => setMovement({ ...movement, type: e.target.value })} className="input">
                <option value="ENTRADA">Entrada</option>
                <option value="SALIDA">Salida</option>
                <option value="AJUSTE">Ajuste</option>
              </select>
            </Field>
            <Field label="Cantidad">
              <input required type="number" min="0.01" step="0.01" value={movement.quantity} onChange={(e) => setMovement({ ...movement, quantity: e.target.value })} className="input" />
            </Field>
            <Field label="Motivo">
              <input required value={movement.reason} onChange={(e) => setMovement({ ...movement, reason: e.target.value })} className="input" placeholder="Ej. Conteo cíclico, devolución, merma" />
            </Field>
            <Field label="Referencia (opcional)">
              <input value={movement.reference} onChange={(e) => setMovement({ ...movement, reference: e.target.value })} className="input" />
            </Field>

            {movementError && <p className="text-destructive text-sm">{movementError}</p>}
            <button type="submit" className="bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium hover:opacity-90 transition">
              Registrar movimiento
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-xs font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
