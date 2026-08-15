// Bulletproof Stripe Client: Dual-mode (Backend API + Direct Stripe REST Fallback)
// Ensures Stripe payments and key verifications work 100% in all deployment types:
// Vercel Static, Vercel Serverless, Cloud Run, Localhost, Netlify, Custom Domains (tetra-hats.com)

import { sanitizeCheckoutItems } from "./security";

export interface StripeVerifyResult {
  valid: boolean;
  livemode?: boolean;
  currency?: string;
  message: string;
  status: string;
}

/**
 * Verifies a Stripe Secret Key.
 * Tries the backend API first; if unavailable (404/500/offline), talks directly to Stripe's official API.
 */
export async function verifyStripeKey(rawSecretKey: string): Promise<StripeVerifyResult> {
  const secretKey = (rawSecretKey || "").replace(/["'\s]/g, "").trim();

  if (!secretKey) {
    return {
      valid: false,
      status: "EMPTY",
      message: "⚠️ No hay ninguna Clave Secreta ingresada. Ingresa tu Secret Key (sk_live_... o sk_test_...)."
    };
  }

  if (secretKey.startsWith("pk_")) {
    return {
      valid: false,
      status: "WRONG_KEY_TYPE",
      message: "⚠️ Has ingresado una Clave Publicable (pk_...) en el campo de Clave Secreta. Debes ingresar la Secret Key (sk_live_... o sk_test_...)."
    };
  }

  if (!secretKey.startsWith("sk_") && !secretKey.startsWith("rk_")) {
    return {
      valid: false,
      status: "INVALID_FORMAT",
      message: "⚠️ Formato Inválido: La Clave Secreta debe comenzar con 'sk_live_' o 'sk_test_'."
    };
  }

  // 1. Try local/serverless backend endpoint first
  try {
    const backendRes = await fetch("/api/stripe/verify-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secretKey })
    });

    if (backendRes.ok) {
      const contentType = backendRes.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await backendRes.json();
        if (typeof data.valid === "boolean") {
          return {
            valid: data.valid,
            livemode: data.livemode,
            currency: data.currency,
            message: data.message || (data.valid ? "✅ Clave de Stripe verificada con éxito." : "❌ Clave rechazada por Stripe."),
            status: data.status || (data.valid ? "SUCCESS" : "FAILED")
          };
        }
      }
    }
  } catch (backendErr) {
    // Backend fetch failed (e.g. running on static Vercel build). Proceed to Direct Stripe API validation.
  }

  // 2. Direct Stripe REST API Validation (Stripe supports CORS for balance endpoint)
  try {
    const stripeRes = await fetch("https://api.stripe.com/v1/balance", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${secretKey}`
      }
    });

    const stripeData = await stripeRes.json().catch(() => ({}));

    if (stripeRes.ok && stripeData.object === "balance") {
      const isLive = Boolean(stripeData.livemode);
      const currency = stripeData.available?.[0]?.currency?.toUpperCase() || "MXN";
      return {
        valid: true,
        livemode: isLive,
        currency,
        status: "SUCCESS",
        message: `✅ CONEXIÓN EXITOSA CON STRIPE: Tu clave secreta está activa en modo ${isLive ? "PRODUCCIÓN (Live Mode)" : "PRUEBAS (Test Mode)"}.`
      };
    } else {
      const errorMsg = stripeData?.error?.message || "Stripe rechazó la clave secreta proporcionada.";
      return {
        valid: false,
        status: "FAILED",
        message: `❌ STRIPE RECHAZÓ LA CLAVE: ${errorMsg}`
      };
    }
  } catch (directErr: any) {
    return {
      valid: false,
      status: "NETWORK_ERROR",
      message: `❌ Error al conectar con Stripe API: ${directErr?.message || "Revisa tu conexión a internet"}`
    };
  }
}

export interface StripeCheckoutItem {
  productId: string;
  name: string;
  quantity: number;
  priceMXN: number;
  image?: string;
}

export interface StripeCheckoutParams {
  orderId: string;
  buyerName: string;
  buyerEmail: string;
  secretKey: string;
  items: StripeCheckoutItem[];
  origin?: string;
}

/**
 * Creates a Stripe Checkout Session.
 * Tries the backend API first, and if unavailable/static, creates it via Stripe REST API directly.
 */
export async function createStripeCheckoutSession(params: StripeCheckoutParams): Promise<{ url: string; sessionId?: string }> {
  const cleanSecret = (params.secretKey || "").replace(/["'\s]/g, "").trim();
  if (!cleanSecret) {
    throw new Error("No hay Clave Secreta de Stripe configurada.");
  }

  // Strictly sanitize & enforce authentic prices against official catalog
  const verifiedItems = sanitizeCheckoutItems(params.items);

  const currentOrigin = params.origin || (typeof window !== "undefined" ? window.location.origin : "https://tetra-hats.com");

  // 1. Try Backend Endpoint first
  try {
    const backendRes = await fetch("/api/stripe/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: params.orderId,
        buyerName: params.buyerName,
        buyerEmail: params.buyerEmail,
        secretKey: cleanSecret,
        clientOrigin: currentOrigin,
        items: verifiedItems
      })
    });

    if (backendRes.ok) {
      const contentType = backendRes.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await backendRes.json();
        if (data.url) {
          return { url: data.url, sessionId: data.sessionId };
        }
      }
    }
  } catch (e) {
    // Proceed to direct REST fallback
  }

  // 2. Direct Stripe REST API Session Creation
  const bodyParams = new URLSearchParams();
  bodyParams.append("payment_method_types[0]", "card");
  bodyParams.append("mode", "payment");
  bodyParams.append("success_url", `${currentOrigin}/?payment=success&orderId=${params.orderId}&session_id={CHECKOUT_SESSION_ID}`);
  bodyParams.append("cancel_url", `${currentOrigin}/?payment=cancel&orderId=${params.orderId}`);
  bodyParams.append("client_reference_id", params.orderId);

  if (params.buyerEmail && params.buyerEmail.includes("@")) {
    bodyParams.append("customer_email", params.buyerEmail.trim());
  }

  bodyParams.append("metadata[orderId]", params.orderId);
  bodyParams.append("metadata[buyerName]", params.buyerName || "Cliente TETRA HATS");

  bodyParams.append("shipping_address_collection[allowed_countries][0]", "MX");
  bodyParams.append("shipping_address_collection[allowed_countries][1]", "US");
  bodyParams.append("shipping_address_collection[allowed_countries][2]", "CA");

  verifiedItems.forEach((item, index) => {
    const unitAmount = Math.round((item.priceMXN || 0) * 100);
    bodyParams.append(`line_items[${index}][price_data][currency]`, "mxn");
    bodyParams.append(`line_items[${index}][price_data][unit_amount]`, String(unitAmount > 0 ? unitAmount : 5000));
    bodyParams.append(`line_items[${index}][price_data][product_data][name]`, item.name || "Gorra TETRA HATS");
    bodyParams.append(`line_items[${index}][quantity]`, String(item.quantity || 1));
    if (item.image && item.image.startsWith("http")) {
      bodyParams.append(`line_items[${index}][price_data][product_data][images][0]`, item.image);
    }
  });

  const stripeDirectRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${cleanSecret}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: bodyParams.toString()
  });

  const directData = await stripeDirectRes.json().catch(() => ({}));

  if (!stripeDirectRes.ok || !directData.url) {
    const errMessage = directData?.error?.message || "No se pudo generar la sesión de pago con Stripe.";
    throw new Error(errMessage);
  }

  return { url: directData.url, sessionId: directData.id };
}
