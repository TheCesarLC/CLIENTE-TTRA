import express from "express";
import path from "path";
import fs from "fs";
import { Readable } from "stream";
import { MercadoPagoConfig, Preference } from "mercadopago";
import Stripe from "stripe";
import sharp from "sharp";

export const app = express();

// In-memory LRU cache for processed images to serve repeat requests in <2ms
interface CachedImage {
  buffer: Buffer;
  contentType: string;
  etag: string;
  timestamp: number;
}
const imageCache = new Map<string, CachedImage>();
const MAX_IMAGE_CACHE = 500;

// In-memory cache for resolved viewer URLs (e.g. ibb.co viewer -> i.ibb.co direct)
const resolvedUrlCache = new Map<string, string>();

// Enable CORS and JSON parsing
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// Helper to extract clean, valid absolute Origin URL in all environments (AI Studio dev, published domain, Cloud Run, Vercel, Hostinger, iframes)
const getRequestOrigin = (req: express.Request): string => {
  const originHeader = req.headers.origin;
  if (originHeader && originHeader !== "null" && originHeader.trim() !== "") {
    return originHeader.replace(/\/$/, "");
  }
  const refererHeader = req.headers.referer;
  if (refererHeader) {
    try {
      const parsed = new URL(refererHeader);
      return `${parsed.protocol}//${parsed.host}`;
    } catch (e) {
      // invalid referer URL
    }
  }
  const hostHeader = (req.headers["x-forwarded-host"] as string) || req.headers.host;
  const protoHeader = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  if (hostHeader) {
    return `${protoHeader}://${hostHeader}`.replace(/\/$/, "");
  }
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
};

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Google Drive Direct Video Stream Proxy for HTML5 <video> Autoplay, Loop & Mute
app.get("/api/video-stream", async (req, res) => {
  const fileId = req.query.id as string;
  if (!fileId) return res.status(400).send("Missing Google Drive file id");

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");

  try {
    const pageRes = await fetch(`https://drive.usercontent.google.com/download?id=${fileId}&export=download`);
    const contentType = pageRes.headers.get("content-type") || "";

    let downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;

    if (contentType.includes("text/html")) {
      const html = await pageRes.text();
      const uuidMatch = html.match(/name="uuid"\s+value="([^"]+)"/);
      const uuid = uuidMatch ? uuidMatch[1] : "";
      downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t${uuid ? `&uuid=${uuid}` : ""}`;
    }

    const forwardHeaders: Record<string, string> = {};
    if (req.headers.range) {
      forwardHeaders["Range"] = req.headers.range;
    }

    const videoRes = await fetch(downloadUrl, { headers: forwardHeaders });

    res.status(videoRes.status);
    res.setHeader("Content-Type", videoRes.headers.get("content-type") || "video/mp4");
    if (videoRes.headers.get("content-length")) {
      res.setHeader("Content-Length", videoRes.headers.get("content-length")!);
    }
    if (videoRes.headers.get("content-range")) {
      res.setHeader("Content-Range", videoRes.headers.get("content-range")!);
    }
    if (videoRes.headers.get("accept-ranges")) {
      res.setHeader("Accept-Ranges", videoRes.headers.get("accept-ranges")!);
    } else {
      res.setHeader("Accept-Ranges", "bytes");
    }
    res.setHeader("Cache-Control", "public, max-age=86400");

    if (req.method === "HEAD" || !videoRes.body) {
      return res.end();
    }

    Readable.fromWeb(videoRes.body as any).pipe(res);
  } catch (err) {
    console.error("Video proxy error:", err);
    if (!res.headersSent) {
      res.status(500).send("Error streaming video");
    }
  }
});

// Image proxy with high-speed Sharp compression & in-memory caching
// Compresses heavy 4MB Imgur/ImgBB PNGs into ultra-crisp ~20KB WebP thumbnails preserving 100% alpha transparency
app.get("/api/proxy-image", async (req, res) => {
  let imageUrl = req.query.url as string;
  if (!imageUrl || typeof imageUrl !== "string") return res.status(400).send("Missing image url");

  const targetWidth = parseInt(req.query.w as string) || 0;
  const requestedFmt = ((req.query.fmt as string) || "webp").toLowerCase();
  const quality = Math.min(100, Math.max(40, parseInt(req.query.q as string) || 85));

  const cacheKey = `${imageUrl}::w${targetWidth}::f${requestedFmt}::q${quality}`;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");

  // 1. Check in-memory image cache for instant response (<2ms)
  const cached = imageCache.get(cacheKey);
  if (cached) {
    if (req.headers["if-none-match"] === cached.etag) {
      return res.status(304).end();
    }
    res.setHeader("Content-Type", cached.contentType);
    res.setHeader("Content-Length", cached.buffer.length);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("ETag", cached.etag);
    res.setHeader("X-Cache", "HIT");
    if (req.method === "HEAD") return res.end();
    return res.end(cached.buffer);
  }

  try {
    let targetFetchUrl = imageUrl.trim();

    // Check if we previously resolved this viewer URL to a direct image link
    if (resolvedUrlCache.has(targetFetchUrl)) {
      targetFetchUrl = resolvedUrlCache.get(targetFetchUrl)!;
    } else if (
      (targetFetchUrl.includes("ibb.co/") || targetFetchUrl.includes("imgbb.com/")) &&
      !targetFetchUrl.includes("i.ibb.co") &&
      !targetFetchUrl.includes("simgbb.com")
    ) {
      // Resolve ImgBB viewer page link (e.g., https://ibb.co/XXXX or https://imgbb.com/XXXX)
      try {
        const pageRes = await fetch(targetFetchUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          },
        });
        if (pageRes.ok) {
          const html = await pageRes.text();
          const match =
            html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
            html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i) ||
            html.match(/<link\s+rel=["']image_src["']\s+href=["']([^"']+)["']/i) ||
            html.match(/<img\s+[^>]*src=["'](https:\/\/[a-z0-9]+\.ibb\.co[^"']+)["']/i);
          if (match && match[1]) {
            resolvedUrlCache.set(imageUrl.trim(), match[1]);
            targetFetchUrl = match[1];
          }
        }
      } catch (err) {
        console.warn("Could not resolve ImgBB viewer page, attempting direct stream:", err);
      }
    }

    const fetchHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
    };

    const fetchRes = await fetch(targetFetchUrl, { headers: fetchHeaders });

    if (!fetchRes.ok) {
      return res.status(fetchRes.status).send("Failed to fetch upstream image");
    }

    const rawBuf = Buffer.from(await fetchRes.arrayBuffer());

    try {
      let pipeline = sharp(rawBuf);
      const meta = await pipeline.metadata();

      // Resize proportionally if target width is specified and image is larger
      if (targetWidth > 0 && meta.width && meta.width > targetWidth) {
        pipeline = pipeline.resize({
          width: targetWidth,
          withoutEnlargement: true,
          fit: "inside"
        });
      }

      let outBuf: Buffer;
      let outMime: string;

      if (requestedFmt === "png") {
        outBuf = await pipeline.png({ compressionLevel: 8, effort: 4 }).toBuffer();
        outMime = "image/png";
      } else if (requestedFmt === "avif") {
        outBuf = await pipeline.avif({ quality, effort: 3 }).toBuffer();
        outMime = "image/avif";
      } else {
        // High quality WebP with 100% alpha transparency preservation
        outBuf = await pipeline.webp({ quality, alphaQuality: 100, effort: 4 }).toBuffer();
        outMime = "image/webp";
      }

      const etag = `"${Buffer.from(cacheKey).toString("base64").substring(0, 16)}-${outBuf.length}"`;

      // Cache in memory (evict oldest if cache gets large)
      if (imageCache.size >= MAX_IMAGE_CACHE) {
        const oldestKey = imageCache.keys().next().value;
        if (oldestKey) imageCache.delete(oldestKey);
      }
      imageCache.set(cacheKey, {
        buffer: outBuf,
        contentType: outMime,
        etag,
        timestamp: Date.now()
      });

      res.setHeader("Content-Type", outMime);
      res.setHeader("Content-Length", outBuf.length);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("ETag", etag);
      res.setHeader("X-Cache", "MISS");
      if (req.method === "HEAD") return res.end();
      return res.end(outBuf);
    } catch (sharpErr) {
      console.warn("Sharp optimization fallback to raw buffer:", sharpErr);
      const contentType = fetchRes.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", rawBuf.length);
      res.setHeader("Cache-Control", "public, max-age=86400");
      if (req.method === "HEAD") return res.end();
      return res.end(rawBuf);
    }
  } catch (err) {
    console.error("Image proxy error:", err);
    if (!res.headersSent) {
      res.status(500).send("Error proxying image");
    }
  }
});

// Endpoint to resolve any viewer URL (like ImgBB or Imgur) to direct image link
app.get("/api/resolve-image-url", async (req, res) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).json({ error: "Missing url" });

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");

  try {
    const trimmed = url.trim();
    if (resolvedUrlCache.has(trimmed)) {
      return res.json({ resolvedUrl: resolvedUrlCache.get(trimmed) });
    }

    if (
      (trimmed.includes("ibb.co/") || trimmed.includes("imgbb.com/")) &&
      !trimmed.includes("i.ibb.co") &&
      !trimmed.includes("simgbb.com")
    ) {
      const pageRes = await fetch(trimmed, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        },
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        const match =
          html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
          html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i) ||
          html.match(/<link\s+rel=["']image_src["']\s+href=["']([^"']+)["']/i) ||
          html.match(/<img\s+[^>]*src=["'](https:\/\/[a-z0-9]+\.ibb\.co[^"']+)["']/i);
        if (match && match[1]) {
          resolvedUrlCache.set(trimmed, match[1]);
          return res.json({ resolvedUrl: match[1] });
        }
      }
    }
    return res.json({ resolvedUrl: trimmed });
  } catch {
    return res.json({ resolvedUrl: url });
  }
});

// Stripe Verification Endpoint
app.post("/api/stripe/verify-keys", async (req, res) => {
  try {
    const { secretKey: customSecret } = req.body;
    const rawSecret = (customSecret && typeof customSecret === "string" && customSecret.trim())
      ? customSecret.trim()
      : (process.env.STRIPE_SECRET_KEY || "");

    if (!rawSecret) {
      return res.status(200).json({
        valid: false,
        status: "EMPTY",
        message: "No se ha ingresado ninguna Clave Secreta (Secret Key)."
      });
    }

    const secretKey = rawSecret.replace(/^["']|["']$/g, "").trim();

    if (secretKey.startsWith("pk_")) {
      return res.status(200).json({
        valid: false,
        status: "WRONG_KEY_TYPE",
        message: "⚠️ Error de Tipo: Has ingresado una Clave Publicable (pk_...) en el campo de Clave Secreta. Debes ingresar la Secret Key (sk_live_... o sk_test_...)."
      });
    }

    if (!secretKey.startsWith("sk_")) {
      return res.status(200).json({
        valid: false,
        status: "INVALID_FORMAT",
        message: "⚠️ Formato Inválido: La Clave Secreta debe comenzar con 'sk_live_' o 'sk_test_'."
      });
    }

    const stripe = new Stripe(secretKey);
    const balance = await stripe.balance.retrieve();

    const isLiveMode = Boolean(balance.livemode);
    const modeText = isLiveMode ? "PRODUCCIÓN (Live Mode)" : "PRUEBAS (Test Mode)";

    return res.status(200).json({
      valid: true,
      status: "SUCCESS",
      livemode: isLiveMode,
      message: `✅ CONEXIÓN EXITOSA CON STRIPE: Tu clave secreta está activa en modo ${modeText}.`,
      currency: balance.available?.[0]?.currency?.toUpperCase() || "MXN"
    });
  } catch (err: any) {
    console.error("Stripe Verification Error:", err);
    const rawMsg = err?.message || err?.raw?.message || "";
    const errType = err?.type || err?.raw?.type || "";

    let userMsg = "Error al autenticar con Stripe.";
    if (errType === "StripeAuthenticationError" || rawMsg.includes("Invalid API Key") || rawMsg.includes("No such API key")) {
      userMsg = "❌ CLAVE INVÁLIDA: Stripe rechazó la clave secreta. Revisa que sea correcta en dashboard.stripe.com/apikeys y que no esté cancelada.";
    } else if (rawMsg) {
      userMsg = `❌ ERROR EN STRIPE: ${rawMsg}`;
    }

    return res.status(200).json({
      valid: false,
      status: "FAILED",
      message: userMsg,
      rawDetails: rawMsg
    });
  }
});

// Stripe Checkout Endpoint
app.post("/api/stripe/create-checkout-session", async (req, res) => {
  try {
    const { items, orderId, buyerEmail, secretKey: customSecret, clientOrigin } = req.body;
    const rawSecret = (customSecret && typeof customSecret === "string" && customSecret.trim()) 
      ? customSecret.trim() 
      : (process.env.STRIPE_SECRET_KEY || "");

    if (!rawSecret) {
      return res.status(400).json({
        error: "MISSING_STRIPE_KEY",
        message: "No se ha configurado la clave secreta de Stripe (Secret Key). Ingrésala en tu Panel de Administración -> Pasarela de Pago."
      });
    }

    // Remove any surrounding single/double quotes or leading/trailing whitespace
    const secretKey = rawSecret.replace(/^["']|["']$/g, "").trim();

    if (secretKey.startsWith("pk_")) {
      return res.status(400).json({
        error: "INVALID_STRIPE_KEY",
        message: "Has ingresado la Clave Publicable (pk_...) en el campo de Clave Secreta. Por favor ingresa tu Secret Key que comienza con sk_live_... o sk_test_... en el Panel Admin -> Pasarela de Pago."
      });
    }

    if (!secretKey.startsWith("sk_")) {
      return res.status(400).json({
        error: "INVALID_STRIPE_KEY",
        message: "La Clave Secreta de Stripe debe comenzar con 'sk_live_' o 'sk_test_'. Por favor verifica la clave en el Panel Admin -> Pasarela de Pago."
      });
    }

    const stripe = new Stripe(secretKey);
    const origin = (clientOrigin && typeof clientOrigin === "string" && clientOrigin.startsWith("http"))
      ? clientOrigin.replace(/\/$/, "")
      : getRequestOrigin(req);

    let totalCentavos = 0;
    const lineItems = (items || []).map((item: any) => {
      let rawPrice = item.priceMXN ?? item.price ?? item.unitPrice ?? 1499;
      if (typeof rawPrice === "string") {
        rawPrice = parseFloat(rawPrice.replace(/[^0-9.]/g, ""));
      }
      const price = Number(rawPrice) > 0 ? Number(rawPrice) : 1499;
      const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
      // Stripe requires minimum 10.00 MXN (1000 centavos) per line item
      const unitAmount = Math.max(1000, Math.round(price * 100));
      totalCentavos += unitAmount * qty;

      // Stripe API requires image URLs to be absolute HTTP or HTTPS links
      const rawImg = item.image || (Array.isArray(item.images) ? item.images[0] : null);
      let validImages: string[] = [];
      if (typeof rawImg === "string" && rawImg.trim()) {
        const trimmedImg = rawImg.trim();
        if (trimmedImg.startsWith("http://") || trimmedImg.startsWith("https://")) {
          validImages = [trimmedImg];
        } else if (trimmedImg.startsWith("/")) {
          validImages = [`${origin}${trimmedImg}`];
        }
      }

      return {
        price_data: {
          currency: "mxn",
          product_data: {
            name: item.name || item.productName || "Gorra TETRA HATS",
            ...(validImages.length > 0 ? { images: validImages } : {}),
          },
          unit_amount: unitAmount,
        },
        quantity: qty,
      };
    });

    if (lineItems.length === 0) {
      lineItems.push({
        price_data: {
          currency: "mxn",
          product_data: {
            name: "Gorra TETRA HATS - Edición Exclusiva",
          },
          unit_amount: 129900,
        },
        quantity: 1,
      });
      totalCentavos = 129900;
    }

    // Stripe requires a minimum charge of $10.00 MXN (1000 centavos) for MXN currency.
    if (lineItems.length > 0 && totalCentavos < 1000) {
      const needed = 1000 - totalCentavos;
      lineItems[0].price_data.unit_amount += Math.ceil(needed / lineItems[0].quantity);
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      customer_email: buyerEmail && buyerEmail.includes("@") ? buyerEmail.trim() : undefined,
      client_reference_id: orderId || `ORD-${Date.now()}`,
      success_url: `${origin}/?payment=success&orderId=${orderId || ""}`,
      cancel_url: `${origin}/?payment=cancelled`,
    });

    return res.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (err: any) {
    console.error("Stripe Session Detailed Error:", err);
    const rawMsg = err?.message || err?.raw?.message || "";
    const errType = err?.type || err?.raw?.type || "";
    const errCode = err?.code || err?.raw?.code || "";

    let errorMessage = rawMsg || "Ocurrió un error al conectar con la API de Stripe.";

    if (rawMsg.includes("at least $10.00 MXN")) {
      errorMessage = "Stripe requiere un monto mínimo de cobro de $10.00 MXN ($10 pesos). Por favor intenta con una compra o producto mayor o igual a $10 MXN.";
    } else if (
      errType === "StripeAuthenticationError" || 
      rawMsg.includes("Invalid API Key") || 
      rawMsg.includes("ApiKey") ||
      rawMsg.includes("No such API key") ||
      errCode === "api_key_expired"
    ) {
      errorMessage = "Error de autenticación con Stripe: La Clave Secreta (Secret Key) ingresada no es válida o pertenece a un entorno cancelado. Por favor verifica tu clave (sk_live_... o sk_test_...) en tu dashboard de Stripe y guárdala en el Panel de Admin.";
    } else if (rawMsg.includes("live charges") || rawMsg.includes("cannot accept payments") || rawMsg.includes("account is restricted")) {
      errorMessage = "Tu cuenta de Stripe no puede procesar cargos en vivo actualmente. Por favor verifica que tu cuenta de Stripe esté activada en dashboard.stripe.com o utiliza tu clave de prueba (sk_test_...).";
    }

    return res.status(400).json({
      error: "STRIPE_ERROR",
      message: errorMessage,
      rawDetails: rawMsg,
    });
  }
});

// Mercado Pago Preference Endpoint
app.post("/api/mercadopago/create-preference", async (req, res) => {
  try {
    const { items, orderId, buyerEmail, backUrl, accessToken: customToken, clientOrigin } = req.body;
    const accessToken = (customToken && typeof customToken === "string" && customToken.trim())
      ? customToken.trim()
      : (process.env.MERCADOPAGO_ACCESS_TOKEN || "");

    if (!accessToken) {
      return res.status(400).json({
        error: "MISSING_MERCADOPAGO_TOKEN",
        message: "No se ha configurado el Access Token de Mercado Pago. Ingrésalo en tu Panel de Admin -> Pasarela de Pago.",
      });
    }

    const client = new MercadoPagoConfig({
      accessToken: accessToken,
    });

    const preference = new Preference(client);

    const preferenceItems = (items || []).map((item: any) => ({
      id: item.productId || item.id || `PROD-${Date.now()}`,
      title: item.name || item.productName || "Gorra TETRA HATS",
      unit_price: Number(item.priceMXN) || Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
      currency_id: "MXN",
    }));

    const origin = (clientOrigin && typeof clientOrigin === "string" && clientOrigin.startsWith("http"))
      ? clientOrigin.replace(/\/$/, "")
      : getRequestOrigin(req);

    const isTestToken = accessToken.trim().startsWith("TEST-");

    const response = await preference.create({
      body: {
        items: preferenceItems.length > 0 ? preferenceItems : [{
          id: "CAP-01",
          title: "Gorra TETRA HATS",
          unit_price: 1299,
          quantity: 1,
          currency_id: "MXN",
        }],
        payer: {
          email: buyerEmail && buyerEmail.includes("@") ? buyerEmail.trim() : "comprador@tetrahats.com",
        },
        payment_methods: {
          excluded_payment_methods: [],
          excluded_payment_types: [],
          installments: 12,
        },
        external_reference: orderId || `ORD-${Date.now()}`,
        back_urls: {
          success: backUrl || `${origin}/?payment=success`,
          failure: backUrl || `${origin}/?payment=failure`,
          pending: backUrl || `${origin}/?payment=pending`,
        },
        auto_return: "approved",
        statement_descriptor: "TETRAHATS",
      }
    });

    const checkoutUrl = isTestToken ? (response.sandbox_init_point || response.init_point) : response.init_point;

    return res.json({
      success: true,
      id: response.id,
      init_point: checkoutUrl,
      sandbox_init_point: response.sandbox_init_point,
      isTestToken,
    });
  } catch (err: any) {
    console.error("Mercado Pago Preference Error:", err);
    return res.status(500).json({
      error: "ERROR_MERCADOPAGO",
      message: err?.message || "Ocurrió un error al comunicarse con la API de Mercado Pago.",
    });
  }
});

// Newsletter Subscriptions Storage and Sync Backup
interface ServerSubscription {
  id: string;
  email: string;
  createdAt: string;
  source: string;
  status: string;
}

const SUBSCRIPTIONS_FILE = path.join(process.cwd(), "subscriptions_backup.json");

function loadServerSubscriptions(): ServerSubscription[] {
  try {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      const data = fs.readFileSync(SUBSCRIPTIONS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn("Could not read subscriptions backup file:", err);
  }
  return [];
}

function saveServerSubscriptions(subs: ServerSubscription[]) {
  try {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subs, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not save subscriptions backup file:", err);
  }
}

let cachedSubscriptions: ServerSubscription[] = loadServerSubscriptions();

app.post("/api/newsletter/subscribe", (req, res) => {
  try {
    const { email, source } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || cleanEmail.length < 5) {
      return res.status(400).json({ error: "Invalid email" });
    }

    const subId = "sub_" + cleanEmail.replace(/[^a-zA-Z0-9_-]/g, "_");
    const existingIdx = cachedSubscriptions.findIndex(s => s.email.toLowerCase() === cleanEmail);
    const subRecord: ServerSubscription = {
      id: subId,
      email: cleanEmail,
      createdAt: new Date().toISOString(),
      source: source || "Newsletter Web",
      status: "activo"
    };

    if (existingIdx >= 0) {
      cachedSubscriptions[existingIdx] = subRecord;
    } else {
      cachedSubscriptions.unshift(subRecord);
    }

    saveServerSubscriptions(cachedSubscriptions);
    return res.json({ success: true, subscription: subRecord });
  } catch (err: any) {
    console.error("Newsletter subscribe error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/newsletter/subscriptions", (req, res) => {
  return res.json({ success: true, subscriptions: cachedSubscriptions });
});

app.delete("/api/newsletter/subscribe", (req, res) => {
  try {
    const id = req.query.id as string;
    const email = (req.query.email as string || "").trim().toLowerCase();
    if (!id && !email) {
      return res.status(400).json({ error: "Missing id or email" });
    }

    cachedSubscriptions = cachedSubscriptions.filter(s => {
      if (id && s.id === id) return false;
      if (email && s.email.toLowerCase() === email) return false;
      return true;
    });

    saveServerSubscriptions(cachedSubscriptions);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

async function startServer() {
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
