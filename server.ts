import express from "express";
import path from "path";
import { Readable } from "stream";
import { createServer as createViteServer } from "vite";
import { MercadoPagoConfig, Preference } from "mercadopago";
import Stripe from "stripe";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
      // Step 1: Initial download request
      const pageRes = await fetch(`https://drive.usercontent.google.com/download?id=${fileId}&export=download`);
      const contentType = pageRes.headers.get("content-type") || "";

      let downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;

      // If Google Drive returns HTML virus warning for large files, extract confirm UUID
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

  // Stripe Checkout Endpoint
  app.post("/api/stripe/create-checkout-session", async (req, res) => {
    try {
      const { items, orderId, buyerEmail, secretKey: customSecret } = req.body;
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
      const origin = req.headers.origin || process.env.APP_URL || "http://localhost:3000";

      let totalCentavos = 0;
      const lineItems = (items || []).map((item: any) => {
        const price = Number(item.priceMXN) || 0;
        const qty = Number(item.quantity) || 1;
        const unitAmount = Math.round(price * 100);
        totalCentavos += unitAmount * qty;
        return {
          price_data: {
            currency: "mxn",
            product_data: {
              name: item.name || item.productName || "Gorra TETRA HATS",
              images: item.image ? [item.image] : [],
            },
            unit_amount: unitAmount,
          },
          quantity: qty,
        };
      });

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
      console.error("Stripe Session Error:", err);
      let errorMessage = err?.message || "Ocurrió un error al crear la sesión de pago con Stripe.";
      if (err?.message?.includes("at least $10.00 MXN")) {
        errorMessage = "Stripe requiere un monto mínimo de cobro de $10.00 MXN ($10 pesos). Por favor intenta con una compra o producto mayor o igual a $10 MXN.";
      } else if (
        err?.type === "StripeAuthenticationError" || 
        err?.message?.includes("Invalid API Key") || 
        err?.message?.includes("ApiKey") ||
        err?.code === "api_key_expired"
      ) {
        errorMessage = "Error de autenticación con Stripe: La Clave Secreta (Secret Key) proporcionada no es válida o pertenece a un entorno distinto. Por favor verifica tu clave (sk_live_... / sk_test_...) en el Panel de Administración -> Pasarela de Pago.";
      }
      return res.status(500).json({
        error: "ERROR_STRIPE",
        message: errorMessage,
      });
    }
  });

  // Mercado Pago Preference creation endpoint for real checkout
  app.post("/api/mercadopago/create-preference", async (req, res) => {
    try {
      const { items, orderId, buyerEmail, buyerName, backUrl, accessToken: customToken } = req.body;
      const accessToken = (customToken && customToken.trim()) || process.env.MERCADOPAGO_ACCESS_TOKEN;
      
      if (!accessToken) {
        return res.status(400).json({
          error: "MISSING_MERCADOPAGO_TOKEN",
          message: "No se ha ingresado el Token de Acceso de Mercado Pago. Puedes ingresar tu Access Token (APP_USR-...) directamente en tu Panel de Administración -> Pasarela de Pago."
        });
      }

      const client = new MercadoPagoConfig({ accessToken: accessToken.trim() });
      const preference = new Preference(client);

      const mpItems = (items || []).map((item: any) => ({
        id: item.id || item.productId || "item-1",
        title: item.name || item.productName || "Gorra TETRA HATS",
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.priceMXN) || 0,
        currency_id: "MXN",
      }));

      const origin = req.headers.origin || process.env.APP_URL || "http://localhost:3000";

      const isTestToken = accessToken.trim().startsWith("TEST-");

      const response = await preference.create({
        body: {
          items: mpItems,
          payer: {
            email: (buyerEmail && buyerEmail.includes("@")) ? buyerEmail.trim() : "comprador@tetrahats.com",
            name: buyerName ? buyerName.trim() : "Cliente TETRA",
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
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

startServer();
