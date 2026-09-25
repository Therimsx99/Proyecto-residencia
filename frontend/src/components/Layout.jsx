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
  Search,
  Bell,
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
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-sidebar">
        <div className="h-16 flex items-center gap-2.5 px-5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)]">
            <span className="text-white text-xs font-bold tracking-tight">BR</span>
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-foreground">Bridacero</p>
            <p className="text-[11px] text-sidebar-foreground">ERP · Operaciones</p>
          </div>
        </div>

        <p className="px-5 pt-5 pb-2 text-[10px] font-semibold tracking-widest text-sidebar-foreground/60 uppercase">Menú</p>
        <nav className="flex-1 px-3 flex flex-col gap-0.5 overflow-y-auto">
          {sidebarItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-sidebar-active text-primary'
                    : 'text-sidebar-foreground hover:bg-white/5 hover:text-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary" />}
                  <Icon size={17} strokeWidth={2} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 mt-2">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-white/5">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[12px] font-semibold text-primary shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-foreground truncate">{user?.name}</p>
              <p className="text-[11px] text-sidebar-foreground truncate">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              title="Cerrar sesión"
              className="text-sidebar-foreground hover:text-foreground transition-colors p-1"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between gap-3 px-4 md:px-6 border-b border-border bg-background sticky top-0 z-10">
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">BR</span>
            </div>
            <p className="text-sm font-semibold text-foreground">Bridacero</p>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 text-sm text-muted-foreground w-72">
            <Search size={15} />
            <span>Buscar en el sistema…</span>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <button className="relative text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-full hover:bg-card">
              <Bell size={18} />
              <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-destructive" />
            </button>
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-border">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[12px] font-semibold text-primary">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="leading-tight">
                <p className="text-[13px] font-medium text-foreground">{user?.name}</p>
                <p className="text-[11px] text-muted-foreground">{user?.role}</p>
              </div>
            </div>
            <button onClick={logout} className="md:hidden text-muted-foreground p-1">
              <LogOut size={17} />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar flex overflow-x-auto py-1 pb-[calc(env(safe-area-inset-bottom,0px)+4px)] z-10">
        {bottomItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3.5 py-1.5 rounded-md text-[10px] font-medium transition-colors shrink-0 ${
                isActive ? 'text-primary' : 'text-sidebar-foreground'
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
