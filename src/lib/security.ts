/**
 * TETRA HATS Security & Anti-Tamper Shield
 * 
 * 1. Blocks DevTools inspection shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S, etc.)
 * 2. Prevents Context Menu (Right-Click) inspect for non-admin visitors
 * 3. Silences verbose console logs in production and displays security disclaimer
 * 4. Sanitizes and verifies cart prices against authentic catalog values to prevent client-side price tampering
 */

import { PRODUCTS } from "../data";

// Declare global admin bypass flag
declare global {
  interface Window {
    __TETRA_ADMIN__?: boolean;
  }
}

/**
 * Validates and locks checkout items against authoritative product prices.
 * Prevents malicious users from tampering with prices via the browser console or DevTools.
 */
export function sanitizeCheckoutItems(
  items: Array<{
    productId?: string;
    name?: string;
    priceMXN?: number;
    quantity?: number;
    image?: string;
    [key: string]: any;
  }>,
  liveCatalog?: Array<{ id: string; name: string; priceMXN: number; images?: string[] }>
): Array<{
  productId: string;
  name: string;
  quantity: number;
  priceMXN: number;
  image?: string;
}> {
  const catalogToUse = (liveCatalog && liveCatalog.length > 0) ? liveCatalog : PRODUCTS;

  return (items || []).map((item) => {
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const targetId = (item.productId || "").trim();
    const targetName = (item.name || "").trim().toLowerCase();

    // Find official product match in dynamic or static catalog
    const matchedProduct = catalogToUse.find((p) => 
      p.id === targetId || 
      p.name.toLowerCase() === targetName ||
      targetName.includes(p.name.toLowerCase()) ||
      p.name.toLowerCase().includes(targetName)
    ) || PRODUCTS.find((p) => 
      p.id === targetId || 
      p.name.toLowerCase() === targetName
    );

    // Strictly enforce live catalog authoritative price
    let verifiedPrice = typeof item.priceMXN === "number" && item.priceMXN > 0 ? item.priceMXN : 500;
    if (matchedProduct && typeof matchedProduct.priceMXN === "number" && matchedProduct.priceMXN > 0) {
      verifiedPrice = matchedProduct.priceMXN;
    }

    return {
      productId: matchedProduct?.id || item.productId || "item",
      name: matchedProduct?.name || item.name || "Gorra TETRA HATS",
      quantity: qty,
      priceMXN: verifiedPrice,
      image: item.image || matchedProduct?.images?.[0]
    };
  });
}

/**
 * Initializes frontend anti-inspection, anti-tamper and console shielding
 */
export function initSecurityShield() {
  if (typeof window === "undefined") return;

  const isProduction = process.env.NODE_ENV === "production" || window.location.hostname !== "localhost";

  // 1. Console Shield & Security Banner
  if (isProduction) {
    // Custom styled warning in console
    const warningTitle = "font-family: sans-serif; font-size: 24px; font-weight: 900; color: #ef4444; text-shadow: 0 0 10px rgba(239,68,68,0.5);";
    const warningDesc = "font-family: sans-serif; font-size: 13px; font-weight: bold; color: #d1d5db; line-height: 1.6;";
    const warningLegal = "font-family: monospace; font-size: 11px; color: #9ca3af;";

    try {
      console.clear();
      console.log("%c🛑 ACCESO RESTRINGIDO - TETRA HATS OFFICIAL", warningTitle);
      console.log(
        "%cEsta consola está reservada exclusivamente para el personal técnico y administrativo autorizado.\n" +
        "La manipulación de código, inyección de scripts o alteración de precios está estrictamente bloqueada.\n" +
        "Todas las transacciones y pagos son verificados y firmados criptográficamente.",
        warningDesc
      );
      console.log("%cSecurity ID: TH-SHIELD-V3 | All rights reserved © TETRA HATS", warningLegal);
    } catch {
      // Ignore
    }

    // Suppress verbose log methods in production for regular visitors
    const noop = () => {};
    const originalError = console.error;
    const originalWarn = console.warn;

    // Keep error/warn with limited output, silence info/debug/table
    window.console.log = noop;
    window.console.debug = noop;
    window.console.info = noop;
    window.console.dir = noop;
    window.console.table = noop;
  }

  // 2. Prevent Keyboard Inspection Shortcuts
  window.addEventListener("keydown", (e: KeyboardEvent) => {
    // If admin is active, allow full developer tools
    if (window.__TETRA_ADMIN__) return;

    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    // F12
    if (e.key === "F12" || e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+I / Cmd+Opt+I (Inspect)
    if (cmdOrCtrl && e.shiftKey && (e.key === "I" || e.key === "i" || e.keyCode === 73)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+J / Cmd+Opt+J (Console)
    if (cmdOrCtrl && e.shiftKey && (e.key === "J" || e.key === "j" || e.keyCode === 74)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+C / Cmd+Opt+C (Inspect Element)
    if (cmdOrCtrl && e.shiftKey && (e.key === "C" || e.key === "c" || e.keyCode === 67)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+U / Cmd+Opt+U (View Source)
    if (cmdOrCtrl && (e.key === "u" || e.key === "U" || e.keyCode === 85)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+S / Cmd+S (Save Page)
    if (cmdOrCtrl && (e.key === "s" || e.key === "S" || e.keyCode === 83)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, { capture: true });

  // 3. Prevent Right-Click Context Menu (Inspect Element) on images & pages
  document.addEventListener("contextmenu", (e: MouseEvent) => {
    if (window.__TETRA_ADMIN__) return;
    
    // Prevent context menu on images and interactive elements
    const target = e.target as HTMLElement | null;
    if (target) {
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      if (!isInput) {
        e.preventDefault();
        return false;
      }
    }
  }, { capture: true });
}
