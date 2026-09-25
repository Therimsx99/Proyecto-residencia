import { useEffect, useState } from 'react';
import { Plus, FileText } from 'lucide-react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const currency = (n) => Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

export default function Quotes() {
  const [quotes, setQuotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [convertingQuote, setConvertingQuote] = useState(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [quotesData, customersData, productsData, warehousesData] = await Promise.all([
        api.get('/quotes'),
        api.get('/customers'),
        api.get('/products'),
        api.get('/warehouses'),
      ]);
      setQuotes(quotesData);
      setCustomers(customersData);
      setProducts(productsData);
      setWarehouses(warehousesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function transition(id, action) {
    await api.post(`/quotes/${id}/${action}`);
    loadAll();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Cotizaciones</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Propuestas de venta antes de convertirse en pedido</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-3.5 py-2 rounded-md hover:opacity-90 transition"
        >
          <Plus size={15} />
          Cotización
        </button>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {loading ? (
        <p className="text-muted-foreground text-sm">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {quotes.map((q) => (
            <div key={q.id} className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <p className="font-semibold text-foreground text-sm">{q.folio} · {q.customer.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Cotizada: {new Date(q.quoteDate).toLocaleDateString('es-MX')}
                    {q.validUntil && ` · Vigencia: ${new Date(q.validUntil).toLocaleDateString('es-MX')}`}
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <StatusBadge status={q.status} />
                  <span className="font-semibold text-foreground text-sm">{currency(q.total)}</span>
                </div>
              </div>

              <ul className="mt-3.5 divide-y divide-border text-sm border-t border-border">
                {q.items.map((it) => (
                  <li key={it.id} className="py-2 flex justify-between">
                    <span className="text-muted-foreground">{it.product.name}</span>
                    <span className="text-foreground font-medium">{Number(it.quantity)} {it.product.unit} × {currency(it.unitPrice)}</span>
                  </li>
                ))}
              </ul>

              {q.status === 'BORRADOR' && (
                <div className="mt-4 flex gap-3">
                  <button onClick={() => transition(q.id, 'send')} className="text-xs font-medium bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md hover:bg-secondary/70 transition">
                    Marcar como enviada
                  </button>
                </div>
              )}
              {q.status === 'ENVIADA' && (
                <div className="mt-4 flex gap-3">
                  <button onClick={() => transition(q.id, 'accept')} className="text-xs font-medium bg-success text-success-foreground px-3 py-1.5 rounded-md hover:opacity-90 transition">
                    Marcar como aceptada
                  </button>
                  <button onClick={() => transition(q.id, 'reject')} className="text-xs font-medium text-destructive hover:underline">
                    Rechazar
                  </button>
                </div>
              )}
              {q.status === 'ACEPTADA' && (
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => setConvertingQuote(q)}
                    className="text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:opacity-90 transition"
                  >
                    Convertir a pedido
                  </button>
                </div>
              )}
            </div>
          ))}
          {quotes.length === 0 && (
            <div className="bg-card rounded-xl border border-dashed border-border py-12 flex flex-col items-center gap-2">
              <FileText size={22} className="text-muted-foreground" strokeWidth={1.5} />
              <p className="text-muted-foreground text-sm">No hay cotizaciones registradas.</p>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <QuoteForm
          customers={customers}
          products={products}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            loadAll();
          }}
        />
      )}

      {convertingQuote && (
        <ConvertForm
          quote={convertingQuote}
          warehouses={warehouses}
          onClose={() => setConvertingQuote(null)}
          onConverted={() => {
            setConvertingQuote(null);
            loadAll();
          }}
        />
      )}
    </div>
  );
}

function QuoteForm({ customers, products, onClose, onCreated }) {
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ productId: products[0]?.id || '', quantity: '', unitPrice: '' }]);
  const [error, setError] = useState('');

  const selectedCustomer = customers.find((c) => String(c.id) === String(customerId));

  function priceFor(productId) {
    const product = products.find((p) => String(p.id) === String(productId));
    if (!product) return '';
    if (selectedCustomer?.priceList) {
      const override = selectedCustomer.priceList.items?.find((it) => String(it.productId) === String(productId));
      if (override) return override.price;
    }
    return product.unitPrice;
  }

  function updateItem(idx, patch) {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function handleProductChange(idx, productId) {
    updateItem(idx, { productId, unitPrice: priceFor(productId) });
  }

  function addItem() {
    setItems([...items, { productId: products[0]?.id || '', quantity: '', unitPrice: priceFor(products[0]?.id) }]);
  }

  function removeItem(idx) {
    setItems(items.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!customerId) return setError('Selecciona un cliente');
    try {
      await api.post('/quotes', { customerId, validUntil: validUntil || null, notes, items });
      onCreated();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal title="Nueva cotización" onClose={onClose}>
      {customers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Primero registra un cliente en Pedidos.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-sm flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">Cliente</span>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input">
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.priceList ? ` (${c.priceList.name})` : ''}</option>
              ))}
            </select>
          </label>
          <label className="text-sm flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">Vigencia hasta</span>
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="input" />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-foreground">Productos</span>
            {items.map((it, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select value={it.productId} onChange={(e) => handleProductChange(idx, e.target.value)} className="input flex-1">
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input required type="number" min="0.01" step="0.01" placeholder="Cant." value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} className="input w-20" />
                <input required type="number" min="0" step="0.01" placeholder="Precio" value={it.unitPrice} onChange={(e) => updateItem(idx, { unitPrice: e.target.value })} className="input w-24" />
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)} className="text-destructive text-lg px-1 leading-none">×</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addItem} className="text-xs font-medium text-primary hover:underline text-left">
              + Agregar producto
            </button>
          </div>

          <textarea placeholder="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={2} />

          {error && <p className="text-destructive text-sm">{error}</p>}
          <button type="submit" className="bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium hover:opacity-90 transition">
            Crear cotización
          </button>
        </form>
      )}
    </Modal>
  );
}

function ConvertForm({ quote, warehouses, onClose, onConverted }) {
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!warehouseId) return setError('Selecciona un almacén');
    try {
      await api.post('/orders', {
        customerId: quote.customerId,
        warehouseId,
        quoteId: quote.id,
        deliveryDate: deliveryDate || null,
        notes: quote.notes,
        items: quote.items.map((it) => ({ productId: it.productId, quantity: it.quantity, unitPrice: it.unitPrice })),
      });
      onConverted();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal title="Convertir a pedido" description={quote.folio} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="text-sm flex flex-col gap-1.5">
          <span className="text-xs font-medium text-foreground">Almacén de surtido</span>
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="input">
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm flex flex-col gap-1.5">
          <span className="text-xs font-medium text-foreground">Fecha de entrega</span>
          <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="input" />
        </label>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <button type="submit" className="bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium hover:opacity-90 transition">
          Crear pedido
        </button>
      </form>
    </Modal>
  );
}
