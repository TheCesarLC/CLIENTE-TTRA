import React, { useState, useEffect, useRef } from "react";
import { X, ShoppingBag, ShieldCheck, Box, ChevronLeft, ChevronRight } from "lucide-react";
import { Product } from "../types";
import { getOptimizedImageUrl, preloadImages } from "../lib/imageOptimizer";

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity?: number) => void;
  currency: "MXN" | "USD" | "CAD";
  glowMode: boolean;
  glowColor?: string;
}

function hexToRgb(hex: string): string {
  const cleanHex = hex.replace("#", "");
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return `${r}, ${g}, ${b}`;
  }
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
  return "16, 185, 129"; // default
}

export default function ProductModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
  currency,
  glowMode,
  glowColor
}: ProductModalProps) {
  const [selectedImgIdx, setSelectedImgIndex] = useState(0);
  const [mainImgLoaded, setMainImgLoaded] = useState(false);
  const [selectedQty, setSelectedQty] = useState(1);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  const handleNextModalImg = () => {
    if (product && product.images && product.images.length > 0) {
      setMainImgLoaded(false);
      setSelectedImgIndex((prev) => (prev + 1) % product.images.length);
    }
  };

  const handlePrevModalImg = () => {
    if (product && product.images && product.images.length > 0) {
      setMainImgLoaded(false);
      setSelectedImgIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    touchEndX.current = null;
    touchEndY.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (
      touchStartX.current !== null &&
      touchEndX.current !== null &&
      touchStartY.current !== null &&
      touchEndY.current !== null
    ) {
      const deltaX = touchStartX.current - touchEndX.current;
      const deltaY = Math.abs(touchStartY.current - touchEndY.current);

      if (Math.abs(deltaX) > 30 && Math.abs(deltaX) > deltaY) {
        if (deltaX > 0) {
          handleNextModalImg();
        } else {
          handlePrevModalImg();
        }
      }
    }
  };

  // Preload all gallery images as soon as modal opens & reset quantity
  useEffect(() => {
    if (isOpen && product?.images?.length > 0) {
      preloadImages(product.images, 1000);
    }
    setMainImgLoaded(false);
    setSelectedQty(1);
  }, [isOpen, product]);

  const colorHex = glowColor || "#10b981";
  const rgb = hexToRgb(colorHex);

  if (!isOpen || !product) return null;

  const formatPrice = (priceMXN?: number) => {
    const val = priceMXN ?? 0;
    return `$ ${val.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} MXN`;
  };

  const glowsInDark = product.badge === "Glow in the Dark";
  const shouldGlow = glowMode && glowsInDark;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
      />

      {/* Modal Container */}
      <div className="relative bg-black/70 backdrop-blur-xl border border-white/15 rounded-xl max-w-4xl w-full text-white shadow-2xl z-10 flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white bg-black/60 p-2 rounded-full border border-white/10 hover:border-white/20 transition-all z-20 cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X size={18} />
        </button>

        {/* Left: Viewport Galleries */}
        <div className="md:w-1/2 flex flex-col bg-black/20 justify-between p-6 border-r border-white/10">
          <div 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex-1 flex items-center justify-center min-h-[300px] max-h-[450px] relative overflow-hidden rounded-md bg-black/30 border border-white/10 select-none touch-pan-y"
          >
            {!mainImgLoaded && (
              <div className="absolute inset-0 bg-neutral-950 animate-pulse flex items-center justify-center z-0">
                <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            )}
            {shouldGlow && (
              <div 
                className="absolute inset-0 mix-blend-screen animate-pulse pointer-events-none z-10" 
                style={{
                  background: `radial-gradient(circle at center, rgba(${rgb}, 0.25) 0%, transparent 75%)`
                }}
              />
            )}
            <img
              src={getOptimizedImageUrl(product.images?.[selectedImgIdx], 1000)}
              alt={product.name}
              loading="eager"
              decoding="async"
              onLoad={() => setMainImgLoaded(true)}
              className={`max-w-full max-h-full object-contain transition-transform duration-300 ${
                shouldGlow ? "brightness-[1.15] contrast-[1.1] saturate-[1.2]" : ""
              }`}
              referrerPolicy="no-referrer"
            />

            {/* Navigation Chevron Toggles on Mobile / Desktop */}
            {product.images.length > 1 && (
              <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between z-20 pointer-events-none">
                <button
                  type="button"
                  onClick={handlePrevModalImg}
                  className="w-9 h-9 rounded-full bg-black/80 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all border border-white/10 pointer-events-auto shadow-xl cursor-pointer"
                  aria-label="Anterior imagen"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={handleNextModalImg}
                  className="w-9 h-9 rounded-full bg-black/80 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all border border-white/10 pointer-events-auto shadow-xl cursor-pointer"
                  aria-label="Siguiente imagen"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>

          {/* Thumbnail list */}
          {product.images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto mt-4 py-1">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setMainImgLoaded(false);
                    setSelectedImgIndex(idx);
                  }}
                  className={`w-14 h-14 border rounded bg-black/30 backdrop-blur-xs flex-shrink-0 flex items-center justify-center overflow-hidden transition-all duration-300 cursor-pointer ${
                    idx === selectedImgIdx
                      ? "border-white"
                      : "border-neutral-800 opacity-60 hover:opacity-100"
                  }`}
                  style={
                    idx === selectedImgIdx && shouldGlow
                      ? {
                          borderColor: colorHex,
                          boxShadow: `0 0 10px ${colorHex}`
                        }
                      : undefined
                  }
                >
                  <img
                    src={getOptimizedImageUrl(img, 150)}
                    alt={`${product.name} miniatura ${idx + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Detailed Specification Panels */}
        <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-between overflow-y-auto max-h-[45vh] md:max-h-full">
          <div>
            <div className="space-y-2 mb-6">
              <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest">
                Colección Original
              </span>
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest text-white leading-none">
                {product.name}
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-base font-extrabold tracking-wider text-white">
                  {formatPrice(product.priceMXN)}
                </span>
                {product.originalPriceMXN && (
                  <span className="text-xs text-gray-500 line-through tracking-wider">
                    {formatPrice(product.originalPriceMXN)}
                  </span>
                )}
                {product.outOfStock ? (
                  <span className="px-2 py-0.5 text-[8px] bg-red-600 font-black tracking-widest uppercase rounded">
                    Agotado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 font-black tracking-widest uppercase rounded">
                    Disponible
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed font-medium mb-6 uppercase">
              {product.description}
            </p>
          </div>

          <div className="border-t border-neutral-900 pt-6 space-y-4">
            {/* Dropdown Stock Counter */}
            {(() => {
              const stockQty = typeof product.stockQuantity === "number" ? product.stockQuantity : 10;
              const isOut = product.outOfStock || stockQty <= 0;

              if (isOut) return null;

              return (
                <div className="space-y-1.5 bg-neutral-900/50 p-3 rounded-lg border border-neutral-850">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                      <Box size={13} />
                      <span>SELECCIONAR UNIDADES DE STOCK:</span>
                    </label>
                    <span className="text-[10px] font-mono font-bold text-gray-400">
                      {stockQty} pzas en stock
                    </span>
                  </div>
                  <select
                    value={Math.min(selectedQty, stockQty)}
                    onChange={(e) => setSelectedQty(Number(e.target.value))}
                    className="w-full bg-black border border-emerald-500/40 text-emerald-300 font-extrabold text-xs px-3 py-2.5 rounded focus:outline-none focus:border-emerald-400 cursor-pointer uppercase tracking-wider transition-all"
                  >
                    {Array.from({ length: Math.min(stockQty, 50) }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num} className="bg-neutral-950 text-white font-bold py-1">
                        {num} {num === 1 ? "unidad" : "unidades"} ({formatPrice(product.priceMXN * num)})
                      </option>
                    ))}
                  </select>
                </div>
              );
            })()}

            {/* Purchase CTA */}
            {(product.outOfStock || (typeof product.stockQuantity === "number" && product.stockQuantity <= 0)) ? (
              <button
                disabled
                className="w-full bg-neutral-900 text-gray-500 py-3.5 px-6 text-xs font-black tracking-widest uppercase cursor-not-allowed rounded flex items-center justify-center gap-2"
              >
                No Disponible Temporalmente
              </button>
            ) : (
              <button
                onClick={() => {
                  onAddToCart(product, selectedQty);
                  onClose();
                }}
                style={
                  shouldGlow
                    ? {
                        backgroundColor: colorHex,
                        color: colorHex === "#ffffff" ? "#000000" : "#ffffff",
                        boxShadow: `0 0 15px rgba(${rgb}, 0.6)`
                      }
                    : undefined
                }
                className={`w-full py-3.5 px-6 text-xs font-black tracking-[0.2em] uppercase transition-all duration-300 rounded flex items-center justify-center gap-2 ${
                  shouldGlow
                    ? "hover:brightness-110 active:scale-95"
                    : "bg-white text-black hover:bg-neutral-200"
                }`}
              >
                <ShoppingBag size={14} />
                <span>Agregar {selectedQty} {selectedQty === 1 ? "Unidad" : "Unidades"} a la Bolsa</span>
              </button>
            )}

            {/* Micro badges below */}
            <div className="grid grid-cols-2 gap-3 text-[9px] text-gray-500 uppercase tracking-widest justify-center">
              <div className="flex items-center gap-1">
                <ShieldCheck size={12} className="text-gray-600" />
                <span>Envío Asegurado Express</span>
              </div>
              <div className="flex items-center gap-1">
                <Box size={12} className="text-gray-600" />
                <span>Edición Limitada</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
