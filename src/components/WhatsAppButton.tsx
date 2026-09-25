import React, { useState, useEffect, useRef } from "react";
import { useSite } from "../context/SiteContext";
import { X, Package, ShoppingBag, Send, ExternalLink, Pencil, Check, Settings } from "lucide-react";

interface WhatsAppButtonProps {
  customPhone?: string;
}

export default function WhatsAppButton({ customPhone }: WhatsAppButtonProps) {
  const { siteConfig, updateSiteConfig, isAdmin } = useSite();
  // The popover window is closed by default. Only opens when user clicks the WhatsApp icon.
  const [isOpen, setIsOpen] = useState(false);
  const [customQuery, setCustomQuery] = useState("");
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [tempPhone, setTempPhone] = useState(siteConfig.whatsappNumber || "");
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setTempPhone(siteConfig.whatsappNumber || "");
  }, [siteConfig.whatsappNumber]);

  // Resolve sanitized international phone number
  const rawPhone = customPhone || siteConfig.whatsappNumber || "+521123456789";
  const cleanPhone = rawPhone.replace(/[^\d]/g, "") || "521123456789";

  // Close popup on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Open WhatsApp with message
  const handleOpenWhatsApp = (message: string) => {
    const trimmed = message.trim();
    const encoded = encodeURIComponent(trimmed);
    const url = encoded
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/${cleanPhone}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  // Submit custom user text: sends ONLY what the user typed without any unwanted automated prefix
  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = customQuery.trim();
    if (!query) {
      handleOpenWhatsApp("Hola");
      return;
    }
    handleOpenWhatsApp(query);
    setCustomQuery("");
  };

  // Lock fixed viewport coordinates on mount to prevent any mobile browser displacement
  useEffect(() => {
    const el = popoverRef.current;
    if (!el) return;
    el.style.setProperty("position", "fixed", "important");
    el.style.setProperty("bottom", "20px", "important");
    el.style.setProperty("right", "20px", "important");
    el.style.setProperty("z-index", "999999", "important");
    el.style.setProperty("transform", "translateZ(0)", "important");
    el.style.setProperty("-webkit-transform", "translateZ(0)", "important");
    el.style.setProperty("margin", "0", "important");
  }, []);

  return (
    <div
      ref={popoverRef}
      className="wa-floating-btn-fixed select-none pointer-events-auto"
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 999999,
        transform: "translateZ(0)",
        WebkitTransform: "translateZ(0)",
      }}
    >
      {/* Interactive Quick Options Popover Card: ONLY rendered when user clicks the icon */}
      {isOpen && (
        <div
          className="absolute bottom-16 right-0 mb-2 w-[calc(100vw-2.5rem)] max-w-[340px] sm:w-[350px] bg-neutral-950 text-white rounded-2xl border border-neutral-800 shadow-[0_15px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          style={{ zIndex: 1000000 }}
        >
          {/* Card Header */}
          <div className="bg-gradient-to-r from-neutral-900 to-black p-4 border-b border-neutral-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg shadow-[#25D366]/20">
                  <WhatsAppSvgIcon className="w-6 h-6 fill-white" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-neutral-950 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  TETRA HATS Oficial
                </h4>
                <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  En línea • Soporte Inmediato
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Cerrar"
              aria-label="Cerrar menú"
            >
              <X size={16} />
            </button>
          </div>

          {/* Admin Fast Configuration Bar */}
          {isAdmin && (
            <div className="bg-neutral-900/90 border-b border-neutral-800 px-3.5 py-2">
              {!isEditingPhone ? (
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Settings size={12} className="text-[#25D366]" />
                    <span>WhatsApp Receptor:</span>
                    <span className="font-mono text-emerald-400 font-bold">{siteConfig.whatsappNumber || cleanPhone}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTempPhone(siteConfig.whatsappNumber || "");
                      setIsEditingPhone(true);
                    }}
                    className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                    title="Editar número de WhatsApp"
                  >
                    <Pencil size={10} />
                    <span>Cambiar</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2 py-1">
                  <div className="flex items-center justify-between text-[10px] text-gray-300 font-bold uppercase tracking-wider">
                    <span>Configurar Teléfono WhatsApp:</span>
                    <button
                      type="button"
                      onClick={() => setIsEditingPhone(false)}
                      className="text-gray-500 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={tempPhone}
                      onChange={(e) => setTempPhone(e.target.value)}
                      placeholder="+52 1 55 1234 5678"
                      className="flex-1 bg-black border border-neutral-700 rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        updateSiteConfig({ whatsappNumber: tempPhone });
                        setIsEditingPhone(false);
                      }}
                      className="px-3 py-1 bg-[#25D366] hover:bg-[#20bd5a] text-black font-black text-[10px] uppercase rounded flex items-center gap-1 cursor-pointer shadow"
                    >
                      <Check size={12} />
                      <span>Guardar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Options */}
          <div className="p-3.5 space-y-2">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 px-1">
              ¿En qué podemos ayudarte hoy?
            </p>

            {/* Option 1: Consultas de Ventas */}
            <button
              type="button"
              onClick={() =>
                handleOpenWhatsApp(
                  "Hola TETRA HATS, me interesa información y disponibilidad de gorras de colección exclusiva. ¿Me podrían asesorar con una compra?"
                )
              }
              className="w-full text-left p-3 rounded-xl bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 hover:border-emerald-500/40 transition-all flex items-center gap-3 group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border border-amber-500/20">
                <ShoppingBag size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-black text-white group-hover:text-emerald-400 transition-colors block">
                  Consultas de Ventas
                </span>
                <span className="text-[10px] text-neutral-400 truncate block">
                  Modelos, precios y disponibilidad exclusiva
                </span>
              </div>
              <ExternalLink size={14} className="text-neutral-500 group-hover:text-emerald-400 transition-colors" />
            </button>

            {/* Option 2: Seguimiento de Guías de Envío */}
            <button
              type="button"
              onClick={() =>
                handleOpenWhatsApp(
                  "Hola TETRA HATS, quisiera consultar el estatus y número de guía de seguimiento de mi pedido."
                )
              }
              className="w-full text-left p-3 rounded-xl bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 hover:border-emerald-500/40 transition-all flex items-center gap-3 group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border border-blue-500/20">
                <Package size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-black text-white group-hover:text-emerald-400 transition-colors block">
                  Seguimiento de Guías de Envío
                </span>
                <span className="text-[10px] text-neutral-400 truncate block">
                  Rastreo de paquete, guía y fecha de entrega
                </span>
              </div>
              <ExternalLink size={14} className="text-neutral-500 group-hover:text-emerald-400 transition-colors" />
            </button>

            {/* Fast Custom Message Input: Sends exactly what the user enters */}
            <form onSubmit={handleCustomSubmit} className="pt-1.5 flex gap-2">
              <input
                type="text"
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder="Escribe tu mensaje..."
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="submit"
                className="bg-[#25D366] hover:bg-[#20bd5a] text-black font-black px-3.5 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
                title="Enviar por WhatsApp"
                aria-label="Enviar por WhatsApp"
              >
                <Send size={15} className="fill-black" />
              </button>
            </form>
          </div>

          {/* Footer note */}
          <div className="px-4 py-2.5 bg-black/60 border-t border-neutral-900 text-center">
            <span className="text-[9px] text-neutral-500 tracking-wider uppercase font-semibold">
              Canal de Atención Directa • TETRA HATS México
            </span>
          </div>
        </div>
      )}

      {/* Main Persistent Floating Button: Clicking toggles the popup window */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative group w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center shadow-[0_8px_30px_rgba(37,211,102,0.45)] hover:shadow-[0_10px_40px_rgba(37,211,102,0.65)] transform transition-transform duration-200 hover:scale-108 active:scale-95 border-2 border-white/20 cursor-pointer"
        style={{
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
        }}
        aria-label="Contactar por WhatsApp para Ventas o Guías de Envío"
        title="WhatsApp • TETRA HATS"
      >
        {/* WhatsApp Icon */}
        <WhatsAppSvgIcon className="w-8 h-8 sm:w-9 sm:h-9 fill-white z-10 transition-transform group-hover:scale-110" />
      </button>
    </div>
  );
}

