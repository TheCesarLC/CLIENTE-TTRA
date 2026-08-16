import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Trash2, Plus, Minus, Box, CheckCircle, CreditCard, Lock, AlertCircle, Download, Mail, Phone, User, MapPin, ShieldCheck, LogIn } from "lucide-react";
import { CartItem, Product } from "../types";
import { useSite } from "../context/SiteContext";
import { getOptimizedImageUrl } from "../lib/imageOptimizer";
import { postApi } from "../lib/api";
import { createStripeCheckoutSession } from "../lib/stripeClient";
import { getOrderStatusDetails } from "../lib/orderStatus";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  currency: "MXN" | "USD" | "CAD";
  onUpdateQty: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
}

interface TicketSummary {
  orderId: string;
  authCode: string;
  cardLast4: string;
  brandName: string;
  logoUrl: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  shippingAddress: string;
  dateStr: string;
  items: { name: string; quantity: number; priceMXN: number }[];
  totalMXN: number;
  totalFormatted: string;
  cardBrand: string;
  receivingBankAccount?: string;
  status?: string;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  currency,
  onUpdateQty,
  onRemoveItem,
  onClearCart
}: CartDrawerProps) {
  const [checkingOut, setCheckingOut] = useState(false);
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  const [checkoutStepText, setCheckoutStepText] = useState("");
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastOrderId, setLastOrderId] = useState("");
  const [lastAuthCode, setLastAuthCode] = useState("");
  const [lastCardDigits, setLastCardDigits] = useState("");
  const [lastTicketSummary, setLastTicketSummary] = useState<TicketSummary | null>(null);

  const { currentUser, siteConfig, saveOrder, products, loginWithGoogle, isAdmin, updateSiteConfig } = useSite();

  const getEffectiveItemPrice = (itemProduct: Product) => {
    if (siteConfig?.testCheckoutActive) {
      const targetId = siteConfig.testCheckoutProductId;
      const testAmount = Math.max(10, Number(siteConfig.testCheckoutAmountMXN) || 11);
      if (!targetId || targetId === "ALL" || targetId === itemProduct.id || itemProduct.name.toLowerCase().includes(targetId.toLowerCase())) {
        return testAmount;
      }
    }
    const liveProd = products?.find(p => p.id === itemProduct.id || p.name.toLowerCase() === itemProduct.name?.toLowerCase());
    return typeof liveProd?.priceMXN === "number" ? liveProd.priceMXN : (itemProduct?.priceMXN || 1499);
  };

  // Auto-adjust cart items if real-time stock drops below cart item quantity
  useEffect(() => {
    if (!products || products.length === 0 || cart.length === 0) return;
    cart.forEach((item) => {
      const liveProd = products.find((p) => p.id === item.product.id);
      if (liveProd) {
        const liveStock = typeof liveProd.stockQuantity === "number" ? liveProd.stockQuantity : 10;
        if (liveProd.outOfStock || liveStock <= 0) {
          // Keep cap at current or warn
        } else if (item.quantity > liveStock) {
          onUpdateQty(item.product.id, liveStock - item.quantity);
        }
      }
    });
  }, [products, cart, onUpdateQty]);

  // Shipping & Contact details form state
  const [buyerName, setBuyerName] = useState(currentUser?.displayName || "");
  const [buyerEmail, setBuyerEmail] = useState(currentUser?.email || "");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (currentUser) {
      if (currentUser.displayName && !buyerName) setBuyerName(currentUser.displayName);
      if (currentUser.email && !buyerEmail) setBuyerEmail(currentUser.email);
    }
  }, [currentUser]);

  const handleStripeCheckout = async () => {
    if (!currentUser) {
      setErrorMsg("Es obligatorio iniciar sesión con tu cuenta de Google para realizar tu compra.");
      try {
        await loginWithGoogle();
      } catch {}
      return;
    }

    if (!buyerName.trim() || !buyerEmail.trim() || !buyerPhone.trim() || !shippingAddress.trim()) {
      setErrorMsg("Por favor completa tus datos de entrega (nombre, correo, teléfono y dirección) arriba para continuar.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(buyerEmail.trim())) {
      setErrorMsg("Por favor ingresa un correo electrónico válido para recibir tu comprobante.");
      return;
    }

    setIsStripeLoading(true);
    setErrorMsg("");

    const orderId = `ORD-STRIPE-${Date.now().toString().slice(-6)}`;

    // Save order record to Firestore as PENDIENTE_DE_REVISION until user completes payment in Stripe
    try {
      await saveOrder({
        id: orderId,
        userEmail: (currentUser?.email || buyerEmail).trim().toLowerCase(),
        userName: (currentUser?.displayName || buyerName).trim().toUpperCase(),
        createdAt: new Date().toISOString(),
        items: cart.map(i => {
          const liveProd = products?.find(p => p.id === i.product.id || p.name.toLowerCase() === i.product.name?.toLowerCase());
          const effectivePrice = getEffectiveItemPrice(i.product);
          return {
            productId: liveProd?.id || i.product.id,
            productName: liveProd?.name || i.product.name,
            quantity: i.quantity,
            priceMXN: effectivePrice,
            image: liveProd?.images?.[0] || i.product.images?.[0] || ""
          };
        }),
        totalMXN: subtotalMXN,
        status: "PENDIENTE_DE_REVISION",
        shippingAddress: shippingAddress.trim().toUpperCase(),
        paymentMethod: "Stripe (Tarjeta de Crédito / Débito)",
        trackingNumber: "",
        buyerPhone: buyerPhone.trim()
      });
      localStorage.setItem("pending_stripe_order_id", orderId);
    } catch (dbErr) {
      console.warn("Pre-saving pending order to Firestore notice:", dbErr);
    }

    const isMobileDevice = typeof window !== "undefined" && (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      window.innerWidth < 768
    );

    let payWin: Window | null = null;
    // On desktop, try opening popup window to avoid popup blockers. On mobile, perform direct top-level redirect.
    if (!isMobileDevice) {
      try {
        payWin = window.open("", "_blank");
        if (payWin) {
          payWin.document.write(`
            <!DOCTYPE html>
            <html style="background:#09090b; color:#ffffff; font-family:system-ui, -apple-system, sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
              <head><title>Stripe Checkout - TETRA HATS</title></head>
              <div style="text-align:center; padding:32px; max-width:380px; background:#18181b; border:1px solid #3f3f46; border-radius:16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">
                <div style="font-size:32px; margin-bottom:12px;">💳</div>
                <h2 style="font-size:18px; font-weight:800; margin:0 0 8px 0; color:#c084fc;">Conectando con Stripe Checkout...</h2>
                <p style="font-size:13px; color:#a1a1aa; line-height:1.5; margin:0;">Por favor espera un momento mientras te redirigimos a la pantalla de pago seguro.</p>
              </div>
            </html>
          `);
        }
      } catch (e) {
        console.warn("Popup init notice:", e);
      }
    }

    const safeClosePopup = () => {
      if (payWin) {
        try {
          if (!payWin.closed) {
            payWin.close();
          }
        } catch (e) {
          console.warn("Safe close popup notice:", e);
        }
      }
    };

    try {
      const { url } = await createStripeCheckoutSession({
        orderId,
        buyerName: buyerName.trim(),
        buyerEmail: buyerEmail.trim(),
        secretKey: siteConfig.stripeSecretKey || "",
        origin: window.location.origin,
        liveCatalog: products,
        testConfig: {
          active: siteConfig.testCheckoutActive,
          productId: siteConfig.testCheckoutProductId,
          amountMXN: siteConfig.testCheckoutAmountMXN
        },
        items: cart.map(i => {
          const liveProd = products?.find(p => p.id === i.product.id || p.name.toLowerCase() === i.product.name?.toLowerCase());
          const effectivePrice = getEffectiveItemPrice(i.product);
          return {
            productId: liveProd?.id || i.product.id,
            name: liveProd?.name || i.product.name,
            quantity: i.quantity,
            priceMXN: effectivePrice,
            image: liveProd?.images?.[0] || i.product.images?.[0]
          };
        })
      });

      if (url) {
        let redirectedInPopup = false;
        if (payWin) {
          try {
            if (!payWin.closed) {
              payWin.location.href = url;
              redirectedInPopup = true;
            }
          } catch (e) {
            console.warn("Popup redirect error, falling back to top navigation:", e);
          }
        }

        if (!redirectedInPopup) {
          safeClosePopup();
          // Direct navigation is 100% reliable across all mobile & desktop browsers and handles cross-origin iframe security
          try {
            if (window.top && window.top !== window) {
              window.top.location.href = url;
            } else {
              window.location.href = url;
            }
          } catch (navErr) {
            window.location.href = url;
          }
        }
      } else {
        safeClosePopup();
        setIsStripeLoading(false);
        setErrorMsg("No se obtuvo el enlace de checkout de Stripe.");
      }
    } catch (err: any) {
      safeClosePopup();
      console.error("Stripe Checkout error:", err);
      setIsStripeLoading(false);
      setErrorMsg(err?.message ? `Error de comunicación con Stripe: ${err.message}` : "Error de comunicación con Stripe.");
    }
  };

  // Credit / Debit Card form states
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardHolder, setCardHolder] = useState("");

  // Format Card Number (#### #### #### ####)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardNumber(formatted);
  };

  // Format Expiry (MM/YY)
  const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 3) {
      raw = raw.slice(0, 2) + "/" + raw.slice(2);
    }
    setCardExpiry(raw);
  };

  // Format CVC
  const handleCardCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    setCardCvc(raw);
  };

  // Helper to detect card brand
  const getCardBrand = () => {
    const clean = cardNumber.replace(/\s/g, "");
    if (clean.startsWith("4")) return "VISA";
    if (clean.startsWith("5") || clean.startsWith("2")) return "MASTERCARD";
    if (clean.startsWith("3")) return "AMEX";
    return "DÉBITO / CRÉDITO";
  };

  // Auto fill test cards
  const handleFillTestCard = (approved: boolean) => {
    if (approved) {
      setCardNumber("4242 4242 4242 4242");
      setCardExpiry("12/28");
      setCardCvc("888");
      setCardHolder((buyerName || "CLIENTE DE PRUEBA").toUpperCase());
      setErrorMsg("");
    } else {
      setCardNumber("4000 0000 0000 0002");
      setCardExpiry("05/27");
      setCardCvc("000");
      setCardHolder("TARJETA DE PRUEBA RECHAZADA");
      setErrorMsg("");
    }
  };

  // Price formatting in MXN
  const formatPrice = (priceMXN?: number) => {
    const val = priceMXN ?? 0;
    return `$ ${val.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} MXN`;
  };

  const getSubtotalMXN = () => {
    return cart.reduce((acc, item) => {
      const effectivePrice = getEffectiveItemPrice(item.product);
      return acc + effectivePrice * item.quantity;
    }, 0);
  };

  const subtotalMXN = getSubtotalMXN();

  // Printable PDF ticket generator & Email helper
  const openTicketPDF = (data: TicketSummary) => {
    const statusInfo = getOrderStatusDetails(data.status || "PENDIENTE_DE_REVISION");
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ticket_TETRA_HATS_${data.orderId}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    @media print {
      body {
        background-color: #ffffff !important;
        color: #000000 !important;
      }
      .no-print {
        display: none !important;
      }
      .ticket-container {
        border: 1px solid #000000 !important;
        box-shadow: none !important;
        background-color: #ffffff !important;
        color: #000000 !important;
      }
      .brand-name {
        color: #000000 !important;
      }
      .value {
        color: #000000 !important;
      }
      .value.highlight {
        color: #047857 !important;
      }
      .info-card {
        background: #f8fafc !important;
        border: 1px solid #e2e8f0 !important;
      }
      th {
        color: #475569 !important;
        border-bottom: 1px solid #cbd5e1 !important;
      }
      td {
        border-bottom: 1px solid #f1f5f9 !important;
        color: #0f172a !important;
      }
      .total-container {
        background: #f0fdf4 !important;
        border: 1px solid #10b981 !important;
      }
      .total-val {
        color: #047857 !important;
      }
    }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
      background-color: #0a0a0a;
      color: #f0f0f0;
      margin: 0;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .no-print-bar {
      width: 100%;
      max-width: 600px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #171717;
      padding: 12px 20px;
      border-radius: 8px;
      border: 1px solid #262626;
      box-sizing: border-box;
    }
    .print-btn {
      background: #10b981;
      color: #000000;
      border: none;
      padding: 10px 20px;
      font-weight: 900;
      font-size: 11px;
      letter-spacing: 1px;
      text-transform: uppercase;
      border-radius: 6px;
      cursor: pointer;
    }
    .ticket-container {
      width: 100%;
      max-width: 600px;
      background-color: #111111;
      border: 1px solid #282828;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9);
      box-sizing: border-box;
    }
    .brand-header {
      text-align: center;
      border-bottom: 1px solid #222222;
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    .brand-logo {
      max-height: 50px;
      margin-bottom: 10px;
      filter: brightness(0) invert(1);
    }
    .brand-name {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: #ffffff;
      margin: 5px 0 0 0;
    }
    .receipt-title {
      display: inline-block;
      margin-top: 12px;
      padding: 4px 14px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid #10b981;
      color: #10b981;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 2px;
      border-radius: 20px;
      text-transform: uppercase;
    }
    .section-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #10b981;
      margin-bottom: 10px;
    }
    .info-card {
      background: #181818;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .info-item {
      font-size: 11px;
    }
    .label {
      font-size: 9px;
      text-transform: uppercase;
      color: #888888;
      letter-spacing: 1px;
      margin-bottom: 2px;
      font-weight: 700;
    }
    .value {
      font-weight: 700;
      color: #ffffff;
      word-break: break-word;
    }
    .value.highlight {
      color: #10b981;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 12px;
    }
    th {
      text-align: left;
      font-size: 9px;
      text-transform: uppercase;
      color: #777;
      letter-spacing: 1px;
      padding-bottom: 8px;
      border-bottom: 1px solid #282828;
    }
    td {
      padding: 10px 0;
      border-bottom: 1px solid #1e1e1e;
      color: #dddddd;
    }
    .total-container {
      background: #000000;
      border: 1px solid #10b981;
      border-radius: 8px;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 25px;
    }
    .total-label {
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #aaaaaa;
    }
    .total-val {
      font-size: 22px;
      font-weight: 900;
      color: #10b981;
      letter-spacing: 1px;
    }
    .footer-stamp {
      text-align: center;
      border-top: 1px solid #222222;
      padding-top: 20px;
      font-size: 9px;
      color: #666666;
      text-transform: uppercase;
      letter-spacing: 1px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="no-print-bar no-print">
    <div style="font-size: 11px; font-weight: 800; color: #ffffff; text-transform: uppercase;">
      📄 TICKET COMPROBANTE OFICIAL (FORMATO PDF)
    </div>
    <button class="print-btn" onclick="window.print()">🖨️ GUARDAR COMO PDF / IMPRIMIR</button>
  </div>

  <div class="ticket-container">
    <div class="brand-header">
      ${data.logoUrl ? `<img src="${data.logoUrl}" alt="Logo" class="brand-logo" />` : ''}
      <h1 class="brand-name">${data.brandName}</h1>
      <div class="receipt-title">${statusInfo.receiptTitle}</div>
    </div>

    <div class="section-title">INFORMACIÓN GENERAL DE LA COMPRA</div>
    <div class="info-card">
      <div class="info-grid">
        <div class="info-item">
          <div class="label">ID DE COMPRA</div>
          <div class="value highlight">${data.orderId}</div>
        </div>
        <div class="info-item">
          <div class="label">FECHA Y HORA</div>
          <div class="value">${data.dateStr}</div>
        </div>
        <div class="info-item">
          <div class="label">MÉTODO DE PAGO</div>
          <div class="value">TARJETA DE DÉBITO / CRÉDITO</div>
        </div>
        <div class="info-item">
          <div class="label">TERMINACIÓN TARJETA</div>
          <div class="value highlight">${data.cardBrand} ****${data.cardLast4}</div>
        </div>
        <div class="info-item" style="grid-column: span 2;">
          <div class="label">ESTATUS DE LA ORDEN</div>
          <div class="value highlight" style="color: ${statusInfo.colorHex}; font-weight: 900;">${statusInfo.statusText}</div>
        </div>
        <div class="info-item" style="grid-column: span 2;">
          <div class="label">CÓDIGO DE AUTORIZACIÓN FIRESTORE</div>
          <div class="value">${data.authCode}</div>
        </div>
      </div>
    </div>

    <div class="section-title">DATOS DEL CLIENTE Y ENVÍO</div>
    <div class="info-card">
      <div class="info-grid">
        <div class="info-item">
          <div class="label">NOMBRE</div>
          <div class="value">${data.buyerName}</div>
        </div>
        <div class="info-item">
          <div class="label">TELÉFONO</div>
          <div class="value">${data.buyerPhone}</div>
        </div>
        <div class="info-item" style="grid-column: span 2;">
          <div class="label">CORREO ELECTRÓNICO (SEGUIMIENTO)</div>
          <div class="value highlight">${data.buyerEmail}</div>
        </div>
        <div class="info-item" style="grid-column: span 2;">
          <div class="label">DIRECCIÓN DE ENVÍO</div>
          <div class="value">${data.shippingAddress}</div>
        </div>
      </div>
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
        ${data.items.map(item => `
          <tr>
            <td><strong>${item.name}</strong></td>
            <td style="text-align: center; font-weight: bold;">${item.quantity}</td>
            <td style="text-align: right; font-weight: bold; color: #ffffff;">$ ${(item.priceMXN * item.quantity).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="total-container">
      <div class="total-label">${statusInfo.totalLabelUpper}</div>
      <div class="total-val">${data.totalFormatted}</div>
    </div>

    <div class="footer-stamp">
      <p style="margin: 0 0 4px 0; font-weight: 800; color: #888888;">¡GRACIAS POR TU COMPRA EN TETRA HATS!</p>
      <p style="margin: 0;">SELLO DE AUTENTICIDAD FIRESTORE ENCRIPTADO • CONSERVA ESTE TICKET PDF PARA SEGUIMIENTO DE TU ENVÍO</p>
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
      // Fallback download if popups are blocked by iframe sandbox
      const a = document.createElement("a");
      a.href = url;
      a.download = `Ticket_TETRA_HATS_${data.orderId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const sendTicketEmail = (data: TicketSummary, adminEmail = "hugocesarlemuscortes@gmail.com") => {
    const subject = encodeURIComponent(`[TETRA HATS] Ticket PDF de Compra #${data.orderId}`);
    const itemsText = data.items.map(i => `- ${i.name} (${i.quantity} pza) : $${(i.priceMXN * i.quantity).toLocaleString()} MXN`).join('\n');
    const body = encodeURIComponent(
      `Hola ${data.buyerName},\n\n` +
      `Gracias por tu compra en TETRA HATS.\n\n` +
      `RESUMEN DE TU ORDEN:\n` +
      `• ID de Compra: ${data.orderId}\n` +
      `• Fecha: ${data.dateStr}\n` +
      `• Total Pagado: ${data.totalFormatted}\n` +
      `• Código Autorización: ${data.authCode}\n` +
      `• Dirección de Envío: ${data.shippingAddress}\n\n` +
      `PRODUCTOS COMPRADOS:\n${itemsText}\n\n` +
      `Tu ticket se ha generado en formato PDF oficial. Adjuntamos las especificaciones de tu envío.\n\n` +
      `Atentamente,\n` +
      `Hugo César Lemus Cortés — Admin Oficial TETRA HATS\n` +
      `Correo Administrador: ${adminEmail}\n`
    );
    
    // Trigger email client in new window/tab to prevent resetting the app iframe
    window.open(`mailto:${data.buyerEmail}?cc=${adminEmail}&subject=${subject}&body=${body}`, '_blank');
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      setErrorMsg("Es obligatorio iniciar sesión con tu cuenta de Google para realizar tu compra.");
      try {
        await loginWithGoogle();
      } catch {}
      return;
    }

    if (!buyerName.trim() || !buyerEmail.trim() || !buyerPhone.trim() || !shippingAddress.trim()) {
      setErrorMsg("Por favor completa todos los detalles personales y de envío.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(buyerEmail.trim())) {
      setErrorMsg("Por favor ingresa un correo electrónico válido para el seguimiento.");
      return;
    }

    const cleanCard = cardNumber.replace(/\s/g, "");
    if (cleanCard.length < 15) {
      setErrorMsg("Ingresa un número de tarjeta válido de 16 dígitos.");
      return;
    }
    if (cardExpiry.length < 5) {
      setErrorMsg("Ingresa una fecha de expiración válida (MM/AA).");
      return;
    }
    if (cardCvc.length < 3) {
      setErrorMsg("Ingresa un código CVC de seguridad válido (3 o 4 dígitos).");
      return;
    }
    if (!cardHolder.trim()) {
      setErrorMsg("Ingresa el nombre del titular de la tarjeta.");
      return;
    }

    setCheckingOut(true);
    setErrorMsg("");
    setCheckoutStepText("Conectando con el servidor de la pasarela de pago bancario...");

    try {
      // Step 1 simulation
      await new Promise((r) => setTimeout(r, 700));
      setCheckoutStepText("Verificando fondos y token de autorización 3D Secure...");

      // Step 2 simulation
      await new Promise((r) => setTimeout(r, 900));

      // Check test card failure scenario
      if (cleanCard === "4000000000000002") {
        setCheckingOut(false);
        setErrorMsg("TRANSACCIÓN RECHAZADA: La tarjeta de prueba fue declinada por el banco emisor. Por favor prueba con la tarjeta aprobada.");
        return;
      }

      setCheckoutStepText("Aprobando transacción e impactando saldo...");
      await new Promise((r) => setTimeout(r, 600));

      const authCode = `AUTH-${Math.floor(100000 + Math.random() * 900000)}`;
      const cardLast4 = cleanCard.slice(-4);
      const nowStr = new Date().toLocaleString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });

      const orderDataToSave = {
        userEmail: (currentUser?.email || buyerEmail).trim().toLowerCase(),
        userName: (currentUser?.displayName || buyerName).trim().toUpperCase(),
        buyerPhone: buyerPhone.trim(),
        createdAt: new Date().toISOString(),
        items: cart.map(item => ({
          productId: item.product.id,
          productName: item.product.name.toUpperCase(),
          quantity: item.quantity,
          priceMXN: getEffectiveItemPrice(item.product),
          image: item.product.images[0]
        })),
        totalMXN: subtotalMXN,
        status: "PENDIENTE_DE_REVISION",
        shippingAddress: shippingAddress.trim().toUpperCase(),
        paymentMethod: `TARJETA_DEBITO_CREDITO (${getCardBrand()} ****${cardLast4})`,
        trackingNumber: ""
      };

      const orderId = await saveOrder(orderDataToSave);

      const ticketSummary: TicketSummary = {
        orderId,
        authCode,
        cardLast4,
        brandName: siteConfig?.heroTitle1 || "TETRA HATS",
        logoUrl: siteConfig?.logoUrl || "",
        buyerName: buyerName.trim().toUpperCase(),
        buyerEmail: (currentUser?.email || buyerEmail).trim().toLowerCase(),
        buyerPhone: buyerPhone.trim(),
        shippingAddress: shippingAddress.trim().toUpperCase(),
        dateStr: nowStr,
        items: cart.map(item => ({
          name: item.product.name.toUpperCase(),
          quantity: item.quantity,
          priceMXN: item.product.priceMXN
        })),
        totalMXN: subtotalMXN,
        totalFormatted: formatPrice(subtotalMXN),
        cardBrand: getCardBrand(),
        receivingBankAccount: siteConfig?.receivingBankAccount || "4189143187401339",
        status: "PENDIENTE_DE_REVISION"
      };

      setLastOrderId(orderId);
      setLastAuthCode(authCode);
      setLastCardDigits(cardLast4);
      setLastTicketSummary(ticketSummary);

      setCheckingOut(false);
      setSuccess(true);
      setErrorMsg("");

    } catch (err) {
      console.error(err);
      setErrorMsg("Ocurrió un error al procesar el pago o conectar con el servidor.");
      setCheckingOut(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Drawer Container */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-neutral-950 text-white z-50 flex flex-col border-l border-neutral-800 shadow-2xl"
          >
            {/* Blinking Top Banner Inciting Sign-In for Receipts History */}
            {!currentUser ? (
              <button
                onClick={loginWithGoogle}
                className="w-full bg-gradient-to-r from-purple-950 via-purple-900 to-purple-950 border-b border-purple-500/50 p-3 px-4 text-[10px] font-black uppercase tracking-wider text-purple-200 flex items-center justify-between gap-2 shadow-xl transition-all hover:brightness-125 cursor-pointer animate-pulse"
                title="Inicia sesión con Google"
              >
                <div className="flex items-center gap-2 text-left">
                  <span className="text-sm shrink-0">✨</span>
                  <span className="leading-tight text-white font-extrabold tracking-wide">
                    ¡INICIA SESIÓN CON GOOGLE PARA GUARDAR Y ACCEDER AL HISTORIAL DE RECIBOS DE TODAS TUS COMPRAS!
                  </span>
                </div>
                <span className="bg-purple-500 hover:bg-purple-400 text-white text-[9px] font-black px-2.5 py-1 rounded shrink-0 shadow uppercase tracking-wider border border-purple-300/40">
                  INGRESAR
                </span>
              </button>
            ) : (
              <div className="w-full bg-emerald-950/80 border-b border-emerald-500/40 p-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="truncate">Sesión Activa: <strong className="text-white">{currentUser.email}</strong></span>
                </div>
                <span className="text-[9px] font-mono text-emerald-400 shrink-0 font-extrabold">
                  RECIBOS AUTO-GUARDADOS
                </span>
              </div>
            )}

            {/* Test Mode Active Notice Banner */}
            {siteConfig?.testCheckoutActive && (
              <div className="w-full bg-amber-950/90 border-b border-amber-500/50 p-2.5 px-4 text-xs text-amber-200 flex items-center justify-between gap-2 shadow-lg">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  <span className="text-[10px] font-mono truncate">
                    <strong className="text-amber-300 uppercase">MODO PRUEBA ACTIVO:</strong> Cobro fijado en <strong>${siteConfig.testCheckoutAmountMXN || 11}.00 MXN</strong>
                  </span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => updateSiteConfig({ testCheckoutActive: false })}
                    className="text-[9px] bg-amber-400 hover:bg-amber-300 text-black font-black px-2 py-0.5 rounded uppercase tracking-wider transition-colors shrink-0 cursor-pointer"
                  >
                    Desactivar
                  </button>
                )}
              </div>
            )}

            {/* Drawer Header */}
            <div className="p-6 border-b border-neutral-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box size={18} className="text-gray-400" />
                <h2 className="text-sm font-black tracking-[0.2em] uppercase text-white">
                  Bolsa de Compras ({cart.reduce((a, b) => a + b.quantity, 0)})
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-neutral-900 cursor-pointer"
                aria-label="Cerrar bolsa"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {success ? (
                <div className="py-8 text-center space-y-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-400 text-emerald-400 mx-auto animate-bounce shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                    <CheckCircle size={32} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-black tracking-widest uppercase text-emerald-400">
                      ¡PAGO APROBADO Y REGISTRADO!
                    </h3>
                    <div className="bg-black/60 border border-emerald-500/30 p-4 rounded text-left space-y-2 text-[11px] font-mono">
                      <p className="text-gray-400">ID COMPRA: <span className="text-white font-bold">{lastOrderId}</span></p>
                      <p className="text-gray-400">AUTORIZACIÓN: <span className="text-emerald-400 font-bold">{lastAuthCode}</span></p>
                      <p className="text-gray-400">CORREO: <span className="text-white font-bold">{buyerEmail}</span></p>
                      <p className="text-gray-400">MÉTODO: <span className="text-white font-bold">TARJETA (****{lastCardDigits})</span></p>
                      <p className="text-gray-400">ESTADO: <span className="text-emerald-400 font-bold">PAGO_RECIBIDO</span></p>
                    </div>
                  </div>

                  {lastTicketSummary && (
                    <div className="pt-2 space-y-2">
                      <button
                        onClick={() => openTicketPDF(lastTicketSummary)}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3.5 px-4 text-xs font-black tracking-widest uppercase rounded shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Download size={16} />
                        <span>Descargar Ticket PDF (Formato PDF)</span>
                      </button>

                      <button
                        onClick={() => sendTicketEmail(lastTicketSummary, "hugocesarlemuscortes@gmail.com")}
                        className="w-full bg-neutral-900 border border-emerald-500/50 hover:bg-neutral-800 text-emerald-400 py-3 px-4 text-xs font-black tracking-widest uppercase rounded flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <span>✉️ Enviar Ticket PDF por Correo ({buyerEmail})</span>
                      </button>
                    </div>
                  )}

                  <p className="text-[10px] text-gray-400 max-w-xs mx-auto leading-relaxed uppercase">
                    SELLO DE AUTENTICIDAD REGISTRADO EN FIRESTORE. SE HA ASIGNADO EL STATUS "PAGO_RECIBIDO" Y SE HA GENERADO TU COMPROBANTE OFICIAL.
                  </p>

                  <button
                    onClick={() => {
                      setSuccess(false);
                      setShowCheckoutForm(false);
                      onClearCart();
                      onClose();
                    }}
                    className="mt-4 px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold tracking-widest uppercase transition-colors cursor-pointer"
                  >
                    Finalizar y Cerrar
                  </button>
                </div>
              ) : checkingOut ? (
                <div className="py-20 text-center space-y-6">
                  <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                    <CreditCard size={20} className="text-emerald-400 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-emerald-400 font-bold tracking-widest uppercase animate-pulse">
                      Procesando Transacción Bancaria
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono tracking-wider max-w-xs mx-auto">
                      {checkoutStepText}
                    </p>
                  </div>
                </div>
              ) : cart.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <div className="text-gray-600 flex justify-center">
                    <Box size={40} strokeWidth={1} />
                  </div>
                  <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
                    Tu bolsa está vacía
                  </p>
                  <p className="text-[10px] text-gray-600 max-w-xs mx-auto">
                    Explora y adquiere uno de nuestros modelos de alta costura antes de que se agoten las existencias.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-4 px-6 py-2.5 bg-white text-black text-xs font-bold tracking-widest uppercase hover:bg-neutral-200 transition-colors cursor-pointer"
                  >
                    Seguir comprando
                  </button>
                </div>
              ) : showCheckoutForm ? (
                /* Checkout details form view */
                <form onSubmit={handleCreateOrder} className="space-y-4 text-left">
                  <div className="border-b border-neutral-900 pb-3 flex justify-between items-center">
                    <h3 className="text-xs font-black tracking-widest uppercase text-gray-300">Detalles de Entrega y Pago</h3>
                    <button 
                      type="button" 
                      onClick={() => setShowCheckoutForm(false)}
                      className="text-gray-500 hover:text-white text-[10px] uppercase font-bold"
                    >
                      Volver al Carrito
                    </button>
                  </div>

                  {currentUser ? (
                    <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
                          Sesión iniciada: {currentUser.displayName || currentUser.email}
                        </span>
                      </div>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">
                        VERIFICADO
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded space-y-2">
                      <div className="text-[10px] text-amber-300 font-bold uppercase flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Inicia sesión con Google para procesar tu orden y sincronizar tu comprobante</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => loginWithGoogle()}
                        className="w-full bg-white hover:bg-neutral-200 text-black text-xs font-black py-2.5 px-3 rounded flex items-center justify-center gap-2 uppercase cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>Iniciar Sesión con Google</span>
                      </button>
                    </div>
                  )}

                  <div className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold uppercase text-gray-400 tracking-wider flex items-center gap-1">
                        <User size={10} /> Nombre Completo del Destinatario
                      </label>
                      <input
                        type="text"
                        required
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        placeholder="EJ. JUAN PÉREZ GARCÍA"
                        className="w-full bg-black border border-neutral-800 rounded p-2.5 text-white uppercase focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold uppercase text-gray-400 tracking-wider flex items-center gap-1">
                        <Mail size={10} /> Correo Electrónico (Seguimiento de Compra)
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="tu-correo@ejemplo.com"
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        className="w-full bg-black border border-neutral-800 rounded p-2.5 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold uppercase text-gray-400 tracking-wider flex items-center gap-1">
                        <Phone size={10} /> Teléfono Celular de Contacto
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="Ej. +52 55 1234 5678"
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        className="w-full bg-black border border-neutral-800 rounded p-2.5 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold uppercase text-gray-400 tracking-wider flex items-center gap-1">
                        <MapPin size={10} /> Dirección de Envío Completa (Calle, CP, Ciudad, Estado)
                      </label>
                      <textarea
                        required
                        rows={2}
                        placeholder="AV. PASEO DE LA REFORMA 123, COL. JUÁREZ, CP 06600, CIUDAD DE MÉXICO"
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        className="w-full bg-black border border-neutral-800 rounded p-2.5 text-white uppercase focus:outline-none focus:border-emerald-500 leading-relaxed"
                      />
                    </div>

                    {/* Payment Method Section - EXCLUSIVELY STRIPE */}
                    <div className="space-y-2 border-t border-neutral-900 pt-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] font-extrabold uppercase text-gray-400 tracking-wider block">Método de Pago Oficial</label>
                        <span className="text-[9px] font-black tracking-widest text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                          <CreditCard size={10} /> STRIPE CHECKOUT
                        </span>
                      </div>

                      <div className="p-3.5 bg-gradient-to-r from-purple-950/40 via-neutral-900 to-black border border-purple-500/30 rounded-lg space-y-2">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                            <CreditCard size={14} className="text-purple-400" /> Stripe Payments
                          </span>
                          <span className="text-[8px] font-mono text-emerald-400 font-bold uppercase bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                            PAGO 100% SEGURO
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-300 leading-relaxed">
                          Paga directamente con cualquier tarjeta de Débito o Crédito (Visa, Mastercard, AMEX) procesado de forma encriptada y segura vía <strong>Stripe</strong>. Recibirás tu comprobante oficial descargable al finalizar.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-900 space-y-3">
                    {errorMsg && (
                      <div className="p-3 bg-red-950/60 border border-red-500/40 text-red-400 font-extrabold uppercase text-[10px] rounded tracking-wider leading-relaxed text-center flex items-center justify-center gap-2">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold tracking-widest text-gray-400 uppercase">TOTAL A PAGAR:</span>
                      <span className="text-sm font-black text-emerald-400 tracking-widest">
                        {formatPrice(subtotalMXN)}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {/* Botón Principal Stripe */}
                      <button
                        type="button"
                        onClick={handleStripeCheckout}
                        disabled={isStripeLoading}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white py-4 px-6 text-xs font-black tracking-widest uppercase transition-all rounded-lg shadow-2xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-purple-400/30"
                      >
                        {isStripeLoading ? (
                          <span>Conectando con Stripe...</span>
                        ) : (
                          <>
                            <CreditCard size={15} />
                            <span>PAGAR CON STRIPE (${subtotalMXN.toLocaleString()} MXN)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => {
                    const liveProduct = products?.find((p) => p.id === item.product.id || p.name.toLowerCase() === item.product.name?.toLowerCase()) || item.product;
                    const availableStock = typeof liveProduct.stockQuantity === "number"
                      ? liveProduct.stockQuantity
                      : (typeof item.product.stockQuantity === "number" ? item.product.stockQuantity : 10);
                    const isOutOfStock = liveProduct.outOfStock || availableStock <= 0;
                    const priceToUse = getEffectiveItemPrice(item.product);
                    const isTestItemActive = !!siteConfig?.testCheckoutActive && (
                      !siteConfig.testCheckoutProductId ||
                      siteConfig.testCheckoutProductId === "ALL" ||
                      siteConfig.testCheckoutProductId === item.product.id ||
                      item.product.name.toLowerCase().includes(siteConfig.testCheckoutProductId.toLowerCase())
                    );

                    return (
                      <div
                        key={item.product.id}
                        className="flex gap-4 p-3 bg-neutral-900/30 border border-neutral-900 rounded-lg hover:border-neutral-800 transition-all duration-300"
                      >
                        {/* Product Thumbnail */}
                        <div className="w-20 h-20 bg-neutral-950 flex-shrink-0 border border-neutral-900 rounded overflow-hidden flex items-center justify-center">
                          <img
                            src={getOptimizedImageUrl(liveProduct.images?.[0] || item.product.images?.[0], 200)}
                            alt={liveProduct.name || item.product.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        {/* Item details */}
                        <div className="flex-1 flex flex-col justify-between py-0.5">
                          <div className="min-w-0">
                            <div className="flex justify-between items-start">
                              <h4 className="text-xs font-bold tracking-wider truncate uppercase text-white hover:text-gray-300 transition-colors">
                                {liveProduct.name || item.product.name}
                              </h4>
                              <button
                                onClick={() => onRemoveItem(item.product.id)}
                                className="text-gray-500 hover:text-red-400 ml-2 transition-colors cursor-pointer"
                                aria-label="Remove item"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {liveProduct.badge && (
                                <span className="inline-block px-1.5 py-0.5 text-[8px] bg-emerald-500/10 text-emerald-400 font-bold tracking-widest uppercase rounded">
                                  {liveProduct.badge}
                                </span>
                              )}
                              {isTestItemActive && (
                                <span className="inline-block px-1.5 py-0.5 text-[8px] bg-amber-400 text-black font-black tracking-widest uppercase rounded animate-pulse">
                                  ⚡ PRUEBA: ${siteConfig.testCheckoutAmountMXN || 11} MXN
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Dropdown Quantity Selector with Realtime Stock Limit */}
                          <div className="flex items-end justify-between mt-2 gap-2">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Cant:</span>
                                {isOutOfStock ? (
                                  <span className="bg-red-950/80 border border-red-500/50 rounded text-[10px] px-2 py-0.5 text-red-400 font-black uppercase">
                                    0 pzas (AGOTADO)
                                  </span>
                                ) : (
                                  <select
                                    value={Math.min(item.quantity, availableStock)}
                                    onChange={(e) => onUpdateQty(item.product.id, Number(e.target.value) - item.quantity)}
                                    className="bg-black border border-emerald-500/50 rounded text-xs px-2 py-1 text-emerald-400 font-extrabold focus:outline-none focus:border-emerald-300 cursor-pointer uppercase"
                                  >
                                    {Array.from({ length: Math.min(availableStock, 50) }, (_, i) => i + 1).map((num) => (
                                      <option key={num} value={num} className="bg-neutral-950 text-white font-bold">
                                        {num} {num === 1 ? "pza" : "pzas"} (de {availableStock} disp.)
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                              <span className="text-[9px] font-mono block">
                                📦 Stock disponible: <strong className={availableStock === 0 ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>{availableStock} pza(s)</strong>
                              </span>
                            </div>
                            <span className="text-xs font-bold text-white tracking-wide shrink-0">
                              {formatPrice(priceToUse * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer / Checkout Actions */}
            {cart.length > 0 && !checkingOut && !success && !showCheckoutForm && (
              <div className="p-6 border-t border-neutral-900 bg-neutral-950 space-y-4 shadow-[0_-12px_24px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold tracking-widest text-gray-400 uppercase">Total Estimado</span>
                  <span className="text-base font-extrabold text-white tracking-widest">
                    {formatPrice(subtotalMXN)}
                  </span>
                </div>

                {!currentUser ? (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-amber-950/40 border border-amber-500/30 rounded text-[10px] text-amber-300 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Identificación con Google requerida para comprar</span>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await loginWithGoogle();
                          setBuyerName(currentUser?.displayName || "");
                          setBuyerEmail(currentUser?.email || "");
                          setShowCheckoutForm(true);
                        } catch {}
                      }}
                      className="w-full bg-white hover:bg-neutral-200 text-black py-4 px-6 text-xs font-black tracking-widest uppercase active:scale-[0.99] transition-all rounded shadow-lg flex items-center justify-center gap-2.5 cursor-pointer"
                      id="google-checkout-trigger-btn"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Iniciar Sesión con Google para Comprar</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setBuyerName(currentUser?.displayName || buyerName || "");
                      setBuyerEmail(currentUser?.email || buyerEmail || "");
                      setShowCheckoutForm(true);
                    }}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-4 px-6 text-xs font-black tracking-[0.2em] uppercase active:scale-[0.99] transition-all duration-300 rounded shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                    id="checkout-trigger-btn"
                  >
                    <CreditCard size={15} />
                    <span>Proceder al Checkout (Pagar con Tarjeta)</span>
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
