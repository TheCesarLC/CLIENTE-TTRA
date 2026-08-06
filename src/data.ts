import { Product, Review } from "./types";

export const PRODUCTS: Product[] = [
  {
    id: "9073020371194",
    name: "ON DGAS",
    priceMXN: 1,
    originalPriceMXN: 1600,
    stockQuantity: 15,
    images: [
      "https://umbra.page/cdn/shop/files/BUNDLEPACK.png",
      "https://umbra.page/cdn/shop/files/5.png",
      "https://umbra.page/cdn/shop/files/6_84edbf45-9055-44a6-a5a5-cadb6b56b4fb.png",
      "https://umbra.page/cdn/shop/files/4.png"
    ],
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
    priceMXN: 1,
    originalPriceMXN: 1600,
    stockQuantity: 10,
    images: [
      "https://umbra.page/cdn/shop/files/25.png",
      "https://umbra.page/cdn/shop/files/16.png",
      "https://umbra.page/cdn/shop/files/15.png",
      "https://umbra.page/cdn/shop/files/10.png"
    ],
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

export const REVIEWS: Review[] = [
  {
    id: "rev1",
    name: "María",
    rating: 5,
    date: "2026-05-05",
    capName: "ON DGAS",
    reviewText: "A mi hijo le gustó mucho, la calidad de los bordados es excelente y el envío llegó al día siguiente en su caja sin ningún rasguño.",
    verified: true
  },
  {
    id: "rev2",
    name: "Enzo",
    rating: 5,
    date: "2026-05-05",
    capName: "ON DGAS",
    reviewText: "La calidad se siente muy bien. Es un diseño muy original y los acabados en gamuza premium de exportación garantizan comodidad extrema.",
    verified: true
  },
  {
    id: "rev3",
    name: "Carlos Fernando Chavez Luis",
    rating: 5,
    date: "2026-06-03",
    capName: "ON DGAS",
    title: "Excelente calidad y comodidad.",
    reviewText: "Excelente calidad y comodidad. Ni hablar de los materiales primera calidad. Mi primera gorra de esta línea y no será la última.",
    verified: true
  },
  {
    id: "rev4",
    name: "Jonathan Hernandez Quiroz",
    rating: 5,
    date: "2026-03-31",
    capName: "800 DIAS",
    title: "Excelente material de gran calidad",
    reviewText: "Excelente material de gran calidad, diseño increíble, cubrió todas mis expectativas una gran adquisición.",
    verified: true
  },
  {
    id: "rev5",
    name: "Daniel Alduzin",
    rating: 5,
    date: "2026-03-31",
    capName: "ON DGAS",
    title: "Excelente calidad",
    reviewText: "Excelente calidad, la gorra más chingona me encantó mi favorita ojalá y saquen más gorras así.",
    verified: true
  },
  {
    id: "rev6",
    name: "Gustavo Cruz",
    rating: 5,
    date: "2026-03-31",
    capName: "800 DIAS",
    title: "Casi perfecta",
    reviewText: "Me gustaría una visera más grande pero está cool la gorra y los diseños son muy buenos, se siente de un valor increíble.",
    verified: true
  },
  {
    id: "rev7",
    name: "Abraham Norberto Salas Quiroz",
    rating: 5,
    date: "2026-03-30",
    capName: "ON DGAS",
    title: "Muy buena calidad y un diseño único bastante llamativo",
    reviewText: "Muy buena calidad y un diseño único bastante llamativo, me encantó.",
    verified: true
  },
  {
    id: "rev8",
    name: "Arturo Puente Colin",
    rating: 5,
    date: "2026-02-20",
    capName: "800 DIAS",
    title: "10/10",
    reviewText: "Simplemente perfecta, la combinación de texturas se siente de un valor de alta costura. Vale totalmente cada peso.",
    verified: true
  },
  {
    id: "rev9",
    name: "Luis Belman Salinas",
    rating: 5,
    date: "2025-12-21",
    capName: "800 DIAS",
    title: "Excelente calidad",
    reviewText: "Excelente calidad, sigan con estos materiales premium. El broche trasero se siente firme y no lastima la cabeza en absoluto.",
    verified: true
  },
  {
    id: "rev10",
    name: "Raul Abimael Ramos",
    rating: 5,
    date: "2025-12-16",
    capName: "ON DGAS",
    title: "Es buena pero podría mejorar",
    reviewText: "Demasiado buena, muy buena gamuza de calidad y bordado de calidad. Recomiendo totalmente la marca.",
    verified: true
  }
];

export const AUTHENTIC_CODES = [
  { code: "UM-ONDGAS-2026", owner: "Hugo Cesar Lemus", status: "VERIFICADA", date: "2026-04-12", item: "ON DGAS (#48290307047674)" },
  { code: "UM-800DIAS-2026", owner: "Angel Sauceda", status: "VERIFICADA", date: "2026-05-18", item: "800 DIAS (#48290299707642)" }
];
