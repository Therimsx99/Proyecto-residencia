import { useEffect, useState } from 'react';
import { Plus, PackageCheck } from 'lucide-react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const currency = (n) => Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [fulfillingOrder, setFulfillingOrder] = useState(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [ordersData, customersData, productsData] = await Promise.all([
        api.get('/orders'),
        api.get('/customers'),
        api.get('/products'),
      ]);
      setOrders(ordersData);
      setCustomers(customersData);
      setProducts(productsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Pedidos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Pedidos de venta a clientes</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCustomerForm(true)} className="bg-secondary text-secondary-foreground text-sm font-medium px-3.5 py-2 rounded-md hover:bg-secondary/70 transition">
            Nuevo cliente
          </button>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-3.5 py-2 rounded-md hover:opacity-90 transition">
            <Plus size={15} />
            Pedido
          </button>
        </div>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {loading ? (
        <p className="text-muted-foreground text-sm">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o) => (
            <div key={o.id} className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <p className="font-semibold text-foreground text-sm">{o.folio} · {o.customer.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pedido: {new Date(o.orderDate).toLocaleDateString('es-MX')}
                    {o.deliveryDate && ` · Entrega: ${new Date(o.deliveryDate).toLocaleDateString('es-MX')}`}
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <StatusBadge status={o.status} />
                  <span className="font-semibold text-foreground text-sm">{currency(o.total)}</span>
                </div>
              </div>

              <ul className="mt-3.5 divide-y divide-border text-sm border-t border-border">
                {o.items.map((it) => (
                  <li key={it.id} className="py-2 flex justify-between">
                    <span className="text-muted-foreground">{it.product.name}</span>
                    <span className="text-foreground font-medium">{Number(it.deliveredQty)} / {Number(it.quantity)} {it.product.unit}</span>
                  </li>
                ))}
              </ul>

              {(o.status === 'PENDIENTE' || o.status === 'SURTIDO_PARCIAL') && (
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => setFulfillingOrder(o)}
                    className="text-xs font-medium bg-success text-success-foreground px-3 py-1.5 rounded-md hover:opacity-90 transition"
                  >
                    Surtir pedido
                  </button>
                  <button
                    onClick={async () => {
                      await api.post(`/orders/${o.id}/cancel`);
                      loadAll();
                    }}
                    className="text-xs font-medium text-destructive hover:underline"
                  >
                    Cancelar pedido
                  </button>
                </div>
              )}
            </div>
          ))}
          {orders.length === 0 && (
            <div className="bg-card rounded-xl border border-dashed border-border py-12 flex flex-col items-center gap-2">
              <PackageCheck size={22} className="text-muted-foreground" strokeWidth={1.5} />
              <p className="text-muted-foreground text-sm">No hay pedidos registrados.</p>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <OrderForm
          customers={customers}
          products={products}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            loadAll();
          }}
        />
      )}

      {showCustomerForm && (
        <CustomerForm
          onClose={() => setShowCustomerForm(false)}
          onCreated={() => {
            setShowCustomerForm(false);
            loadAll();
          }}
        />
      )}

      {fulfillingOrder && (
        <FulfillForm
          order={fulfillingOrder}
          onClose={() => setFulfillingOrder(null)}
          onFulfilled={() => {
            setFulfillingOrder(null);
            loadAll();
          }}
        />
      )}
    </div>
  );
}

function CustomerForm({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', contactName: '', phone: '', email: '', address: '' });
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/customers', form);
      onCreated();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal title="Nuevo cliente" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input required placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
        <input placeholder="Contacto" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="input" />
        <input placeholder="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
        <input placeholder="Correo" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
        <input placeholder="Dirección" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" />
        {error && <p className="text-destructive text-sm">{error}</p>}
        <button type="submit" className="bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium hover:opacity-90 transition">
          Guardar
        </button>
      </form>
    </Modal>
  );
}

function OrderForm({ customers, products, onClose, onCreated }) {
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ productId: products[0]?.id || '', quantity: '', unitPrice: '' }]);
  const [error, setError] = useState('');

  function updateItem(idx, patch) {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems([...items, { productId: products[0]?.id || '', quantity: '', unitPrice: '' }]);
  }

  function removeItem(idx) {
    setItems(items.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!customerId) return setError('Selecciona un cliente');
    try {
      await api.post('/orders', { customerId, deliveryDate: deliveryDate || null, notes, items });
      onCreated();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal title="Nuevo pedido" onClose={onClose}>
      {customers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Primero registra un cliente.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-sm flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">Cliente</span>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input">
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">Fecha de entrega</span>
            <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="input" />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-foreground">Productos</span>
            {items.map((it, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select value={it.productId} onChange={(e) => updateItem(idx, { productId: e.target.value })} className="input flex-1">
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
            Crear pedido
          </button>
        </form>
      )}
    </Modal>
  );
}

function FulfillForm({ order, onClose, onFulfilled }) {
  const [quantities, setQuantities] = useState(
    Object.fromEntries(order.items.map((it) => [it.id, Number(it.quantity) - Number(it.deliveredQty)]))
  );
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const items = Object.entries(quantities)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([salesOrderItemId, deliveredQty]) => ({ salesOrderItemId, deliveredQty }));
    try {
      await api.post(`/orders/${order.id}/fulfill`, { items });
      onFulfilled();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal title="Surtir pedido" description={order.folio} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {order.items.map((it) => {
          const pending = Number(it.quantity) - Number(it.deliveredQty);
          return (
            <label key={it.id} className="text-sm flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground">
                {it.product.name} <span className="text-muted-foreground font-normal">(pendiente: {pending} {it.product.unit})</span>
              </span>
              <input
                type="number"
                min="0"
                max={pending}
                step="0.01"
                value={quantities[it.id]}
                onChange={(e) => setQuantities({ ...quantities, [it.id]: e.target.value })}
                className="input"
              />
            </label>
          );
        })}
        {error && <p className="text-destructive text-sm">{error}</p>}
        <button type="submit" className="bg-success text-success-foreground rounded-md py-2.5 text-sm font-medium hover:opacity-90 transition">
          Confirmar surtido
        </button>
      </form>
    </Modal>
  );
}
