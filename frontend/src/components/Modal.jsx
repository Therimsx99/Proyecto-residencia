import { X } from 'lucide-react';

export default function Modal({ title, description, onClose, children }) {
  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-[2px] flex items-end md:items-center justify-center z-20 p-0 md:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card rounded-t-2xl md:rounded-xl w-full md:max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl border border-border">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border sticky top-0 bg-card">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md p-1 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
