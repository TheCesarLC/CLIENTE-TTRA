import React, { useState, useEffect } from "react";
import { X, Save, Edit, AlertCircle, ShoppingBag, DollarSign, Image as ImageIcon } from "lucide-react";
import { Product } from "../types";
import { ProductImageManager } from "./ProductImageManager";

interface ProductQuickEditDialogProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onSave: (updatedProduct: Product) => Promise<void>;
  onPreview: (updatedProduct: Product) => void;
}

export default function ProductQuickEditDialog({
  isOpen,
  product,
  onClose,
  onSave,
  onPreview
}: ProductQuickEditDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceMXN, setPriceMXN] = useState<number>(0);
  const [stockQuantity, setStockQuantity] = useState<number>(10);
  const [isCustomStock, setIsCustomStock] = useState(false);
  const [imagesList, setImagesList] = useState<string[]>([""]);
  const [outOfStock, setOutOfStock] = useState(false);
  const [badge, setBadge] = useState("");
  const [category, setCategory] = useState<"NIGHTMARES" | "SHADOWS IN THE DARKNESS" | "REST OF WORLD">("NIGHTMARES");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const PRESET_STOCKS = [0, 1, 2, 3, 5, 10, 15, 20, 25, 50, 100];

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || "");
      setPriceMXN(product.priceMXN);
      const qty = product.stockQuantity ?? 10;
      setStockQuantity(qty);
      setIsCustomStock(!PRESET_STOCKS.includes(qty));
      setImagesList(Array.isArray(product.images) && product.images.length > 0 ? product.images : [""]);
      setOutOfStock(product.outOfStock || false);
      setBadge(product.badge || "");
      setCategory(product.category || "NIGHTMARES");
      setError(null);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleFieldChange = (updates: Partial<Product>) => {
    const updated: Product = {
      ...product,
      name: updates.name !== undefined ? updates.name : name,
      description: updates.description !== undefined ? updates.description : description,
      priceMXN: updates.priceMXN !== undefined ? updates.priceMXN : priceMXN,
      stockQuantity: updates.stockQuantity !== undefined ? updates.stockQuantity : stockQuantity,
      outOfStock: updates.outOfStock !== undefined ? updates.outOfStock : outOfStock,
      badge: updates.badge !== undefined ? updates.badge : badge,
      category: updates.category !== undefined ? updates.category : category,
      images: updates.images !== undefined ? updates.images : imagesList
    };
    onPreview(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updatedProduct: Product = {
        ...product,
        name,
        description,
        priceMXN: Number(priceMXN),
        stockQuantity: Number(stockQuantity),
        outOfStock: Number(stockQuantity) === 0,
        badge: badge ? badge : undefined,
        category,
        images: imagesList.filter(Boolean).length > 0 ? imagesList.filter(Boolean) : [""]
      };
      await onSave(updatedProduct);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error al guardar la gorra.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-xl bg-neutral-950 border border-neutral-850 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        id="product-edit-modal-wrapper"
      >
        {/* Header toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-900 bg-neutral-950">
          <div className="flex items-center gap-2">
            <Edit size={16} className="text-emerald-400 animate-pulse" />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
              Editar Gorra: {product.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-neutral-900 transition-colors cursor-pointer"
            title="Cerrar"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">
              Nombre de la Gorra
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                handleFieldChange({ name: e.target.value });
              }}
              className="w-full bg-neutral-900 border border-neutral-800 focus:border-emerald-500 text-white text-xs px-4 py-3 rounded focus:outline-none transition-all uppercase font-medium tracking-wider"
              placeholder="Ex. ON DGAS"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">
              Descripción Corta
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                handleFieldChange({ description: e.target.value });
              }}
              rows={2}
              className="w-full bg-neutral-900 border border-neutral-800 focus:border-emerald-500 text-white text-xs px-4 py-3 rounded focus:outline-none transition-all uppercase placeholder-gray-650 font-medium tracking-wide"
              placeholder="Describir los materiales, visera o acabados..."
              required
            />
          </div>

          {/* Price MXN & Dropdown Stock Counter */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">
                  Precio en Pesos (MXN)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-550 text-xs font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={priceMXN ?? ""}
                    onChange={(e) => {
                      const price = parseFloat(e.target.value) || 0;
                      setPriceMXN(price);
                      handleFieldChange({ priceMXN: price });
                    }}
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-emerald-500 text-white text-xs pl-8 pr-4 py-3 rounded focus:outline-none transition-all font-bold"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Stock Counter Dropdown & Manual Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest block">
                    📦 Contador de Stock ({isCustomStock ? "Ingreso Manual" : "Desplegable"})
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomStock(!isCustomStock)}
                    className="text-[9px] font-black text-emerald-400 hover:underline uppercase tracking-wider cursor-pointer"
                  >
                    {isCustomStock ? "📋 Lista Desplegable" : "✏️ Otra Cantidad (Manual)"}
                  </button>
                </div>

                {isCustomStock ? (
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min="0"
                      value={stockQuantity}
                      onChange={(e) => {
                        const qty = Math.max(0, parseInt(e.target.value) || 0);
                        setStockQuantity(qty);
                        handleFieldChange({ stockQuantity: qty, outOfStock: qty === 0 });
                      }}
                      className="w-full bg-black border border-emerald-500/60 focus:border-emerald-400 text-emerald-300 font-extrabold text-xs px-4 py-3 rounded focus:outline-none transition-all pr-12"
                      placeholder="Ingresa la cantidad exacta..."
                      autoFocus
                    />
                    <span className="absolute right-3 text-[10px] text-emerald-400 font-black uppercase pointer-events-none">pzas</span>
                  </div>
                ) : (
                  <select
                    value={PRESET_STOCKS.includes(stockQuantity) ? stockQuantity : "custom"}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setIsCustomStock(true);
                      } else {
                        const qty = parseInt(e.target.value) || 0;
                        setStockQuantity(qty);
                        handleFieldChange({ stockQuantity: qty, outOfStock: qty === 0 });
                      }
                    }}
                    className="w-full bg-neutral-900 border border-emerald-500/50 focus:border-emerald-400 text-emerald-300 font-extrabold text-xs px-4 py-3 rounded focus:outline-none transition-all cursor-pointer uppercase"
                  >
                    <option value={0} className="bg-neutral-950 text-red-400 font-bold">0 piezas (AGOTADO)</option>
                    <option value={1} className="bg-neutral-950 text-white font-bold">1 pieza disponible</option>
                    <option value={2} className="bg-neutral-950 text-white font-bold">2 piezas disponibles</option>
                    <option value={3} className="bg-neutral-950 text-white font-bold">3 piezas disponibles</option>
                    <option value={5} className="bg-neutral-950 text-white font-bold">5 piezas disponibles</option>
                    <option value={10} className="bg-neutral-950 text-white font-bold">10 piezas disponibles</option>
                    <option value={15} className="bg-neutral-950 text-white font-bold">15 piezas disponibles</option>
                    <option value={20} className="bg-neutral-950 text-white font-bold">20 piezas disponibles</option>
                    <option value={25} className="bg-neutral-950 text-white font-bold">25 piezas disponibles</option>
                    <option value={50} className="bg-neutral-950 text-white font-bold">50 piezas disponibles</option>
                    <option value={100} className="bg-neutral-950 text-white font-bold">100 piezas disponibles</option>
                    {!PRESET_STOCKS.includes(stockQuantity) && (
                      <option value={stockQuantity} className="bg-neutral-950 text-emerald-300 font-bold">
                        {stockQuantity} piezas (Personalizado)
                      </option>
                    )}
                    <option value="custom" className="bg-neutral-950 text-emerald-400 font-black">
                      ✏️ OTRA CANTIDAD (Ingresar manualmente)...
                    </option>
                  </select>
                )}
              </div>
            </div>

            {/* Quick Price Presets */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[9px] text-gray-500 uppercase font-black tracking-wider">Atajos de Precio:</span>
              <button
                type="button"
                onClick={() => {
                  setPriceMXN(1);
                  handleFieldChange({ priceMXN: 1 });
                }}
                className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                ⚡ $1.00 MXN (Prueba)
              </button>
              <button
                type="button"
                onClick={() => {
                  setPriceMXN(1600);
                  handleFieldChange({ priceMXN: 1600 });
                }}
                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-gray-300 border border-neutral-700 rounded text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                🏷️ $1,600.00 MXN (Estándar)
              </button>
            </div>
          </div>

          {/* Image Manager */}
          <ProductImageManager
            images={imagesList}
            onChange={(newImgs) => {
              setImagesList(newImgs);
              handleFieldChange({ images: newImgs });
            }}
          />

          {/* Out of stock Toggle */}
          <div className="flex items-center justify-between p-4 bg-neutral-900/40 border border-neutral-900 rounded-lg">
            <div>
              <span className="text-xs font-black text-white uppercase tracking-wider">Estado: AGOTADO (Out of Stock)</span>
              <p className="text-[9px] text-gray-500 uppercase tracking-wide">Muestra el cartel de AGOTADO y deshabilita añadir al carrito</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOutOfStock(!outOfStock);
                handleFieldChange({ outOfStock: !outOfStock });
              }}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                outOfStock ? "bg-red-600" : "bg-neutral-800"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                  outOfStock ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Real-time preview snippet */}
          {imagesList[0] && (
            <div className="border border-neutral-900 p-3 bg-black/60 rounded flex items-center gap-3">
              <img
                src={imagesList[0]}
                alt="Product Preview resize"
                className="w-14 h-14 object-cover rounded bg-neutral-900 border border-neutral-800"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://placehold.co/100x100/000000/ffffff?text=Cap";
                }}
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[8px] text-gray-550 font-black uppercase tracking-widest block">Vista Previa de Tarjeta</span>
                <p className="text-xs text-white font-bold truncate uppercase tracking-widest">{name || "SIN NOMBRE"}</p>
                <p className="text-[10px] text-emerald-400 font-extrabold font-mono">${(priceMXN ?? 0).toLocaleString()} MXN — Stock: {stockQuantity} pzas</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-[10px] uppercase tracking-wider font-semibold">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-900 bg-neutral-950">
          <button
            onClick={() => {
              // Revert
              onPreview(product);
              onClose();
            }}
            className="px-4 py-2 border border-neutral-800 hover:bg-neutral-900 text-gray-400 hover:text-white text-[10px] font-bold uppercase tracking-widest rounded transition-all cursor-pointer"
            type="button"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 text-black disabled:text-gray-500 text-[10px] font-black uppercase tracking-widest rounded transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:scale-[1.02] cursor-pointer"
          >
            {saving ? (
              <>
                <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save size={12} />
                <span>Guardar Producto</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
