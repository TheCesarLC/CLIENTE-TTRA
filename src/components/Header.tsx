import React, { useState, useEffect } from "react";
import { Menu, Search, User, ShoppingBag, Globe, Sparkles, X, ShieldAlert, LogIn, LogOut, Pencil } from "lucide-react";
import { CartItem, GLOW_COLORS } from "../types";
import { useSite, SiteConfig } from "../context/SiteContext";

interface HeaderProps {
  cart: CartItem[];
  currency: "MXN" | "USD" | "CAD";
  setCurrency: (currency: "MXN" | "USD" | "CAD") => void;
  toggleCart: () => void;
  toggleSearch: () => void;
  toggleAccount: () => void;
  toggleGlowMode: () => void;
  glowMode: boolean;
  glowColor?: string;
  onGlowColorChange?: (color: string) => void;
  scrollToSection: (id: string) => void;
  onOpenAdmin: () => void;
  siteConfig?: SiteConfig;
  visualEditMode?: boolean;
  onVisualEdit?: (fieldName: string, label: string, type: "text" | "textarea" | "image" | "video" | "color" | "number" | "boolean") => void;
}

export default function Header({
  cart,
  currency,
  setCurrency,
  toggleCart,
  toggleSearch,
  toggleAccount,
  toggleGlowMode,
  glowMode,
  glowColor,
  onGlowColorChange,
  scrollToSection,
  onOpenAdmin,
  siteConfig: siteConfigProp,
  visualEditMode,
  onVisualEdit
}: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [regionDropdownOpen, setRegionDropdownOpen] = useState(false);

  const { siteConfig: siteConfigFromContext, currentUser, isAdmin, loginWithGoogle, logout } = useSite();
  const siteConfig = siteConfigProp || siteConfigFromContext;
  const colorHex = glowColor || "#10b981";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const currencies: { code: "MXN" | "USD" | "CAD"; label: string; flag: string }[] = [
    { code: "MXN", label: "México (MXN $)", flag: "🇲🇽" },
    { code: "USD", label: "Estados Unidos (USD $)", flag: "🇺🇸" },
    { code: "CAD", label: "Canadá (CAD $)", flag: "🇨🇦" }
  ];

  const showBanner = !!siteConfig.bannerMessage;

  return (
    <>
      {/* Top Banner Message */}
      {showBanner && (
        <div 
          className="w-full bg-white text-black text-center py-2 text-xs font-bold tracking-widest uppercase transition-all duration-300 relative flex items-center justify-center gap-1.5 px-4"
          style={{ backgroundColor: "#ffffff" }}
        >
          <span>⚡ {siteConfig.bannerMessage} ⚡</span>
          {isAdmin && visualEditMode && onVisualEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onVisualEdit("bannerMessage", "Mensaje del Banner", "text");
              }}
              className="p-1 bg-emerald-500 hover:bg-emerald-400 text-black rounded transition-all cursor-pointer text-[8px] font-black uppercase flex items-center gap-1 shadow-md ml-2 z-50 absolute right-4 scale-90"
              title="Editar mensaje del banner superior"
            >
              <Pencil size={8} />
              <span className="hidden sm:inline">EDITAR BANNER</span>
            </button>
          )}
        </div>
      )}

      <header
        className={`fixed left-0 right-0 z-40 transition-all duration-300 border-b border-white/5 ${
          scrolled 
            ? "bg-black/90 backdrop-blur-md py-3 top-0" 
            : showBanner 
              ? "bg-transparent py-5 top-10" 
              : "bg-transparent py-5 top-0"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
          
          {/* Left: Hamburger menu for mobile, inline menu for desktop */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden text-white hover:text-gray-300 transition-colors p-1 cursor-pointer"
              aria-label="Abrir menú"
              id="hamburger-menu-btn"
            >
              <Menu size={22} />
            </button>

            <nav className="hidden lg:flex items-center gap-8 text-xs font-medium tracking-[0.2em] uppercase text-gray-400">
              <button
                onClick={() => scrollToSection("inicio")}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Inicio
              </button>
              <button
                onClick={() => scrollToSection("catalog")}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Catálogo
              </button>
              <button
                onClick={() => scrollToSection("reviews")}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Opiniones
              </button>
            </nav>
          </div>

          {/* Center: Brand Logo */}
          <div className="flex-1 flex justify-center lg:absolute lg:left-1/2 lg:-translate-x-1/2 relative items-center group/logo-header">
            <button
              onClick={() => scrollToSection("inicio")}
              className="flex items-center gap-2 cursor-pointer focus:outline-none"
              id="header-logo-button"
            >
              <img
                src={siteConfig.headerLogo || null}
                alt="Logo"
                className="h-7 md:h-9 object-contain"
                referrerPolicy="no-referrer"
              />
            </button>
            {isAdmin && visualEditMode && onVisualEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onVisualEdit("headerLogo", "Logo de Cabecera (URL)", "image");
                }}
                className="absolute -right-16 p-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-[8px] rounded flex items-center gap-0.5 shadow-lg z-50 cursor-pointer scale-75 sm:scale-90"
                title="Editar Logo de Cabecera"
              >
                <Pencil size={8} />
                <span>LOGO</span>
              </button>
            )}
          </div>

          {/* Right: Quick actions */}
          <div className="flex items-center gap-4 md:gap-6 text-white">
            
            {/* Realtime Admin Console trigger */}
            {isAdmin && (
              <button
                onClick={onOpenAdmin}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black rounded text-[10px] font-black tracking-widest uppercase transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse"
                title="Consola de mando admin"
                id="admin-console-shortcut"
              >
                <ShieldAlert size={12} />
                <span>Panel Admin</span>
              </button>
            )}

            {/* Spectral Glow Toggle with Micro-interactivity! */}
            <div className="flex items-center gap-2" id="spectral-glow-container">
              <button
                onClick={toggleGlowMode}
                style={
                  glowMode
                    ? {
                        backgroundColor: `${colorHex}1a`,
                        borderColor: colorHex,
                        color: colorHex,
                        boxShadow: `0 0 12px ${colorHex}44`
                      }
                    : undefined
                }
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all duration-300 border ${
                  glowMode
                    ? "animate-pulse"
                    : "bg-white/5 border-white/10 hover:border-emerald-500/40 text-gray-400 hover:text-emerald-400"
                }`}
                title="Activar brillo fosforescente nocturno"
                id="spectral-glow-toggle"
              >
                <Sparkles size={11} style={{ color: glowMode ? colorHex : undefined }} className={glowMode ? "" : "text-gray-400"} />
                <span className="hidden sm:inline">Modo Glow</span>
              </button>

              {/* Color dots picker */}
              {glowMode && (
                <div className="flex items-center gap-1 bg-neutral-900/80 border border-neutral-800 rounded-full px-2 py-1 animate-fade-in" id="glow-color-picker-container">
                  {GLOW_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => onGlowColorChange?.(c.hex)}
                      className="w-3.5 h-3.5 rounded-full border transition-all duration-300 hover:scale-125 focus:outline-none cursor-pointer"
                      style={{
                        backgroundColor: c.hex,
                        borderColor: colorHex === c.hex ? "#ffffff" : "transparent",
                        boxShadow: colorHex === c.hex ? `0 0 8px ${c.hex}` : "none"
                      }}
                      title={c.name}
                      id={`glow-color-dot-${c.hex.replace("#", "")}`}
                    />
                  ))}
                </div>
              )}
            </div>



            {/* Search Icon */}
            <button
              onClick={toggleSearch}
              className="text-gray-300 hover:text-white transition-colors p-1 cursor-pointer"
              aria-label="Buscar productos"
              id="search-icon-btn"
            >
              <Search size={18} />
            </button>

            {/* Account Icon (Interlocks with Google Auth) */}
            <div className="flex items-center gap-2">
              {currentUser ? (
                <button
                  onClick={toggleAccount}
                  className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full py-1 px-2.5 hover:border-white/30 text-xs text-slate-300 transition-all cursor-pointer"
                  title={`Miembro Google ID: ${currentUser.email}`}
                  id="google-user-profile-btn"
                >
                  <div className="w-4 h-4 rounded-full bg-emerald-400 text-black flex items-center justify-center font-bold text-[9px] uppercase">
                    {currentUser.email ? currentUser.email[0] : "G"}
                  </div>
                  <span className="max-w-[70px] truncate text-[10px] uppercase font-bold text-gray-300 hidden md:inline">
                    {currentUser.displayName || currentUser.email?.split("@")[0]}
                  </span>
                </button>
              ) : (
                <button
                  onClick={loginWithGoogle}
                  className="text-gray-300 hover:text-emerald-400 hover:border-emerald-500/30 transition-all p-1.5 bg-neutral-900 rounded-full border border-neutral-800 flex items-center gap-1 px-2 text-[10px] font-bold uppercase tracking-widest cursor-pointer"
                  title="Conectar con Google"
                  id="google-login-trigger"
                >
                  <LogIn size={12} />
                  <span className="hidden leading-none sm:inline">Ingresar</span>
                </button>
              )}
            </div>

            {/* Shopping Cart Icon with dynamic notification bubble */}
            <button
              onClick={toggleCart}
              className="relative text-gray-300 hover:text-white transition-colors p-1.5 bg-white/5 rounded-full border border-white/10 hover:border-white/20 cursor-pointer"
              aria-label="Ver carrito"
              id="cart-icon-btn"
            >
              <ShoppingBag size={18} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-black text-[9px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-black shadow-lg animate-bounce">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Slide-out Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity">
          <div className="fixed top-0 bottom-0 left-0 w-80 bg-neutral-950 border-r border-neutral-800 p-6 flex flex-col justify-between z-50">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-neutral-900">
                <img
                  src={siteConfig.headerLogo || null}
                  alt="Logo"
                  className="h-6 object-contain"
                  referrerPolicy="no-referrer"
                />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-8 flex flex-col gap-6 text-sm font-semibold tracking-widest uppercase">
                <button
                  onClick={() => {
                    scrollToSection("inicio");
                    setMobileMenuOpen(false);
                  }}
                  className="text-left text-gray-300 hover:text-white py-2 border-b border-neutral-900 cursor-pointer"
                >
                  Inicio
                </button>
                <button
                  onClick={() => {
                    scrollToSection("catalog");
                    setMobileMenuOpen(false);
                  }}
                  className="text-left text-gray-300 hover:text-white py-2 border-b border-neutral-900 cursor-pointer"
                >
                  Catálogo
                </button>
                <button
                  onClick={() => {
                    scrollToSection("reviews");
                    setMobileMenuOpen(false);
                  }}
                  className="text-left text-gray-300 hover:text-white py-2 border-b border-neutral-900 cursor-pointer"
                >
                  Opiniones
                </button>

                {isAdmin && (
                  <button
                    onClick={() => {
                      onOpenAdmin();
                      setMobileMenuOpen(false);
                    }}
                    className="text-left text-emerald-400 hover:text-emerald-300 py-2 border-b border-neutral-900 flex items-center gap-2 font-black tracking-widest"
                  >
                    <ShieldAlert size={14} />
                    <span>PANEL ADMINISTRADOR</span>
                  </button>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-900">
              <p className="text-[10px] text-gray-500 tracking-wider">
                &copy; 2026 TETRA HATS. TODOS LOS DERECHOS RESERVADOS.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
