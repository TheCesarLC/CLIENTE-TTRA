import { Product, Review } from "./types";

export const PRODUCTS: Product[] = [
  {
    id: "9073020371194",
    name: "ON DGAS",
    priceMXN: 1499,
    originalPriceMXN: 1600,
    stockQuantity: 15,
    images: [],
    description: "Gorra de colección premium 'ON DGAS'. Diseñada para la máxima distinción urbana, destaca por sus costuras reforzadas, acabados de gamuza italiana de exportación y un diseño totalmente exclusivo. Incluye caja de colección premium, pines coleccionables y tarjeta holográfica de autenticidad.",
    outOfStock: false,
    category: "NIGHTMARES",
    badge: "Colección Especial",
    details: [
      "Gamuza de exportación súper suave",
      "Bordado de alta definición en relieve 3D",
      "Correa de cuero ajustable con hebilla metálica",
      "Caja premium del coleccionista",
      "Set de pines coleccionables",
      "Tarjeta holográfica de autenticidad"
    ]
  },
  {
    id: "9073019060474",
    name: "800 DIAS",
    priceMXN: 1499,
    originalPriceMXN: 1600,
    stockQuantity: 10,
    images: [],
    description: "Edición exclusiva '800 DIAS'. Una pieza con alma propia que encarna el sigilo y la noche eterna. Confeccionada con paneles estructurados rígidos de primera clase para una perfecta forma permanente, materiales suaves al tacto y acabados de terciopelo premium.",
    outOfStock: false,
    category: "SHADOWS IN THE DARKNESS",
    details: [
      "Estructura premium de 5 paneles",
      "Bordado de alta densidad",
      "Visera precurvada de alta costura",
      "Interiores forrados con satín grabado premium",
      "Caja oficial incluida"
    ]
  }
];

export const REVIEWS: Review[] = [];


export const AUTHENTIC_CODES = [
  { code: "UM-ONDGAS-2026", owner: "Hugo Cesar Lemus", status: "VERIFICADA", date: "2026-04-12", item: "ON DGAS (#48290307047674)" },
  { code: "UM-800DIAS-2026", owner: "Angel Sauceda", status: "VERIFICADA", date: "2026-05-18", item: "800 DIAS (#48290299707642)" }
];
