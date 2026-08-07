import React, { useState, useEffect } from "react";
import { PRODUCTS } from "./data";
import { Product, CartItem, GLOW_COLORS } from "./types";
import { Sparkles, MessageSquare, ShieldCheck, Box, BadgeCheck, X, Settings2, Pencil, Video, Play } from "lucide-react";
import { useSite, Order } from "./context/SiteContext";
import { getOptimizedImageUrl } from "./lib/imageOptimizer";

// Modular subcomponents
import Header from "./components/Header";
import CartDrawer from "./components/CartDrawer";
import ProductCard from "./components/ProductCard";
import ProductModal from "./components/ProductModal";
import SearchModal from "./components/SearchModal";
import Reviews from "./components/Reviews";
import Footer from "./components/Footer";
import AdminPanel from "./components/AdminPanel";
import StarryBackground from "./components/StarryBackground";
import { ReceiptModal } from "./components/ReceiptModal";

// Visual Inline Dialogs
import VisualEditDialog from "./components/VisualEditDialog";
import ProductQuickEditDialog from "./components/ProductQuickEditDialog";

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

export default function App() {
  const { 
    products, 
    siteConfig, 
    orders, 
    isAdmin, 
    loginWithGoogle, 
    currentUser,
    visualEditMode,
    updateSiteConfig,
    updateOrder,
    saveProduct,
    deleteProduct,
    loading
  } = useSite();

  // Temporary Live Visual Preview states
  const [previewSiteConfig, setPreviewSiteConfig] = useState<any>(null);
  const [previewProducts, setPreviewProducts] = useState<Product[] | null>(null);

  const siteConfigToUse = previewSiteConfig || siteConfig;
  const activeProducts = previewProducts || (products && products.length > 0 ? products : PRODUCTS);

  const [paymentStatusAlert, setPaymentStatusAlert] = useState<string | null>(null);
  const [completedReceiptOrder, setCompletedReceiptOrder] = useState<Order | null>(null);

  // Ensure page title and check Stripe Checkout URL return parameters
  useEffect(() => {
    document.title = "TETRA HATS";

    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const orderIdParam = params.get("orderId");
    const pendingOrderId = localStorage.getItem("pending_stripe_order_id");

    if (payment === "success" || payment === "stripe_success") {
      setPaymentStatusAlert("¡Pago acreditado exitosamente con Stripe! Tu compra ha sido confirmada.");
      setCart([]);
      localStorage.removeItem("exclusive_caps_cart");

      const targetOrderId = orderIdParam || pendingOrderId;
      if (targetOrderId && orders && orders.length > 0) {
        const found = orders.find(o => o.id === targetOrderId);
        if (found) {
          if (found.status !== "PAGO_RECIBIDO") {
            updateOrder(found.id, { status: "PAGO_RECIBIDO" });
          }
          setCompletedReceiptOrder({ ...found, status: "PAGO_RECIBIDO" });
        }
      }
      localStorage.removeItem("pending_stripe_order_id");
      localStorage.removeItem("last_completed_order_id");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (payment === "cancelled" || payment === "failure") {
      setPaymentStatusAlert("El pago fue cancelado o no pudo completarse. Puedes reintentar cuando gustes.");
      localStorage.removeItem("pending_stripe_order_id");
      localStorage.removeItem("last_completed_order_id");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (payment === "pending") {
      setPaymentStatusAlert("Tu pago está en proceso de verificación por la entidad bancaria.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [orders, updateOrder]);

  // Editing structures
  const [editingField, setEditingField] = useState<{
    label: string;
    fieldName: string;
    value: any;
    type: "text" | "textarea" | "image" | "video" | "color" | "number" | "boolean";
  } | null>(null);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const userOrders = orders 
    ? (isAdmin && currentUser ? orders.filter((o) => o.userEmail === currentUser.email) : orders)
    : [];

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("exclusive_caps_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [currency, setCurrency] = useState<"MXN" | "USD" | "CAD">("MXN");
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState<"ALL" | "NIGHTMARES" | "SHADOWS IN THE DARKNESS">("ALL");
  const [glowMode, setGlowMode] = useState(false);
  const [glowColor, setGlowColor] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("shop_glow_color");
      return saved || "#10b981";
    } catch {
      return "#10b981";
    }
  });

  const handleSetGlowColor = (color: string) => {
    setGlowColor(color);
    try {
      localStorage.setItem("shop_glow_color", color);
    } catch (e) {
      console.error(e);
    }
  };

  const rgbStr = hexToRgb(glowColor);

  // Sync cart with localStorage
  useEffect(() => {
    try {
      localStorage.setItem("exclusive_caps_cart", JSON.stringify(cart));
    } catch (e) {
      console.error("No se pudo guardar el carrito:", e);
    }
  }, [cart]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#000000] z-50 flex flex-col items-center justify-center select-none">
        {/* Sleek premium loading ring */}
        <div className="relative w-16 h-16 flex items-center justify-center mb-6">
          <div className="absolute inset-0 border-2 border-neutral-900 rounded-full" />
          <div className="absolute inset-0 border-2 border-t-[#10b981] rounded-full animate-spin" style={{ borderTopColor: siteConfigToUse.accentColor || "#10b981" }} />
        </div>
        <span className="text-[10px] text-zinc-400 font-extrabold tracking-[0.4em] uppercase animate-pulse">
          {siteConfigToUse.heroBrandTitle || "TETRA HATS"}
        </span>
      </div>
    );
  }

  const handleAddToCart = (product: Product, quantityToAdd: number = 1) => {
    const liveProd = activeProducts.find((p) => p.id === product.id) || product;
    const realStock = typeof liveProd.stockQuantity === "number" ? liveProd.stockQuantity : 10;

    if (liveProd.outOfStock || realStock <= 0) {
      alert(`La gorra "${product.name}" se encuentra agotada en este momento.`);
      return;
    }

    setCart((prevCart) => {
      const exists = prevCart.find((item) => item.product.id === product.id);
      if (exists) {
        const nextQty = Math.min(exists.quantity + quantityToAdd, realStock);
        return prevCart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: nextQty, product: liveProd } : item
        );
      }
      const initialQty = Math.min(quantityToAdd, realStock);
      return [...prevCart, { product: liveProd, quantity: initialQty }];
    });
    // Dynamically toggle drawer so the customer gets instant, gorgeous visual feedback!
    setCartOpen(true);
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const filteredProducts = activeProducts.filter((p) => {
    if (activeCategory === "ALL") return true;
    return p.category === activeCategory;
  });

  // Open general visual editor callback
  const handleOpenVisualEdit = (
    fieldName: string,
    label: string,
    type: "text" | "textarea" | "image" | "video" | "color" | "number" | "boolean"
  ) => {
    setEditingField({
      label,
      fieldName,
      value: (siteConfigToUse as any)[fieldName] || "",
      type
    });
  };

  const handleOpenVisualEditProduct = (product: Product) => {
    setEditingProduct(product);
  };

  // Live visual preview updating handler
  const handleLivePreviewSiteConfig = (fieldName: string, value: any) => {
    setPreviewSiteConfig((prev: any) => {
      const currentBase = prev || siteConfig;
      return { ...currentBase, [fieldName]: value };
    });
  };

  // Live visual save handler
  const handleLiveSaveSiteConfig = async (fieldName: string, value: any) => {
    await updateSiteConfig({ [fieldName]: value });
    setPreviewSiteConfig(null);
  };

  // Live visual preview updating for products
  const handleLivePreviewProduct = (updatedProduct: Product) => {
    setPreviewProducts((prev) => {
      const currentList = prev || activeProducts;
      return currentList.map((p) => (p.id === updatedProduct.id ? updatedProduct : p));
    });
  };

  // Live visual save for products
  const handleLiveSaveProduct = async (updatedProduct: Product) => {
    await saveProduct(updatedProduct);
    setPreviewProducts(null);
  };

  // Helper widget to easily overlay pencil controllers
  const renderEditButton = (
    label: string,
    fieldName: string,
    type: "text" | "textarea" | "image" | "video" | "color" | "number" | "boolean"
  ) => {
    if (!isAdmin || !visualEditMode) return null;
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          handleOpenVisualEdit(fieldName, label, type);
        }}
        className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-black px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded shadow-[0_0_12px_rgba(16,185,129,0.5)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer ml-1.5 z-30 pointer-events-auto"
        title={`Editar ${label}`}
      >
        <Pencil size={8} />
        <span>EDITAR</span>
      </button>
    );
  };

  return (
    <div 
      className="min-h-screen text-white font-sans antialiased overflow-x-hidden selection:bg-white selection:text-black transition-all duration-[600ms] relative bg-black"
    >
      {/* Realist, elegant starry background layer */}
      <StarryBackground />
      <style>{`
        :root {
          --accent-color: ${siteConfigToUse.accentColor || "#10b981"};
          --bg-color: ${siteConfigToUse.backgroundColor || "#000000"};
        }
        
        /* Dynamically override all green emerald tags to chosen accentColor value */
        .text-emerald-400, .text-emerald-500 {
          color: ${siteConfigToUse.accentColor || "#10b981"} !important;
        }
        .bg-emerald-400, .bg-emerald-500 {
          background-color: ${siteConfigToUse.accentColor || "#10b981"} !important;
        }
        .border-emerald-400, .border-emerald-500, .border-emerald-500\\/20, .border-emerald-400\\/20, .border-emerald-500\\/10 {
          border-color: ${siteConfigToUse.accentColor || "#10b981"} !important;
        }
        .focus\\:border-emerald-500:focus {
          border-color: ${siteConfigToUse.accentColor || "#10b981"} !important;
        }
        .hover\\:bg-emerald-400:hover, .hover\\:bg-emerald-500:hover {
          background-color: ${siteConfigToUse.accentColor || "#10b981"}E6 !important;
        }
        
        /* Glow intercepts for chosen shades */
        [class*="shadow-emerald"], [class*="shadow-[0_0_12px_rgba(16,185,129,"] {
          box-shadow: 0 0 16px ${siteConfigToUse.accentColor || "#10b981"}99 !important;
        }
        .border-emerald-400\\/10 {
          border-color: ${siteConfigToUse.accentColor || "#10b981"}1a !important;
        }
        .shadow-\\[inset_0_0_100px_rgba\\(16\\,185\\,129\\,0\\.15\\)\\] {
          box-shadow: inset 0 0 100px ${siteConfigToUse.accentColor || "#10b981"}2b !important;
        }
        .bg-emerald-500\\/10 {
          background-color: ${siteConfigToUse.accentColor || "#10b981"}20 !important;
        }
        .bg-emerald-500\\/5 {
          background-color: ${siteConfigToUse.accentColor || "#10b981"}0f !important;
        }
        .border-emerald-400\\/20 {
          border-color: ${siteConfigToUse.accentColor || "#10b981"}33 !important;
        }
      `}</style>
      
      {/* Dynamic Ambient Spectral Star Filter Layer */}
      {glowMode && (
        <div 
          className="fixed inset-0 pointer-events-none z-30 select-none border-[16px] transition-all duration-1000 animate-pulse animate-glow-glow" 
          style={{
            borderColor: `rgba(${rgbStr}, 0.18)`,
            boxShadow: `inset 0 0 130px rgba(${rgbStr}, 0.28)`
          }}
        />
      )}

      {/* Main Header navigation */}
      <Header
        cart={cart}
        currency={currency}
        setCurrency={setCurrency}
        toggleCart={() => setCartOpen(!cartOpen)}
        toggleSearch={() => setSearchOpen(!searchOpen)}
        toggleAccount={() => setAccountOpen(!accountOpen)}
        toggleGlowMode={() => setGlowMode(!glowMode)}
        glowMode={glowMode}
        glowColor={glowColor}
        onGlowColorChange={handleSetGlowColor}
        scrollToSection={scrollToSection}
        onOpenAdmin={() => setAdminOpen(true)}
        siteConfig={siteConfigToUse}
        visualEditMode={visualEditMode}
        onVisualEdit={handleOpenVisualEdit}
      />

      {paymentStatusAlert && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-xl bg-gradient-to-r from-blue-900/90 via-black to-emerald-900/90 border border-blue-500/50 text-white px-6 py-4 rounded-xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <p className="text-xs font-bold tracking-wider uppercase text-blue-200">
            {paymentStatusAlert}
          </p>
          <button
            onClick={() => setPaymentStatusAlert(null)}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Hero Loop section */}
      <section id="inicio" className="relative h-[95vh] w-full flex items-center justify-center overflow-hidden pt-20" style={{ backgroundColor: siteConfigToUse.backgroundColor || "#000000" }}>
        
        {/* Absolute Background Videos / Fallback posters */}
        <div className="absolute inset-0 z-0">
          {siteConfigToUse.heroVideo &&
          !siteConfigToUse.heroVideo.includes("umbra.page") &&
          !siteConfigToUse.heroVideo.includes("8678b1b9") &&
          !siteConfigToUse.heroVideo.includes("41ebdb") ? (
            <video
              key={siteConfigToUse.heroVideo}
              src={siteConfigToUse.heroVideo}
              playsInline
              autoPlay
              loop
              muted
              className="w-full h-full object-cover brightness-[0.4] saturate-[0.8] contrast-[1.15]"
              poster={
                siteConfigToUse.heroPoster &&
                !siteConfigToUse.heroPoster.includes("umbra.page") &&
                !siteConfigToUse.heroPoster.includes("8678b1b9")
                  ? siteConfigToUse.heroPoster
                  : undefined
              }
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-black via-neutral-950 to-black" />
          )}
          {/* Black Vignette Overlays for deep aesthetic mystery */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/85" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80" />
        </div>

        {/* Floating Hero Visual Config controls for Admin */}
        {isAdmin && visualEditMode && (
          <div className="absolute top-28 right-6 z-30 flex flex-col gap-2.5 bg-black/85 backdrop-blur-md border border-neutral-850 p-4 rounded-xl shadow-2xl select-none max-w-xs scale-90 sm:scale-100">
            <span className="text-[8px] text-[#34d399] font-black uppercase tracking-[0.2em] block">Controles del Banner Hero</span>
            <div className="flex flex-col gap-1.5 pt-1">
              <button
                onClick={() => handleOpenVisualEdit("heroVideo", "Video de Hero", "video")}
                className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-[9px] text-white font-extrabold uppercase rounded border border-neutral-800 cursor-pointer flex items-center gap-1"
              >
                <Pencil size={9} className="text-[#34d399]" />
                <span>VIDEO FONDO</span>
              </button>
              <button
                onClick={() => handleOpenVisualEdit("heroPoster", "Miniatura de Hero", "image")}
                className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-[9px] text-white font-extrabold uppercase rounded border border-neutral-800 cursor-pointer flex items-center gap-1"
              >
                <Pencil size={9} className="text-[#34d399]" />
                <span>POSTER FONDO</span>
              </button>
              <button
                onClick={() => handleOpenVisualEdit("logoUrl", "Logo Central Grande (URL)", "image")}
                className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-[9px] text-white font-extrabold uppercase rounded border border-neutral-800 cursor-pointer flex items-center gap-1"
              >
                <Pencil size={9} className="text-[#34d399]" />
                <span>LOGO GRANDE</span>
              </button>
            </div>
          </div>
        )}

        {/* Hero content presentation */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center space-y-8 flex flex-col items-center">
          <img
            src={getOptimizedImageUrl(siteConfigToUse.logoUrl || "https://umbra.page/cdn/shop/files/Letras_Blancas.png", 800)}
            alt="Logo Large"
            loading="eager"
            decoding="async"
            className="w-[85%] max-w-lg mb-2 object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-transform duration-[2000ms] hover:scale-[1.015]"
            referrerPolicy="no-referrer"
          />

          <p className="text-gray-300 text-[11px] sm:text-xs md:text-sm font-semibold tracking-[0.4em] uppercase max-w-xl leading-relaxed relative flex items-center justify-center gap-2 flex-wrap">
            <span>{siteConfigToUse.heroSubtitle || `${siteConfigToUse.heroTitle1 || "Alta Moda y Diseño Premium."} ${siteConfigToUse.heroTitle2 || "Gorras de Colección Exclusiva con Autenticidad NFC Integrada."}`}</span>
            {renderEditButton("Subtítulo de Hero", "heroSubtitle", "textarea")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 z-10 justify-center">
            <div className="relative flex items-center gap-1 flex-wrap justify-center">
              <button
                onClick={() => scrollToSection("catalog")}
                className="px-8 py-4 bg-white text-black text-xs font-black tracking-[0.25em] uppercase hover:bg-neutral-200 transition-all rounded shadow-xl flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>{siteConfigToUse.heroButton1Text || "Ver Catálogo"}</span>
              </button>
              {renderEditButton("Botón 1", "heroButton1Text", "text")}
            </div>
          </div>
        </div>
      </section>

      {/* Main Caps Catalog Section with category filtering tabs */}
      <section id="catalog" className="py-16 md:py-24 max-w-7xl mx-auto px-4 md:px-8 border-t border-neutral-900/60 relative z-10">
        
        {/* Filtering Tabs Panel Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 pb-6 border-b border-neutral-900">
          <div className="space-y-2 text-left">
            <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest block">
              Colección Oficial Disponible
            </span>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest leading-none">
                PRODUCTOS TETRA HATS
              </h2>
            </div>
          </div>
        </div>

        {/* Dynamic products presentation list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              currency={currency}
              onAddToCart={handleAddToCart}
              onViewDetails={(p) => setSelectedProduct(p)}
              glowMode={glowMode}
              glowColor={glowColor}
              isAdmin={isAdmin}
              visualEditMode={visualEditMode}
              onVisualEdit={handleOpenVisualEditProduct}
              onDelete={deleteProduct}
            />
          ))}
        </div>
      </section>

      {/* Mid Video Player with custom aesthetic looping wrapper */}
      <section className="py-16 border-t border-neutral-900/60 relative z-10">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-xl md:text-3xl font-black uppercase tracking-widest text-white leading-none relative flex justify-center items-center gap-2 max-w-lg mx-auto">
            <span>{siteConfigToUse.experienceTitle || "DETALLES EXCLUSIVOS AL DETALLE"}</span>
            {renderEditButton("Título de Experiencia", "experienceTitle", "text")}
          </h2>

          {/* Floating controls for Experience Video */}
          {isAdmin && visualEditMode && (
            <div className="flex justify-center gap-2 pt-1 max-w-sm mx-auto scale-90 sm:scale-100">
              <button
                onClick={() => handleOpenVisualEdit("experienceVideo", "Video de Experiencia", "video")}
                className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[9px] font-black rounded flex items-center gap-1 cursor-pointer shadow-md"
              >
                <Pencil size={9} />
                <span>VIDEO EXPERIENCIA</span>
              </button>
              <button
                onClick={() => handleOpenVisualEdit("experiencePoster", "Miniatura de Experiencia", "image")}
                className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-450 text-black text-[9px] font-black rounded flex items-center gap-1 cursor-pointer shadow-md"
              >
                <Pencil size={9} />
                <span>POSTER EXPERIENCIA</span>
              </button>
            </div>
          )}

          <div className="relative rounded-xl border border-neutral-800 overflow-hidden bg-neutral-950 aspect-video shadow-[0_0_60px_rgba(255,255,255,0.02)]">
            {siteConfigToUse.experienceVideo &&
            !siteConfigToUse.experienceVideo.includes("umbra.page") &&
            !siteConfigToUse.experienceVideo.includes("8678b1b9") &&
            !siteConfigToUse.experienceVideo.includes("41ebdb") ? (
              <video
                key={siteConfigToUse.experienceVideo}
                src={siteConfigToUse.experienceVideo}
                playsInline
                autoPlay
                loop
                muted
                controls
                className="w-full h-full object-cover brightness-[0.8] saturate-[0.95] contrast-[1.1]"
                poster={
                  siteConfigToUse.experiencePoster &&
                  !siteConfigToUse.experiencePoster.includes("umbra.page") &&
                  !siteConfigToUse.experiencePoster.includes("8678b1b9")
                    ? siteConfigToUse.experiencePoster
                    : undefined
                }
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-neutral-900/90 via-black to-neutral-950">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                  <Video size={20} />
                </div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-white mb-1">
                  Video de Experiencia Exclusiva
                </h3>
                <p className="text-[10px] sm:text-xs text-gray-400 max-w-sm font-light leading-relaxed">
                  {isAdmin
                    ? "Agrega la URL de tu video personalizado (.mp4) utilizando el botón de edición o desde el Panel Admin."
                    : "Colección Limitada. Piezas Únicas de Alta Gama."}
                </p>
                {isAdmin && (
                  <button
                    onClick={() => handleOpenVisualEdit("experienceVideo", "Video de Experiencia", "video")}
                    className="mt-4 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Pencil size={11} />
                    <span>Configurar URL de Mi Video</span>
                  </button>
                )}
              </div>
            )}
          </div>
          
          <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest leading-relaxed max-w-md mx-auto relative flex justify-center items-center gap-1.5 flex-wrap">
            <span>{siteConfigToUse.experienceSubtitle || "Colección Limitada. No son simples gorras, son piezas de exclusividad."}</span>
            {renderEditButton("Subtítulo de Experiencia", "experienceSubtitle", "textarea")}
          </p>
        </div>
      </section>



      {/* Reviews, testimonial scores structure */}
      <Reviews />

      {/* Footer layout linking forms and resources */}
      <Footer
        siteConfig={siteConfigToUse}
        visualEditMode={visualEditMode}
        isAdmin={isAdmin}
        onVisualEdit={handleOpenVisualEdit}
      />

      {/* Sliding Bolsa Drawer Overlay */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        currency={currency}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
      />

      {/* CMD-k searches spot panel overlay */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        products={activeProducts}
        onSelectProduct={(p) => {
          setSelectedProduct(p);
        }}
        currency={currency}
      />

      {/* Product specs popup info dialog */}
      <ProductModal
        product={selectedProduct ? (activeProducts.find((p) => p.id === selectedProduct.id) || selectedProduct) : null}
        isOpen={selectedProduct !== null}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        currency={currency}
        glowMode={glowMode}
        glowColor={glowColor}
      />

      {/* Customer User Account Info overlay box */}
      {accountOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            onClick={() => setAccountOpen(false)}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm cursor-pointer"
          />
          <div className="relative bg-neutral-950 border border-neutral-800 rounded-lg max-w-md w-full p-6 text-white shadow-2xl z-10 space-y-6 animate-fade-in">
            <button
              onClick={() => setAccountOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-white"
            >
              <X size={15} />
            </button>

            <div className="text-left space-y-1.5 border-b border-neutral-900 pb-4">
              <h3 className="text-sm font-black tracking-widest uppercase">Perfil del Destinatario</h3>
              <p className="text-[10px] text-gray-500 uppercase">Bienvenido a la red exclusiva</p>
            </div>

            <div className="space-y-4 text-left">
              <div className="bg-neutral-900 p-4 border border-neutral-800 rounded space-y-1">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Familia Miembro</p>
                <p className="text-sm font-bold text-white uppercase">{localStorage.getItem("user_nickname") || "Invitado Distinguido"}</p>
                <div className="pt-2 flex gap-2">
                  <input
                    type="text"
                    id="set-nickname-input"
                    placeholder="Cambiar Nombre o Apodo"
                    defaultValue={localStorage.getItem("user_nickname") || ""}
                    className="flex-1 bg-black border border-neutral-800 rounded p-1 px-2 text-[10px] text-white focus:outline-none placeholder-gray-650 uppercase"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) {
                          localStorage.setItem("user_nickname", val);
                          setAccountOpen(false);
                          setTimeout(() => setAccountOpen(true), 10);
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById("set-nickname-input") as HTMLInputElement;
                      if (input && input.value.trim()) {
                        localStorage.setItem("user_nickname", input.value.trim());
                        setAccountOpen(false);
                        setTimeout(() => setAccountOpen(true), 10);
                      }
                    }}
                    className="p-1 px-4 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded select-none cursor-pointer"
                  >
                    Guardar
                  </button>
                </div>
              </div>

              {/* Order statuses section */}
              <div className="space-y-2.5">
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">Mis Pedidos Reales</span>
                {userOrders.length === 0 ? (
                  <div className="border border-neutral-900 p-4 bg-neutral-900/10 rounded text-center text-[10px] uppercase tracking-wider text-gray-500">
                    Aún no cuentas con pedidos registrados en la base de datos Firestore.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {userOrders.map((order) => {
                      const formattedDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "";
                      return (
                        <div key={order.id} className="border border-neutral-900 p-3 bg-neutral-900/30 rounded flex flex-col gap-1 text-[11px] leading-relaxed">
                          <div className="flex items-center justify-between">
                            <h4 className="font-extrabold text-white">#ORD-{order.id ? order.id.substring(0, 7).toUpperCase() : ""}</h4>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                order.status === "ENTREGADO" 
                                  ? "bg-white text-black" 
                                  : order.status === "PAGO_PENDIENTE" 
                                  ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" 
                                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-400/20"
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>
                          <p className="text-[9px] text-gray-400 uppercase">F. Registro: {formattedDate}</p>
                          <p className="text-[9px] text-gray-400 uppercase">Pago: {order.paymentMethod}</p>
                          <p className="text-[9px] text-gray-400 uppercase truncate">Dirección: {order.shippingAddress}</p>
                          {order.trackingNumber ? (
                            <p className="text-[9px] font-bold text-emerald-400 uppercase">Guía tracking: {order.trackingNumber}</p>
                          ) : (
                            <p className="text-[9px] text-gray-500 uppercase">Guía tracking: Preparando DHL Express</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <p className="text-[9px] text-center text-gray-600 leading-normal uppercase">
                Utiliza tu apodo guardado para firmar tus reseñas verificadas. Gracias por pertenecer a nuestra exclusiva familia.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating global style customizer when edit mode is active */}
      {isAdmin && visualEditMode && (
        <div className="fixed bottom-6 left-6 z-40 bg-black/90 backdrop-blur-md border border-neutral-850 p-4 rounded-xl shadow-2xl select-none max-w-xs text-left animate-fade-in">
          <span className="text-[8px] text-[#34d399] font-black uppercase tracking-[0.2em] block mb-2">🎨 Paleta del Sitio</span>
          <div className="space-y-1.5">
            <button
              onClick={() => handleOpenVisualEdit("backgroundColor", "Color de Fondo del Sitio", "color")}
              className="w-full px-3 py-1.5 bg-neutral-950 hover:bg-neutral-900 text-[9px] font-extrabold text-white uppercase rounded border border-neutral-850 cursor-pointer flex items-center justify-between"
            >
              <span>Fondo del Sitio</span>
              <div className="w-3.5 h-3.5 rounded border border-white/20" style={{ backgroundColor: siteConfigToUse.backgroundColor || "#000000" }} />
            </button>
            <button
              onClick={() => handleOpenVisualEdit("accentColor", "Color de Acento del Sitio", "color")}
              className="w-full px-3 py-1.5 bg-neutral-950 hover:bg-neutral-900 text-[9px] font-extrabold text-white uppercase rounded border border-neutral-850 cursor-pointer flex items-center justify-between"
            >
              <span>Acento Visual</span>
              <div className="w-3.5 h-3.5 rounded border border-white/20" style={{ backgroundColor: siteConfigToUse.accentColor || "#10b981" }} />
            </button>
          </div>
        </div>
      )}

      {/* Consola del Panel de Administración de Datos */}
      {adminOpen && isAdmin && (
        <AdminPanel onClose={() => setAdminOpen(false)} />
      )}

      {/* General visual editable dialog overlay */}
      <VisualEditDialog
        isOpen={editingField !== null}
        onClose={() => handleCancelSiteEdit()}
        label={editingField?.label || ""}
        fieldName={editingField?.fieldName || ""}
        initialValue={editingField ? (siteConfig[editingField.fieldName as keyof typeof siteConfig] || "") : ""}
        type={editingField?.type || "text"}
        onPreview={handleLivePreviewSiteConfig}
        onSave={handleLiveSaveSiteConfig}
      />

      {/* Product / Cap visual quick editor overlay */}
      <ProductQuickEditDialog
        isOpen={editingProduct !== null}
        product={editingProduct}
        onClose={() => handleCancelProductEdit()}
        onPreview={handleLivePreviewProduct}
        onSave={handleLiveSaveProduct}
      />

      {/* Printable / Downloadable Receipt Modal overlay for completed purchases */}
      {completedReceiptOrder && (
        <ReceiptModal
          order={completedReceiptOrder}
          onClose={() => setCompletedReceiptOrder(null)}
          logoUrl={siteConfigToUse.brandLogoUrl}
        />
      )}
    </div>
  );

  // Revert handlers to secure flawless cancel rollbacks
  function handleCancelSiteEdit() {
    setPreviewSiteConfig(null);
    setEditingField(null);
  }

  function handleCancelProductEdit() {
    setPreviewProducts(null);
    setEditingProduct(null);
  }
}
