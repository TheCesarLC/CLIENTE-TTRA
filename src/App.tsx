import React, { useState, useEffect, useMemo } from "react";
import { PRODUCTS } from "./data";
import { Product, CartItem, GLOW_COLORS } from "./types";
import { Sparkles, MessageSquare, ShieldCheck, Box, BadgeCheck, X, Settings2, Pencil, Video, Play, LogIn, LogOut, User, Image, Download, FileText, CheckCircle2, Clock } from "lucide-react";
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
import OptimizedVideoPlayer from "./components/OptimizedVideoPlayer";

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
    logout,
    currentUser,
    visualEditMode,
    authError,
    clearAuthError,
    updateSiteConfig,
    updateOrder,
    saveProduct,
    deleteProduct,
    loading
  } = useSite();

  // Temporary Live Visual Preview states
  const [previewSiteConfig, setPreviewSiteConfig] = useState<any>(null);
  const [previewProducts, setPreviewProducts] = useState<Product[] | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const siteConfigToUse = previewSiteConfig || siteConfig;
  const baseCatalog = previewProducts || (products && products.length > 0 ? products : PRODUCTS);
  const activeProducts = useMemo(() => {
    if (!siteConfigToUse?.testCheckoutActive) return baseCatalog;
    const targetId = siteConfigToUse.testCheckoutProductId;
    const testAmount = Math.max(10, Number(siteConfigToUse.testCheckoutAmountMXN) || 11);
    return baseCatalog.map((p, idx) => {
      const isTarget = !targetId || targetId === "ALL" || targetId === p.id || (!targetId && idx === 0) || p.name.toLowerCase().includes(targetId.toLowerCase());
      if (isTarget) {
        return {
          ...p,
          priceMXN: testAmount,
        };
      }
      return p;
    });
  }, [baseCatalog, siteConfigToUse?.testCheckoutActive, siteConfigToUse?.testCheckoutProductId, siteConfigToUse?.testCheckoutAmountMXN]);

  const [paymentStatusAlert, setPaymentStatusAlert] = useState<string | null>(null);
  const [completedReceiptOrder, setCompletedReceiptOrder] = useState<Order | null>(null);

  // Ensure page title and meta description for SEO / Search Engine indexing
  useEffect(() => {
    document.title = "TETRA HATS Gorras de colección exclusiva";

    const descText = siteConfigToUse.footerDescription || "Marca líder en gorras de colección No son simples gorras, son piezas de exclusividad.";
    
    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", descText);

    // Update OpenGraph title and description
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", "TETRA HATS Gorras de colección exclusiva");

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement("meta");
      ogDesc.setAttribute("property", "og:description");
      document.head.appendChild(ogDesc);
    }
    ogDesc.setAttribute("content", descText);

    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const orderIdParam = params.get("orderId");
    const pendingOrderId = localStorage.getItem("pending_stripe_order_id");

    if (payment === "success" || payment === "stripe_success") {
      setPaymentStatusAlert("¡Pago acreditado exitosamente! SE TE HARA LLEGAR TU GUIA DE SEGUIMIENTO DE ENVIO A TU CORREO O WHATSAPP PERSONAL EN LOS PROXIMOS 2 DIAS HABILES...");
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
    ? (currentUser 
        ? orders.filter((o) => !o.userEmail || o.userEmail.toLowerCase() === currentUser.email?.toLowerCase())
        : [])
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

  // Synchronize cart with real-time activeProducts (price updates, stock changes, name updates)
  useEffect(() => {
    if (!activeProducts || activeProducts.length === 0) return;
    setCart((prevCart) => {
      let changed = false;
      const updated = prevCart.map((item) => {
        const liveProd = activeProducts.find(
          (p) => p.id === item.product.id || p.name.toLowerCase() === item.product.name?.toLowerCase()
        );
        if (!liveProd) return item;
        const currentPrice = item.product.priceMXN;
        const newPrice = liveProd.priceMXN;
        const currentStock = item.product.stockQuantity;
        const newStock = liveProd.stockQuantity;
        const currentOutOfStock = item.product.outOfStock;
        const newOutOfStock = liveProd.outOfStock;
        const currentName = item.product.name;
        const newName = liveProd.name;
        const currentImage = item.product.images?.[0];
        const newImage = liveProd.images?.[0];

        if (
          currentPrice !== newPrice ||
          currentStock !== newStock ||
          currentOutOfStock !== newOutOfStock ||
          currentName !== newName ||
          currentImage !== newImage
        ) {
          changed = true;
          const maxStock = typeof newStock === "number" && newStock > 0 ? newStock : 10;
          return {
            ...item,
            product: liveProd,
            quantity: Math.max(1, Math.min(item.quantity, maxStock))
          };
        }
        return item;
      });
      return changed ? updated : prevCart;
    });
  }, [activeProducts]);

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
        <div className="absolute inset-0 z-0 overflow-hidden flex items-center justify-center pointer-events-none">
          <OptimizedVideoPlayer
            isHero
            src={
              (siteConfigToUse.heroVideo &&
              !siteConfigToUse.heroVideo.includes("umbra.page") &&
              !siteConfigToUse.heroVideo.includes("8678b1b9") &&
              !siteConfigToUse.heroVideo.includes("41ebdb")
                ? siteConfigToUse.heroVideo
                : null) ||
              siteConfigToUse.experienceVideo ||
              "https://res.cloudinary.com/demo/video/upload/q_auto,f_auto/v1682352857/cld-sample-video.mp4"
            }
            playsInline
            autoPlay
            loop
            muted
            customOverlayControls={false}
            className="w-full h-full object-cover min-w-full min-h-full scale-[1.08] brightness-[0.5] saturate-[0.85] contrast-[1.1]"
            poster={
              siteConfigToUse.heroPoster &&
              !siteConfigToUse.heroPoster.includes("umbra.page") &&
              !siteConfigToUse.heroPoster.includes("8678b1b9")
                ? siteConfigToUse.heroPoster
                : undefined
            }
          />
          {/* Black Vignette Overlays for deep aesthetic mystery */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/85 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80 pointer-events-none" />
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

      {/* Mid Video Player Section with two vertical videos side-by-side */}
      <section className="py-16 border-t border-neutral-900/60 relative z-10 bg-neutral-950/40">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-8">
          <div className="space-y-2">
            <h2 className="text-xl md:text-3xl font-black uppercase tracking-widest text-white leading-none relative flex justify-center items-center gap-2 max-w-lg mx-auto">
              <span>{siteConfigToUse.experienceTitle || "DETALLES EXCLUSIVOS AL DETALLE"}</span>
              {renderEditButton("Título de Experiencia", "experienceTitle", "text")}
            </h2>
            <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest leading-relaxed max-w-md mx-auto relative flex justify-center items-center gap-1.5 flex-wrap">
              <span>{siteConfigToUse.experienceSubtitle || "Colección Limitada. No son simples gorras, son piezas de exclusividad."}</span>
              {renderEditButton("Subtítulo de Experiencia", "experienceSubtitle", "textarea")}
            </p>
          </div>

          {/* Floating controls for Experience Videos in Visual Edit mode */}
          {isAdmin && visualEditMode && (
            <div className="flex flex-wrap justify-center gap-2 pt-1 max-w-md mx-auto">
              <button
                onClick={() => handleOpenVisualEdit("experienceVideo", "Video 1 (Izquierda)", "video")}
                className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[9px] font-black rounded flex items-center gap-1 cursor-pointer shadow-md"
              >
                <Pencil size={9} />
                <span>VIDEO 1 (IZQ)</span>
              </button>
              <button
                onClick={() => handleOpenVisualEdit("experienceVideo2", "Video 2 (Derecha)", "video")}
                className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[9px] font-black rounded flex items-center gap-1 cursor-pointer shadow-md"
              >
                <Pencil size={9} />
                <span>VIDEO 2 (DER)</span>
              </button>
              <button
                onClick={() => handleOpenVisualEdit("experiencePoster", "Miniatura de Experiencia", "image")}
                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-[9px] font-black rounded flex items-center gap-1 cursor-pointer shadow-md"
              >
                <Pencil size={9} />
                <span>POSTER</span>
              </button>
            </div>
          )}

          {/* Side-by-Side Vertical Videos Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 max-w-3xl mx-auto px-2">
            
            {/* VIDEO 1 - ONDGAS */}
            {(() => {
              const ondgasProduct = activeProducts.find(p => p.name.toUpperCase().includes("ON DGAS") || p.name.toUpperCase().includes("ONDGAS")) || activeProducts[0];
              const ondgasFallbackPoster = ondgasProduct?.images?.[0] || "https://res.cloudinary.com/demo/image/upload/q_auto,f_auto/v1682352857/cld-sample-video.jpg";
              const ondgasVideoSrc = siteConfigToUse.experienceVideo &&
                !siteConfigToUse.experienceVideo.includes("umbra.page") &&
                !siteConfigToUse.experienceVideo.includes("8678b1b9") &&
                !siteConfigToUse.experienceVideo.includes("41ebdb")
                  ? siteConfigToUse.experienceVideo
                  : "https://res.cloudinary.com/demo/video/upload/q_auto,f_auto/v1682352857/cld-sample-video.mp4";

              return (
                <div className="flex flex-col items-center">
                  <div className="w-full max-w-[320px] sm:max-w-none aspect-[9/16] rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] relative group transition-all duration-300 hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                    <OptimizedVideoPlayer
                      id="ondgas"
                      activeVideoId={activeVideoId}
                      onPlayRequest={setActiveVideoId}
                      src={ondgasVideoSrc}
                      playsInline
                      loop
                      muted
                      className="w-full h-full object-cover brightness-[0.9] contrast-[1.05]"
                      poster={
                        siteConfigToUse.experiencePoster &&
                        !siteConfigToUse.experiencePoster.includes("umbra.page") &&
                        !siteConfigToUse.experiencePoster.includes("8678b1b9")
                          ? siteConfigToUse.experiencePoster
                          : undefined
                      }
                      fallbackPoster={ondgasFallbackPoster}
                    />
                  </div>
                  <span className="mt-2.5 text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${activeVideoId === 'ondgas' ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'}`}></span>
                    ONDGAS
                  </span>
                </div>
              );
            })()}

            {/* VIDEO 2 - 800 DIAS */}
            {(() => {
              const d800Product = activeProducts.find(p => p.name.toUpperCase().includes("800 DIAS") || p.name.toUpperCase().includes("800 DÍAS")) || activeProducts[1] || activeProducts[0];
              const d800FallbackPoster = d800Product?.images?.[0] || "https://res.cloudinary.com/demo/image/upload/q_auto,f_auto/v1682352857/cld-sample-video.jpg";
              const d800VideoSrc = siteConfigToUse.experienceVideo2 &&
                !siteConfigToUse.experienceVideo2.includes("umbra.page") &&
                !siteConfigToUse.experienceVideo2.includes("8678b1b9") &&
                !siteConfigToUse.experienceVideo2.includes("41ebdb")
                  ? siteConfigToUse.experienceVideo2
                  : "https://res.cloudinary.com/demo/video/upload/q_auto,f_auto/v1682352857/cld-sample-video.mp4";

              return (
                <div className="flex flex-col items-center">
                  <div className="w-full max-w-[320px] sm:max-w-none aspect-[9/16] rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] relative group transition-all duration-300 hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                    <OptimizedVideoPlayer
                      id="800dias"
                      activeVideoId={activeVideoId}
                      onPlayRequest={setActiveVideoId}
                      src={d800VideoSrc}
                      playsInline
                      loop
                      muted
                      className="w-full h-full object-cover brightness-[0.9] contrast-[1.05]"
                      poster={
                        siteConfigToUse.experiencePoster2 &&
                        !siteConfigToUse.experiencePoster2.includes("umbra.page")
                          ? siteConfigToUse.experiencePoster2
                          : undefined
                      }
                      fallbackPoster={d800FallbackPoster}
                    />
                  </div>
                  <span className="mt-2.5 text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${activeVideoId === '800dias' ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'}`}></span>
                    800 DÍAS
                  </span>
                </div>
              );
            })()}

          </div>
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
          <div className="relative bg-neutral-950 border border-neutral-800 rounded-xl max-w-lg w-full p-6 text-white shadow-2xl z-10 space-y-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setAccountOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>

            <div className="text-left space-y-1 border-b border-neutral-900 pb-4">
              <h3 className="text-sm font-black tracking-widest uppercase flex items-center gap-2">
                <User size={16} className="text-purple-400" />
                Mi Cuenta y Comprobantes de Compra
              </h3>
              <p className="text-[10px] text-gray-400 uppercase">
                {currentUser ? `Sesión vinculada a ${currentUser.email}` : "Inicia sesión con Google para acceder a tus recibos"}
              </p>
            </div>

            <div className="space-y-5 text-left">
              {/* Google Account Profile Card */}
              {currentUser ? (
                <div className="bg-neutral-900/80 p-4 border border-emerald-500/30 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {currentUser.photoURL ? (
                        <img src={currentUser.photoURL} alt="Google Avatar" className="w-10 h-10 rounded-full border border-emerald-400" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 font-black text-sm">
                          {(currentUser.displayName || currentUser.email || "G").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-black text-white uppercase">{currentUser.displayName || "Usuario Registrado"}</p>
                        <p className="text-[10px] text-emerald-400 font-mono">{currentUser.email}</p>
                      </div>
                    </div>
                    <span className="text-[8px] font-black px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded uppercase tracking-wider">
                      Google Active
                    </span>
                  </div>

                  <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                    <span className="text-[9px] text-gray-400 uppercase font-mono">
                      {userOrders.length} {userOrders.length === 1 ? "recibo guardado" : "recibos guardados"}
                    </span>
                    <button
                      onClick={() => {
                        logout();
                        setAccountOpen(false);
                      }}
                      className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase flex items-center gap-1 cursor-pointer"
                    >
                      <LogOut size={12} />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-purple-950/60 to-neutral-900 p-4 border border-purple-500/40 rounded-lg space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase text-purple-300 flex items-center gap-1.5">
                      <LogIn size={14} className="text-purple-400" /> Inicia Sesión con tu Cuenta de Google
                    </p>
                    <p className="text-[10px] text-gray-300 leading-relaxed">
                      Al iniciar sesión, todas tus compras y recibos oficiales se guardarán automáticamente en tu historial para que puedas consultarlos y descargarlos como imagen en cualquier momento.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      loginWithGoogle();
                    }}
                    className="w-full bg-white hover:bg-neutral-200 text-black py-3 px-4 text-xs font-black tracking-wider uppercase rounded-lg shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Ingresar con Google</span>
                  </button>
                </div>
              )}

              {/* Order Receipts History Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-300 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                    <FileText size={12} className="text-emerald-400" /> Historial de Comprobantes de Compra ({userOrders.length})
                  </span>
                  {currentUser && (
                    <span className="text-[9px] text-emerald-400 font-mono font-bold">
                      Sincronizado Firestore
                    </span>
                  )}
                </div>

                {userOrders.length === 0 ? (
                  <div className="border border-neutral-900 p-6 bg-neutral-900/20 rounded-lg text-center space-y-2">
                    <p className="text-xs text-gray-400 uppercase font-bold">
                      No tienes compras o comprobantes registrados
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Cuando realices un pedido con tu correo ({currentUser?.email || "Google"}), aparecerá aquí tu comprobante digital listo para descargar.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {userOrders.map((order) => {
                      const formattedDate = order.createdAt ? (() => {
                        try {
                          return new Date(order.createdAt).toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          });
                        } catch {
                          return order.createdAt;
                        }
                      })() : "";

                      const isOrderPaid = order.status === "PAGO_RECIBIDO" || order.status === "COMPLETADO" || order.status === "EMPACADO" || order.status === "ENVIADO" || order.status === "ENTREGADO";

                      return (
                        <div key={order.id} className="border border-neutral-800 p-3.5 bg-neutral-900/40 rounded-lg space-y-2.5 text-xs hover:border-neutral-700 transition-colors">
                          <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
                            <div>
                              <h4 className="font-black text-white text-xs">#{order.id}</h4>
                              <p className="text-[9px] text-gray-400 font-mono">{formattedDate}</p>
                            </div>
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                              isOrderPaid
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            }`}>
                              {order.status}
                            </span>
                          </div>

                          <div className="text-[10px] space-y-1 text-gray-300">
                            <p><strong className="text-gray-400">Total:</strong> <span className="text-emerald-400 font-black">${(order.totalMXN || 0).toLocaleString()} MXN</span></p>
                            <p className="truncate"><strong className="text-gray-400">Método:</strong> {order.paymentMethod}</p>
                            {order.items && order.items.length > 0 && (
                              <p className="truncate text-gray-400">
                                <strong>Artículos:</strong> {order.items.map(i => `${i.productName || "Gorra"} (${i.quantity}x)`).join(", ")}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              setCompletedReceiptOrder(order);
                              setAccountOpen(false);
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-3 text-[10px] font-black tracking-wider uppercase rounded shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Image size={13} />
                            <span>Ver / Descargar Comprobante (Imagen/PDF)</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <p className="text-[9px] text-center text-gray-500 leading-normal uppercase pt-2 border-t border-neutral-900">
                TETRA HATS — Colección Exclusiva. Todos tus comprobantes quedan encriptados y protegidos en Firestore.
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

      {/* Firebase Auth Error Diagnostic Modal */}
      {authError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-white relative">
            <button
              onClick={clearAuthError}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 text-amber-400">
              <ShieldCheck size={24} />
              <h3 className="text-base font-bold uppercase tracking-wider">Aviso de Autenticación Firebase</h3>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              {authError}
            </p>
            <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 font-mono text-[11px] text-emerald-400 flex items-center justify-between">
              <span>Dominio actual: <strong>{window.location.hostname}</strong></span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.hostname);
                  alert("¡Dominio copiado al portapapeles!");
                }}
                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-[10px] uppercase font-bold tracking-wider cursor-pointer"
              >
                Copiar
              </button>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={clearAuthError}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
              >
                Entendido / Cerrar
              </button>
            </div>
          </div>
        </div>
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
