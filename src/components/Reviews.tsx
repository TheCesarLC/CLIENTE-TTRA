import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Star, MessageSquarePlus, Check, Award, Pencil, Trash2, X } from "lucide-react";
import { Review } from "../types";
import { useSite } from "../context/SiteContext";

export default function Reviews() {
  const { reviews: reviewsList, saveReview, deleteReview, isAdmin, visualEditMode, products } = useSite();
  const [formOpen, setFormOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formRating, setFormRating] = useState(5);
  const [formText, setFormText] = useState("");
  const [formCap, setFormCap] = useState("ON DGAS");
  const [formTitle, setFormTitle] = useState("");
  const [successMsg, setSuccessMsg] = useState(false);

  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editRating, setEditRating] = useState(5);
  const [editCapName, setEditCapName] = useState("");
  const [editReviewText, setEditReviewText] = useState("");

  const startEditReview = (rev: Review) => {
    setEditingReviewId(rev.id);
    setEditName(rev.name);
    setEditTitle(rev.title || "");
    setEditRating(rev.rating);
    setEditCapName(rev.capName);
    setEditReviewText(rev.reviewText);
  };

  const handleSaveEditReview = async (id: string) => {
    if (!editName.trim() || !editReviewText.trim()) return;
    const original = reviewsList.find(r => r.id === id);
    if (!original) return;

    const updated: Review = {
      ...original,
      name: editName.trim().toUpperCase(),
      title: editTitle.trim() ? editTitle.trim().toUpperCase() : undefined,
      rating: editRating,
      capName: editCapName.toUpperCase(),
      reviewText: editReviewText.trim().toUpperCase()
    };

    await saveReview(updated);
    setEditingReviewId(null);
  };

  const handleDeleteReview = async (id: string) => {
    if (window.confirm("¿Seguro que deseas eliminar esta opinión de forma permanente del catálogo?")) {
      await deleteReview(id);
    }
  };

  const totalReviewsCount = reviewsList.length || 1;
  const averageRating = (
    reviewsList.reduce((acc, curr) => acc + curr.rating, 0) / totalReviewsCount
  ).toFixed(2);

  const starCounts = [0, 0, 0, 0, 0];
  reviewsList.forEach((r) => {
    const starIdx = Math.max(1, Math.min(r.rating, 5)) - 1;
    starCounts[starIdx]++;
  });

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formText.trim()) return;

    const newReview: Review = {
      id: `custom-rev-${Date.now()}`,
      name: formName.trim().toUpperCase(),
      rating: formRating,
      date: new Date().toISOString().split("T")[0],
      capName: formCap.toUpperCase(),
      title: formTitle.trim() ? formTitle.trim().toUpperCase() : undefined,
      reviewText: formText.trim().toUpperCase(),
      verified: true
    };

    await saveReview(newReview);
    setSuccessMsg(true);
    setFormName("");
    setFormText("");
    setFormTitle("");
    setFormRating(5);

    setTimeout(() => {
      setSuccessMsg(false);
      setFormOpen(false);
    }, 3000);
  };

  return (
    <section
      id="reviews"
      className="relative bg-black text-white py-16 md:py-24 border-t border-neutral-900"
    >
      {/* Background with subtle stars pattern or dark cover */}
      <div className="absolute inset-0 z-0 opacity-15">
        <img
          src="https://umbra.page/cdn/shop/files/fondo_para_seccion_de_judge.jpg"
          alt="Reviews Background"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-black" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10 text-left space-y-12">
        
        {/* Header Summary Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-neutral-900">
          <div className="space-y-2">
            <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest block">
              Comentarios de Clientes
            </span>
            <div className="flex items-end gap-3">
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-widest leading-none">
                OPINIONES
              </h2>
              <span className="text-gray-500 font-mono text-xs uppercase tracking-wide pb-1">
                ({totalReviewsCount} Reseñas)
              </span>
            </div>
          </div>

          <button
            onClick={() => setFormOpen(!formOpen)}
            className="inline-flex items-center gap-2 px-5 py-3 border border-white/10 hover:border-white/30 rounded bg-white/5 hover:bg-white text-white hover:text-black text-xs font-black tracking-widest uppercase transition-all duration-300"
            id="write-review-toggle"
          >
            <MessageSquarePlus size={14} />
            <span>Escribir opinión</span>
          </button>
        </div>

        {/* Global Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-neutral-950/40 p-6 rounded-lg border border-neutral-900">
          
          {/* Average Stars */}
          <div className="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left space-y-2.5">
            <span className="text-5xl font-black tracking-tight text-white">{averageRating}</span>
            <div className="flex text-white">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={18}
                  fill={s <= Math.round(Number(averageRating)) ? "currentColor" : "none"}
                  className="text-white"
                />
              ))}
            </div>
            <p className="text-[11px] text-gray-500 tracking-wider uppercase font-semibold">
              Basado en opiniones verificadas de clientes
            </p>
          </div>

          {/* Histogram distribution slider */}
          <div className="md:col-span-5 space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = starCounts[rating - 1] || 0;
              const percent = totalReviewsCount > 0 ? (count / totalReviewsCount) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-3 text-xs">
                  <span className="w-3 text-right font-mono font-bold text-gray-400">{rating}</span>
                  <Star size={11} className="text-gray-500 fill-neutral-500" />
                  <div className="flex-1 h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono font-bold text-gray-400">
                    {percent.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* Medallions trust elements */}
          <div className="md:col-span-3 border-t md:border-t-0 md:border-l border-neutral-900 pt-6 md:pt-0 md:pl-8 flex flex-col items-center md:items-start space-y-2 text-center md:text-left">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Award size={18} />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Garantía Verificada</h4>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider leading-relaxed">
              Reseñas administradas bajo estándares de compra directa acreditada Judge.Me.
            </p>
          </div>
        </div>

        {/* Dynamic New Review Pop-Up Modal */}
        {formOpen && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
            {/* Dark Backdrop Overlay */}
            <div
              className="fixed inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
              onClick={() => setFormOpen(false)}
            />

            {/* Modal Dialog Card */}
            <div
              className="bg-neutral-950 border border-neutral-800 w-full max-w-lg max-h-[82vh] sm:max-h-[85vh] flex flex-col rounded-xl shadow-2xl relative my-auto text-left overflow-hidden z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header (Fixed at top) */}
              <div className="flex items-center justify-between border-b border-neutral-900 p-4 sm:p-5 flex-shrink-0 bg-neutral-950">
                <div className="space-y-0.5">
                  <span className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest block">
                    Comunidad Tetra Hats
                  </span>
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-widest text-white leading-none">
                    Escribir Opinión
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="p-2 text-gray-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded-full border border-neutral-800 transition-colors cursor-pointer shrink-0 ml-2"
                  aria-label="Cerrar modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Scrollable Body */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                {successMsg ? (
                  <div className="text-center py-6 sm:py-8 space-y-3">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-400 text-emerald-400 mx-auto animate-pulse">
                      <Check size={20} />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400">
                      ¡Gracias por tu opinión!
                    </h3>
                    <p className="text-[11px] text-gray-400 uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
                      Tu reseña ha sido procesada e insertada de forma inmediata al catálogo.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSuccessMsg(false);
                        setFormOpen(false);
                      }}
                      className="mt-2 px-5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white text-[10px] font-black uppercase tracking-widest rounded cursor-pointer"
                    >
                      Cerrar Ventana
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider leading-relaxed">
                      Comparte tu experiencia honesta sobre la calidad, acabados y diseño de tu gorra.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-left block">
                          Nombre o Apodo *
                        </label>
                        <input
                          type="text"
                          required
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          placeholder="Ej. Juan Pérez"
                          className="w-full bg-black border border-neutral-800 rounded p-2.5 text-xs text-white uppercase placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-left block">
                          Modelo comprado
                        </label>
                        <select
                          value={formCap}
                          onChange={(e) => setFormCap(e.target.value)}
                          className="w-full bg-black border border-neutral-800 rounded p-2.5 text-xs text-white uppercase focus:outline-none focus:border-white transition-colors"
                        >
                          {products && products.length > 0 ? (
                            products.map((p) => (
                              <option key={p.id} value={p.name}>
                                {p.name}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="ON DGAS">ON DGAS</option>
                              <option value="800 DIAS">800 DIAS</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-center">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-left block">
                          Título de Reseña (Opcional)
                        </label>
                        <input
                          type="text"
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          placeholder="Ej. Excelente calidad"
                          className="w-full bg-black border border-neutral-800 rounded p-2.5 text-xs text-white uppercase placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-left block">
                          Calificación (Estrellas)
                        </label>
                        <div className="flex items-center gap-1.5 pt-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setFormRating(s)}
                              className="hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                            >
                              <Star
                                size={20}
                                fill={s <= formRating ? "currentColor" : "none"}
                                className={s <= formRating ? "text-white" : "text-neutral-700"}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-left block">
                        Cuerpo del Comentario *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={formText}
                        onChange={(e) => setFormText(e.target.value)}
                        placeholder="Escribe tu experiencia honesta sobre los bordados, materiales, ajuste..."
                        className="w-full bg-black border border-neutral-800 rounded p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white leading-relaxed text-left transition-colors"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setFormOpen(false)}
                        className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white text-[11px] font-black tracking-widest uppercase transition-colors rounded cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-white text-black text-[11px] font-black tracking-widest uppercase hover:bg-neutral-200 transition-colors rounded cursor-pointer"
                      >
                        Enviar Reseña
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Existing Reviews List Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {reviewsList.map((rev) => {
            const isEditing = editingReviewId === rev.id;
            return (
              <div
                key={rev.id}
                className="bg-neutral-950/60 backdrop-blur-md p-5 rounded-lg border border-neutral-800 space-y-4 hover:border-neutral-700 transition-colors text-left relative"
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                      <span className="text-[9px] font-black uppercase text-emerald-400 tracking-widest">Editando Opinión</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSaveEditReview(rev.id)}
                          className="px-2 py-1 bg-emerald-500 hover:bg-emerald-400 text-black text-[9px] font-black uppercase rounded cursor-pointer"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingReviewId(null)}
                          className="px-2 py-1 bg-neutral-900 border border-neutral-800 text-white hover:bg-neutral-800 text-[9px] font-black uppercase rounded cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[8px] text-gray-500 font-extrabold uppercase tracking-wider block">Nombre</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-black border border-neutral-800 rounded p-1.5 text-[11px] text-white uppercase focus:outline-none focus:border-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8px] text-gray-500 font-extrabold uppercase tracking-wider block">Modelo</label>
                        <select
                          value={editCapName}
                          onChange={(e) => setEditCapName(e.target.value)}
                          className="w-full bg-black border border-neutral-800 rounded p-1.5 text-[11px] text-white uppercase focus:outline-none focus:border-white"
                        >
                          <option value="ON DGAS">ON DGAS</option>
                          <option value="800 DIAS">800 DIAS</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[8px] text-gray-500 font-extrabold uppercase tracking-wider block">Título</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full bg-black border border-neutral-800 rounded p-1.5 text-[11px] text-white uppercase focus:outline-none focus:border-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8px] text-gray-500 font-extrabold uppercase tracking-wider block">Calificación</label>
                        <div className="flex items-center gap-1 pt-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setEditRating(s)}
                              className="focus:outline-none"
                            >
                              <Star
                                size={14}
                                fill={s <= editRating ? "currentColor" : "none"}
                                className={s <= editRating ? "text-white" : "text-gray-600"}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] text-gray-500 font-extrabold uppercase tracking-wider block">Comentario</label>
                      <textarea
                        rows={2}
                        value={editReviewText}
                        onChange={(e) => setEditReviewText(e.target.value)}
                        className="w-full bg-black border border-neutral-800 rounded p-2 text-[11px] text-white uppercase focus:outline-none focus:border-white leading-normal"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black uppercase text-white tracking-widest block">
                          {rev.name}
                        </span>
                        <span className="text-[8px] text-gray-500 tracking-wider">
                          {rev.date}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Stars Indicator */}
                        <div className="flex text-white">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={11}
                              fill={s <= rev.rating ? "currentColor" : "none"}
                              className="text-white"
                            />
                          ))}
                        </div>

                        {/* Inline Admin Edit Controls */}
                        {isAdmin && (
                          <div className="flex gap-1 z-10">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditReview(rev);
                              }}
                              className="p-1 bg-emerald-500 hover:bg-emerald-450 text-black rounded select-none shadow hover:scale-105 active:scale-95 transition-all cursor-pointer"
                              title="Editar reseña"
                            >
                              <Pencil size={9} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(rev.id);
                              }}
                              className="p-1 bg-red-600 hover:bg-red-500 text-white rounded select-none shadow hover:scale-105 active:scale-95 transition-all cursor-pointer"
                              title="Eliminar reseña"
                            >
                              <Trash2 size={9} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 border-t border-neutral-900 pt-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] text-gray-500 uppercase tracking-widest">Modelo comprado:</span>
                        <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded tracking-widest uppercase">
                          {rev.capName}
                        </span>
                      </div>

                      {rev.title && (
                        <h4 className="text-xs font-extrabold uppercase tracking-wide text-white py-1">
                          {rev.title}
                        </h4>
                      )}

                      <p className="text-[11px] text-gray-400 leading-normal uppercase">
                        {rev.reviewText}
                      </p>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Confirmation Modal for Review Deletion */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-900 rounded-lg p-6 max-w-sm w-full space-y-6 shadow-2xl">
            <div className="space-y-2 text-center">
              <h3 className="text-sm font-black uppercase tracking-widest text-white">
                ¿Eliminar Opinión?
              </h3>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide leading-relaxed">
                ¿Estás seguro de que deseas eliminar esta opinión de forma permanente del catálogo? Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] font-black uppercase tracking-widest rounded border border-neutral-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (deleteConfirmId) {
                    await deleteReview(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }
                }}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded transition-colors cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
