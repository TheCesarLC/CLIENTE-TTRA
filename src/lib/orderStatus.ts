export type OrderStatusKey =
  | "PENDIENTE_DE_REVISION"
  | "REVISADO"
  | "PAGADO"
  | "ENVIADO"
  | "FINALIZADO"
  | "CANCELADO";

export interface OrderStatusDetails {
  key: OrderStatusKey;
  stepNumber: number;
  label: string;
  shortLabel: string;
  badgeLabel: string;
  totalLabel: string;
  totalLabelUpper: string;
  receiptTitle: string;
  statusText: string;
  colorHex: string;
  badgeClass: string;
  badgePrintClass: string;
  activeClass: string;
  inactiveClass: string;
  dotClass: string;
  isPaidOrApproved: boolean;
  isPending: boolean;
  isCancelled: boolean;
}

export const ORDER_SEMAFORO_LIST: {
  key: OrderStatusKey;
  stepNumber: number;
  label: string;
  shortLabel: string;
  activeClass: string;
  inactiveClass: string;
  dotClass: string;
}[] = [
  {
    key: "PENDIENTE_DE_REVISION",
    stepNumber: 1,
    label: "1: PENDIENTE DE REVISION",
    shortLabel: "PENDIENTE DE REVISION",
    activeClass: "bg-red-600 text-white border-red-400 shadow-lg shadow-red-950/80 ring-2 ring-red-500 font-black",
    inactiveClass: "bg-black/80 text-red-400/80 border-red-900/50 hover:bg-red-950/40 hover:text-red-300 hover:border-red-700",
    dotClass: "bg-red-500 shadow-red-500/80 shadow-sm"
  },
  {
    key: "REVISADO",
    stepNumber: 2,
    label: "2: REVISADO",
    shortLabel: "REVISADO",
    activeClass: "bg-amber-500 text-black border-amber-300 shadow-lg shadow-amber-950/80 ring-2 ring-amber-400 font-black",
    inactiveClass: "bg-black/80 text-amber-400/80 border-amber-900/50 hover:bg-amber-950/40 hover:text-amber-300 hover:border-amber-700",
    dotClass: "bg-amber-400 shadow-amber-400/80 shadow-sm"
  },
  {
    key: "PAGADO",
    stepNumber: 3,
    label: "3: PAGADO",
    shortLabel: "PAGADO",
    activeClass: "bg-emerald-500 text-black border-emerald-300 shadow-lg shadow-emerald-950/80 ring-2 ring-emerald-400 font-black",
    inactiveClass: "bg-black/80 text-emerald-400/80 border-emerald-900/50 hover:bg-emerald-950/40 hover:text-emerald-300 hover:border-emerald-700",
    dotClass: "bg-emerald-400 shadow-emerald-400/80 shadow-sm"
  },
  {
    key: "ENVIADO",
    stepNumber: 4,
    label: "4: ENVIADO",
    shortLabel: "ENVIADO",
    activeClass: "bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-950/80 ring-2 ring-blue-500 font-black",
    inactiveClass: "bg-black/80 text-blue-400/80 border-blue-900/50 hover:bg-blue-950/40 hover:text-blue-300 hover:border-blue-700",
    dotClass: "bg-blue-400 shadow-blue-400/80 shadow-sm"
  },
  {
    key: "FINALIZADO",
    stepNumber: 5,
    label: "5: FINALIZADO",
    shortLabel: "FINALIZADO",
    activeClass: "bg-purple-600 text-white border-purple-300 shadow-lg shadow-purple-950/80 ring-2 ring-purple-400 font-black",
    inactiveClass: "bg-black/80 text-purple-400/80 border-purple-900/50 hover:bg-purple-950/40 hover:text-purple-300 hover:border-purple-700",
    dotClass: "bg-purple-400 shadow-purple-400/80 shadow-sm"
  }
];

export function normalizeOrderStatus(rawStatus?: string): OrderStatusKey {
  const s = (rawStatus || "").toUpperCase().trim();
  if (s === "FINALIZADO" || s === "ENTREGADO" || s === "COMPLETADO" || s.includes("FINALIZ")) {
    return "FINALIZADO";
  }
  if (s === "ENVIADO" || s.includes("ENVIAD")) {
    return "ENVIADO";
  }
  if (s === "PAGADO" || s === "PAGO_RECIBIDO" || s === "PAGO RECIBIDO" || s === "APROBADO") {
    return "PAGADO";
  }
  if (s === "REVISADO" || s === "REVISION" || s === "REVISIÓN" || s === "EMPACADO" || s === "ACTIVO") {
    return "REVISADO";
  }
  if (s === "CANCELADO") {
    return "CANCELADO";
  }
  return "PENDIENTE_DE_REVISION";
}

