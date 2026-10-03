import React, { useState } from "react";
import { Plus, Trash2, Image as ImageIcon, List, Layers, Sparkles, Wand2 } from "lucide-react";
import { getOptimizedImageUrl } from "../lib/imageOptimizer";
import { TransparentProductImage } from "./TransparentProductImage";
import { removeWhiteBackground } from "../lib/transparentBg";
import { cleanRawImageUrl, isImgBBUrl, isImgurUrl } from "../lib/mediaUtils";

interface ProductImageManagerProps {
  images: string[];
  onChange: (images: string[]) => void;
}

export const ProductImageManager: React.FC<ProductImageManagerProps> = ({
  images,
  onChange,
}) => {
  const [mode, setMode] = useState<"list" | "text">("list");
  const [isProcessingBg, setIsProcessingBg] = useState(false);
  // Keep local text state for text mode so commas or newlines don't jump/break during editing
  const [rawText, setRawText] = useState<string>(() => 
    Array.isArray(images) ? images.filter(Boolean).join("\n") : ""
  );

  // Ensure images array has at least one entry for UI rendering
  const currentImages = Array.isArray(images) && images.length > 0 ? images : [""];

  const handleSingleImageChange = (index: number, val: string) => {
    const cleaned = cleanRawImageUrl(val);
    const next = [...currentImages];
    next[index] = cleaned;
    onChange(next);
    setRawText(next.filter(Boolean).join("\n"));

    // If user pasted an ImgBB viewer page (ibb.co/XYZ or imgbb.com/XYZ), automatically resolve to the direct image
    if (
      (cleaned.includes("ibb.co/") || cleaned.includes("imgbb.com/")) &&
      !cleaned.includes("i.ibb.co") &&
      !cleaned.includes("simgbb.com")
    ) {
      fetch(`/api/resolve-image-url?url=${encodeURIComponent(cleaned)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.resolvedUrl && data.resolvedUrl !== cleaned) {
            const resolvedList = [...next];
            resolvedList[index] = data.resolvedUrl;
            onChange(resolvedList);
            setRawText(resolvedList.filter(Boolean).join("\n"));
          }
        })
        .catch(() => {});
    }
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
    // Split by newline or comma and clean snippets
    const parsed = text
      .split(/[\n,]/)
      .map((url) => cleanRawImageUrl(url.trim()))
      .filter((url) => url.length > 0);

    onChange(parsed.length > 0 ? parsed : [""]);
  };

  const handleSwitchMode = (newMode: "list" | "text") => {
    if (newMode === "text") {
      setRawText(currentImages.filter(Boolean).join("\n"));
    }
    setMode(newMode);
  };

  const handleRemoveWhiteBgFromIndex = async (index: number) => {
    const targetUrl = currentImages[index];
    if (!targetUrl || !targetUrl.trim()) return;
    try {
      setIsProcessingBg(true);
      const transparentDataUrl = await removeWhiteBackground(targetUrl);
      if (transparentDataUrl && transparentDataUrl !== targetUrl) {
        handleSingleImageChange(index, transparentDataUrl);
      }
    } catch (err) {
      console.warn("Error removing background:", err);
    } finally {
      setIsProcessingBg(false);
    }
  };

  return (
    <div className="space-y-3 bg-neutral-900/60 border border-neutral-800 p-4 rounded-lg text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-2.5">
        <div>
          <label className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider block">
            Galería e Imágenes del Producto (Fondo Transparente Automático)
          </label>
          <p className="text-[10px] text-gray-400 font-medium">
            Compatible con <strong className="text-emerald-400">Imgur</strong> (i.imgur.com), <strong className="text-teal-400">ImgBB</strong> (i.ibb.co / ibb.co), Google Drive y CDNs directos. Puedes combinarlos libremente.
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
              <div className="w-12 h-12 bg-transparent border border-neutral-700 rounded flex-shrink-0 flex items-center justify-center overflow-hidden p-0.5">
                {imgUrl && imgUrl.trim().length > 5 ? (
                  <TransparentProductImage
                    src={imgUrl}
                    alt={`Preview ${idx + 1}`}
                    widthOptimization={100}
                    loading="lazy"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <ImageIcon size={18} className="text-neutral-600" />
                )}
              </div>

              {/* URL Input */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex justify-between items-center text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <span>
                      {idx === 0 ? "★ Imagen 1 (Portada Principal)" : `Imagen ${idx + 1}`}
                    </span>
                    {imgUrl && isImgurUrl(imgUrl) && (
                      <span className="text-[8px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1 py-0.2 rounded font-black tracking-wider uppercase">
                        Imgur
                      </span>
                    )}
                    {imgUrl && isImgBBUrl(imgUrl) && (
                      <span className="text-[8px] bg-teal-500/15 text-teal-400 border border-teal-500/30 px-1 py-0.2 rounded font-black tracking-wider uppercase">
                        ImgBB
                      </span>
                    )}
                  </div>
                  {imgUrl && imgUrl.trim().length > 5 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveWhiteBgFromIndex(idx)}
                      disabled={isProcessingBg}
                      className="text-[9px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                      title="Quitar fondo negro o blanco a esta imagen"
                    >
                      <Wand2 size={10} />
                      <span>{isProcessingBg ? "Limpiando..." : "Quitar fondo negro/blanco"}</span>
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  value={imgUrl}
                  onChange={(e) => handleSingleImageChange(idx, e.target.value)}
                  placeholder="https://i.imgur.com/... o https://i.ibb.co/..."
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
            placeholder={`https://i.imgur.com/u6D6b9Z.png\nhttps://i.ibb.co/L5hYvXz/gorra-1.png\nhttps://i.imgur.com/VnEirIv.png`}
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
