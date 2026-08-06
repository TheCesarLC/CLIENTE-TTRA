import React, { useState } from "react";
import { Plus, Trash2, Image as ImageIcon, List, Layers } from "lucide-react";

interface ProductImageManagerProps {
  images: string[];
  onChange: (images: string[]) => void;
}

export const ProductImageManager: React.FC<ProductImageManagerProps> = ({
  images,
  onChange,
}) => {
  const [mode, setMode] = useState<"list" | "text">("list");
  // Keep local text state for text mode so commas or newlines don't jump/break during editing
  const [rawText, setRawText] = useState<string>(() => 
    Array.isArray(images) ? images.filter(Boolean).join("\n") : ""
  );

  // Ensure images array has at least one entry for UI rendering
  const currentImages = Array.isArray(images) && images.length > 0 ? images : [""];

  const handleSingleImageChange = (index: number, val: string) => {
    const next = [...currentImages];
    next[index] = val;
    onChange(next);
    setRawText(next.filter(Boolean).join("\n"));
  };

  const handleAddImageRow = () => {
    const next = [...currentImages, ""];
    onChange(next);
    setRawText(next.filter(Boolean).join("\n"));
  };

  const handleRemoveImageRow = (index: number) => {
    const next = currentImages.filter((_, i) => i !== index);
    const finalArr = next.length > 0 ? next : [""];
    onChange(finalArr);
    setRawText(finalArr.filter(Boolean).join("\n"));
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setRawText(text);
    // Split by newline or comma
    const parsed = text
      .split(/[\n,]/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    onChange(parsed.length > 0 ? parsed : [""]);
  };

  const handleSwitchMode = (newMode: "list" | "text") => {
    if (newMode === "text") {
      setRawText(currentImages.filter(Boolean).join("\n"));
    }
    setMode(newMode);
  };

  return (
    <div className="space-y-3 bg-neutral-900/60 border border-neutral-800 p-4 rounded-lg text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-2.5">
        <div>
          <label className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider block">
            Galería e Imágenes del Producto
          </label>
          <p className="text-[10px] text-gray-400 font-medium">
            Agrega las URLs de las imágenes. La primera será la portada principal.
          </p>
        </div>

        {/* Mode switcher tabs */}
        <div className="flex items-center gap-1 bg-black p-1 rounded border border-neutral-800 text-[10px] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleSwitchMode("list")}
            className={`px-2.5 py-1 rounded font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
              mode === "list"
                ? "bg-emerald-500 text-black shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <List size={12} />
            <span>Una por Una</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode("text")}
            className={`px-2.5 py-1 rounded font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
              mode === "text"
                ? "bg-emerald-500 text-black shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Layers size={12} />
            <span>Pegar Lista (Un URL por línea)</span>
          </button>
        </div>
      </div>

      {mode === "list" ? (
        <div className="space-y-3">
          {currentImages.map((imgUrl, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 bg-black/80 border border-neutral-800 p-2 rounded-lg"
            >
              {/* Thumbnail preview */}
              <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                {imgUrl && imgUrl.trim().length > 5 ? (
                  <img
                    src={imgUrl}
                    alt={`Preview ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <ImageIcon size={18} className="text-neutral-600" />
                )}
              </div>

              {/* URL Input */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex justify-between items-center text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  <span>
                    {idx === 0 ? "★ Imagen 1 (Portada Principal)" : `Imagen ${idx + 1}`}
                  </span>
                </div>
                <input
                  type="url"
                  value={imgUrl}
                  onChange={(e) => handleSingleImageChange(idx, e.target.value)}
                  placeholder="https://ejemplo.com/imagen.png"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                />
              </div>

              {/* Delete button */}
              {currentImages.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveImageRow(idx)}
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-neutral-900 rounded transition-colors cursor-pointer"
                  title="Eliminar esta imagen"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddImageRow}
            className="w-full py-2.5 border border-dashed border-neutral-700 hover:border-emerald-500 text-gray-300 hover:text-emerald-400 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer bg-neutral-950/50 hover:bg-neutral-900"
          >
            <Plus size={14} />
            <span>+ Agregar otra imagen a la lista</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase">
            <span>Escribe o pega las URLs (Un enlace en cada renglón/línea):</span>
            <span className="text-emerald-400 font-extrabold">
              {currentImages.filter((i) => i.trim()).length} Imagen(es) detectada(s)
            </span>
          </div>
          <textarea
            value={rawText}
            onChange={handleTextareaChange}
            rows={5}
            placeholder={`https://ejemplo.com/imagen1.png\nhttps://ejemplo.com/imagen2.png\nhttps://ejemplo.com/imagen3.png`}
            className="w-full bg-black border border-neutral-800 rounded p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono leading-relaxed"
          />
          <p className="text-[10px] text-gray-500">
            💡 Tip: Presiona <kbd className="px-1 py-0.5 bg-neutral-800 text-gray-300 rounded font-mono">Enter</kbd> para agregar la siguiente URL en una nueva línea. No necesitas usar comas.
          </p>
        </div>
      )}
    </div>
  );
};
