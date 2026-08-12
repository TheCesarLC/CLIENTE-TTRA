import React from "react";
import { Order } from "../context/SiteContext";
import { X, Printer, CheckCircle2, ShieldCheck, CreditCard, Truck, FileText, Clock } from "lucide-react";

interface ReceiptModalProps {
  order: Order | null;
  onClose: () => void;
  logoUrl?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose, logoUrl }) => {
  if (!order) return null;

  const isPaid = order.status === "PAGO_RECIBIDO" || order.status === "COMPLETADO" || order.status === "EMPACADO" || order.status === "ENVIADO" || order.status === "ENTREGADO";
  const isCancelled = order.status === "CANCELADO";

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = order.createdAt ? (() => {
    try {
      return new Date(order.createdAt).toLocaleDateString("es-MX", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "HOY";
    }
  })() : "HOY";

  const safeItems = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in print:p-0 print:bg-white print:static print:block">
      {/* Container - Styled for dark mode screen, pure high-contrast clean print for PDF download */}
      <div className="relative w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black print:max-w-none print:w-full print:rounded-none">
        
        {/* Top bar screen action controls - hidden during print */}
        <div className="flex items-center justify-between px-6 py-4 bg-neutral-900/80 border-b border-neutral-800 print:hidden">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-purple-400" />
            <span className="text-xs font-black tracking-widest text-white uppercase">Comprobante de Pago Oficial</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider rounded-lg transition-all shadow-lg cursor-pointer"
            >
              <Printer size={14} />
              <span>Imprimir / Guardar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PRINTABLE RECEIPT CONTENT BODY */}
        <div className="p-8 space-y-6 print:p-6 print:space-y-4">
          
          {/* Header Brand & Order Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 print:border-black/20 pb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img src={logoUrl} alt="TETRA HATS" className="h-10 object-contain print:invert-0" />
                ) : (
                  <span className="text-2xl font-black tracking-widest text-white print:text-black">TETRA HATS</span>
                )}
                <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-black tracking-wider print:bg-purple-100 print:text-purple-900 print:border-purple-300">
                  MARCA OFICIAL
                </span>
              </div>
              <p className="text-[11px] text-gray-400 print:text-gray-600 uppercase font-medium">
                Gorras Exclusivas de Edición Limitada — México & Internacional
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              {isPaid ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 print:bg-emerald-50 print:border-emerald-300 print:text-emerald-800 rounded-full text-xs font-black uppercase tracking-wider">
                  <CheckCircle2 size={14} />
                  <span>PAGO APROBADO ({order.paymentMethod?.toLowerCase().includes("stripe") ? "STRIPE" : "RECIBIDO"})</span>
                </div>
              ) : isCancelled ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-400 print:bg-red-50 print:border-red-300 print:text-red-800 rounded-full text-xs font-black uppercase tracking-wider">
                  <X size={14} />
                  <span>PAGO CANCELADO / NO EFECTUADO</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 print:bg-amber-50 print:border-amber-300 print:text-amber-800 rounded-full text-xs font-black uppercase tracking-wider">
                  <Clock size={14} />
                  <span>PAGO PENDIENTE DE VERIFICACIÓN</span>
                </div>
              )}
              <p className="text-xs font-mono text-gray-400 print:text-gray-600 block pt-1">
                Folio: <strong className="text-white print:text-black font-extrabold">{order.id}</strong>
              </p>
              <p className="text-[10px] text-gray-500 print:text-gray-500 font-mono">
                {formattedDate}
              </p>
            </div>
          </div>

          {!isPaid && !isCancelled && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[11px] font-medium leading-relaxed print:bg-amber-50 print:border-amber-200 print:text-amber-900">
              <strong>⚠️ ESTADO DE PAGO: PENDIENTE.</strong> Esta orden se registró al direccionar a la pasarela de pago. El cobro definitivo aún no ha sido confirmado por Stripe o la entidad bancaria.
            </div>
          )}

          {/* Customer & Shipping Data Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-neutral-900/50 print:bg-gray-50 border border-neutral-800 print:border-gray-200 rounded-xl space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-400 print:text-purple-900 flex items-center gap-1.5">
                <ShieldCheck size={13} />
                <span>Datos del Comprador</span>
              </h4>
              <div className="text-xs space-y-1 text-gray-300 print:text-gray-800">
                <p><span className="text-gray-500 print:text-gray-500 font-bold uppercase text-[10px]">Nombre:</span> <strong>{order.userName || "Cliente TETRA"}</strong></p>
                <p><span className="text-gray-500 print:text-gray-500 font-bold uppercase text-[10px]">Correo:</span> {order.userEmail}</p>
                <p><span className="text-gray-500 print:text-gray-500 font-bold uppercase text-[10px]">Teléfono:</span> {order.buyerPhone || "No ingresado"}</p>
              </div>
            </div>

            <div className="p-4 bg-neutral-900/50 print:bg-gray-50 border border-neutral-800 print:border-gray-200 rounded-xl space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-400 print:text-purple-900 flex items-center gap-1.5">
                <Truck size={13} />
                <span>Dirección de Envío</span>
              </h4>
              <div className="text-xs text-gray-300 print:text-gray-800">
                <p className="whitespace-pre-wrap leading-relaxed uppercase font-semibold">{order.shippingAddress || "Entrega Registrada"}</p>
                {order.trackingNumber && (
                  <p className="pt-2 text-[10px] text-emerald-400 print:text-emerald-700 font-mono font-bold">
                    Guía Rastreable: {order.trackingNumber}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Notice of Tracking Number Delivery */}
          <div className="p-4 bg-purple-900/30 print:bg-purple-50 border border-purple-500/40 print:border-purple-300 rounded-xl text-purple-200 print:text-purple-950 flex items-start gap-3 shadow-md">
            <Truck size={20} className="text-purple-400 print:text-purple-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-extrabold uppercase tracking-widest text-[10px] text-purple-300 print:text-purple-900 block">
                Aviso de Rastreo de Envío
              </span>
              <p className="text-xs font-black leading-relaxed tracking-wide uppercase">
                SE TE HARA LLEGAR TU GUIA DE SEGUIMIENTO DE ENVIO A TU CORREO O WHATSAPP PERSONAL EN LOS PROXIMOS 2 DIAS HABILES...
              </p>
            </div>
          </div>

          {/* Items Purchased Table */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-400 print:text-gray-700">
              Resumen de Artículos
            </h4>
            <div className="border border-neutral-800 print:border-gray-300 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-900 print:bg-gray-100 text-gray-400 print:text-gray-700 font-black uppercase text-[9px] tracking-wider border-b border-neutral-800 print:border-gray-300">
                    <th className="p-3">Gorra / Modelo</th>
                    <th className="p-3 text-center">Cant.</th>
                    <th className="p-3 text-right">Precio Un.</th>
                    <th className="p-3 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 print:divide-gray-200">
                  {safeItems.map((item, i) => (
                    <tr key={i} className="text-gray-200 print:text-gray-900 font-medium">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {item.image && (
                            <img src={item.image} alt={item.productName} className="w-8 h-8 object-cover rounded border border-neutral-800 print:border-gray-300" />
                          )}
                          <span className="font-bold uppercase tracking-wide">{item.productName}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center font-mono font-bold">{item.quantity}</td>
                      <td className="p-3 text-right font-mono">${(item.priceMXN || 0).toLocaleString()} MXN</td>
                      <td className="p-3 text-right font-mono font-extrabold text-white print:text-black">
                        ${((item.priceMXN || 0) * (item.quantity || 1)).toLocaleString()} MXN
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Totals Breakdown */}
          <div className="p-4 bg-neutral-900/70 print:bg-gray-100 border border-neutral-800 print:border-gray-300 rounded-xl space-y-2">
            <div className="flex justify-between text-xs text-gray-400 print:text-gray-600">
              <span>Subtotal:</span>
              <span className="font-mono font-bold text-gray-200 print:text-gray-900">${(order.totalMXN || 0).toLocaleString()} MXN</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 print:text-gray-600">
              <span>Envío Express DHL / Estafeta:</span>
              <span className="font-bold text-emerald-400 print:text-emerald-700 uppercase">GRATIS</span>
            </div>
            <div className="border-t border-neutral-800 print:border-gray-300 pt-2 flex justify-between text-sm font-black text-white print:text-black">
              <span className="uppercase tracking-wider">
                {isPaid ? "Total Pagado:" : isCancelled ? "Total Cancelado (Sin Cobro):" : "Total a Pagar (Pendiente):"}
              </span>
              <span className={`font-mono text-base font-extrabold ${
                isPaid 
                  ? "text-emerald-400 print:text-emerald-800" 
                  : isCancelled 
                  ? "text-red-400 print:text-red-800" 
                  : "text-amber-400 print:text-amber-800"
              }`}>
                ${(order.totalMXN || 0).toLocaleString()} MXN
              </span>
            </div>
          </div>

          {/* Payment Guarantee Footer */}
          <div className="pt-2 border-t border-neutral-800 print:border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-gray-500 print:text-gray-600">
            <div className="flex items-center gap-1.5">
              <CreditCard size={14} className="text-purple-400 print:text-purple-700" />
              <span>Transacción procesada y protegida vía <strong>Stripe Payments Inc.</strong></span>
            </div>
            <div className="font-mono">
              TETRA HATS © {new Date().getFullYear()} — Todos los derechos reservados
            </div>
          </div>

        </div>

        {/* Footer actions for screen view */}
        <div className="p-4 bg-neutral-900/90 border-t border-neutral-800 flex justify-end gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-wider rounded-lg transition-all shadow-lg flex items-center gap-2 cursor-pointer"
          >
            <Printer size={15} />
            <span>Imprimir / Descargar PDF</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default ReceiptModal;
