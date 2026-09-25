const STYLES = {
  PENDIENTE: 'bg-warning/15 text-warning border-warning/20',
  PARCIAL: 'bg-secondary text-secondary-foreground border-border',
  SURTIDO_PARCIAL: 'bg-secondary text-secondary-foreground border-border',
  RECIBIDA: 'bg-success/12 text-success border-success/20',
  SURTIDO: 'bg-success/12 text-success border-success/20',
  CANCELADA: 'bg-destructive/10 text-destructive border-destructive/20',
  CANCELADO: 'bg-destructive/10 text-destructive border-destructive/20',
};

const LABELS = {
  PENDIENTE: 'Pendiente',
  PARCIAL: 'Recepción parcial',
  SURTIDO_PARCIAL: 'Surtido parcial',
  RECIBIDA: 'Recibida',
  SURTIDO: 'Surtido',
  CANCELADA: 'Cancelada',
  CANCELADO: 'Cancelado',
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
        STYLES[status] || 'bg-secondary text-secondary-foreground border-border'
      }`}
    >
      {LABELS[status] || status}
    </span>
  );
}
