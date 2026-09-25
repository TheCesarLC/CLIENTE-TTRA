import * as XLSX from "xlsx";
import { Order } from "../context/SiteContext";
import { Subscription } from "../types";

/**
 * Format a date string safely into date and time parts
 */
function parseDateTime(dateStr?: string): { date: string; time: string } {
  if (!dateStr) {
    return { date: "N/A", time: "N/A" };
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      // If it's a plain string like "2026-09-25"
      return { date: dateStr, time: "N/A" };
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}:${seconds}`,
    };
  } catch {
    return { date: dateStr, time: "N/A" };
  }
}

/**
 * Get readable human Spanish label for order status
 */
function getReadableOrderStatus(status?: string): string {
  const s = (status || "").toUpperCase();
  if (s.includes("PAGO_RECIBIDO") || s.includes("PAGADO")) return "PAGO RECIBIDO / CONFIRMADO";
  if (s.includes("EMPACADO")) return "EMPACADO Y LISTO";
  if (s.includes("ENVIADO")) return "ENVIADO (EN TRÁNSITO)";
  if (s.includes("ENTREGADO") || s.includes("FINALIZADO")) return "ENTREGADO CON ÉXITO";
  if (s.includes("CANCELADO")) return "CANCELADO / REEMBOLSADO";
  if (s.includes("PENDIENTE")) return "PAGO PENDIENTE";
  return status || "PENDIENTE";
}

/**
 * Exports subscribed emails to a professional Excel (.xlsx) file
 */
export function exportSubscriptionsToExcel(subscriptions: Subscription[]) {
  const now = new Date();
  const dateStamp = now.toISOString().split("T")[0];

  const rows = subscriptions.map((sub, index) => {
    const { date, time } = parseDateTime(sub.createdAt);
    return {
      "No.": index + 1,
      "Correo Electrónico": sub.email,
      "Fecha de Registro": date,
      "Hora de Registro": time,
      "Estatus": (sub.status || "ACTIVO").toUpperCase(),
      "Origen del Registro": sub.source || "Newsletter / Footer Web",
      "ID Único": sub.id,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto column widths
  worksheet["!cols"] = [
    { wch: 6 },  // No.
    { wch: 35 }, // Correo Electrónico
    { wch: 18 }, // Fecha de Registro
    { wch: 16 }, // Hora de Registro
    { wch: 14 }, // Estatus
    { wch: 28 }, // Origen
    { wch: 24 }, // ID Único
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Suscripciones");

  const fileName = `Suscripciones_Newsletter_TETRA_HATS_${dateStamp}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  return fileName;
}

/**
 * Exports all orders and shipments control to a comprehensive Excel (.xlsx) file
 */
export function exportOrdersToExcel(orders: Order[]) {
  const now = new Date();
  const dateStamp = now.toISOString().split("T")[0];

  const rows = orders.map((ord, index) => {
    const { date, time } = parseDateTime(ord.createdAt);
    const safeItems = Array.isArray(ord.items) ? ord.items : [];
    
    // Breakdown of items purchased
    const itemsDescription = safeItems
      .map(
        (item) =>
          `${item.quantity || 1}x ${item.productName || "Gorra TETRA"} ($${(
            item.priceMXN || 0
          ).toLocaleString("es-MX")} MXN)`
      )
      .join(" | ");

    const totalPieces = safeItems.reduce(
      (sum, item) => sum + (Number(item.quantity) || 1),
      0
    );

    const safeTotalMXN = typeof ord.totalMXN === "number" ? ord.totalMXN : 0;
    const safeTotalUSD =
      typeof ord.totalUSD === "number"
        ? ord.totalUSD
        : Math.round(safeTotalMXN / 20);

    return {
      "No.": index + 1,
      "ID de Orden": ord.id,
      "Fecha de Compra": date,
      "Hora de Registro": time,
      "Estatus del Pedido": getReadableOrderStatus(ord.status),
      "Nombre del Cliente": ord.userName || "No especificado",
      "Correo Electrónico": ord.userEmail || "Sin Correo",
      "Teléfono de Contacto": ord.buyerPhone || "No ingresado",
      "Dirección de Envío Completa": (ord.shippingAddress || "Sin Dirección").replace(/\n/g, " "),
      "Total (MXN)": safeTotalMXN,
      "Total (USD)": safeTotalUSD,
      "Piezas Totales": totalPieces,
      "Desglose de Artículos": itemsDescription || "Sin artículos",
      "Número de Guía / Tracking": ord.trackingNumber || "Pendiente de Guía",
      "Método de Pago": (ord.paymentMethod || "TARJETA").toUpperCase(),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Format columns widths for clean presentation
  worksheet["!cols"] = [
    { wch: 6 },  // No.
    { wch: 22 }, // ID de Orden
    { wch: 16 }, // Fecha de Compra
    { wch: 16 }, // Hora de Registro
    { wch: 28 }, // Estatus del Pedido
    { wch: 28 }, // Nombre del Cliente
    { wch: 32 }, // Correo Electrónico
    { wch: 20 }, // Teléfono
    { wch: 45 }, // Dirección de Envío Completa
    { wch: 16 }, // Total MXN
    { wch: 14 }, // Total USD
    { wch: 14 }, // Piezas Totales
    { wch: 55 }, // Desglose de Artículos
    { wch: 28 }, // Guía / Tracking
    { wch: 22 }, // Método de Pago
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Control de Envíos");

  const fileName = `Envios_y_Transacciones_TETRA_HATS_${dateStamp}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  return fileName;
}
