import { useEffect, useState } from 'react';
import { Plus, Tags } from 'lucide-react';
import { api } from '../api/client';
import Modal from '../components/Modal';

const currency = (n) => Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

export default function PriceLists() {
  const [priceLists, setPriceLists] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingList, setEditingList] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [pl, prod] = await Promise.all([api.get('/price-lists'), api.get('/products')]);
      setPriceLists(pl);
      setProducts(prod);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Listas de precios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Precios especiales por grupo de cliente</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-3.5 py-2 rounded-md hover:opacity-90 transition"
        >
          <Plus size={15} />
          Nueva lista
        </button>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {loading ? (
        <p className="text-muted-foreground text-sm">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {priceLists.map((pl) => (
            <div key={pl.id} className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Tags size={15} className="text-muted-foreground" />
                  <p className="font-medium text-foreground text-sm">{pl.name}</p>
                  <span className="text-xs text-muted-foreground">{pl.items.length} productos con precio especial</span>
                </div>
                <button onClick={() => setEditingList(pl)} className="text-xs font-medium text-primary hover:underline">
                  Editar precios
                </button>
              </div>
              {pl.items.length > 0 && (
                <ul className="mt-3 divide-y divide-border border-t border-border text-sm">
                  {pl.items.map((it) => (
                    <li key={it.id} className="py-1.5 flex justify-between">
                      <span className="text-muted-foreground">{it.product.name}</span>
                      <span className="text-foreground font-medium">{currency(it.price)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {priceLists.length === 0 && (
            <div className="bg-card rounded-xl border border-dashed border-border py-12 flex flex-col items-center gap-2">
              <Tags size={22} className="text-muted-foreground" strokeWidth={1.5} />
              <p className="text-muted-foreground text-sm">No hay listas de precios registradas.</p>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <PriceListForm
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {editingList && (
        <EditItemsForm
          priceList={editingList}
          products={products}
          onClose={() => setEditingList(null)}
          onSaved={() => {
            setEditingList(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function PriceListForm({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/price-lists', { name });
      onCreated();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal title="Nueva lista de precios" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input required placeholder="Nombre (ej. Lista mayoreo)" value={name} onChange={(e) => setName(e.target.value)} className="input" />
        {error && <p className="text-destructive text-sm">{error}</p>}
        <button type="submit" className="bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium hover:opacity-90 transition">
          Guardar
        </button>
      </form>
    </Modal>
  );
}

function EditItemsForm({ priceList, products, onClose, onSaved }) {
  const [prices, setPrices] = useState(() => {
    const map = {};
    for (const it of priceList.items) map[it.productId] = it.price;
    return map;
  });
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const items = Object.entries(prices)
      .filter(([, price]) => price !== '' && price != null)
      .map(([productId, price]) => ({ productId, price }));
    try {
      await api.put(`/price-lists/${priceList.id}/items`, { items });
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal title="Editar precios" description={priceList.name} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="max-h-80 overflow-y-auto flex flex-col gap-2 pr-1">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-foreground truncate">{p.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">lista: {currency(p.unitPrice)}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="—"
                value={prices[p.id] ?? ''}
                onChange={(e) => setPrices({ ...prices, [p.id]: e.target.value })}
                className="input w-24 shrink-0"
              />
            </div>
          ))}
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <button type="submit" className="bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium hover:opacity-90 transition">
          Guardar precios
        </button>
      </form>
    </Modal>
  );
}
