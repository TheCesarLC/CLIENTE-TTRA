import React, { useState } from "react";
import { Mail, Instagram, Check, Pencil, Trash2, Eye } from "lucide-react";
import { useSite, SiteConfig } from "../context/SiteContext";

interface FooterProps {
  siteConfig?: SiteConfig;
  visualEditMode?: boolean;
  onVisualEdit?: (fieldName: string, label: string, type: "text" | "textarea" | "image" | "video" | "color" | "number" | "boolean") => void;
  isAdmin?: boolean;
}

export default function Footer({
  siteConfig: siteConfigProp,
  visualEditMode,
  onVisualEdit,
  isAdmin
}: FooterProps = {}) {
  const { siteConfig: siteConfigFromContext, updateSiteConfig } = useSite();
  const siteConfig = siteConfigProp || siteConfigFromContext;
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [activePolicyIdx, setActivePolicyIdx] = useState<number | null>(null);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubscribed(true);
    setEmail("");
    setTimeout(() => {
      setSubscribed(false);
    }, 4000);
  };

  const policies = [
    {
      name: siteConfig.policyPrivacyName || "Política de Privacidad",
      nameKey: "policyPrivacyName",
      content: siteConfig.policyPrivacyContent || "En nuestra tienda respetamos tu privacidad. Tus datos personales de envío, facturación e historial de compras se resguardan de forma encriptada de extremo a extremo. No compartimos bases de datos con terceros ni comercializamos los chips NFC de autenticidad.",
      contentKey: "policyPrivacyContent",
      hiddenKey: "policyPrivacyHidden" as const,
      hidden: siteConfig.policyPrivacyHidden || false
    },
    {
      name: siteConfig.policyRefundName || "Política de Reembolso",
      nameKey: "policyRefundName",
      content: siteConfig.policyRefundContent || "Ofrecemos garantía de devolución y cambio de 30 días para todas las gorras. Para ser elegible, la gorra debe devolverse en su empaque original de colección, con los pines correspondientes intactos y sin manipulación física del sensor NFC de la visera.",
      contentKey: "policyRefundContent",
      hiddenKey: "policyRefundHidden" as const,
      hidden: siteConfig.policyRefundHidden || false
    },
    {
      name: siteConfig.policyTermsName || "Términos de Servicio",
      nameKey: "policyTermsName",
      content: siteConfig.policyTermsContent || "Al adquirir nuestros productos asumes el compromiso de uso correcto de nuestras tecnologías asociadas. Queda prohibida la alteración fraudulenta de los códigos de autenticidad y el hackeo de chips integrados NFC.",
      contentKey: "policyTermsContent",
      hiddenKey: "policyTermsHidden" as const,
      hidden: siteConfig.policyTermsHidden || false
    },
    {
      name: siteConfig.policyShippingName || "Política de Envío",
      nameKey: "policyShippingName",
      content: siteConfig.policyShippingContent || "Realizamos envíos urgentes asegurados a todo México mediante servicio Express prioritario. El tiempo promedio de entrega es de 1 a 2 días hábiles posteriores a la validación de la compra. Cada envío viaja en caja oficial rígida protectora.",
      contentKey: "policyShippingContent",
      hiddenKey: "policyShippingHidden" as const,
      hidden: siteConfig.policyShippingHidden || false
    },
    {
      name: siteConfig.policyContactName || "Información de Contacto",
      nameKey: "policyContactName",
      content: siteConfig.policyContactContent || "Soporte Oficial de Alta Costura. Correo: soporte@world-caps.com. Dirección fiscal corporativa: Alta Costura Urbana, Ciudad de México. Horario de atención NFC de lunes a viernes de 9 AM a 6 PM.",
      contentKey: "policyContactContent",
      hiddenKey: "policyContactHidden" as const,
      hidden: siteConfig.policyContactHidden || false
    }
  ];

  return (
    <footer className="relative bg-neutral-950/80 backdrop-blur-md text-white pt-16 pb-12 border-t border-neutral-900/80 z-10">
      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-12">
        {/* Newsletter Subscription */}
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <div className="flex flex-col items-center justify-center gap-1">
            <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest block">
              {siteConfig.newsletterBadge || "ÚNETE A NUESTRA FAMILIA"}
            </span>
            {isAdmin && visualEditMode && onVisualEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onVisualEdit("newsletterBadge", "Etiqueta Boletín", "text");
                }}
                className="p-1 bg-emerald-500 hover:bg-emerald-400 text-black rounded text-[8px] font-bold uppercase flex items-center gap-0.5 cursor-pointer select-none"
              >
                <Pencil size={8} />
                <span>EDITAR ETIQUETA</span>
              </button>
            )}
          </div>

          <div className="flex flex-col items-center justify-center gap-1">
            <h3 className="text-xl md:text-2xl font-black uppercase tracking-widest text-white leading-none">
              {siteConfig.newsletterTitle || "REGÍSTRATE EN NUESTRA LISTA"}
            </h3>
            {isAdmin && visualEditMode && onVisualEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onVisualEdit("newsletterTitle", "Título Boletín", "text");
                }}
                className="p-1 bg-emerald-500 hover:bg-emerald-400 text-black rounded text-[8px] font-bold uppercase flex items-center gap-0.5 cursor-pointer select-none"
              >
                <Pencil size={8} />
                <span>EDITAR TÍTULO</span>
              </button>
            )}
          </div>

          <div className="flex flex-col items-center justify-center gap-1">
            <p className="text-xs text-gray-400 max-w-md mx-auto uppercase tracking-wider leading-relaxed">
              {siteConfig.newsletterDescription || "Sé el primero en recibir notificaciones de próximos lanzamientos de gorras y accesos prioritarios."}
            </p>
            {isAdmin && visualEditMode && onVisualEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onVisualEdit("newsletterDescription", "Descripción Boletín", "textarea");
                }}
                className="p-1 bg-emerald-500 hover:bg-emerald-400 text-black rounded text-[8px] font-bold uppercase flex items-center gap-0.5 cursor-pointer select-none"
              >
                <Pencil size={8} />
                <span>EDITAR DESCRIPCIÓN</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSubscribe} className="pt-2">
            {subscribed ? (
              <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-400/20 px-4 py-2.5 rounded-full uppercase tracking-widest animate-pulse">
                <Check size={14} />
                <span>Te has inscrito con éxito</span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto border border-neutral-800 rounded bg-black p-1 hover:border-neutral-700 transition-colors">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Tu correo electrónico"
                  className="flex-1 bg-transparent border-none text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-0 px-3 uppercase tracking-wider py-2"
                />
                <button
                  type="submit"
                  className="bg-white text-black text-xs font-black tracking-widest uppercase hover:bg-neutral-200 transition-colors py-2 px-5 rounded cursor-pointer flex items-center gap-2 justify-center"
                >
                  <span>{siteConfig.newsletterButtonText || "Suscribirme"}</span>
                  {isAdmin && visualEditMode && onVisualEdit && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onVisualEdit("newsletterButtonText", "Botón Boletín", "text");
                      }}
                      className="p-0.5 bg-emerald-500 text-black rounded hover:bg-emerald-400 cursor-pointer inline-flex items-center"
                      title="Editar botón"
                    >
                      <Pencil size={8} />
                    </span>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Brand footer details and links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-t border-neutral-900 items-start text-xs border-b">
          
          {/* Logo & description */}
          <div className="space-y-4 text-left relative group/footer-logo">
            <div className="flex items-center gap-3">
              <img
                src={siteConfig.logoUrl || "https://umbra.page/cdn/shop/files/Letras_Blancas.png"}
                alt="Logo"
                className="h-6 object-contain"
                referrerPolicy="no-referrer"
              />
              {isAdmin && visualEditMode && onVisualEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onVisualEdit("logoUrl", "Logo Secundario de Pie (URL)", "image");
                  }}
                  className="p-1 bg-emerald-500 hover:bg-emerald-450 text-black rounded transition-all cursor-pointer text-[8px] font-bold uppercase flex items-center gap-0.5 shadow-lg select-none"
                  title="Editar Logo de Pie"
                >
                  <Pencil size={8} />
                  <span>EDITAR LOGO</span>
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1 items-start">
              <p className="text-gray-500 text-[10px] uppercase leading-relaxed tracking-wider max-w-sm">
                {siteConfig.footerDescription || "Marca líder en gorras de colección  No son simples gorras, son piezas de exclusividad."}
              </p>
              {isAdmin && visualEditMode && onVisualEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onVisualEdit("footerDescription", "Descripción Pie", "textarea");
                  }}
                  className="p-1 bg-emerald-500 hover:bg-emerald-400 text-black rounded text-[8px] font-bold uppercase flex items-center gap-0.5 cursor-pointer select-none"
                >
                  <Pencil size={8} />
                  <span>EDITAR DESCRIPCIÓN</span>
                </button>
              )}
            </div>
          </div>

          {/* Social connections */}
          <div className="space-y-4 text-left relative group/footer-socials">
            <div className="flex items-center gap-3">
              <h4 className="font-extrabold tracking-widest uppercase text-gray-400">
                {siteConfig.socialsTitle || "Síguenos en Redes"}
              </h4>
              {isAdmin && visualEditMode && onVisualEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onVisualEdit("socialsTitle", "Título Redes", "text");
                  }}
                  className="p-1 bg-emerald-500 hover:bg-emerald-450 text-black rounded transition-all cursor-pointer text-[8px] font-bold uppercase flex items-center gap-0.5 shadow-lg select-none"
                >
                  <Pencil size={8} />
                  <span>EDITAR TÍTULO</span>
                </button>
              )}
            </div>
            <div className="flex gap-4 items-center flex-wrap">
              <div className="flex items-center gap-1 bg-neutral-900/40 p-1 rounded border border-neutral-900">
                <a
                  href={siteConfig.instagramUrl || "https://www.instagram.com/"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white p-2 bg-neutral-950 rounded transition-all duration-300 inline-flex items-center"
                  aria-label="Instagram"
                >
                  <Instagram size={14} />
                </a>
                {isAdmin && visualEditMode && onVisualEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onVisualEdit("instagramUrl", "Enlace de Instagram", "text");
                    }}
                    className="p-1 bg-emerald-500 text-black rounded hover:bg-emerald-400 cursor-pointer"
                    title="Editar Link Instagram"
                  >
                    <Pencil size={8} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 bg-neutral-900/40 p-1 rounded border border-neutral-900">
                <a
                  href={siteConfig.tiktokUrl || "https://www.tiktok.com/"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white p-2 bg-neutral-950 rounded transition-all duration-300 inline-flex items-center"
                  aria-label="TikTok"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-5.2-1.74 2.89 2.89 0 0 1 2.31-2.83V7.63a6.34 6.34 0 0 0-3.41 1.03A6.33 6.33 0 0 0 3 14.15a6.34 6.34 0 0 0 6.34 6.35 6.34 6.34 0 0 0 6.35-6.35V8.87a8.16 8.16 0 0 0 3.9 1.27V6.69z"/>
                  </svg>
                </a>
                {isAdmin && visualEditMode && onVisualEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onVisualEdit("tiktokUrl", "Enlace de TikTok", "text");
                    }}
                    className="p-1 bg-emerald-500 text-black rounded hover:bg-emerald-400 cursor-pointer"
                    title="Editar Link TikTok"
                  >
                    <Pencil size={8} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Policies list */}
          <div className="space-y-4 text-left">
            <h4 className="font-extrabold tracking-widest uppercase text-gray-400">Términos y Políticas</h4>
            <ul className="flex flex-col gap-2 font-medium tracking-wider text-gray-400 uppercase text-[10px]">
              {policies.map((p, idx) => {
                const isHidden = p.hidden;
                if (isHidden && !(isAdmin && visualEditMode)) return null;

                return (
                  <li key={idx} className={`flex items-center gap-2 group/policy ${isHidden ? "opacity-40 line-through" : ""}`}>
                    <button
                      onClick={() => setActivePolicyIdx(activePolicyIdx === idx ? null : idx)}
                      className="hover:text-white text-left focus:outline-none transition-colors cursor-pointer text-[10px]"
                    >
                      {p.name} {isHidden && <span className="text-[8px] text-red-500 font-extrabold ml-1">[OCULTO]</span>}
                    </button>
                    {isAdmin && visualEditMode && (
                      <div className="flex items-center gap-1 opacity-0 group-hover/policy:opacity-100 transition-opacity">
                        {onVisualEdit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onVisualEdit(p.nameKey, `Título de ${p.name}`, "text");
                            }}
                            className="p-0.5 bg-emerald-500 text-black rounded transition-colors hover:bg-emerald-400 cursor-pointer"
                            title="Editar título"
                          >
                            <Pencil size={8} />
                          </button>
                        )}
                        {isHidden ? (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await updateSiteConfig({ [p.hiddenKey]: false });
                            }}
                            className="p-0.5 bg-blue-500 text-white rounded transition-colors hover:bg-blue-400 cursor-pointer"
                            title="Restaurar apartado"
                          >
                            <Eye size={8} />
                          </button>
                        ) : (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (activePolicyIdx === idx) {
                                setActivePolicyIdx(null);
                              }
                              await updateSiteConfig({ [p.hiddenKey]: true });
                            }}
                            className="p-0.5 bg-red-500 text-white rounded transition-colors hover:bg-red-400 cursor-pointer"
                            title="Borrar apartado"
                          >
                            <Trash2 size={8} />
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Expandable policy panel box */}
        {activePolicyIdx !== null && policies[activePolicyIdx] && (
          <div className="bg-neutral-950 border border-neutral-800 p-5 rounded-lg text-left slide-in">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-2 mb-3">
              <div className="flex items-center gap-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-widest">
                  {policies[activePolicyIdx].name}
                  {policies[activePolicyIdx].hidden && <span className="text-[9px] text-red-500 font-extrabold ml-2">[APARTADO OCULTO]</span>}
                </h4>
                {isAdmin && visualEditMode && (
                  <div className="flex gap-1.5">
                    {onVisualEdit && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onVisualEdit(policies[activePolicyIdx].nameKey, `Título de ${policies[activePolicyIdx].name}`, "text");
                          }}
                          className="p-1 bg-emerald-500 hover:bg-emerald-450 text-black rounded transition-all cursor-pointer text-[8px] font-bold uppercase flex items-center gap-0.5 shadow-lg select-none"
                        >
                          <Pencil size={8} />
                          <span>EDITAR TÍTULO</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onVisualEdit(policies[activePolicyIdx].contentKey, `Contenido de ${policies[activePolicyIdx].name}`, "textarea");
                          }}
                          className="p-1 bg-emerald-500 hover:bg-emerald-450 text-black rounded transition-all cursor-pointer text-[8px] font-bold uppercase flex items-center gap-0.5 shadow-lg select-none"
                        >
                          <Pencil size={8} />
                          <span>EDITAR CONTENIDO</span>
                        </button>
                      </>
                    )}
                    {policies[activePolicyIdx].hidden ? (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await updateSiteConfig({ [policies[activePolicyIdx].hiddenKey]: false });
                        }}
                        className="p-1 bg-blue-500 hover:bg-blue-450 text-white rounded transition-all cursor-pointer text-[8px] font-bold uppercase flex items-center gap-0.5 shadow-lg select-none"
                      >
                        <Eye size={8} />
                        <span>RESTAURAR</span>
                      </button>
                    ) : (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const key = policies[activePolicyIdx].hiddenKey;
                          setActivePolicyIdx(null);
                          await updateSiteConfig({ [key]: true });
                        }}
                        className="p-1 bg-red-500 hover:bg-red-450 text-white rounded transition-all cursor-pointer text-[8px] font-bold uppercase flex items-center gap-0.5 shadow-lg select-none"
                      >
                        <Trash2 size={8} />
                        <span>BORRAR</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setActivePolicyIdx(null)}
                className="text-gray-400 hover:text-white text-xs border border-white/10 hover:border-white/20 px-2 py-0.5 rounded cursor-pointer"
              >
                Cerrar
              </button>
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed uppercase tracking-wider whitespace-pre-wrap">
              {policies[activePolicyIdx].content}
            </p>
          </div>
        )}

        {/* copyright and credits info */}
        <div className="flex flex-col sm:flex-row justify-between items-center text-[10px] text-gray-500 uppercase tracking-widest pt-2">
          <div className="flex items-center gap-2">
            <p>{siteConfig.footerRights || "© 2026 TETRA HATS. Todos los derechos reservados."}</p>
            {isAdmin && visualEditMode && onVisualEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onVisualEdit("footerRights", "Derechos de Autor (Copyright)", "text");
                }}
                className="p-1 bg-emerald-500 text-black rounded cursor-pointer transition-all hover:bg-emerald-400"
                title="Editar Derechos Reservados"
              >
                <Pencil size={8} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 sm:mt-0">
            <p>{siteConfig.footerSlogan || "Elegancia, Sigilo y Estilo."}</p>
            {isAdmin && visualEditMode && onVisualEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onVisualEdit("footerSlogan", "Eslogan de Pie", "text");
                }}
                className="p-1 bg-emerald-500 text-black rounded cursor-pointer transition-all hover:bg-emerald-400"
                title="Editar Eslogan"
              >
                <Pencil size={8} />
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
