import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Trash2, Plus, Minus, Box, CheckCircle, CreditCard, Lock, AlertCircle, Download, Mail, Phone, User, MapPin } from "lucide-react";
import { CartItem } from "../types";
import { useSite } from "../context/SiteContext";
import { getOptimizedImageUrl } from "../lib/imageOptimizer";

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

  const { currentUser, siteConfig, saveOrder, products } = useSite();

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
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleStripeCheckout = async () => {
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

    // Save order record to Firestore as PAGO_PENDIENTE until user completes payment in Stripe
    try {
      await saveOrder({
        id: orderId,
        userEmail: buyerEmail.trim(),
        userName: buyerName.trim(),
        createdAt: new Date().toISOString(),
        items: cart.map(i => ({
          productId: i.product.id,
          productName: i.product.name,
          quantity: i.quantity,
          priceMXN: i.product.priceMXN,
          image: i.product.images?.[0] || ""
        })),
        totalMXN: subtotalMXN,
        status: "PAGO_PENDIENTE",
        shippingAddress: shippingAddress.trim(),
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
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          buyerName: buyerName.trim(),
          buyerEmail: buyerEmail.trim(),
          secretKey: siteConfig.stripeSecretKey || "",
          items: cart.map(i => ({
            productId: i.product.id,
            name: i.product.name,
            quantity: i.quantity,
            priceMXN: i.product.priceMXN,
            image: i.product.images?.[0]
          }))
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        safeClosePopup();
        setIsStripeLoading(false);
        if (data.error === "MISSING_STRIPE_KEY") {
          setErrorMsg("⚡ STRIPE: Ingrese su Clave Secreta de Stripe (sk_live_...) en el Panel Admin -> Pasarela de Pago.");
        } else if (data.error === "INVALID_STRIPE_KEY") {
          setErrorMsg(`⚡ STRIPE: ${data.message}`);
        } else {
          setErrorMsg(data.message || "Error al conectar con la pasarela de Stripe. Verifica tu clave de Stripe en el Panel de Admin.");
        }
        return;
      }

      if (data.url) {
        let redirectedInPopup = false;
        if (payWin) {
          try {
            if (!payWin.closed) {
              payWin.location.href = data.url;
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
              window.top.location.href = data.url;
            } else {
              window.location.href = data.url;
            }
          } catch (navErr) {
            window.location.href = data.url;
          }
        }
      } else {
        safeClosePopup();
        setIsStripeLoading(false);
        setErrorMsg("No se obtuvo el enlace de checkout de Stripe.");
      }
    } catch (err: any) {
      safeClosePopup();
      console.error("Stripe fetch error:", err);
      setIsStripeLoading(false);
      setErrorMsg(err?.message ? `Error de comunicación con Stripe: ${err.message}` : "Error de comunicación con el servidor backend de Stripe.");
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
    return cart.reduce((acc, item) => acc + (item.product?.priceMXN || 0) * item.quantity, 0);
  };

  const subtotalMXN = getSubtotalMXN();

  // Printable PDF ticket generator & Email helper
  const openTicketPDF = (data: TicketSummary) => {
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
      <div class="receipt-title">COMPROBANTE OFICIAL DE COMPRA PDF</div>
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
      <div class="total-label">TOTAL PAGADO</div>
      <div class="total-val">${data.totalFormatted}</div>
    </div>

    <div class="footer-stamp">
      <p style="margin: 0 0 4px 0; font-weight: 800; color: #888888;">¡GRACIAS POR TU COMPRA EN TETRA HATS!</p>
      <p style="margin: 0;">REMITENTE OFICIAL ADMINISTRADOR: hugocesarlemuscortes@gmail.com • SELLO DE AUTENTICIDAD FIRESTORE ENCRIPTADO • CONSERVA ESTE TICKET PDF PARA SEGUIMIENTO DE TU ENVÍO</p>
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
        userEmail: buyerEmail.trim().toLowerCase(),
        userName: buyerName.trim().toUpperCase(),
        buyerPhone: buyerPhone.trim(),
        createdAt: new Date().toISOString(),
        items: cart.map(item => ({
          productId: item.product.id,
          productName: item.product.name.toUpperCase(),
          quantity: item.quantity,
          priceMXN: item.product.priceMXN,
          image: item.product.images[0]
        })),
        totalMXN: subtotalMXN,
        status: "PAGO_RECIBIDO",
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
        buyerEmail: buyerEmail.trim().toLowerCase(),
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
        receivingBankAccount: siteConfig?.receivingBankAccount || "4189143187401339"
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

                      <div className="p-2.5 bg-neutral-900/80 border border-neutral-800 rounded text-[9px] text-gray-400 uppercase font-mono text-center">
                        * Remitente Oficial Admin: <span className="text-emerald-400 font-bold">hugocesarlemuscortes@gmail.com</span>
                      </div>
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
                    const liveProduct = products?.find((p) => p.id === item.product.id) || item.product;
                    const availableStock = typeof liveProduct.stockQuantity === "number"
                      ? liveProduct.stockQuantity
                      : (typeof item.product.stockQuantity === "number" ? item.product.stockQuantity : 10);
                    const isOutOfStock = liveProduct.outOfStock || availableStock <= 0;
                    const priceToUse = liveProduct.priceMXN ?? item.product.priceMXN;

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
                            {liveProduct.badge && (
                              <span className="inline-block px-1.5 py-0.5 text-[8px] bg-emerald-500/10 text-emerald-400 font-bold tracking-widest uppercase rounded mt-1">
                                {liveProduct.badge}
                              </span>
                            )}
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
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
