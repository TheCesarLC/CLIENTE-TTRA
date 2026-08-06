import React, { useState, useEffect } from "react";
import { X, Save, Type, Image as ImageIcon, Video, Palette, Link, Eye, Check, AlertCircle } from "lucide-react";

interface VisualEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  label: string;
  fieldName: string;
  initialValue: any;
  type: "text" | "textarea" | "image" | "video" | "color" | "number" | "boolean";
  onSave: (fieldName: string, value: any) => Promise<void>;
  onPreview: (fieldName: string, value: any) => void;
}

export default function VisualEditDialog({
  isOpen,
  onClose,
  label,
  fieldName,
  initialValue,
  type,
  onSave,
  onPreview,
}: VisualEditDialogProps) {
  const [value, setValue] = useState<any>(initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update inside when initialValue changes
  useEffect(() => {
    setValue(initialValue);
    setError(null);
  }, [initialValue]);

  if (!isOpen) return null;

  const handleLiveChange = (val: any) => {
    setValue(val);
    onPreview(fieldName, val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let finalValue = value;
      if (type === "number") {
        finalValue = Number(value);
        if (isNaN(finalValue)) {
          throw new Error("Por favor introduce un número válido.");
        }
      }
      await onSave(fieldName, finalValue);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-lg bg-neutral-950 border border-neutral-850 rounded-2xl shadow-2xl overflow-hidden"
        id="visual-edit-modal-container"
      >
        {/* Header toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-900 bg-neutral-950">
          <div className="flex items-center gap-2">
            {type === "color" && <Palette size={16} className="text-emerald-400 animate-pulse" />}
            {(type === "image" || type === "video") && <ImageIcon size={16} className="text-emerald-400 animate-pulse" />}
            {(type === "text" || type === "textarea") && <Type size={16} className="text-emerald-400 animate-pulse" />}
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
              Edición en Vivo: {label}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-neutral-900 transition-colors cursor-pointer"
            title="Cancelar"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form and Controls */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest block">
              Valor Actual / Nuevo
            </label>

            {type === "text" && (
              <input
                type="text"
                value={value || ""}
                onChange={(e) => handleLiveChange(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-emerald-500 text-white text-xs px-4 py-3 rounded focus:outline-none transition-all uppercase placeholder-gray-600 font-medium tracking-wider"
                placeholder={`ENTRA ${label.toUpperCase()}...`}
                required
              />
            )}

            {type === "textarea" && (
              <textarea
                value={value || ""}
                onChange={(e) => handleLiveChange(e.target.value)}
                rows={4}
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-emerald-500 text-white text-xs px-4 py-3 rounded focus:outline-none transition-all uppercase placeholder-gray-600 font-medium tracking-wide leading-relaxed"
                placeholder={`ENTRA ${label.toUpperCase()}...`}
                required
              />
            )}

            {type === "number" && (
              <input
                type="number"
                step="any"
                value={value !== undefined ? value : ""}
                onChange={(e) => handleLiveChange(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-emerald-500 text-white text-xs px-4 py-3 rounded focus:outline-none transition-all placeholder-gray-600 font-bold"
                placeholder="0.00"
                required
              />
            )}

            {type === "color" && (
              <div className="space-y-3">
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={value || "#000000"}
                    onChange={(e) => handleLiveChange(e.target.value)}
                    className="w-12 h-12 bg-transparent border border-neutral-800 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={value || ""}
                    onChange={(e) => handleLiveChange(e.target.value)}
                    className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-emerald-500 text-white text-xs px-4 py-3 rounded focus:outline-none transition-all uppercase font-mono font-bold tracking-wider"
                    placeholder="#000000"
                    maxLength={7}
                    required
                  />
                </div>
                {/* Standard presets */}
                <div className="space-y-1">
                  <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest block">Sugerencias Rápidas:</span>
                  <div className="flex gap-2">
                    {["#000000", "#09090b", "#171717", "#0f051d", "#022c22", "#050b14"].map((pre) => (
                      <button
                        key={pre}
                        type="button"
                        onClick={() => handleLiveChange(pre)}
                        className="w-6 h-6 rounded border border-neutral-800 transition-transform hover:scale-110 relative"
                        style={{ backgroundColor: pre }}
                        title={pre}
                      >
                        {value === pre && <Check size={10} className="text-white mx-auto drop-shadow-md" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {type === "image" && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <span className="p-3 bg-neutral-900 border border-neutral-800 rounded text-gray-400">
                    <Link size={14} />
                  </span>
                  <input
                    type="url"
                    value={value || ""}
                    onChange={(e) => handleLiveChange(e.target.value)}
                    className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-emerald-500 text-white text-xs px-4 py-3 rounded focus:outline-none transition-all placeholder-gray-600 font-mono text-[11px]"
                    placeholder="https://umbra.page/cdn/shop/files/..."
                    required
                  />
                </div>

                {/* Previews */}
                {value && (
                  <div className="border border-neutral-900 p-2 bg-black/40 rounded flex flex-col items-center justify-center gap-1.5">
                    <span className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">Vista previa del recurso</span>
                    <img
                      src={value}
                      alt="URL Preview"
                      className="max-h-24 object-contain rounded border border-neutral-850 bg-neutral-900"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://placehold.co/400x150/000000/ffffff?text=Image+URL+Invalida";
                      }}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>
            )}

            {type === "video" && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <span className="p-3 bg-neutral-900 border border-neutral-800 rounded text-gray-400">
                    <Video size={14} />
                  </span>
                  <input
                    type="url"
                    value={value || ""}
                    onChange={(e) => handleLiveChange(e.target.value)}
                    className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-emerald-500 text-white text-xs px-4 py-3 rounded focus:outline-none transition-all placeholder-gray-600 font-mono text-[11px]"
                    placeholder="https://umbra.page/cdn/shop/videos/..."
                    required
                  />
                </div>

                {/* Video Preview */}
                {value && (
                  <div className="border border-neutral-900 p-2 bg-black/40 rounded flex flex-col items-center justify-center gap-1.5">
                    <span className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">Vista previa del video</span>
                    <video
                      src={value}
                      muted
                      controls
                      playsInline
                      className="max-h-24 aspect-video object-cover rounded border border-neutral-850"
                    />
                  </div>
                )}
              </div>
            )}

            {type === "boolean" && (
              <div className="flex items-center justify-between p-4 bg-neutral-900/50 border border-neutral-900 rounded">
                <div>
                  <span className="text-xs font-black text-white uppercase tracking-wider">Habilitar / Desactivar</span>
                  <p className="text-[9px] text-gray-400 uppercase tracking-wide">Control visual instantáneo en pantalla</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleLiveChange(!value)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    value ? "bg-emerald-500" : "bg-neutral-800"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                      value ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-[10px] uppercase tracking-wider font-semibold">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-900">
            <button
              onClick={() => {
                // Revert to initial
                onPreview(fieldName, initialValue);
                onClose();
              }}
              className="px-4 py-2 border border-neutral-800 hover:bg-neutral-900 text-gray-400 hover:text-white text-[10px] font-bold uppercase tracking-widest rounded transition-all cursor-pointer"
              type="button"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 text-black disabled:text-gray-500 text-[10px] font-black uppercase tracking-widest rounded transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:scale-[1.02] cursor-pointer"
            >
              {saving ? (
                <>
                  <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save size={12} />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
