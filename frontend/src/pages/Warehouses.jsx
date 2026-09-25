import { useEffect, useState } from 'react';
import { Plus, Warehouse as WarehouseIcon } from 'lucide-react';
import { api } from '../api/client';
import Modal from '../components/Modal';

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setWarehouses(await api.get('/warehouses'));
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
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Almacenes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Ubicaciones donde se guarda inventario</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-3.5 py-2 rounded-md hover:opacity-90 transition"
        >
          <Plus size={15} />
          Nuevo almacén
        </button>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {loading ? (
        <p className="text-muted-foreground text-sm">Cargando…</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {warehouses.map((w) => (
            <div key={w.id} className="bg-card rounded-xl border border-border p-5 flex gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <WarehouseIcon size={16} className="text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">{w.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{w.code}</p>
                {w.address && <p className="text-xs text-muted-foreground mt-1">{w.address}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <WarehouseForm
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function WarehouseForm({ onClose, onCreated }) {
  const [form, setForm] = useState({ code: '', name: '', address: '' });
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/warehouses', form);
      onCreated();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal title="Nuevo almacén" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input required placeholder="Código (ej. ALM-02)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="input" />
        <input required placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
        <input placeholder="Dirección" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" />
        {error && <p className="text-destructive text-sm">{error}</p>}
        <button type="submit" className="bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium hover:opacity-90 transition">
          Guardar
        </button>
      </form>
    </Modal>
  );
}