/**
 * High-definition official WhatsApp vector glyph
 */
function WhatsAppSvgIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12.01 2.002c-5.508 0-9.988 4.479-9.988 9.987 0 1.758.459 3.473 1.332 4.985L2 22l5.204-1.364a9.948 9.948 0 0 0 4.806 1.353h.004c5.507 0 9.986-4.48 9.986-9.988 0-2.669-1.04-5.178-2.927-7.066a9.919 9.919 0 0 0-7.063-2.933zm0 18.29a8.27 8.27 0 0 1-4.223-1.156l-.303-.18-3.09.81.824-3.013-.198-.314a8.26 8.26 0 0 1-1.27-4.448c0-4.57 3.719-8.289 8.293-8.289 2.215 0 4.297.863 5.863 2.43 1.566 1.566 2.428 3.649 2.427 5.864 0 4.571-3.719 8.294-8.321 8.294zm4.555-6.208c-.25-.125-1.478-.73-1.708-.813-.23-.083-.396-.125-.563.125-.166.25-.646.813-.792.98-.146.166-.292.187-.542.062s-1.056-.39-2.012-1.242c-.744-.663-1.246-1.482-1.392-1.732-.146-.25-.016-.385.11-.51.113-.113.25-.292.375-.438.125-.146.167-.25.25-.417.083-.166.042-.312-.021-.437-.062-.125-.562-1.355-.77-1.855-.203-.487-.41-.42-.563-.428l-.479-.009c-.167 0-.438.063-.667.313-.23.25-.875.855-.875 2.084s.896 2.418 1.021 2.585c.125.166 1.764 2.693 4.274 3.777.597.258 1.064.412 1.428.528.6.191 1.146.164 1.577.1.48-.072 1.478-.604 1.687-1.188.208-.583.208-1.083.146-1.188-.063-.104-.23-.166-.48-.291z" />
    </svg>
  );
}
