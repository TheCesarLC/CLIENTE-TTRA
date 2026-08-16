import React, { useState, useEffect } from "react";
import { useSite, SiteConfig, Order, AuthenticCode, ContactMessage } from "../context/SiteContext";
import { Product } from "../types";
import { ProductImageManager } from "./ProductImageManager";
import { ReceiptModal } from "./ReceiptModal";
import { postApi } from "../lib/api";
import { verifyStripeKey } from "../lib/stripeClient";
import { 
  X, 
  Settings, 
  Sliders, 
  ShoppingBag, 
  Truck, 
  Mail, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  UserCheck, 
  TrendingUp, 
  Play, 
  CircleAlert,
  Moon,
  Sun,
  Eye,
  Activity,
  User,
  ExternalLink,
  CreditCard,
  DollarSign,
  Star,
  MessageSquare,
  FlaskConical,
  Zap
} from "lucide-react";
import { getOrderStatusDetails, ORDER_SEMAFORO_LIST, normalizeOrderStatus } from "../lib/orderStatus";

interface AdminPanelProps {
  onClose: () => void;
}

// PDF Ticket Printer & Email Dispatch Helpers for Admin
const printOrderPDF = (ord: Order, logoUrl?: string) => {
  const dateStr = ord.createdAt ? new Date(ord.createdAt).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "medium" }) : new Date().toLocaleString("es-MX");
  const statusInfo = getOrderStatusDetails(ord.status);
  const isPaid = statusInfo.isPaidOrApproved;
  const isCancelled = statusInfo.isCancelled;

  const statusText = statusInfo.statusText;
  const receiptTitle = statusInfo.receiptTitle;
  const totalLabel = statusInfo.totalLabelUpper;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ticket_TETRA_HATS_${ord.id}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    @media print {
      body { background-color: #ffffff !important; color: #000000 !important; }
      .no-print { display: none !important; }
      .ticket-container { border: 1px solid #000000 !important; background: #ffffff !important; color: #000000 !important; }
      .brand-name, .value { color: #000000 !important; }
      .value.highlight { color: #047857 !important; }
      .info-card { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; }
      th { color: #475569 !important; border-bottom: 1px solid #cbd5e1 !important; }
      td { border-bottom: 1px solid #f1f5f9 !important; color: #0f172a !important; }
      .total-container { background: #f0fdf4 !important; border: 1px solid #10b981 !important; }
      .total-val { color: #047857 !important; }
    }
    body { font-family: sans-serif; background: #0a0a0a; color: #f0f0f0; margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; }
    .no-print-bar { width: 100%; max-width: 600px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; background: #171717; padding: 12px 20px; border-radius: 8px; border: 1px solid #262626; box-sizing: border-box; }
    .print-btn { background: #10b981; color: #000; border: none; padding: 10px 20px; font-weight: 900; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; border-radius: 6px; cursor: pointer; }
    .ticket-container { width: 100%; max-width: 600px; background-color: #111; border: 1px solid #282828; border-radius: 12px; padding: 30px; box-sizing: border-box; }
    .brand-header { text-align: center; border-bottom: 1px solid #222; padding-bottom: 20px; margin-bottom: 25px; }
    .brand-logo { max-height: 50px; margin-bottom: 10px; filter: brightness(0) invert(1); }
    .brand-name { font-size: 22px; font-weight: 900; letter-spacing: 4px; text-transform: uppercase; color: #fff; margin: 5px 0 0 0; }
    .receipt-title { display: inline-block; margin-top: 12px; padding: 4px 14px; background: rgba(16, 185, 129, 0.12); border: 1px solid #10b981; color: #10b981; font-size: 10px; font-weight: 800; letter-spacing: 2px; border-radius: 20px; text-transform: uppercase; }
    .section-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #10b981; margin-bottom: 10px; }
    .info-card { background: #181818; border: 1px solid #2a2a2a; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .info-item { font-size: 11px; }
    .label { font-size: 9px; text-transform: uppercase; color: #888; letter-spacing: 1px; margin-bottom: 2px; font-weight: 700; }
    .value { font-weight: 700; color: #fff; word-break: break-word; }
    .value.highlight { color: #10b981; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
    th { text-align: left; font-size: 9px; text-transform: uppercase; color: #777; letter-spacing: 1px; padding-bottom: 8px; border-bottom: 1px solid #282828; }
    td { padding: 10px 0; border-bottom: 1px solid #1e1e1e; color: #ddd; }
    .total-container { background: #000; border: 1px solid #10b981; border-radius: 8px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
    .total-label { font-size: 11px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #aaa; }
    .total-val { font-size: 22px; font-weight: 900; color: #10b981; letter-spacing: 1px; }
    .footer-stamp { text-align: center; border-top: 1px solid #222; padding-top: 20px; font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 1px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="no-print-bar no-print">
    <div style="font-size: 11px; font-weight: 800; color: #fff; text-transform: uppercase;">
      📄 TICKET COMPROBANTE OFICIAL (FORMATO PDF)
    </div>
    <button class="print-btn" onclick="window.print()">🖨️ GUARDAR COMO PDF / IMPRIMIR</button>
  </div>

  <div class="ticket-container">
    <div class="brand-header">
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="brand-logo" />` : ''}
      <h1 class="brand-name">TETRA HATS</h1>
      <div class="receipt-title">${receiptTitle}</div>
    </div>

    <div class="section-title">INFORMACIÓN GENERAL DE LA COMPRA</div>
    <div class="info-card">
      <div class="info-grid">
        <div class="info-item">
          <div class="label">ID DE COMPRA</div>
          <div class="value highlight">${ord.id}</div>
        </div>
        <div class="info-item">
          <div class="label">FECHA Y HORA</div>
          <div class="value">${dateStr}</div>
        </div>
        <div class="info-item">
          <div class="label">ESTADO DE ORDEN</div>
          <div class="value highlight" style="${!isPaid ? (isCancelled ? 'color:#ef4444!important;' : 'color:#f59e0b!important;') : ''}">${statusText}</div>
        </div>
        <div class="info-item">
          <div class="label">GUÍA DE RASTREO</div>
          <div class="value">${ord.trackingNumber || "PENDIENTE"}</div>
        </div>
      </div>
    </div>

    <div class="section-title">DATOS DEL CLIENTE Y ENVÍO</div>
    <div class="info-card">
      <div class="info-grid">
        <div class="info-item">
          <div class="label">NOMBRE</div>
          <div class="value">${ord.userName || "Cliente"}</div>
        </div>
        <div class="info-item">
          <div class="label">TELÉFONO</div>
          <div class="value">${ord.buyerPhone || "N/A"}</div>
        </div>
        <div class="info-item" style="grid-column: span 2;">
          <div class="label">CORREO ELECTRÓNICO (SEGUIMIENTO)</div>
          <div class="value highlight">${ord.userEmail || "N/A"}</div>
        </div>
        <div class="info-item" style="grid-column: span 2;">
          <div class="label">DIRECCIÓN DE ENVÍO</div>
          <div class="value">${ord.shippingAddress || "Sin Dirección"}</div>
        </div>
      </div>
    </div>

    <div style="margin: 16px 0; padding: 12px 16px; background-color: #1e112a; border: 1px solid #9333ea; border-radius: 8px; color: #e9d5ff; font-size: 11px; font-weight: 800; text-transform: uppercase; line-height: 1.5;">
      🚚 AVISO: SE TE HARA LLEGAR TU GUIA DE SEGUIMIENTO DE ENVIO A TU CORREO O WHATSAPP PERSONAL EN LOS PROXIMOS 2 DIAS HABILES...
    </div>

    <div class="section-title">PRODUCTOS ADQUIRIDOS</div>
    <table>
      <thead>
        <tr>
          <th>PRODUCTO</th>
          <th style="text-align: center;">CANT</th>
          <th style="text-align: right;">TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${(Array.isArray(ord.items) ? ord.items : []).map(item => `
          <tr>
            <td><strong>${item.productName || "Gorra"}</strong></td>
            <td style="text-align: center; font-weight: bold;">${item.quantity || 1}</td>
            <td style="text-align: right; font-weight: bold; color: #ffffff;">$ ${((item.priceMXN || 0) * (item.quantity || 1)).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="total-container">
      <div class="total-label">${totalLabel}</div>
      <div class="total-val">$ ${(ord.totalMXN || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN</div>
    </div>

    <div class="footer-stamp">
      <p style="margin: 0 0 4px 0; font-weight: 800; color: #888888;">TETRA HATS — COMPROBANTE OFICIAL DE COMPRA</p>
      <p style="margin: 0;">SELLO DE AUTENTICIDAD FIRESTORE ENCRIPTADO</p>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const printWin = window.open(url, "_blank");
  if (!printWin) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `Ticket_TETRA_HATS_${ord.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};

const sendOrderEmailPDF = (ord: Order, logoUrl?: string) => {
  const adminEmail = "hugocesarlemuscortes@gmail.com";
  const isPaid = ord.status === "PAGO_RECIBIDO" || (ord.status as string) === "COMPLETADO" || ord.status === "EMPACADO" || ord.status === "ENVIADO" || ord.status === "ENTREGADO";
  const subject = encodeURIComponent(`[TETRA HATS] Comprobante PDF de Compra #${ord.id}`);
  const itemsText = (Array.isArray(ord.items) ? ord.items : []).map(i => `- ${i.productName || "Gorra"} (${i.quantity || 1} pza) : $${((i.priceMXN || 0) * (i.quantity || 1)).toLocaleString()} MXN`).join('\n');
  const totalMXN = typeof ord.totalMXN === "number" ? ord.totalMXN : 0;
  const totalUSD = typeof ord.totalUSD === "number" ? ord.totalUSD : Math.round(totalMXN / 20);
  const body = encodeURIComponent(
    `Hola ${ord.userName || "Cliente"},\n\n` +
    `Adjuntamos tu comprobante oficial en formato PDF para la orden de compra #${ord.id}.\n\n` +
    `RESUMEN DE TU COMPRA:\n` +
    `• ID de Compra: ${ord.id}\n` +
    `• ${isPaid ? "Total Pagado" : "Total a Pagar (Pendiente)"}: $${totalMXN.toLocaleString()} MXN / $${totalUSD.toLocaleString()} USD\n` +
    `• Estado de Pago: ${ord.status || "PAGO_PENDIENTE"}\n` +
    `• Guía de Envío: ${ord.trackingNumber || "En preparación"}\n` +
    `• Dirección de Envío: ${ord.shippingAddress || "Sin Dirección"}\n` +
    `• AVISO DE SEGUIMIENTO: SE TE HARA LLEGAR TU GUIA DE SEGUIMIENTO DE ENVIO A TU CORREO O WHATSAPP PERSONAL EN LOS PROXIMOS 2 DIAS HABILES...\n\n` +
    `PRODUCTOS ADQUIRIDOS:\n${itemsText}\n\n` +
    `Atentamente,\n` +
    `Hugo César Lemus Cortés — Administrador TETRA HATS\n` +
    `Correo Administrador: ${adminEmail}\n`
  );

  window.open(`mailto:${ord.userEmail || ""}?cc=${adminEmail}&subject=${subject}&body=${body}`, '_blank');
};

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const {
    currentUser,
    siteConfig,
    products,
    reviews,
    saveReview,
    deleteReview,
    orders,
    contactMessages,
    authenticCodes,
    visualEditMode,
    setVisualEditMode,
    updateSiteConfig,
    saveProduct,
    deleteProduct,
    updateOrder,
    deleteOrder,
    markMessageRead,
    deleteMessage,
    saveAuthenticCode,
    deleteAuthenticCode,
    logout
  } = useSite();

  const [activeTab, setActiveTab] = useState<"site" | "products" | "orders" | "reviews">("site");
  const [reviewFilter, setReviewFilter] = useState<"all" | "pending" | "approved">("all");
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  const SEMAFORO_STATUSES = ORDER_SEMAFORO_LIST;
  const getNormalizedSemAforoKey = (rawStatus: string) => normalizeOrderStatus(rawStatus);
  const [isAdminCustomStock, setIsAdminCustomStock] = useState(false);
  const [editingCode, setEditingCode] = useState<Partial<AuthenticCode> | null>(null);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [stripeSecretInput, setStripeSecretInput] = useState(siteConfig.stripeSecretKey || "");
  const [stripePublishableInput, setStripePublishableInput] = useState(siteConfig.stripePublishableKey || "");
  const [isSavingStripeKey, setIsSavingStripeKey] = useState(false);

  const [stripeVerification, setStripeVerification] = useState<{
    loading: boolean;
    valid: boolean | null;
    message: string;
    livemode?: boolean;
    currency?: string;
  }>({
    loading: false,
    valid: null,
    message: ""
  });

  useEffect(() => {
    setStripeSecretInput(siteConfig.stripeSecretKey || "");
    setStripePublishableInput(siteConfig.stripePublishableKey || "");
  }, [siteConfig.stripeSecretKey, siteConfig.stripePublishableKey]);

  const handleVerifyStripeKeys = async (secretOverride?: string) => {
    const keyToTest = secretOverride !== undefined
      ? secretOverride
      : stripeSecretInput.replace(/["'\s]/g, "").trim();

    if (!keyToTest) {
      setStripeVerification({
        loading: false,
        valid: false,
        message: "⚠️ No hay ninguna Clave Secreta ingresada. Por favor ingresa tu Secret Key (sk_live_... o sk_test_...)."
      });
      return;
    }

    setStripeVerification((prev) => ({ ...prev, loading: true }));
    try {
      const result = await verifyStripeKey(keyToTest);
      setStripeVerification({
        loading: false,
        valid: result.valid,
        message: result.message,
        livemode: result.livemode,
        currency: result.currency
      });
    } catch (err: any) {
      setStripeVerification({
        loading: false,
        valid: false,
        message: `❌ Error al verificar clave: ${err?.message || "Comprueba tu conexión a internet"}`
      });
    }
  };

  useEffect(() => {
    if (siteConfig.stripeSecretKey && siteConfig.stripeSecretKey.trim()) {
      handleVerifyStripeKeys(siteConfig.stripeSecretKey.trim());
    } else {
      setStripeVerification({
        loading: false,
        valid: null,
        message: "Sin clave configurada. Ingrese su clave secreta de Stripe para verificar."
      });
    }
  }, [siteConfig.stripeSecretKey]);

  const handleSaveStripeKeys = async () => {
    setIsSavingStripeKey(true);
    try {
      const cleanSecret = stripeSecretInput.replace(/["'\s]/g, "").trim();
      const cleanPublishable = stripePublishableInput.replace(/["'\s]/g, "").trim();
      await updateSiteConfig({
        stripeSecretKey: cleanSecret,
        stripePublishableKey: cleanPublishable,
      });
      showNotification("⚡ Claves de Stripe guardadas correctamente.");
      await handleVerifyStripeKeys(cleanSecret);
    } catch (err) {
      showNotification("❌ Error al guardar las claves de Stripe.");
    } finally {
      setIsSavingStripeKey(false);
    }
  };

  const ADMIN_PRESET_STOCKS = [0, 1, 2, 3, 5, 10, 15, 20, 25, 50, 100];

  useEffect(() => {
    if (editingProduct && editingProduct.stockQuantity !== undefined) {
      setIsAdminCustomStock(!ADMIN_PRESET_STOCKS.includes(editingProduct.stockQuantity));
    }
  }, [editingProduct?.id]);

  const [confirmDelete, setConfirmDelete] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // Convert array back/forth to comma-separated fields
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.id || !editingProduct.name) return;

    const stockQty = editingProduct.stockQuantity !== undefined ? Math.max(0, Number(editingProduct.stockQuantity)) : 10;

    const formattedProduct: Product = {
      id: editingProduct.id,
      name: editingProduct.name.toUpperCase(),
      priceMXN: Number(editingProduct.priceMXN || 0),
      priceUSD: Number(editingProduct.priceUSD || 0),
      originalPriceMXN: editingProduct.originalPriceMXN ? Number(editingProduct.originalPriceMXN) : undefined,
      images: Array.isArray(editingProduct.images) ? editingProduct.images : [editingProduct.images || ""],
      description: editingProduct.description || "",
      stockQuantity: stockQty,
      outOfStock: stockQty === 0 ? true : !!editingProduct.outOfStock,
      category: (editingProduct.category as any) || "NIGHTMARES",
      badge: editingProduct.badge || "",
      details: Array.isArray(editingProduct.details) ? editingProduct.details : []
    };

    try {
      await saveProduct(formattedProduct);
      setEditingProduct(null);
      showNotification("✅ Producto guardado correctamente en Firestore.");
    } catch (err: any) {
      console.error("Error guardando producto:", err);
      showNotification("❌ Error de permisos: Verifica haber iniciado sesión con hugocesarlemuscortes@gmail.com");
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCode || !editingCode.code || !editingCode.owner) return;

    const formattedCode: AuthenticCode = {
      code: editingCode.code.toUpperCase().trim(),
      owner: editingCode.owner,
      status: editingCode.status || "VERIFICADA",
      date: editingCode.date || new Date().toISOString().split("T")[0],
      item: editingCode.item || "Modelo Desconocido"
    };

    try {
      await saveAuthenticCode(formattedCode);
      setEditingCode(null);
      showNotification("✅ Código de autenticación registrado.");
    } catch (err: any) {
      console.error("Error guardando código:", err);
      showNotification("❌ Error de permisos al registrar código de autenticidad.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col md:flex-row text-white font-sans antialiased">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-80 bg-neutral-950 border-b md:border-b-0 md:border-r border-neutral-800 p-6 flex flex-col justify-between">
        <div className="space-y-8">
          {/* Header BRAND Title */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-emerald-400 font-black tracking-widest uppercase block animate-pulse">● CONSOLA DE MANDO</span>
              <h2 className="text-xl font-black uppercase tracking-[0.3em]">ADMIN PANEL</h2>
            </div>
            <button 
              onClick={onClose} 
              className="md:hidden text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Logged Info */}
          <div className="bg-neutral-900 border border-neutral-800 p-4 rounded flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold uppercase text-xs">
              {currentUser?.email ? currentUser.email.substring(0,2) : "AD"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Sesión Iniciada como</p>
              <p className="text-xs font-black truncate text-gray-300">{currentUser?.email}</p>
            </div>
          </div>

          {/* Quick Realtime Visual Switcher */}
          <div className="bg-neutral-900/40 p-4 border border-neutral-800 rounded space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-emerald-400" />
                <span className="text-xs font-black tracking-wider uppercase">Editor Visual Directo</span>
              </div>
              <button
                onClick={() => setVisualEditMode(!visualEditMode)}
                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  visualEditMode ? "bg-emerald-500" : "bg-neutral-800"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                    visualEditMode ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 leading-normal uppercase">
              {visualEditMode 
                ? "SÍ: Puedes hacer clic en los lápices para editar textos y productos directo en la web." 
                : "NO: Usa esta consola central para cambiar los elementos."}
            </p>
          </div>

          {/* Navigation Tab lists */}
          <nav className="space-y-1">
            <button
              onClick={() => { setActiveTab("site"); setEditingProduct(null); setEditingCode(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded text-left text-xs font-bold tracking-widest uppercase transition-all ${
                activeTab === "site" ? "bg-emerald-500 text-black shadow-lg" : "text-gray-400 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <Sliders size={15} />
              <span>Personalizar Web</span>
            </button>

            <button
              onClick={() => { setActiveTab("products"); setEditingProduct(null); setEditingCode(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded text-left text-xs font-bold tracking-widest uppercase transition-all ${
                activeTab === "products" ? "bg-emerald-500 text-black shadow-lg" : "text-gray-400 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <ShoppingBag size={15} />
              <span>Gamas y Modelos ({products.length})</span>
            </button>

            <button
              onClick={() => { setActiveTab("orders"); setEditingProduct(null); setEditingCode(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded text-left text-xs font-bold tracking-widest uppercase transition-all ${
                activeTab === "orders" ? "bg-emerald-500 text-black shadow-lg" : "text-gray-400 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <Truck size={15} />
              <span>Pagos y Envíos ({orders.length})</span>
            </button>

            <button
              onClick={() => { setActiveTab("reviews"); setEditingProduct(null); setEditingCode(null); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded text-left text-xs font-bold tracking-widest uppercase transition-all ${
                activeTab === "reviews" ? "bg-emerald-500 text-black shadow-lg" : "text-gray-400 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Star size={15} />
                <span>Opiniones ({reviews.length})</span>
              </div>
              {reviews.filter(r => r.approved === false).length > 0 && (
                <span className="px-2 py-0.5 bg-amber-500 text-black font-black text-[9px] rounded-full animate-pulse">
                  {reviews.filter(r => r.approved === false).length} PENDIENTES
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Action Bottom buttons */}
        <div className="pt-6 border-t border-neutral-900 space-y-4">
          <button
            onClick={() => { logout(); onClose(); }}
            className="w-full text-center px-4 py-3 text-[10px] font-black tracking-widest uppercase border border-neutral-800 text-red-400 rounded hover:bg-neutral-900 transition-colors cursor-pointer"
          >
            Cerrar Sesión Admin
          </button>
          <button
            onClick={onClose}
            className="w-full text-center px-4 py-3 text-[10px] font-black tracking-widest uppercase bg-white text-black rounded hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Ver Cambios en la Web
          </button>
        </div>
      </div>

      {/* Main Panel Content Workspace Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8">
        
        {/* Realtime Action alert feedback notifications */}
        {successMsg && (
          <div className="fixed top-6 right-6 z-50 bg-emerald-500 text-black text-xs font-bold px-6 py-4 rounded shadow-2xl tracking-widest uppercase flex items-center gap-2 border border-emerald-400">
            <Check size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: Site Customization */}
        {activeTab === "site" && (
          <div className="space-y-8 max-w-4xl">
            <div className="border-b border-neutral-900 pb-4">
              <h3 className="text-xl font-black uppercase tracking-widest">Ajuste de Visuales y Textos</h3>
              <p className="text-xs text-gray-500 mt-1 uppercase">Cambia la estética, logos y descripciones en tiempo real</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CONFIGURACIÓN DIRECTA STRIPE */}
              <div className="md:col-span-2 p-5 bg-gradient-to-r from-purple-950/40 via-neutral-900 to-indigo-950/40 border border-purple-500/50 rounded-xl space-y-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30">
                    <CreditCard size={22} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                      <span>CONFIGURACIÓN DE PASARELA STRIPE</span>
                      <span className="text-[9px] bg-purple-600 text-white px-2 py-0.5 rounded font-black tracking-widest uppercase">
                        RECOMENDADA / MÁS FÁCIL Y DIRECTA
                      </span>
                    </h4>
                    <p className="text-xs text-purple-200/80 mt-0.5">
                      Stripe no rechaza tarjetas por conflicto de titular. Acepta todas las tarjetas de Débito y Crédito (Visa, Mastercard, AMEX) en México e internacionalmente al instante.
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold px-2 py-0.5 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        PAGOS ACTIVOS EN TETRA-HATS.COM Y WEB PUBLICADA
                      </span>
                      <span className="text-[9px] text-purple-300/80 font-mono">
                        CORS y redirección de retorno automáticos
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-[10px] text-purple-300 font-extrabold uppercase tracking-widest block">
                      Clave Secreta de Stripe (Secret Key)
                    </label>
                    <input
                      type="password"
                      value={stripeSecretInput}
                      onChange={(e) => setStripeSecretInput(e.target.value)}
                      className="w-full bg-black/90 border border-purple-500/40 rounded p-3 text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-400 transition-colors"
                      placeholder="sk_live_... o sk_test_..."
                    />
                    <p className="text-[9px] text-gray-400">
                      Obtenla en <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer" className="underline text-purple-400">dashboard.stripe.com/apikeys</a>.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-purple-300 font-extrabold uppercase tracking-widest block">
                      Clave Publicable (Publishable Key - Opcional)
                    </label>
                    <input
                      type="text"
                      value={stripePublishableInput}
                      onChange={(e) => setStripePublishableInput(e.target.value)}
                      className="w-full bg-black/90 border border-purple-500/40 rounded p-3 text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-400 transition-colors"
                      placeholder="pk_live_... o pk_test_..."
                    />
                    <p className="text-[9px] text-gray-400">
                      Tu Clave Publicable de Stripe.
                    </p>
                  </div>
                </div>

                {/* Banner de Estado de Verificación Directa de Stripe */}
                <div className={`p-4 rounded-xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                  stripeVerification.loading
                    ? "bg-purple-900/30 border-purple-500/50 text-purple-200"
                    : stripeVerification.valid === true
                    ? "bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-lg shadow-emerald-950/50"
                    : stripeVerification.valid === false
                    ? "bg-red-950/80 border-red-500 text-red-200 shadow-lg shadow-red-950/50"
                    : "bg-black/60 border-purple-500/30 text-gray-400"
                }`}>
                  <div className="flex items-start gap-3">
                    {stripeVerification.loading ? (
                      <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin shrink-0 mt-0.5" />
                    ) : stripeVerification.valid === true ? (
                      <ShieldCheck size={22} className="text-emerald-400 shrink-0 mt-0.5" />
                    ) : stripeVerification.valid === false ? (
                      <CircleAlert size={22} className="text-red-400 shrink-0 mt-0.5" />
                    ) : (
                      <Activity size={22} className="text-purple-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-extrabold text-[11px] uppercase tracking-wider block">
                        DIAGNÓSTICO EN TIEMPO REAL: {
                          stripeVerification.loading 
                            ? "CONECTANDO Y PROBANDO CLAVE CON STRIPE API..." 
                            : stripeVerification.valid === true 
                            ? (stripeVerification.livemode ? "✅ CLAVE VÁLIDA Y ACTIVA (MODO PRODUCCIÓN LIVE)" : "✅ CLAVE VÁLIDA Y ACTIVA (MODO PRUEBAS TEST)")
                            : stripeVerification.valid === false
                            ? "❌ CLAVE INVALIDA O RECHAZADA"
                            : "PENDIENTE DE VERIFICACIÓN"
                        }
                      </span>
                      <p className="text-[11px] opacity-90 mt-1 leading-relaxed font-mono">
                        {stripeVerification.message || "Presiona 'PROBAR CONEXIÓN' para verificar inmediatamente si la clave funciona."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleVerifyStripeKeys()}
                    disabled={stripeVerification.loading}
                    className="shrink-0 w-full sm:w-auto px-4 py-2 bg-purple-900/90 hover:bg-purple-800 text-purple-100 text-[10px] font-black uppercase tracking-widest rounded-lg border border-purple-400/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    <Activity size={14} />
                    <span>{stripeVerification.loading ? "PROBANDO..." : "PROBAR CONEXIÓN"}</span>
                  </button>
                </div>

                <div className="pt-3 border-t border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-[10px] text-purple-300/80 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    <span>Tus claves se guardan encriptadas de forma segura.</span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleSaveStripeKeys}
                      disabled={isSavingStripeKey}
                      className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs tracking-widest uppercase rounded-lg shadow-lg hover:shadow-purple-500/25 transition-all flex items-center justify-center gap-2 border border-purple-400/40 active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <Check size={16} />
                      <span>{isSavingStripeKey ? "GUARDANDO..." : "GUARDAR Y VERIFICAR CLAVE"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* APARTADO DE PRUEBA DE PAGO (TEST CHECKOUT) */}
              <div className="md:col-span-2 p-5 bg-gradient-to-r from-amber-950/40 via-neutral-900 to-yellow-950/30 border border-amber-500/50 rounded-xl space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
                      <FlaskConical size={22} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                        <span>MODO DE PRUEBA DE PAGO (TEST CHECKOUT)</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-black tracking-widest uppercase ${
                          siteConfig.testCheckoutActive 
                            ? "bg-amber-400 text-black animate-pulse" 
                            : "bg-neutral-800 text-gray-400"
                        }`}>
                          {siteConfig.testCheckoutActive ? "⚡ MODO PRUEBA ACTIVO" : "INACTIVO / MODO NORMAL"}
                        </span>
                      </h4>
                      <p className="text-xs text-amber-200/80 mt-0.5">
                        Activa o desactiva este modo para realizar cobros reales de prueba con tarjeta por montos pequeños (ej. $11.00 MXN) en la gorra que elijas.
                      </p>
                    </div>
                  </div>

                  {/* Interruptor Switch On/Off */}
                  <div className="flex items-center gap-3 self-start sm:self-center bg-black/60 px-3 py-2 rounded-lg border border-amber-500/30">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                      {siteConfig.testCheckoutActive ? "ACTIVADO" : "DESACTIVADO"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newActive = !siteConfig.testCheckoutActive;
                        updateSiteConfig({ 
                          testCheckoutActive: newActive,
                          testCheckoutAmountMXN: siteConfig.testCheckoutAmountMXN || 11,
                          testCheckoutProductId: siteConfig.testCheckoutProductId || (products[0]?.id || "")
                        });
                        setSuccessMsg(newActive ? "⚡ Modo prueba de pago ACTIVADO ($" + (siteConfig.testCheckoutAmountMXN || 11) + " MXN)" : "Modo prueba de pago DESACTIVADO");
                        setTimeout(() => setSuccessMsg(""), 3500);
                      }}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        siteConfig.testCheckoutActive ? "bg-amber-400" : "bg-neutral-800"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                          siteConfig.testCheckoutActive ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Selector de Producto */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-amber-300 font-extrabold uppercase tracking-widest block">
                      Gorra / Modelo para la Prueba
                    </label>
                    <select
                      value={siteConfig.testCheckoutProductId || ""}
                      onChange={(e) => {
                        updateSiteConfig({ testCheckoutProductId: e.target.value });
                        setSuccessMsg("Gorra de prueba actualizada");
                        setTimeout(() => setSuccessMsg(""), 2500);
                      }}
                      className="w-full bg-black/90 border border-amber-500/40 rounded p-3 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors uppercase font-bold cursor-pointer"
                    >
                      <option value="">-- Todas las Gorras / Primer Producto --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Precio regular: ${(p.priceMXN || 0).toLocaleString()} MXN)
                        </option>
                      ))}
                    </select>
                    <p className="text-[9px] text-gray-400">
                      Selecciona con cuál modelo se aplicará el monto de prueba durante el checkout.
                    </p>
                  </div>

                  {/* Monto de Prueba */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-amber-300 font-extrabold uppercase tracking-widest block flex items-center justify-between">
                      <span>Monto de Prueba (MXN)</span>
                      <span className="text-[9px] text-amber-400/80 font-normal">Mínimo Stripe: $10.00 MXN</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-3 text-amber-400 font-mono font-bold text-xs">$</span>
                        <input
                          type="number"
                          min="10"
                          step="1"
                          value={siteConfig.testCheckoutAmountMXN ?? 11}
                          onChange={(e) => {
                            const val = Math.max(10, Number(e.target.value) || 10);
                            updateSiteConfig({ testCheckoutAmountMXN: val });
                          }}
                          className="w-full bg-black/90 border border-amber-500/40 rounded p-3 pl-7 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-400 transition-colors font-bold"
                          placeholder="11"
                        />
                        <span className="absolute right-3 top-3 text-amber-400/70 font-mono font-bold text-xs">MXN</span>
                      </div>
                    </div>
                    {/* Botones de montos rápidos */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[9px] text-gray-400 uppercase font-extrabold mr-1 self-center">Presets rápidos:</span>
                      {[11, 15, 20, 50, 100].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            updateSiteConfig({ testCheckoutAmountMXN: amt });
                            setSuccessMsg(`Monto fijado en $${amt} MXN`);
                            setTimeout(() => setSuccessMsg(""), 2000);
                          }}
                          className={`px-2.5 py-1 rounded text-[10px] font-mono font-extrabold transition-all cursor-pointer ${
                            (siteConfig.testCheckoutAmountMXN || 11) === amt
                              ? "bg-amber-400 text-black shadow font-black scale-105"
                              : "bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-neutral-700"
                          }`}
                        >
                          ${amt} MXN
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Resumen & Estado explicativo */}
                <div className="p-3 bg-black/50 border border-amber-500/20 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-amber-200">
                    <span className={`w-2 h-2 rounded-full ${siteConfig.testCheckoutActive ? 'bg-amber-400 animate-pulse' : 'bg-neutral-600'}`} />
                    <span className="text-[11px] font-mono">
                      {siteConfig.testCheckoutActive
                        ? `⚡ MODO PRUEBA ACTIVO: ${products.find(p => p.id === siteConfig.testCheckoutProductId)?.name || "Gorra seleccionada"} se cobrará a $${siteConfig.testCheckoutAmountMXN || 11}.00 MXN en el checkout.`
                        : `Modo Normal: Todas las gorras se cobran a su precio regular oficial.`}
                    </span>
                  </div>

                  {siteConfig.testCheckoutActive && (
                    <button
                      type="button"
                      onClick={() => {
                        updateSiteConfig({ testCheckoutActive: false });
                        setSuccessMsg("Modo prueba DESACTIVADO");
                        setTimeout(() => setSuccessMsg(""), 3000);
                      }}
                      className="px-3 py-1 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 text-[10px] font-black uppercase tracking-wider rounded transition-all cursor-pointer whitespace-nowrap"
                    >
                      Desactivar Modo Prueba
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Título Primario del Hero</label>
                <input
                  type="text"
                  value={siteConfig.heroTitle1}
                  onChange={(e) => updateSiteConfig({ heroTitle1: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors uppercase"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Logo Principal (Image URL)</label>
                <input
                  type="text"
                  value={siteConfig.headerLogo}
                  onChange={(e) => updateSiteConfig({ headerLogo: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Descripción / Subtítulo del Hero</label>
                <textarea
                  value={siteConfig.heroSubtitle}
                  onChange={(e) => updateSiteConfig({ heroSubtitle: e.target.value })}
                  rows={2}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Mensaje de Barra Promocional Superior</label>
                <input
                  type="text"
                  value={siteConfig.bannerMessage}
                  onChange={(e) => updateSiteConfig({ bannerMessage: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Color de Acento en Hex (ej: #10b981)</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={siteConfig.accentColor}
                    onChange={(e) => updateSiteConfig({ accentColor: e.target.value })}
                    className="h-11 w-11 bg-neutral-950 border border-neutral-800 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={siteConfig.accentColor}
                    onChange={(e) => updateSiteConfig({ accentColor: e.target.value })}
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors uppercase"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest flex items-center justify-between">
                  <span>Video del Hero (Cloudinary, Google Drive o .mp4)</span>
                  <span className="text-emerald-400 text-[9px] font-bold">Aceleración CDN Automática</span>
                </label>
                <input
                  type="text"
                  value={siteConfig.heroVideo || ""}
                  placeholder="https://res.cloudinary.com/... o https://drive.google.com/..."
                  onChange={(e) => updateSiteConfig({ heroVideo: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-neutral-700 font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest flex items-center justify-between">
                  <span>Video ONDGAS (Cloudinary, Google Drive o .mp4)</span>
                  <span className="text-emerald-400 text-[9px] font-bold">Auto-optimizado</span>
                </label>
                <input
                  type="text"
                  value={siteConfig.experienceVideo || ""}
                  placeholder="https://res.cloudinary.com/... o https://drive.google.com/..."
                  onChange={(e) => updateSiteConfig({ experienceVideo: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-neutral-700 font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest flex items-center justify-between">
                  <span>Miniatura / Preview ONDGAS (URL de Imagen o Poster)</span>
                  {siteConfig.experiencePoster ? (
                    <span className="text-emerald-400 text-[9px] font-bold">Personalizado</span>
                  ) : (
                    <span className="text-gray-500 text-[9px]">Autogenerado de Cloudinary / Foto Oficial</span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={siteConfig.experiencePoster || ""}
                    placeholder="https://... (dejar vacío para extraer fotograma automático)"
                    onChange={(e) => updateSiteConfig({ experiencePoster: e.target.value })}
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-neutral-700 font-mono text-xs"
                  />
                  {siteConfig.experiencePoster && (
                    <img 
                      src={siteConfig.experiencePoster} 
                      alt="Preview ONDGAS" 
                      className="w-11 h-11 object-cover rounded border border-neutral-700" 
                      onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest flex items-center justify-between">
                  <span>Video 800 DÍAS (Cloudinary, Google Drive o .mp4)</span>
                  <span className="text-emerald-400 text-[9px] font-bold">Auto-optimizado</span>
                </label>
                <input
                  type="text"
                  value={siteConfig.experienceVideo2 || ""}
                  placeholder="https://res.cloudinary.com/... o https://drive.google.com/..."
                  onChange={(e) => updateSiteConfig({ experienceVideo2: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-neutral-700 font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest flex items-center justify-between">
                  <span>Miniatura / Preview 800 DÍAS (URL de Imagen o Poster)</span>
                  {siteConfig.experiencePoster2 ? (
                    <span className="text-emerald-400 text-[9px] font-bold">Personalizado</span>
                  ) : (
                    <span className="text-gray-500 text-[9px]">Autogenerado de Cloudinary / Foto Oficial</span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={siteConfig.experiencePoster2 || ""}
                    placeholder="https://... (dejar vacío para extraer fotograma automático)"
                    onChange={(e) => updateSiteConfig({ experiencePoster2: e.target.value })}
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-neutral-700 font-mono text-xs"
                  />
                  {siteConfig.experiencePoster2 && (
                    <img 
                      src={siteConfig.experiencePoster2} 
                      alt="Preview 800 DIAS" 
                      className="w-11 h-11 object-cover rounded border border-neutral-700" 
                      onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Título Sección Experiencia</label>
                <input
                  type="text"
                  value={siteConfig.experienceTitle}
                  onChange={(e) => updateSiteConfig({ experienceTitle: e.target.value.toUpperCase() })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors uppercase"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Subtítulo Sección Experiencia</label>
                <input
                  type="text"
                  value={siteConfig.experienceSubtitle}
                  onChange={(e) => updateSiteConfig({ experienceSubtitle: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest font-black">WhatsApp Enlace Directo (Número)</label>
                <input
                  type="text"
                  value={siteConfig.whatsappNumber}
                  onChange={(e) => updateSiteConfig({ whatsappNumber: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest font-black">Instagram URL</label>
                <input
                  type="text"
                  value={siteConfig.instagramUrl}
                  onChange={(e) => updateSiteConfig({ instagramUrl: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Créditos de Artistas / Barra de Familias</label>
                <textarea
                  value={siteConfig.artistCredits}
                  onChange={(e) => updateSiteConfig({ artistCredits: e.target.value })}
                  rows={2}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Copyright del Footer</label>
                <input
                  type="text"
                  value={siteConfig.footerText}
                  onChange={(e) => updateSiteConfig({ footerText: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors uppercase text-xs"
                />
              </div>

              {/* Footer Customization Fields */}
              <div className="md:col-span-2 pt-6 border-t border-neutral-900 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-neutral-900 rounded text-emerald-400">
                    <Settings size={16} />
                  </span>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider text-white">Configuración del Pie de Página (Footer)</h4>
                    <p className="text-[10px] text-gray-500 uppercase">Modifica textos, boletines, redes sociales y logotipos inferiores</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-900/10 p-4 border border-neutral-900 rounded-lg">
                  <div className="space-y-2">
                    <label className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest">Etiqueta del Boletín</label>
                    <input
                      type="text"
                      value={siteConfig.newsletterBadge || ""}
                      onChange={(e) => updateSiteConfig({ newsletterBadge: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-xs focus:outline-none focus:border-emerald-500 transition-colors uppercase font-medium text-white"
                      placeholder="Únete a nuestra familia"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest">Título del Boletín</label>
                    <input
                      type="text"
                      value={siteConfig.newsletterTitle || ""}
                      onChange={(e) => updateSiteConfig({ newsletterTitle: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-xs focus:outline-none focus:border-emerald-500 transition-colors uppercase font-medium text-white"
                      placeholder="Regístrate en nuestra lista"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest">Descripción del Boletín</label>
                    <textarea
                      value={siteConfig.newsletterDescription || ""}
                      onChange={(e) => updateSiteConfig({ newsletterDescription: e.target.value })}
                      rows={2}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-xs focus:outline-none focus:border-emerald-500 transition-colors font-medium text-white"
                      placeholder="Sé el primero en recibir notificaciones..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest">Texto de Botón del Boletín</label>
                    <input
                      type="text"
                      value={siteConfig.newsletterButtonText || ""}
                      onChange={(e) => updateSiteConfig({ newsletterButtonText: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-xs focus:outline-none focus:border-emerald-500 transition-colors uppercase font-medium text-white"
                      placeholder="Suscribirme"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest">Logo de Pie de Página (Image URL)</label>
                    <input
                      type="text"
                      value={siteConfig.logoUrl || ""}
                      onChange={(e) => updateSiteConfig({ logoUrl: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-xs focus:outline-none focus:border-emerald-500 transition-colors font-medium text-white"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest">Descripción del Pie de Página</label>
                    <textarea
                      value={siteConfig.footerDescription || ""}
                      onChange={(e) => updateSiteConfig({ footerDescription: e.target.value })}
                      rows={2}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-xs focus:outline-none focus:border-emerald-500 transition-colors font-medium text-white"
                      placeholder="Marca líder en gorras..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest">Título Sección de Redes</label>
                    <input
                      type="text"
                      value={siteConfig.socialsTitle || ""}
                      onChange={(e) => updateSiteConfig({ socialsTitle: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-xs focus:outline-none focus:border-emerald-500 transition-colors uppercase font-medium text-white"
                      placeholder="Síguenos en Redes"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest">Enlace Instagram (URL)</label>
                    <input
                      type="text"
                      value={siteConfig.instagramUrl || ""}
                      onChange={(e) => updateSiteConfig({ instagramUrl: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-xs focus:outline-none focus:border-emerald-500 transition-colors font-medium text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest">Enlace TikTok (URL)</label>
                    <input
                      type="text"
                      value={siteConfig.tiktokUrl || ""}
                      onChange={(e) => updateSiteConfig({ tiktokUrl: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-xs focus:outline-none focus:border-emerald-500 transition-colors font-medium text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest">Derechos Reservados (Copyright)</label>
                    <input
                      type="text"
                      value={siteConfig.footerRights || ""}
                      onChange={(e) => updateSiteConfig({ footerRights: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-xs focus:outline-none focus:border-emerald-500 transition-colors uppercase font-medium text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest">Eslogan de Pie de Página</label>
                    <input
                      type="text"
                      value={siteConfig.footerSlogan || ""}
                      onChange={(e) => updateSiteConfig({ footerSlogan: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-xs focus:outline-none focus:border-emerald-500 transition-colors font-medium text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Sección de Términos y Políticas */}
              <div className="md:col-span-2 pt-6 border-t border-neutral-900 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-neutral-900 rounded text-emerald-400">
                    <ShieldCheck size={16} />
                  </span>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider text-white">Manual de Términos y Políticas</h4>
                    <p className="text-[10px] text-gray-500 uppercase">Modifica los títulos y textos descriptivos de la sección legal inferior</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Política de Privacidad */}
                  <div className="bg-neutral-900/10 border border-neutral-900 p-4 rounded-lg space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest block">1. Política de Privacidad</span>
                      <button
                        type="button"
                        onClick={() => updateSiteConfig({ policyPrivacyHidden: !siteConfig.policyPrivacyHidden })}
                        className={`text-[9px] px-2.5 py-1 rounded font-extrabold tracking-widest uppercase transition-all flex items-center gap-1 cursor-pointer select-none ${
                          siteConfig.policyPrivacyHidden 
                            ? "bg-blue-600 hover:bg-blue-500 text-white" 
                            : "bg-red-950/40 hover:bg-red-900 border border-red-900/40 text-red-400"
                        }`}
                      >
                        {siteConfig.policyPrivacyHidden ? <Eye size={10} /> : <Trash2 size={10} />}
                        <span>{siteConfig.policyPrivacyHidden ? "Restaurar" : "Borrar"}</span>
                      </button>
                    </div>
                    {siteConfig.policyPrivacyHidden && (
                      <div className="bg-red-950/10 border border-red-900/30 text-[9px] text-red-400 p-2 rounded uppercase font-bold tracking-wider text-center">
                        Este apartado está oculto/borrado del sitio público.
                      </div>
                    )}
                    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-opacity ${siteConfig.policyPrivacyHidden ? "opacity-30 pointer-events-none" : ""}`}>
                      <div className="space-y-2">
                        <label className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest">Título en Footer</label>
                        <input
                          type="text"
                          value={siteConfig.policyPrivacyName || ""}
                          onChange={(e) => updateSiteConfig({ policyPrivacyName: e.target.value })}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-xs focus:outline-none focus:border-emerald-500 transition-colors uppercase font-medium text-white"
                          placeholder="Política de Privacidad"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest">Contenido Legal</label>
                        <textarea
                          value={siteConfig.policyPrivacyContent || ""}
                          onChange={(e) => updateSiteConfig({ policyPrivacyContent: e.target.value })}
                          rows={2}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-xs focus:outline-none focus:border-emerald-500 transition-colors font-medium text-white"
                          placeholder="Detalles de la política..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Política de Reembolso */}
                  <div className="bg-neutral-900/10 border border-neutral-900 p-4 rounded-lg space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest block">2. Política de Reembolso</span>
                      <button
                        type="button"
                        onClick={() => updateSiteConfig({ policyRefundHidden: !siteConfig.policyRefundHidden })}
                        className={`text-[9px] px-2.5 py-1 rounded font-extrabold tracking-widest uppercase transition-all flex items-center gap-1 cursor-pointer select-none ${
                          siteConfig.policyRefundHidden 
                            ? "bg-blue-600 hover:bg-blue-500 text-white" 
                            : "bg-red-950/40 hover:bg-red-900 border border-red-900/40 text-red-400"
                        }`}
                      >
                        {siteConfig.policyRefundHidden ? <Eye size={10} /> : <Trash2 size={10} />}
                        <span>{siteConfig.policyRefundHidden ? "Restaurar" : "Borrar"}</span>
                      </button>
                    </div>
                    {siteConfig.policyRefundHidden && (
                      <div className="bg-red-950/10 border border-red-900/30 text-[9px] text-red-400 p-2 rounded uppercase font-bold tracking-wider text-center">
                        Este apartado está oculto/borrado del sitio público.
                      </div>
                    )}
                    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-opacity ${siteConfig.policyRefundHidden ? "opacity-30 pointer-events-none" : ""}`}>
                      <div className="space-y-2">
                        <label className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest">Título en Footer</label>
                        <input
                          type="text"
                          value={siteConfig.policyRefundName || ""}
                          onChange={(e) => updateSiteConfig({ policyRefundName: e.target.value })}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-xs focus:outline-none focus:border-emerald-500 transition-colors uppercase font-medium text-white"
                          placeholder="Política de Reembolso"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest">Contenido Legal</label>
                        <textarea
                          value={siteConfig.policyRefundContent || ""}
                          onChange={(e) => updateSiteConfig({ policyRefundContent: e.target.value })}
                          rows={2}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-xs focus:outline-none focus:border-emerald-500 transition-colors font-medium text-white"
                          placeholder="Detalles de la política..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Términos de Servicio */}
                  <div className="bg-neutral-900/10 border border-neutral-900 p-4 rounded-lg space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest block">3. Términos de Servicio</span>
                      <button
                        type="button"
                        onClick={() => updateSiteConfig({ policyTermsHidden: !siteConfig.policyTermsHidden })}
                        className={`text-[9px] px-2.5 py-1 rounded font-extrabold tracking-widest uppercase transition-all flex items-center gap-1 cursor-pointer select-none ${
                          siteConfig.policyTermsHidden 
                            ? "bg-blue-600 hover:bg-blue-500 text-white" 
                            : "bg-red-950/40 hover:bg-red-900 border border-red-900/40 text-red-400"
                        }`}
                      >
                        {siteConfig.policyTermsHidden ? <Eye size={10} /> : <Trash2 size={10} />}
                        <span>{siteConfig.policyTermsHidden ? "Restaurar" : "Borrar"}</span>
                      </button>
                    </div>
                    {siteConfig.policyTermsHidden && (
                      <div className="bg-red-950/10 border border-red-900/30 text-[9px] text-red-400 p-2 rounded uppercase font-bold tracking-wider text-center">
                        Este apartado está oculto/borrado del sitio público.
                      </div>
                    )}
                    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-opacity ${siteConfig.policyTermsHidden ? "opacity-30 pointer-events-none" : ""}`}>
                      <div className="space-y-2">
                        <label className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest">Título en Footer</label>
                        <input
                          type="text"
                          value={siteConfig.policyTermsName || ""}
                          onChange={(e) => updateSiteConfig({ policyTermsName: e.target.value })}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-xs focus:outline-none focus:border-emerald-500 transition-colors uppercase font-medium text-white"
                          placeholder="Términos de Servicio"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest">Contenido Legal</label>
                        <textarea
                          value={siteConfig.policyTermsContent || ""}
                          onChange={(e) => updateSiteConfig({ policyTermsContent: e.target.value })}
                          rows={2}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-xs focus:outline-none focus:border-emerald-500 transition-colors font-medium text-white"
                          placeholder="Detalles de la política..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Política de Envío */}
                  <div className="bg-neutral-900/10 border border-neutral-900 p-4 rounded-lg space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest block">4. Política de Envío</span>
                      <button
                        type="button"
                        onClick={() => updateSiteConfig({ policyShippingHidden: !siteConfig.policyShippingHidden })}
                        className={`text-[9px] px-2.5 py-1 rounded font-extrabold tracking-widest uppercase transition-all flex items-center gap-1 cursor-pointer select-none ${
                          siteConfig.policyShippingHidden 
                            ? "bg-blue-600 hover:bg-blue-500 text-white" 
                            : "bg-red-950/40 hover:bg-red-900 border border-red-900/40 text-red-400"
                        }`}
                      >
                        {siteConfig.policyShippingHidden ? <Eye size={10} /> : <Trash2 size={10} />}
                        <span>{siteConfig.policyShippingHidden ? "Restaurar" : "Borrar"}</span>
                      </button>
                    </div>
                    {siteConfig.policyShippingHidden && (
                      <div className="bg-red-950/10 border border-red-900/30 text-[9px] text-red-400 p-2 rounded uppercase font-bold tracking-wider text-center">
                        Este apartado está oculto/borrado del sitio público.
                      </div>
                    )}
                    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-opacity ${siteConfig.policyShippingHidden ? "opacity-30 pointer-events-none" : ""}`}>
                      <div className="space-y-2">
                        <label className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest">Título en Footer</label>
                        <input
                          type="text"
                          value={siteConfig.policyShippingName || ""}
                          onChange={(e) => updateSiteConfig({ policyShippingName: e.target.value })}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-xs focus:outline-none focus:border-emerald-500 transition-colors uppercase font-medium text-white"
                          placeholder="Política de Envío"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest">Contenido Legal</label>
                        <textarea
                          value={siteConfig.policyShippingContent || ""}
                          onChange={(e) => updateSiteConfig({ policyShippingContent: e.target.value })}
                          rows={2}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-xs focus:outline-none focus:border-emerald-500 transition-colors font-medium text-white"
                          placeholder="Detalles de la política..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Información de Contacto */}
                  <div className="bg-neutral-900/10 border border-neutral-900 p-4 rounded-lg space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest block">5. Información de Contacto</span>
                      <button
                        type="button"
                        onClick={() => updateSiteConfig({ policyContactHidden: !siteConfig.policyContactHidden })}
                        className={`text-[9px] px-2.5 py-1 rounded font-extrabold tracking-widest uppercase transition-all flex items-center gap-1 cursor-pointer select-none ${
                          siteConfig.policyContactHidden 
                            ? "bg-blue-600 hover:bg-blue-500 text-white" 
                            : "bg-red-950/40 hover:bg-red-900 border border-red-900/40 text-red-400"
                        }`}
                      >
                        {siteConfig.policyContactHidden ? <Eye size={10} /> : <Trash2 size={10} />}
                        <span>{siteConfig.policyContactHidden ? "Restaurar" : "Borrar"}</span>
                      </button>
                    </div>
                    {siteConfig.policyContactHidden && (
                      <div className="bg-red-950/10 border border-red-900/30 text-[9px] text-red-400 p-2 rounded uppercase font-bold tracking-wider text-center">
                        Este apartado está oculto/borrado del sitio público.
                      </div>
                    )}
                    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-opacity ${siteConfig.policyContactHidden ? "opacity-30 pointer-events-none" : ""}`}>
                      <div className="space-y-2">
                        <label className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest">Título en Footer</label>
                        <input
                          type="text"
                          value={siteConfig.policyContactName || ""}
                          onChange={(e) => updateSiteConfig({ policyContactName: e.target.value })}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-xs focus:outline-none focus:border-emerald-500 transition-colors uppercase font-medium text-white"
                          placeholder="Información de Contacto"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest">Contenido Legal</label>
                        <textarea
                          value={siteConfig.policyContactContent || ""}
                          onChange={(e) => updateSiteConfig({ policyContactContent: e.target.value })}
                          rows={2}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-xs focus:outline-none focus:border-emerald-500 transition-colors font-medium text-white"
                          placeholder="Detalles de la política..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Products Catalog management */}
        {activeTab === "products" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-900 pb-4">
              <div>
                <h3 className="text-xl font-black uppercase tracking-widest">Registro de Gamas y Modelos</h3>
                <p className="text-xs text-gray-500 mt-1 uppercase">Añade, edita, cambia precios o marca existencias del inventario</p>
              </div>
              <button
                onClick={() => setEditingProduct({
                  id: "prod-" + Math.floor(100000 + Math.random() * 900000),
                  name: "",
                  priceMXN: 1600,
                  stockQuantity: 15,
                  images: [""],
                  description: "",
                  category: "NIGHTMARES",
                  badge: "",
                  outOfStock: false,
                  details: []
                })}
                className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-500 text-black text-xs font-black tracking-widest uppercase rounded hover:bg-emerald-400 transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>NUEVO DISEÑO</span>
              </button>
            </div>

            {/* Custom Product form Modal overlay */}
            {editingProduct && (
              <div className="bg-neutral-950 rounded-lg border border-neutral-800 p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
                  <h4 className="text-sm font-black tracking-widest uppercase">
                    {editingProduct.name ? `Editar: ${editingProduct.name}` : "Registrar Nueva Pieza"}
                  </h4>
                  <button 
                    onClick={() => setEditingProduct(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleProductSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">ID de Referencia (Ej: 9073019060474)</label>
                    <input
                      type="text"
                      required
                      value={editingProduct.id || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, id: e.target.value })}
                      className="w-full bg-black border border-neutral-800 rounded p-2.5 text-white uppercase focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">Nombre Oficial</label>
                    <input
                      type="text"
                      required
                      value={editingProduct.name || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      placeholder="BLACK FLAMES"
                      className="w-full bg-black border border-neutral-800 rounded p-2.5 text-white uppercase focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">Precio (MXN)</label>
                    <input
                      type="number"
                      required
                      value={editingProduct.priceMXN || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, priceMXN: Number(e.target.value) })}
                      className="w-full bg-black border border-neutral-800 rounded p-2.5 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider block">
                        📦 Unidades de Stock ({isAdminCustomStock ? "Ingreso Manual" : "Desplegable"})
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsAdminCustomStock(!isAdminCustomStock)}
                        className="text-[9px] font-black text-emerald-400 hover:underline uppercase tracking-wider cursor-pointer"
                      >
                        {isAdminCustomStock ? "📋 Lista Desplegable" : "✏️ Otra Cantidad (Manual)"}
                      </button>
                    </div>

                    {isAdminCustomStock ? (
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          value={editingProduct.stockQuantity ?? 10}
                          onChange={(e) => {
                            const qty = Math.max(0, parseInt(e.target.value) || 0);
                            setEditingProduct({
                              ...editingProduct,
                              stockQuantity: qty,
                              outOfStock: qty === 0
                            });
                          }}
                          className="w-full bg-black border border-emerald-500/60 rounded p-2.5 text-emerald-300 font-extrabold text-xs focus:outline-none focus:border-emerald-400 pr-12"
                          placeholder="Ingresa cantidad de stock..."
                          autoFocus
                        />
                        <span className="absolute right-3 text-[10px] text-emerald-400 font-black uppercase pointer-events-none">pzas</span>
                      </div>
                    ) : (
                      <select
                        value={ADMIN_PRESET_STOCKS.includes(editingProduct.stockQuantity ?? 10) ? (editingProduct.stockQuantity ?? 10) : "custom"}
                        onChange={(e) => {
                          if (e.target.value === "custom") {
                            setIsAdminCustomStock(true);
                          } else {
                            const qty = Number(e.target.value);
                            setEditingProduct({
                              ...editingProduct,
                              stockQuantity: qty,
                              outOfStock: qty === 0
                            });
                          }
                        }}
                        className="w-full bg-black border border-emerald-500/50 rounded p-2.5 text-emerald-300 font-extrabold uppercase focus:outline-none focus:border-emerald-400 cursor-pointer"
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
                        {!ADMIN_PRESET_STOCKS.includes(editingProduct.stockQuantity ?? 10) && (
                          <option value={editingProduct.stockQuantity ?? 10} className="bg-neutral-950 text-emerald-300 font-bold">
                            {editingProduct.stockQuantity} piezas (Personalizado)
                          </option>
                        )}
                        <option value="custom" className="bg-neutral-950 text-emerald-400 font-black">
                          ✏️ OTRA CANTIDAD (Ingresar manualmente)...
                        </option>
                      </select>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <ProductImageManager
                      images={Array.isArray(editingProduct.images) ? editingProduct.images : [editingProduct.images || ""]}
                      onChange={(newImages) => setEditingProduct({ ...editingProduct, images: newImages })}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">Descripción Narrativa del Producto</label>
                    <textarea
                      value={editingProduct.description || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                      rows={3}
                      className="w-full bg-black border border-neutral-800 rounded p-2.5 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex items-center gap-3 py-2">
                    <input
                      type="checkbox"
                      id="outOfStock"
                      checked={!!editingProduct.outOfStock}
                      onChange={(e) => setEditingProduct({ ...editingProduct, outOfStock: e.target.checked })}
                      className="h-4 w-4 rounded bg-black border-neutral-800 text-emerald-500 focus:outline-none cursor-pointer"
                    />
                    <label htmlFor="outOfStock" className="text-xs font-black tracking-widest uppercase cursor-pointer selection:bg-transparent">Marcar Agotado (Sin Stock)</label>
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-neutral-900">
                    <button
                      type="button"
                      onClick={() => setEditingProduct(null)}
                      className="px-4 py-2.5 border border-neutral-800 rounded uppercase font-bold text-[10px] hover:bg-neutral-900 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-emerald-500 text-black font-black uppercase text-[10px] rounded hover:bg-emerald-400 transition-colors"
                    >
                      Guardar Modelo
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Products Table */}
            <div className="overflow-x-auto border border-neutral-800 rounded bg-neutral-950">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-900/80 border-b border-neutral-800 text-[10px] text-gray-400 uppercase tracking-widest">
                    <th className="p-4">Imagen</th>
                    <th className="p-4">ID</th>
                    <th className="p-4">Nombre</th>
                    <th className="p-4">Precio (MXN)</th>
                    <th className="p-4">Contador Stock</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-900/30 transition-colors">
                      <td className="p-4">
                        <img 
                          src={p.images?.[0] || null} 
                          alt={p.name} 
                          className="h-10 w-10 object-cover rounded bg-black border border-neutral-800"
                        />
                      </td>
                      <td className="p-4 font-mono text-[10px] text-gray-500">{p.id}</td>
                      <td className="p-4 font-black uppercase tracking-wider">{p.name}</td>
                      <td className="p-4">
                        <div className="font-bold text-gray-300 flex flex-col">
                          <span>${(p.priceMXN || 0).toLocaleString()} MXN</span>
                          {siteConfig.testCheckoutActive && (siteConfig.testCheckoutProductId === p.id || !siteConfig.testCheckoutProductId) && (
                            <span className="mt-1 text-[9px] bg-amber-400 text-black px-1.5 py-0.5 rounded font-black tracking-wider uppercase inline-flex items-center gap-1 w-fit">
                              ⚡ PRUEBA: ${siteConfig.testCheckoutAmountMXN || 11} MXN
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-extrabold text-emerald-400 font-mono">📦 {p.stockQuantity ?? 10} pzas</td>
                      <td className="p-4">
                        {p.outOfStock ? (
                          <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black rounded uppercase tracking-wider">Agotado</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black rounded uppercase tracking-wider">Disponible</span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => setEditingProduct(p)}
                          className="p-1.5 text-gray-400 hover:text-white border border-neutral-800 hover:border-neutral-700 rounded transition-all inline-flex items-center"
                          title="Editar"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            setConfirmDelete({
                              title: "Eliminar Producto",
                              message: `¿Estás seguro de que deseas eliminar definitivamente el modelo "${p.name}"? Esta acción cancelará su disponibilidad y es irreversible.`,
                              onConfirm: async () => {
                                try {
                                  await deleteProduct(p.id);
                                  showNotification("Diseño de gorra removido definitivamente.");
                                } catch (err: any) {
                                  console.error("Error deleting product:", err);
                                  let message = "Error de conexión o permisos al eliminar.";
                                  if (err.message) {
                                    try {
                                      const parsed = JSON.parse(err.message);
                                      if (parsed.error && parsed.error.toLowerCase().includes("permission")) {
                                        message = "Permiso denegado por Firestore. Asegúrate de haber iniciado sesión con tu correo administrador: hugocesarlemuscortes@gmail.com";
                                      } else {
                                        message = `Error de base de datos: ${parsed.error || err.message}`;
                                      }
                                    } catch {
                                      if (err.message.includes("permission-denied") || err.message.toLowerCase().includes("permission")) {
                                        message = "Permiso denegado por Firestore. Asegúrate de haber iniciado sesión con tu correo administrador: hugocesarlemuscortes@gmail.com";
                                      } else {
                                        message = `Error: ${err.message}`;
                                      }
                                    }
                                  }
                                  showNotification(`ERROR: ${message}`);
                                }
                              }
                            });
                          }}
                          className="p-1.5 text-gray-500 hover:text-red-400 border border-neutral-800 hover:border-red-500/20 rounded transition-all inline-flex items-center cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Orders, tracking and payment verification */}
        {activeTab === "orders" && (
          <div className="space-y-8">
            <div className="border-b border-neutral-900 pb-4">
              <h3 className="text-xl font-black uppercase tracking-widest">Envíos y Control de Transacciones</h3>
            </div>

            {orders.length === 0 ? (
              <div className="p-12 text-center border border-neutral-800 rounded bg-neutral-950 text-gray-600 space-y-2 uppercase text-xs font-black">
                <Activity className="mx-auto" size={24} />
                <p>No se registran compras todavía en esta red.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((ord) => {
                  const safeItems = Array.isArray(ord.items) ? ord.items : [];
                  const safeDate = ord.createdAt 
                    ? (typeof ord.createdAt === "string" && ord.createdAt.includes("T") ? ord.createdAt.split("T")[0] : String(ord.createdAt))
                    : "HOY";
                  const safeTotalMXN = typeof ord.totalMXN === "number" ? ord.totalMXN : 0;
                  const safeTotalUSD = typeof ord.totalUSD === "number" ? ord.totalUSD : Math.round(safeTotalMXN / 20);
                  const safeStatus = ord.status || "PAGO_PENDIENTE";

                  const currentSemAforoKey = getNormalizedSemAforoKey(ord.status);

                  return (
                    <div key={ord.id} className="bg-neutral-950 border border-neutral-800 rounded p-6 space-y-4">
                      {/* Header line of the single order card */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-900 pb-3 text-xs">
                        <div className="space-y-1">
                          <span className="text-[10px] text-emerald-400 font-extrabold uppercase block tracking-wider">Orden Generada</span>
                          <h4 className="text-sm font-black tracking-widest">{ord.id} <span className="font-normal text-[10px] text-gray-500">({safeDate})</span></h4>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-full text-[10px] font-black uppercase tracking-wider text-purple-300">
                            {SEMAFORO_STATUSES.find(s => s.key === currentSemAforoKey)?.shortLabel || ord.status}
                          </span>

                          <button
                            onClick={() => {
                              setConfirmDelete({
                                title: "Eliminar Registro de Orden",
                                message: `¿Estás seguro de que deseas eliminar permanentemente el registro de orden "${ord.id}"? Esta acción es irreversible.`,
                                onConfirm: async () => {
                                  await deleteOrder(ord.id);
                                  showNotification("Orden eliminada de los registros.");
                                }
                              });
                            }}
                            className="p-1.5 border border-neutral-800 text-red-400 hover:bg-neutral-900 rounded cursor-pointer"
                            title="Eliminar Registro"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Customer + items rows details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs leading-relaxed">
                        {/* Client Info */}
                        <div className="space-y-2 bg-neutral-900/30 p-4 border border-neutral-900/60 rounded">
                          <h5 className="font-extrabold tracking-widest uppercase text-gray-400 text-[10px]">Detalles del Comprador</h5>
                          <p><span className="text-gray-500 font-bold block uppercase text-[10px]">Usuario Google:</span> <span className="font-bold">{ord.userEmail || "Sin Correo"}</span></p>
                          <p><span className="text-gray-500 font-bold block uppercase text-[10px]">Nombre Completo:</span> <span className="font-bold uppercase">{ord.userName || "No especificado"}</span></p>
                          <p><span className="text-gray-500 font-bold block uppercase text-[10px]">Celular:</span> <span className="font-bold">{ord.buyerPhone || "No ingresado"}</span></p>
                          <p><span className="text-gray-500 font-bold block uppercase text-[10px]">Dirección de Envío:</span> <span className="font-bold text-gray-300 uppercase block mt-0.5 whitespace-pre-wrap">{ord.shippingAddress || "Sin Dirección"}</span></p>
                        </div>

                        {/* Items Info */}
                        <div className="space-y-2 bg-neutral-900/30 p-4 border border-neutral-900/60 rounded">
                          <h5 className="font-extrabold tracking-widest uppercase text-gray-400 text-[10px]">Artículos Adquiridos</h5>
                          <div className="divide-y divide-neutral-900 space-y-2">
                            {safeItems.map((item, idx) => {
                              const itemPrice = typeof item.priceMXN === "number" ? item.priceMXN : 0;
                              const itemQty = typeof item.quantity === "number" ? item.quantity : 1;
                              return (
                                <div key={idx} className="flex gap-2 pt-2 first:pt-0">
                                  {item.image && <img src={item.image} className="w-8 h-8 rounded border border-neutral-800 bg-black object-cover" />}
                                  <div className="min-w-0">
                                    <p className="font-bold uppercase truncate">{item.productName || "Gorra TETRA"}</p>
                                    <p className="text-[10px] text-gray-500 uppercase">{itemQty} pza(s) — (${itemPrice.toLocaleString()} MXN)</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="border-t border-neutral-900 pt-2 flex justify-between font-black">
                            <span className="text-gray-400 text-[10px] uppercase">TOTAL:</span>
                            <span className="text-emerald-400">${safeTotalMXN.toLocaleString()} MXN / ${safeTotalUSD.toLocaleString()} USD</span>
                          </div>
                        </div>

                      {/* Semáforo de Estado de Pedido */}
                      <div className="space-y-4 bg-neutral-900/30 p-4 border border-neutral-900/60 rounded flex flex-col justify-between">
                        <div className="space-y-2">
                          <h5 className="font-extrabold tracking-widest uppercase text-gray-300 text-[10px] flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Activity size={13} className="text-purple-400" />
                              <span>ESTADO DEL PEDIDO (SEMÁFORO)</span>
                            </span>
                          </h5>

                          <div className="grid grid-cols-1 gap-1.5 pt-1">
                            {SEMAFORO_STATUSES.map((st) => {
                              const isSelected = currentSemAforoKey === st.key;
                              return (
                                <button
                                  key={st.key}
                                  type="button"
                                  onClick={async () => {
                                    await updateOrder(ord.id, { status: st.key as any });
                                    showNotification(`Estatus de orden ${ord.id} actualizado a: ${st.shortLabel}`);
                                  }}
                                  className={`w-full py-2 px-3 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all duration-150 flex items-center justify-between cursor-pointer active:scale-98 ${
                                    isSelected ? st.activeClass : st.inactiveClass
                                  }`}
                                >
                                  <span className="flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-full ${st.dotClass} ${isSelected ? 'animate-pulse' : 'opacity-50'}`} />
                                    <span>{st.label}</span>
                                  </span>
                                  {isSelected && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/50 text-white uppercase font-mono font-bold">
                                      ACTIVO
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <button
                            onClick={() => setSelectedReceiptOrder(ord)}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2.5 px-3 text-xs font-black tracking-wider uppercase rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                          >
                            <span>📄 Ver Recibo / Comprobante PDF</span>
                          </button>
                        </div>

                        <div className="bg-neutral-900 p-2.5 rounded border border-neutral-800 flex items-center justify-between">
                          <span className="text-[9px] text-gray-500 font-extrabold uppercase tracking-wider">Pasarela Virtual</span>
                          <span className="text-[9px] font-black tracking-widest bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 px-2 py-0.5 rounded uppercase">{ord.paymentMethod || "TARJETA_DIRECTA"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: REVIEWS APPROVAL & MANAGEMENT */}
        {activeTab === "reviews" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-900 pb-4">
              <div>
                <h3 className="text-lg font-black tracking-widest uppercase text-white flex items-center gap-2">
                  <Star className="text-amber-400" size={18} />
                  Aprobación y Gestión de Opiniones
                </h3>
                <p className="text-xs text-gray-400 uppercase tracking-wider">
                  Las opiniones enviadas por los clientes no se mostrarán públicamente hasta que las apruebes.
                </p>
              </div>

              {/* Filter Tabs & Bulk Actions */}
              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                <div className="flex gap-1.5 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setReviewFilter("all")}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase rounded tracking-wider transition-colors cursor-pointer ${
                      reviewFilter === "all" ? "bg-white text-black" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Todas ({reviews.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewFilter("pending")}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase rounded tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                      reviewFilter === "pending" ? "bg-amber-500 text-black" : "text-amber-400 hover:text-amber-300"
                    }`}
                  >
                    <span>Pendientes ({reviews.filter((r) => r.approved === false).length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewFilter("approved")}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase rounded tracking-wider transition-colors cursor-pointer ${
                      reviewFilter === "approved" ? "bg-emerald-500 text-black" : "text-emerald-400 hover:text-emerald-300"
                    }`}
                  >
                    Aprobadas ({reviews.filter((r) => r.approved !== false).length})
                  </button>
                </div>

                {reviews.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDelete({
                        title: "Eliminar Todas las Opiniones",
                        message: `¿Estás seguro de que deseas eliminar permanentemente todas las ${reviews.length} opiniones registradas? Esta acción no se puede deshacer.`,
                        onConfirm: async () => {
                          for (const rev of reviews) {
                            await deleteReview(rev.id);
                          }
                          showNotification("Todas las opiniones han sido eliminadas.");
                        }
                      });
                    }}
                    className="px-3 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/40 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 size={12} />
                    <span>Eliminar Todas</span>
                  </button>
                )}
              </div>
            </div>

            {/* List of Reviews */}
            {reviews.length === 0 ? (
              <div className="p-8 border border-neutral-900 rounded-lg text-center space-y-2">
                <p className="text-xs text-gray-400 uppercase font-bold">No hay opiniones registradas aún en el sistema</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviews
                  .filter((r) => {
                    if (reviewFilter === "pending") return r.approved === false;
                    if (reviewFilter === "approved") return r.approved !== false;
                    return true;
                  })
                  .map((rev) => {
                    const isPending = rev.approved === false;
                    return (
                      <div
                        key={rev.id}
                        className={`p-4 rounded-xl border space-y-3 relative text-left transition-all ${
                          isPending
                            ? "bg-amber-950/20 border-amber-500/50"
                            : "bg-neutral-950 border-neutral-800"
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-neutral-900 pb-2.5">
                          <div>
                            <h4 className="text-xs font-black text-white uppercase">{rev.name}</h4>
                            <p className="text-[9px] text-gray-500 uppercase">{rev.date} • {rev.capName}</p>
                          </div>
                          <span
                            className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                              isPending
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            }`}
                          >
                            {isPending ? "⏳ Pendiente" : "✓ Aprobada"}
                          </span>
                        </div>

                        <div className="flex text-amber-400 gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={12}
                              fill={s <= rev.rating ? "currentColor" : "none"}
                              className={s <= rev.rating ? "text-amber-400" : "text-neutral-700"}
                            />
                          ))}
                        </div>

                        {rev.title && (
                          <h5 className="text-xs font-extrabold uppercase text-white">{rev.title}</h5>
                        )}

                        <p className="text-[11px] text-gray-300 uppercase leading-relaxed">{rev.reviewText}</p>

                        <div className="pt-2 border-t border-neutral-900 flex items-center justify-between gap-2">
                          {isPending ? (
                            <button
                              type="button"
                              onClick={async () => {
                                await saveReview({ ...rev, approved: true });
                                showNotification("✅ Opinión aprobada y publicada en la tienda.");
                              }}
                              className="bg-emerald-500 hover:bg-emerald-400 text-black py-1.5 px-3 text-[10px] font-black uppercase rounded tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Check size={12} />
                              <span>Aprobar y Publicar</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={async () => {
                                await saveReview({ ...rev, approved: false });
                                showNotification("⏸️ Opinión ocultada del público.");
                              }}
                              className="bg-neutral-900 hover:bg-neutral-800 border border-amber-500/40 text-amber-400 py-1.5 px-3 text-[10px] font-bold uppercase rounded tracking-wider transition-all cursor-pointer"
                            >
                              <span>Ocultar / Desaprobar</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm("¿Seguro que deseas eliminar esta opinión de forma permanente?")) {
                                await deleteReview(rev.id);
                                showNotification("🗑️ Opinión eliminada correctamente.");
                              }
                            }}
                            className="bg-red-600/20 hover:bg-red-600 border border-red-500/40 text-red-400 hover:text-white py-1.5 px-3 text-[10px] font-bold uppercase rounded tracking-wider transition-all cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom Elegance Confirmation Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 p-6 md:p-8 max-w-md w-full rounded shadow-2xl relative space-y-6">
            <div className="absolute top-0 left-0 w-full h-[2px]" style={{ backgroundColor: siteConfig.accentColor || "#10b981" }} />
            
            <div className="space-y-2">
              <h4 className="text-sm font-black tracking-widest uppercase text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: siteConfig.accentColor || "#10b981" }} />
                {confirmDelete.title}
              </h4>
              <p className="text-xs text-gray-400 uppercase leading-relaxed tracking-wider">
                {confirmDelete.message}
              </p>
            </div>

            <div className="flex gap-3 pt-2 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-5 py-2.5 bg-neutral-900 border border-neutral-800 text-[10px] font-bold tracking-widest uppercase rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  try {
                    await confirmDelete.onConfirm();
                  } catch (e) {
                    console.error("Error executing custom confirm action:", e);
                  } finally {
                    setConfirmDelete(null);
                  }
                }}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black tracking-widest uppercase rounded transition-colors cursor-pointer"
              >
                Sí, Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable / Downloadable Receipt Modal overlay */}
      {selectedReceiptOrder && (
        <ReceiptModal
          order={selectedReceiptOrder}
          onClose={() => setSelectedReceiptOrder(null)}
          logoUrl={siteConfig.brandLogoUrl}
        />
      )}
    </div>
  );
}
