import React from "react";
import { MessageSquare, Award, CheckCircle, Pencil } from "lucide-react";
import { useSite, SiteConfig } from "../context/SiteContext";
import { getOptimizedImageUrl } from "../lib/imageOptimizer";

interface OfficialDistributorsProps {
  siteConfig?: SiteConfig;
  visualEditMode?: boolean;
  onVisualEdit?: (fieldName: string, label: string, type: "text" | "textarea" | "image" | "video" | "color" | "number" | "boolean") => void;
  isAdmin?: boolean;
}

export default function OfficialDistributors({
  siteConfig: siteConfigProp,
  visualEditMode,
  onVisualEdit,
  isAdmin
}: OfficialDistributorsProps = {}) {
  const { siteConfig: siteConfigFromContext } = useSite();
  const siteConfig = siteConfigProp || siteConfigFromContext;
  const perks = [
    { title: "Márgenes Premium", desc: "Obtén descuentos competitivos de mayoreo de hasta el 40%." },
    { title: "Lanzamientos Adelantados", desc: "Asegura piezas exclusivas de colecciones limitadas antes que el público." },
    { title: "Material de Marketing Oficial", desc: "Te brindamos fotografías, videos y expositores oficiales para tu tienda." }
  ];

  const safePhone = siteConfig.whatsappNumber ? siteConfig.whatsappNumber.replace(/[^\d]/g, "") : "521123456789";

  return (
    <section
      id="distributors"
      className="relative bg-black text-white py-16 md:py-24 border-t border-neutral-900"
    >
      {/* Background with UYJYUJUYJ-100 picture */}
      <div className="absolute inset-0 z-0 opacity-20">
        <img
          src={getOptimizedImageUrl("https://umbra.page/cdn/shop/files/UYJYUJUYJ-100.jpg", 1200)}
          alt="Distributor Background"
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/40 to-black" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10 flex flex-col items-center text-center space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold tracking-widest text-gray-300 uppercase relative">
          <Award size={11} className="text-gray-400" />
          <span>Distribución</span>
        </div>

        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-widest leading-none max-w-3xl relative flex items-center justify-center gap-2 group/distrib-t">
          <span>{siteConfig.distributionTitle || "SE DISTRIBUIDOR OFICIAL"}</span>
          {isAdmin && visualEditMode && onVisualEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onVisualEdit("distributionTitle", "Título de Distribución", "text");
              }}
              className="p-1 bg-emerald-500 hover:bg-emerald-400 text-black rounded transition-all cursor-pointer text-[8px] font-bold uppercase flex items-center gap-0.5 shadow-lg ml-2"
              title="Editar título de distribución"
            >
              <Pencil size={8} />
              <span>EDITAR</span>
            </button>
          )}
        </h2>

        <p className="text-gray-300 text-xs md:text-sm tracking-wider uppercase max-w-2xl leading-relaxed relative flex items-center justify-center gap-2 group/distrib-st">
          <span>{siteConfig.distributionSubtitle || "Contáctanos por WhatsApp y obtén los mejores precios preferenciales en compras de mayoreo. al ser distribuidor oficial obtienes beneficios exclusivos de la familia."}</span>
          {isAdmin && visualEditMode && onVisualEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onVisualEdit("distributionSubtitle", "Subtítulo de Distribución", "textarea");
              }}
              className="p-1 bg-emerald-500 hover:bg-emerald-450 text-black rounded transition-all cursor-pointer text-[8px] font-bold uppercase flex items-center gap-0.5 shadow-lg ml-2"
              title="Editar subtítulo de distribución"
            >
              <Pencil size={8} />
              <span>EDITAR</span>
            </button>
          )}
        </p>

        {/* Benefits list grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full pt-6">
          {perks.map((p, idx) => (
            <div
              key={idx}
              className="bg-neutral-950/80 border border-neutral-900 p-5 rounded-lg text-left space-y-2 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center gap-2 text-white">
                <CheckCircle size={14} className="text-gray-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider">{p.title}</h4>
              </div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider leading-normal">
                {p.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="pt-6">
          <a
            href={`https://wa.me/${safePhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-4 text-xs font-black tracking-widest uppercase transition-all duration-300 rounded shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95 cursor-pointer"
            id="whatsapp-distributor-link"
          >
            <MessageSquare size={15} />
            <span>ESCRIBENOS AQUÍ</span>
          </a>
        </div>
      </div>
    </section>
  );
}
