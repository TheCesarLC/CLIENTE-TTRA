import React, { useState } from "react";
import { useSite } from "../context/SiteContext";
import { ShieldCheck, ShieldAlert, BadgeCheck, Check, Sparkles, Pencil, Trash2, Plus, X } from "lucide-react";

export default function VerificationSection() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [searched, setSearched] = useState(false);
  const { authenticCodes, isAdmin, visualEditMode, saveAuthenticCode, deleteAuthenticCode } = useSite();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editSerial, setEditSerial] = useState("");
  const [editOwner, setEditOwner] = useState("");
  const [editItem, setEditItem] = useState("ON DGAS");
  const [editDate, setEditDate] = useState("");
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  const handleOpenCreateCode = () => {
    setEditSerial("");
    setEditOwner("");
    setEditItem("ON DGAS");
    setEditDate(new Date().toISOString().split("T")[0]);
    setIsEditingExisting(false);
    setEditorOpen(true);
  };

  const handleOpenEditCode = (codeObj: any) => {
    setEditSerial(codeObj.code);
    setEditOwner(codeObj.owner);
    setEditItem(codeObj.item);
    setEditDate(codeObj.date);
    setIsEditingExisting(true);
    setEditorOpen(true);
  };

  const handleSaveCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSerial.trim() || !editOwner.trim()) return;

    const newCodeObj = {
      code: editSerial.trim().toUpperCase(),
      owner: editOwner.trim().toUpperCase(),
      item: editItem.toUpperCase(),
      date: editDate,
      status: "verified"
    };

    await saveAuthenticCode(newCodeObj);
    setEditorOpen(false);
  };

  const handleDeleteCode = async (serial: string) => {
    if (window.confirm(`¿Seguro que deseas eliminar el código NFC "${serial}" de forma definitiva?`)) {
      await deleteAuthenticCode(serial);
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    const matched = authenticCodes.find(
      (c) => c.code.toLowerCase() === code.trim().toLowerCase()
    );

    if (matched) {
      setResult(matched);
    } else {
      setResult(null);
    }
    setSearched(true);
  };

  return (
    <section
      id="verification"
      className="relative bg-black text-white py-16 md:py-24 border-t border-neutral-900 overflow-hidden"
    >
      {/* Background cover image matching umbra verification */}
      <div className="absolute inset-0 z-0 opacity-15">
        <img
          src="https://umbra.page/cdn/shop/files/1112.png"
          alt="Verification Background"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Information Panel */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold tracking-widest text-gray-300 uppercase">
            <Sparkles size={11} className="text-gray-400" />
            <span>Autenticación Criptográfica</span>
          </div>

          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-widest leading-none">
            VERIFICACIÓN DE AUTENTICIDAD
          </h2>

          <p className="text-gray-400 text-xs md:text-sm tracking-wider uppercase leading-relaxed max-w-xl">
            Cada gorra de colección posee un chip NFC integrado imperceptible debajo de la visera. Registra tu gorra,
            confirma la autenticidad y propiedad, vigila tu fecha de registro y transfiere la propiedad de forma digital y segura.
          </p>

          {/* Quick instructions list */}
          <div className="space-y-4 pt-2">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/5 border border-white/10 text-white font-mono text-xs flex items-center justify-center font-bold">
                1
              </span>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Escanea la Visera</h4>
                <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">
                  Acerca tu teléfono celular al borde izquierdo de la visera para activar el sensor.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/5 border border-white/10 text-white font-mono text-xs flex items-center justify-center font-bold">
                2
              </span>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Obtén tu Código Serial</h4>
                <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide">
                  Copia el código único o digítalo en este panel para verificar su estatuto.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Active Interacting Widget Panel */}
        <div className="lg:col-span-6">
          <div className="bg-neutral-950/60 backdrop-blur-md border border-neutral-800 p-6 md:p-8 rounded-xl shadow-2xl space-y-6">
            <h3 className="text-sm font-black tracking-widest uppercase border-b border-neutral-800 pb-3 text-left">
              Consola de Registro Seguro
            </h3>

            <form onSubmit={handleVerify} className="space-y-4">
              <div className="text-left space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Código de Autenticidad (Chip NFC)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Ej. UM-ONDGAS-2026, UM-800DIAS-2026..."
                    className="flex-1 bg-black border border-neutral-800 rounded px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white uppercase tracking-wider"
                  />
                  <button
                    type="submit"
                    className="px-6 bg-white hover:bg-neutral-200 text-black text-xs font-black tracking-widest uppercase rounded transition-colors"
                  >
                    Verificar
                  </button>
                </div>
              </div>

              {/* Propose trial codes link */}
              <div className="flex items-center gap-1.5 text-[9px] text-gray-500 uppercase tracking-wider">
                <span>¿No tienes código? Prueba:</span>
                <button
                  type="button"
                  onClick={() => setCode("UM-ONDGAS-2026")}
                  className="font-bold underline text-gray-400 hover:text-white"
                >
                  UM-ONDGAS-2026
                </button>
                <span>o</span>
                <button
                  type="button"
                  onClick={() => setCode("UM-800DIAS-2026")}
                  className="font-bold underline text-gray-400 hover:text-white"
                >
                  UM-800DIAS-2026
                </button>
              </div>
            </form>

            {/* Results Display */}
            {searched && (
              <div className="pt-4 border-t border-neutral-900 slide-in text-left">
                {result ? (
                  <div className="bg-emerald-500/5 border border-emerald-400/20 p-4 rounded space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <ShieldCheck size={18} />
                      <span className="text-xs font-black tracking-widest uppercase">
                        PRODUCTO AUTÉNTICO VERIFICADO
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest block">Propietario Registrado</span>
                        <span className="font-bold text-white uppercase mt-0.5 block">{result.owner}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest block">Modelo Vinculado</span>
                        <span className="font-bold text-white uppercase mt-0.5 block">{result.item}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest block">Fecha de Registro</span>
                        <span className="font-bold text-gray-400 mt-0.5 block">{result.date}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-bold text-emerald-400">Estatus</span>
                        <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400 font-bold bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded mt-0.5 uppercase tracking-widest">
                          <Check size={8} /> Verified
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-500/5 border border-red-500/20 p-4 rounded space-y-2">
                    <div className="flex items-center gap-2 text-red-500">
                      <ShieldAlert size={18} />
                      <span className="text-xs font-black tracking-widest uppercase">
                        CÓDIGO SERIAL NO ENCONTRADO
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-normal uppercase">
                      El serial provisto no se encuentra en la base descentralizada de autenticidad del sitio. Favor de
                      verificar que tu aproximación NFC esté encendida o contáctanos para soporte de autenticidad.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Direct Inline NFC / Authenticity Codes Visual Management for Admin */}
            {isAdmin && visualEditMode && (
              <div className="pt-6 border-t border-neutral-900 space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest block">
                    🛠️ Administrar Códigos NFC
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenCreateCode}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[9px] font-black uppercase rounded cursor-pointer transition-transform duration-300 active:scale-95 shadow-md"
                  >
                    <Plus size={11} />
                    <span>Nuevo Código</span>
                  </button>
                </div>

                {editorOpen && (
                  <form onSubmit={handleSaveCode} className="bg-black/85 border border-neutral-800 p-4 rounded-lg space-y-3 animate-fade-in relative z-10">
                    <div className="flex items-center justify-between border-b border-neutral-900 pb-1.5">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                        {isEditingExisting ? "Modificar Código NFC" : "Registrar Nuevo Código NFC"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditorOpen(false)}
                        className="text-gray-500 hover:text-white"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="space-y-0.5">
                        <label className="text-[8px] text-gray-500 uppercase tracking-wider">Código (ID)</label>
                        <input
                          type="text"
                          required
                          disabled={isEditingExisting}
                          placeholder="Ej. UM-ONDGAS-2026"
                          value={editSerial}
                          onChange={(e) => setEditSerial(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-850 rounded p-1.5 text-xs text-white uppercase focus:outline-none focus:border-white"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[8px] text-gray-500 uppercase tracking-wider">Propietario</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. FEDERICO SANCHEZ"
                          value={editOwner}
                          onChange={(e) => setEditOwner(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-855 rounded p-1.5 text-xs text-white uppercase focus:outline-none focus:border-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="space-y-0.5">
                        <label className="text-[8px] text-gray-500 uppercase tracking-wider">Modelo de Gorra</label>
                        <select
                          value={editItem}
                          onChange={(e) => setEditItem(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-855 rounded p-1.5 text-xs text-white uppercase focus:outline-none"
                        >
                          <option value="ON DGAS">ON DGAS</option>
                          <option value="800 DIAS">800 DIAS</option>
                        </select>
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[8px] text-gray-500 uppercase tracking-wider">Fecha Registro</label>
                        <input
                          type="date"
                          required
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-855 rounded p-1.5 text-[11px] text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-1.5 pt-1 border-t border-neutral-900">
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[9px] font-black uppercase rounded cursor-pointer"
                      >
                        {isEditingExisting ? "Actualizar" : "Guardar NFC"}
                      </button>
                    </div>
                  </form>
                )}

                {/* Compact List of Authentic Codes for instantaneous visual deletes/edits */}
                <div className="max-h-48 overflow-y-auto border border-neutral-850 bg-black/40 rounded divide-y divide-neutral-900">
                  {authenticCodes.length === 0 ? (
                    <div className="p-4 text-center text-[10px] text-gray-600 uppercase tracking-wider">
                      Ningún código NFC registrado actualmente.
                    </div>
                  ) : (
                    authenticCodes.map((c) => (
                      <div key={c.code} className="p-2.5 flex items-center justify-between text-[10px] hover:bg-neutral-950/40 transition-colors">
                        <div className="space-y-0.5 max-w-[70%]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-white font-extrabold uppercase tracking-wide">
                              {c.code}
                            </span>
                            <span className="text-[8px] text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded font-extrabold uppercase">
                              {c.item}
                            </span>
                          </div>
                          <div className="text-[9px] text-gray-400 uppercase tracking-wide">
                            Titular: <span className="font-bold text-gray-200">{c.owner}</span> | Reg: {c.date}
                          </div>
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditCode(c)}
                            className="p-1.5 bg-neutral-900 hover:bg-neutral-800 text-emerald-400 border border-neutral-800 rounded cursor-pointer"
                            title="Editar código"
                          >
                            <Pencil size={8} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCode(c.code)}
                            className="p-1.5 bg-neutral-900 hover:bg-red-950 text-red-500 border border-neutral-800 rounded cursor-pointer"
                            title="Eliminar código"
                          >
                            <Trash2 size={8} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
