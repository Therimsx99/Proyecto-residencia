import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutGrid,
  Boxes,
  ClipboardList,
  Truck,
  FileText,
  BarChart3,
  Warehouse,
  Tags,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Resumen', icon: LayoutGrid, end: true },
  { to: '/inventario', label: 'Inventario', icon: Boxes },
  { to: '/compras', label: 'Compras', icon: ClipboardList, roles: ['ADMIN', 'COMPRAS'] },
  { to: '/pedidos', label: 'Pedidos', icon: Truck, roles: ['ADMIN', 'VENTAS', 'ALMACEN'] },
  { to: '/cotizaciones', label: 'Cotizaciones', icon: FileText, roles: ['ADMIN', 'VENTAS'] },
  { to: '/listas-precios', label: 'Listas de precios', icon: Tags, roles: ['ADMIN', 'VENTAS'] },
  { to: '/almacenes', label: 'Almacenes', icon: Warehouse, roles: ['ADMIN', 'ALMACEN'] },
  { to: '/reportes', label: 'Reportes', icon: BarChart3 },
];

const mobileItems = [
  { to: '/', label: 'Resumen', icon: LayoutGrid, end: true },
  { to: '/inventario', label: 'Inventario', icon: Boxes },
  { to: '/compras', label: 'Compras', icon: ClipboardList, roles: ['ADMIN', 'COMPRAS'] },
  { to: '/pedidos', label: 'Pedidos', icon: Truck, roles: ['ADMIN', 'VENTAS', 'ALMACEN'] },
  { to: '/reportes', label: 'Reportes', icon: BarChart3 },
];

function visibleFor(items, role) {
  return items.filter((item) => !item.roles || item.roles.includes(role));
}

export default function Layout() {
  const { user, logout } = useAuth();
  const sidebarItems = visibleFor(navItems, user?.role);
  const bottomItems = visibleFor(mobileItems, user?.role);

  return (
    <div className="min-h-dvh flex bg-background">
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-border bg-card">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold tracking-tight">BR</span>
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-foreground">Bridacero</p>
            <p className="text-[11px] text-muted-foreground">ERP · Operaciones</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
          {sidebarItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                }`
              }
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-border">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[11px] font-semibold text-secondary-foreground shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-foreground truncate">{user?.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              title="Cerrar sesión"
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-14 flex items-center justify-between px-4 border-b border-border bg-card sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-[10px] font-bold">BR</span>
            </div>
            <p className="text-sm font-semibold text-foreground">Bridacero ERP</p>
          </div>
          <button onClick={logout} className="text-muted-foreground p-1">
            <LogOut size={17} />
          </button>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-8 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex overflow-x-auto py-1 pb-[calc(env(safe-area-inset-bottom,0px)+4px)] z-10">
        {bottomItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3.5 py-1.5 rounded-md text-[10px] font-medium transition-colors shrink-0 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`
            }
          >
            <Icon size={19} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