export function getOrderStatusDetails(rawStatus?: string): OrderStatusDetails {
  const key = normalizeOrderStatus(rawStatus);

  switch (key) {
    case "REVISADO":
      return {
        key: "REVISADO",
        stepNumber: 2,
        label: "2: REVISADO",
        shortLabel: "REVISADO",
        badgeLabel: "2: REVISADO (EN REVISIÓN)",
        totalLabel: "Total a Pagar (Revisión):",
        totalLabelUpper: "TOTAL A PAGAR (REVISIÓN)",
        receiptTitle: "COMPROBANTE OFICIAL - EN REVISIÓN (PDF)",
        statusText: "EN REVISIÓN / REVISADO",
        colorHex: "#f59e0b",
        badgeClass: "bg-amber-500/10 border-amber-500/30 text-amber-400",
        badgePrintClass: "print:bg-amber-50 print:border-amber-300 print:text-amber-900",
        activeClass: "bg-amber-500 text-black border-amber-300 font-black",
        inactiveClass: "bg-black/80 text-amber-400/80 border-amber-900/50",
        dotClass: "bg-amber-400 shadow-amber-400/80 shadow-sm",
        isPaidOrApproved: false,
        isPending: false,
        isCancelled: false
      };

    case "PAGADO":
      return {
        key: "PAGADO",
        stepNumber: 3,
        label: "3: PAGADO",
        shortLabel: "PAGADO",
        badgeLabel: "3: PAGADO (PAGO APROBADO)",
        totalLabel: "Total a Pagar (Pagado):",
        totalLabelUpper: "TOTAL A PAGAR (PAGADO)",
        receiptTitle: "COMPROBANTE OFICIAL DE PAGO APROBADO (PDF)",
        statusText: "PAGO APROBADO / CONFIRMADO",
        colorHex: "#10b981",
        badgeClass: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
        badgePrintClass: "print:bg-emerald-50 print:border-emerald-300 print:text-emerald-900",
        activeClass: "bg-emerald-500 text-black border-emerald-300 font-black",
        inactiveClass: "bg-black/80 text-emerald-400/80 border-emerald-900/50",
        dotClass: "bg-emerald-400 shadow-emerald-400/80 shadow-sm",
        isPaidOrApproved: true,
        isPending: false,
        isCancelled: false
      };

    case "ENVIADO":
      return {
        key: "ENVIADO",
        stepNumber: 4,
        label: "4: ENVIADO",
        shortLabel: "ENVIADO",
        badgeLabel: "4: ENVIADO (EN CAMINO)",
        totalLabel: "Total a Pagar (Enviado):",
        totalLabelUpper: "TOTAL A PAGAR (ENVIADO)",
        receiptTitle: "COMPROBANTE OFICIAL - PEDIDO ENVIADO (PDF)",
        statusText: "PEDIDO ENVIADO / EN CAMINO",
        colorHex: "#3b82f6",
        badgeClass: "bg-blue-500/10 border-blue-500/30 text-blue-400",
        badgePrintClass: "print:bg-blue-50 print:border-blue-300 print:text-blue-900",
        activeClass: "bg-blue-600 text-white border-blue-400 font-black",
        inactiveClass: "bg-black/80 text-blue-400/80 border-blue-900/50",
        dotClass: "bg-blue-400 shadow-blue-400/80 shadow-sm",
        isPaidOrApproved: true,
        isPending: false,
        isCancelled: false
      };

    case "FINALIZADO":
      return {
        key: "FINALIZADO",
        stepNumber: 5,
        label: "5: FINALIZADO",
        shortLabel: "FINALIZADO",
        badgeLabel: "5: FINALIZADO (ENTREGADO)",
        totalLabel: "Total a Pagar (Finalizado):",
        totalLabelUpper: "TOTAL A PAGAR (FINALIZADO)",
        receiptTitle: "COMPROBANTE OFICIAL - COMPRA FINALIZADA (PDF)",
        statusText: "PEDIDO FINALIZADO Y ENTREGADO",
        colorHex: "#a855f7",
        badgeClass: "bg-purple-500/10 border-purple-500/30 text-purple-400",
        badgePrintClass: "print:bg-purple-50 print:border-purple-300 print:text-purple-900",
        activeClass: "bg-purple-600 text-white border-purple-300 font-black",
        inactiveClass: "bg-black/80 text-purple-400/80 border-purple-900/50",
        dotClass: "bg-purple-400 shadow-purple-400/80 shadow-sm",
        isPaidOrApproved: true,
        isPending: false,
        isCancelled: false
      };

    case "CANCELADO":
      return {
        key: "CANCELADO",
        stepNumber: 0,
        label: "CANCELADO",
        shortLabel: "CANCELADO",
        badgeLabel: "CANCELADO (SIN COBRO)",
        totalLabel: "Total Cancelado (Sin Cobro):",
        totalLabelUpper: "TOTAL CANCELADO (SIN COBRO)",
        receiptTitle: "COMPROBANTE DE ORDEN CANCELADA (PDF)",
        statusText: "ORDEN CANCELADA",
        colorHex: "#ef4444",
        badgeClass: "bg-red-500/10 border-red-500/30 text-red-400",
        badgePrintClass: "print:bg-red-50 print:border-red-300 print:text-red-900",
        activeClass: "bg-red-600 text-white border-red-400 font-black",
        inactiveClass: "bg-black/80 text-red-400/80 border-red-900/50",
        dotClass: "bg-red-400 shadow-red-400/80 shadow-sm",
        isPaidOrApproved: false,
        isPending: false,
        isCancelled: true
      };

    case "PENDIENTE_DE_REVISION":
    default:
      return {
        key: "PENDIENTE_DE_REVISION",
        stepNumber: 1,
        label: "1: PENDIENTE DE REVISION",
        shortLabel: "PENDIENTE DE REVISION",
        badgeLabel: "1: PENDIENTE DE REVISIÓN",
        totalLabel: "Total a Pagar (Pendiente):",
        totalLabelUpper: "TOTAL A PAGAR (PENDIENTE)",
        receiptTitle: "COMPROBANTE OFICIAL - PENDIENTE DE REVISIÓN (PDF)",
        statusText: "PAGO PENDIENTE DE REVISIÓN",
        colorHex: "#ef4444",
        badgeClass: "bg-red-500/10 border-red-500/30 text-red-400",
        badgePrintClass: "print:bg-red-50 print:border-red-300 print:text-red-900",
        activeClass: "bg-red-600 text-white border-red-400 font-black",
        inactiveClass: "bg-black/80 text-red-400/80 border-red-900/50",
        dotClass: "bg-red-500 shadow-red-500/80 shadow-sm",
        isPaidOrApproved: false,
        isPending: true,
        isCancelled: false
      };
  }
}
