import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, ShoppingBag, ZoomIn, Ban, Pencil, Trash2 } from "lucide-react";
import { Product } from "../types";
import { getOptimizedImageUrl, preloadImages } from "../lib/imageOptimizer";

interface ProductCardProps {
  key?: any;
  product: Product;
  currency: "MXN" | "USD" | "CAD";
  onAddToCart: (product: Product) => void;
  onViewDetails: (product: Product) => void;
  glowMode: boolean;
  glowColor?: string;
  isAdmin?: boolean;
  visualEditMode?: boolean;
  onVisualEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
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

export default function ProductCard({
  product,
  currency,
  onAddToCart,
  onViewDetails,
  glowMode,
  glowColor,
  isAdmin,
  visualEditMode,
  onVisualEdit,
  onDelete
}: ProductCardProps) {
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Preload all product images once on component mount
  useEffect(() => {
    if (product?.images?.length > 0) {
      preloadImages(product.images, 600);
    }
  }, [product.images]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (product?.images?.length > 0) {
      preloadImages(product.images, 600);
    }
  };

  const colorHex = glowColor || "#10b981";
  const rgb = hexToRgb(colorHex);

  // Price formatting in MXN
  const formatPrice = (priceMXN?: number) => {
    const val = priceMXN ?? 0;
    return `$ ${val.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} MXN`;
  };

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const isSwiping = useRef<boolean>(false);

  const handleNextImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (product.images && product.images.length > 0) {
      setActiveImgIndex((prev) => (prev + 1) % product.images.length);
    }
  };

  const handlePrevImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (product.images && product.images.length > 0) {
      setActiveImgIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    touchEndX.current = null;
    touchEndY.current = null;
    isSwiping.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;

    if (touchStartX.current !== null && touchEndX.current !== null) {
      const diffX = Math.abs(touchStartX.current - touchEndX.current);
      if (diffX > 8) {
        isSwiping.current = true;
      }
    }
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

      // Trigger swipe if horizontal distance > 30px and dominates vertical scroll
      if (Math.abs(deltaX) > 30 && Math.abs(deltaX) > deltaY) {
        if (deltaX > 0) {
          // Swiped left (finger right -> left) => Next Image
          handleNextImage();
        } else {
          // Swiped right (finger left -> right) => Prev Image
          handlePrevImage();
        }
      }
    }

