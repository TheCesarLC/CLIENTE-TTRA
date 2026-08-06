export interface Product {
  id: string;
  name: string;
  priceMXN: number;
  priceUSD?: number;
  originalPriceMXN?: number;
  stockQuantity?: number;
  images: string[];
  description: string;
  outOfStock: boolean;
  category: "NIGHTMARES" | "SHADOWS IN THE DARKNESS" | "REST OF WORLD";
  badge?: string;
  details?: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Review {
  id: string;
  name: string;
  rating: number;
  date: string;
  capName: string;
  title?: string;
  reviewText: string;
  verified: boolean;
}

export interface GlowColor {
  name: string;
  hex: string;
  rgb: string;
}

export const GLOW_COLORS: GlowColor[] = [
  { name: "Verde Esmeralda", hex: "#10b981", rgb: "16, 185, 129" },
  { name: "Azul Eléctrico", hex: "#06b6d4", rgb: "6, 182, 212" },
  { name: "Púrpura Neón", hex: "#d946ef", rgb: "217, 70, 239" },
  { name: "Naranja Lava", hex: "#f97316", rgb: "249, 115, 22" },
  { name: "Rojo Carmesí", hex: "#ef4444", rgb: "239, 68, 68" },
  { name: "Blanco Espectral", hex: "#ffffff", rgb: "255, 255, 255" }
];
