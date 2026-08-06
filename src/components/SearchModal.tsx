import React, { useState } from "react";
import { Search, X, ArrowRight } from "lucide-react";
import { Product } from "../types";
import { getOptimizedImageUrl } from "../lib/imageOptimizer";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
  currency: "MXN" | "USD" | "CAD";
}

export default function SearchModal({
  isOpen,
  onClose,
  products,
  onSelectProduct,
  currency
}: SearchModalProps) {
  const [query, setQuery] = useState("");

  if (!isOpen) return null;

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.description.toLowerCase().includes(query.toLowerCase())
  );

  const formatPrice = (priceMXN: number) => {
    let price = priceMXN;
    let symbol = "$";
    let suffix = "MXN";

    if (currency === "USD") {
      price = priceMXN / 20;
    } else if (currency === "CAD") {
      price = priceMXN / 14.5;
    }

    return `${symbol} ${price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} ${currency}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-sm cursor-pointer"
      />

      {/* Cmdk search box */}
      <div className="relative bg-neutral-950 border border-neutral-800 rounded-lg max-w-xl w-full text-white shadow-2xl z-10 overflow-hidden flex flex-col">
        {/* Input box */}
        <div className="flex items-center px-4 py-3.5 border-b border-neutral-900 gap-3">
          <Search size={18} className="text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar modelo, colección o especificación..."
            className="flex-1 bg-transparent border-none text-white text-xs placeholder-gray-500 focus:outline-none focus:ring-0 uppercase tracking-widest"
            autoFocus
          />
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 hover:bg-white/5 rounded transition-all"
            aria-label="Cerrar búsqueda"
          >
            <X size={15} />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto max-h-[300px] p-2 space-y-1">
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-xs tracking-widest uppercase">
              No se han encontrado resultados.
            </div>
          ) : (
            filteredProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  onSelectProduct(p);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-2 rounded hover:bg-white/5 text-left transition-colors duration-200 group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black rounded border border-neutral-900 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    <img
                      src={getOptimizedImageUrl(p.images?.[0], 100)}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold tracking-wider text-white uppercase group-hover:text-gray-200 transition-colors">
                      {p.name}
                    </h4>
                    <span className="text-[9px] text-gray-500 tracking-widest uppercase">
                      {p.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <span className="font-bold text-gray-400">{formatPrice(p.priceMXN)}</span>
                  <ArrowRight size={12} className="text-gray-600 group-hover:text-white transition-colors duration-200" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Search Footer */}
        <div className="px-4 py-2 bg-neutral-950/60 border-t border-neutral-900 flex justify-between items-center text-[9px] text-gray-500 tracking-widest uppercase">
          <span>{filteredProducts.length} Resultados Encontrados</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 rounded font-sans">ESC</kbd>
            <span>para salir</span>
          </span>
        </div>
      </div>
    </div>
  );
}