    setTimeout(() => {
      isSwiping.current = false;
    }, 150);
  };

  const handleCardClick = () => {
    if (isSwiping.current) return;
    onViewDetails(product);
  };

  // Determine if this cap glows
  const glowsInDark = product.badge === "Glow in the Dark";
  const shouldGlow = glowMode && glowsInDark;

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex flex-col justify-between bg-black/10 hover:bg-black/20 backdrop-blur-[2px] border border-white/15 hover:border-white/30 rounded-xl overflow-hidden transition-all duration-500 cursor-pointer shadow-lg hover:shadow-2xl"
      style={{
        boxShadow: shouldGlow
          ? `0 0 35px rgba(${rgb}, 0.75), 0 0 15px rgba(${rgb}, 0.45), inset 0 0 20px rgba(${rgb}, 0.3)`
          : "none"
      }}
      id={`product-card-${product.id}`}
    >
      {/* Product Image & Slideshow Gallery with Touch Swipe */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative aspect-square w-full overflow-hidden bg-transparent flex items-center justify-center border-b border-white/10 p-3 select-none touch-pan-y"
      >
        
        {/* Skeleton Shimmer when image is loading */}
        {!imgLoaded && (
          <div className="absolute inset-0 bg-black/20 animate-pulse flex items-center justify-center z-0">
            <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Glow Mode Ambient Overlay */}
        {shouldGlow && (
          <div 
            className="absolute inset-0 mix-blend-screen animate-pulse pointer-events-none z-10" 
            style={{
              background: `radial-gradient(circle at center, rgba(${rgb}, 0.25) 0%, transparent 75%)`
            }}
          />
        )}

        {/* Product Images with subtle smooth transition */}
        <img
          src={getOptimizedImageUrl(product.images?.[activeImgIndex], 600)}
          alt={`${product.name} - Vista ${activeImgIndex + 1}`}
          loading="eager"
          decoding="async"
          onLoad={() => setImgLoaded(true)}
          className={`w-full h-full object-contain transition-all duration-300 ease-out select-none ${
            isHovered ? "scale-105" : "scale-100"
          } ${shouldGlow ? "brightness-[1.15] contrast-[1.1] saturate-[1.2]" : ""}`}
          referrerPolicy="no-referrer"
        />

        {/* Slideshow Arrow Toggles - Always visible on mobile, visible on hover for desktop */}
        {product.images.length > 1 && (
          <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between z-20 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <button
              onClick={handlePrevImage}
              className="w-8 h-8 rounded-full bg-black/80 hover:bg-white text-white hover:text-black flex items-center justify-center transition-colors border border-white/10 pointer-events-auto shadow-lg cursor-pointer"
              aria-label="Imagen anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleNextImage}
              className="w-8 h-8 rounded-full bg-black/80 hover:bg-white text-white hover:text-black flex items-center justify-center transition-colors border border-white/10 pointer-events-auto shadow-lg cursor-pointer"
              aria-label="Siguiente imagen"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Premium Image Slideshow Pagination Indicators */}
        {product.images.length > 1 && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 shadow-lg transition-all duration-300">
            {product.images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImgIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
                  idx === activeImgIndex
                    ? "w-4 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                    : "w-1.5 bg-white/30 hover:bg-white/70"
                }`}
                aria-label={`Vista ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-20">
          {product.badge && (
            <span
              className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded transition-all duration-300"
              style={
                glowMode && glowsInDark
                  ? {
                      backgroundColor: colorHex,
                      color: colorHex === "#ffffff" ? "#000000" : "#ffffff",
                      boxShadow: `0 0 15px ${colorHex}`
                    }
                  : undefined
              }
            >
              {product.badge}
            </span>
          )}

          {product.outOfStock && (
            <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest bg-red-600 border border-red-500 text-white rounded">
              Agotado
            </span>
          )}
        </div>

        {/* Quick Zoom Indicator */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex items-center gap-1.5">
          {isAdmin && visualEditMode && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onVisualEdit && onVisualEdit(product);
                }}
                className="w-7 h-7 bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center rounded-full border border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)] cursor-pointer"
                title="Editar diseño y precio"
              >
                <Pencil size={11} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onDelete && window.confirm(`¿Seguro que deseas eliminar de forma permanente la gorra "${product.name}" de la tienda?`)) {
                    onDelete(product.id);
                  }
                }}
                className="w-7 h-7 bg-red-600 hover:bg-red-500 text-white flex items-center justify-center rounded-full border border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)] cursor-pointer"
                title="Eliminar del catálogo"
              >
                <Trash2 size={11} />
              </button>
            </>
          )}
          <span className="w-7 h-7 bg-black/50 backdrop-blur-md flex items-center justify-center rounded-full text-white/80 hover:text-white border border-white/10 hover:border-white/20">
            <ZoomIn size={14} />
          </span>
        </div>
      </div>

      {/* Info & Buy Button block */}
      <div className="p-4 md:p-5 flex flex-col flex-1 justify-between bg-transparent">
        <div className="space-y-1 mb-4">
          <h3 className="text-xs font-bold tracking-widest uppercase text-gray-300 md:text-sm group-hover:text-white transition-colors duration-300">
            {product.name}
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest text-white">
                {formatPrice(product.priceMXN)}
              </span>
              {product.originalPriceMXN && (
                <span className="text-[10px] text-gray-500 line-through tracking-wider">
                  {formatPrice(product.originalPriceMXN)}
                </span>
              )}
            </div>
            {!product.outOfStock && (
              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                📦 {product.stockQuantity || 10} pzas
              </span>
            )}
          </div>
        </div>

        {/* Interactivity Buttons */}
        <div className="space-y-2">
          {product.outOfStock ? (
            <button
              disabled
              onClick={(e) => e.stopPropagation()}
              className="w-full py-2.5 bg-neutral-900 border border-neutral-800 text-gray-500 text-[10px] font-black tracking-widest uppercase cursor-not-allowed flex items-center justify-center gap-1.5 rounded"
            >
              <Ban size={12} />
              <span>Agotado</span>
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(product);
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
              className={`w-full py-2.5 text-[10px] font-black tracking-widest uppercase transition-all duration-300 rounded flex items-center justify-center gap-1.5 ${
                shouldGlow
                  ? "hover:brightness-110 active:scale-95"
                  : "bg-white text-black hover:bg-neutral-200"
              }`}
            >
              <ShoppingBag size={12} />
              <span>Añadir</span>
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(product);
            }}
            className="w-full py-2 bg-transparent text-gray-400 hover:text-white text-[9px] font-extrabold tracking-widest uppercase transition-colors"
          >
            Ver Detalles
          </button>
        </div>
      </div>
    </div>
  );
}
