import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query,
  where 
} from "firebase/firestore";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User 
} from "firebase/auth";
import { db, auth, googleProvider, handleFirestoreError, OperationType, cleanDocData } from "../lib/firebase";
import { Product, Review, CartItem } from "../types";
import { PRODUCTS, REVIEWS, AUTHENTIC_CODES } from "../data";

// Custom type representing the overall visual site configuration
export interface SiteConfig {
  heroTitle1: string;
  heroTitle2: string;
  heroSubtitle: string;
  accentColor: string;
  backgroundColor: string;
  bannerMessage: string;
  headerLogo: string;
  footerText: string;
  whatsappNumber: string;
  instagramUrl: string;
  artistCredits: string;
  experienceVideo: string;
  experienceVideo2?: string;
  heroVideo: string;
  showGlow: boolean;
  glowIntensity: string; // e.g. "0.15" representation
  experienceTitle: string;
  experienceSubtitle: string;
  distributionTitle: string;
  distributionSubtitle: string;
  logoUrl?: string;
  heroPoster?: string;
  experiencePoster?: string;
  experiencePoster2?: string;
  heroButton1Text?: string;
  heroButton2Text?: string;
  policyPrivacyName?: string;
  policyPrivacyContent?: string;
  policyRefundName?: string;
  policyRefundContent?: string;
  policyTermsName?: string;
  policyTermsContent?: string;
  policyShippingName?: string;
  policyShippingContent?: string;
  policyContactName?: string;
  policyContactContent?: string;
  policyPrivacyHidden?: boolean;
  policyRefundHidden?: boolean;
  policyTermsHidden?: boolean;
  policyShippingHidden?: boolean;
  policyContactHidden?: boolean;
  newsletterBadge?: string;
  newsletterTitle?: string;
  newsletterDescription?: string;
  newsletterButtonText?: string;
  footerDescription?: string;
  socialsTitle?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  footerRights?: string;
  footerSlogan?: string;
  receivingBankAccount?: string;
  receivingBankName?: string;
  receivingBankHolder?: string;
  mercadoPagoAccessToken?: string;
  mercadoPagoPublicKey?: string;
  stripeSecretKey?: string;
  stripePublishableKey?: string;
}

// Order record in Firestore
export interface Order {
  id: string;
  userEmail: string;
  userName: string;
  createdAt: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    priceMXN: number;
    priceUSD: number;
    image: string;
  }[];
  totalMXN: number;
  totalUSD: number;
  status: "PAGO_PENDIENTE" | "PAGO_RECIBIDO" | "EMPACADO" | "ENVIADO" | "ENTREGADO";
  shippingAddress: string;
  paymentMethod: string;
  trackingNumber: string;
  buyerPhone?: string;
}

// User submission contact message
export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
  read: boolean;
}

// Authentication code definition
export interface AuthenticCode {
  code: string;
  owner: string;
  status: string;
  date: string;
  item: string;
}

interface SiteContextType {
  currentUser: User | null;
  isAdmin: boolean;
  loading: boolean;
  siteConfig: SiteConfig;
  products: Product[];
  reviews: Review[];
  orders: Order[];
  contactMessages: ContactMessage[];
  authenticCodes: AuthenticCode[];
  visualEditMode: boolean;
  setVisualEditMode: (mode: boolean) => void;
  // Auth operations
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  // Realtime updates
  updateSiteConfig: (newConfig: Partial<SiteConfig>) => Promise<void>;
  saveProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  saveReview: (review: Review) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;
  saveOrder: (order: Omit<Order, "id"> & { id?: string }) => Promise<string>;
  updateOrder: (orderId: string, updates: Partial<Order>) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  submitMessage: (name: string, email: string, phone: string, message: string) => Promise<void>;
  markMessageRead: (messageId: string, read: boolean) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  saveAuthenticCode: (code: AuthenticCode) => Promise<void>;
  deleteAuthenticCode: (code: string) => Promise<void>;
  deductProductStock: (items: { productId: string; quantity: number }[]) => Promise<void>;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

const defaultSiteConfig: SiteConfig = {
  heroTitle1: "PREMIUM CAPS",
  heroTitle2: "COLECCIÓN",
  heroSubtitle: "Alta Moda y Diseño Premium. Gorras de Colección Exclusiva con Autenticidad NFC Integrada.",
  accentColor: "#10b981", // Emerald 500
  backgroundColor: "#000000",
  bannerMessage: "",
  headerLogo: "https://umbra.page/cdn/shop/files/Letras_Blancas.png",
  footerText: "© 2026 ALTA COSTURA BAJO LAS SOMBRAS.",
  whatsappNumber: "+521123456789",
  instagramUrl: "https://instagram.com/",
  artistCredits: "",
  experienceVideo: "https://res.cloudinary.com/demo/video/upload/q_auto,f_auto/v1682352857/cld-sample-video.mp4",
  experienceVideo2: "https://res.cloudinary.com/demo/video/upload/q_auto,f_auto/v1682352857/cld-sample-video.mp4",
  experiencePoster: "",
  experiencePoster2: "",
  heroVideo: "https://res.cloudinary.com/demo/video/upload/q_auto,f_auto/v1682352857/cld-sample-video.mp4",
  showGlow: true,
  glowIntensity: "0.15",
  experienceTitle: "DETALLES EXCLUSIVOS AL DETALLE",
  experienceSubtitle: "Colección Limitada. No son simples gorras, son piezas de exclusividad.",
  distributionTitle: "DISTRIBUIDORES OFICIALES",
  distributionSubtitle: "Adquiere piezas exclusivas en puntos autorizados o conviértete en partner de venta mayorista.",
  heroButton1Text: "Ver Catálogo",
  heroButton2Text: "Verificar Mi Gorra",
  policyPrivacyName: "Política de Privacidad",
  policyPrivacyContent: "En nuestra tienda respetamos tu privacidad. Tus datos personales de envío, facturación e historial de compras se resguardan de forma encriptada de extremo a extremo. No compartimos bases de datos con terceros ni comercializamos los chips NFC de autenticidad.",
  policyRefundName: "Política de Reembolso",
  policyRefundContent: "Ofrecemos garantía de devolución y cambio de 30 días para todas las gorras. Para ser elegible, la gorra debe devolverse en su empaque original de colección, con los pines correspondientes intactos y sin manipulación física del sensor NFC de la visera.",
  policyTermsName: "Términos de Servicio",
  policyTermsContent: "Al adquirir nuestros productos asumes el compromiso de uso correcto de nuestras tecnologías asociadas. Queda prohibida la alteración fraudulenta de los códigos de autenticidad y el hackeo de chips integrados NFC.",
  policyShippingName: "Política de Envío",
  policyShippingContent: "Realizamos envíos urgentes asegurados a todo México mediante DHL y FedEx Express. El tiempo promedio de entrega es de 1 a 2 días hábiles posteriores a la validación de la compra. Cada envío viaja en caja oficial rígida protectora.",
  policyContactName: "Información de Contacto",
  policyContactContent: "Soporte Oficial de Alta Costura. Correo: soporte@world-caps.com. Dirección fiscal corporativa: Alta Costura Urbana, Ciudad de México. Horario de atención NFC de lunes a viernes de 9 AM a 6 PM.",
  logoUrl: "https://umbra.page/cdn/shop/files/Letras_Blancas.png",
  newsletterBadge: "ÚNETE A NUESTRA FAMILIA",
  newsletterTitle: "REGÍSTRATE EN NUESTRA LISTA",
  newsletterDescription: "Sé el primero en recibir notificaciones de próximos lanzamientos de gorras y accesos prioritarios.",
  newsletterButtonText: "Suscribirme",
  footerDescription: "Marca líder en gorras de colección No son simples gorras, son piezas de exclusividad.",
  socialsTitle: "Síguenos en Redes",
  facebookUrl: "",
  youtubeUrl: "",
  tiktokUrl: "https://www.tiktok.com/",
  footerRights: "© 2026 TETRA HATS. Todos los derechos reservados.",
  footerSlogan: "Alta Moda y Diseño Premium.",
  receivingBankAccount: "4189143187401339",
  receivingBankName: "BANCO RECEPTOR BANCARIO / TARJETA",
  receivingBankHolder: "TETRA HATS / MARCA OFICIAL",
  mercadoPagoAccessToken: "",
  mercadoPagoPublicKey: "",
  stripeSecretKey: "",
  stripePublishableKey: ""
};

export const SiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  
  const loading = !authLoaded || !configLoaded;

  const [siteConfig, setSiteConfig] = useState<SiteConfig>(() => {
    try {
      const saved = localStorage.getItem("shop_site_config");
      if (saved) {
        const parsed = JSON.parse(saved) as SiteConfig;
        if (parsed.bannerMessage && (
          parsed.bannerMessage.includes("Caja de colección") ||
          parsed.bannerMessage.includes("Pines oficiales") ||
          parsed.bannerMessage.includes("Caja de colecci")
        )) {
          parsed.bannerMessage = "";
        }
        if (parsed.heroSubtitle && parsed.heroSubtitle.includes("Elegancia, Sigilo y Estilo de Alta Costura")) {
          parsed.heroSubtitle = parsed.heroSubtitle.replace("Elegancia, Sigilo y Estilo de Alta Costura", "Alta Moda y Diseño Premium");
        }
        if (parsed.footerSlogan && parsed.footerSlogan.includes("Elegancia, Sigilo")) {
          parsed.footerSlogan = "Alta Moda y Diseño Premium.";
        }
        if (parsed.footerDescription && (parsed.footerDescription.includes("Nuestra marca es líder") || parsed.footerDescription.includes("alta gama y diseño conceptual"))) {
          parsed.footerDescription = "Marca líder en gorras de colección No son simples gorras, son piezas de exclusividad.";
        }
        if (parsed.experienceSubtitle && (
          parsed.experienceSubtitle.includes("Gamuza italiana") ||
          parsed.experienceSubtitle.includes("refractarios") ||
          parsed.experienceSubtitle.includes("titanio") ||
          parsed.experienceSubtitle.includes("estatus")
        )) {
          parsed.experienceSubtitle = "Colección Limitada. No son simples gorras, son piezas de exclusividad.";
        }
        if (parsed.experienceVideo && (parsed.experienceVideo.includes("umbra.page/cdn/shop/videos") || parsed.experienceVideo.includes("41ebdb") || parsed.experienceVideo.includes("8678b1b9"))) {
          parsed.experienceVideo = "";
        }
        if (parsed.experiencePoster && (parsed.experiencePoster.includes("8678b1b9") || parsed.experiencePoster.includes("41ebdb"))) {
          parsed.experiencePoster = "";
        }
        if (parsed.heroVideo && (parsed.heroVideo.includes("umbra.page/cdn/shop/videos") || parsed.heroVideo.includes("41ebdb") || parsed.heroVideo.includes("8678b1b9"))) {
          parsed.heroVideo = "";
        }
        return { ...defaultSiteConfig, ...parsed };
      }
      return defaultSiteConfig;
    } catch {
      return defaultSiteConfig;
    }
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [authenticCodes, setAuthenticCodes] = useState<AuthenticCode[]>([]);
  const [visualEditMode, setVisualEditMode] = useState(false);

  // Monitor Auth Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        // hugocesarlemuscortes@gmail.com is absolute administrator
        if (user.email?.toLowerCase() === "hugocesarlemuscortes@gmail.com") {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
        setVisualEditMode(false);
      }
      setAuthLoaded(true);
    });
    return unsubscribe;
  }, []);

  // Sync / Listen to site configuration
  useEffect(() => {
    const configPath = "site_configs";
    const docRef = doc(db, configPath, "global");
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as SiteConfig;
        if (data.bannerMessage && (
          data.bannerMessage.includes("Caja de colección") ||
          data.bannerMessage.includes("Pines oficiales") ||
          data.bannerMessage.includes("Caja de colecci")
        )) {
          data.bannerMessage = "";
        }
        if (data.heroSubtitle && data.heroSubtitle.includes("Elegancia, Sigilo y Estilo de Alta Costura")) {
          data.heroSubtitle = data.heroSubtitle.replace("Elegancia, Sigilo y Estilo de Alta Costura", "Alta Moda y Diseño Premium");
        }
        if (data.footerSlogan && data.footerSlogan.includes("Elegancia, Sigilo")) {
          data.footerSlogan = "Alta Moda y Diseño Premium.";
        }
        if (data.footerDescription && (data.footerDescription.includes("Nuestra marca es líder") || data.footerDescription.includes("alta gama y diseño conceptual"))) {
          data.footerDescription = "Marca líder en gorras de colección No son simples gorras, son piezas de exclusividad.";
        }
        if (data.experienceSubtitle && (
          data.experienceSubtitle.includes("Gamuza italiana") ||
          data.experienceSubtitle.includes("refractarios") ||
          data.experienceSubtitle.includes("titanio") ||
          data.experienceSubtitle.includes("estatus")
        )) {
          data.experienceSubtitle = "Colección Limitada. No son simples gorras, son piezas de exclusividad.";
        }
        if (data.experienceVideo && (data.experienceVideo.includes("umbra.page/cdn/shop/videos") || data.experienceVideo.includes("41ebdb") || data.experienceVideo.includes("8678b1b9"))) {
          data.experienceVideo = "";
        }
        if (data.experiencePoster && (data.experiencePoster.includes("8678b1b9") || data.experiencePoster.includes("41ebdb"))) {
          data.experiencePoster = "";
        }
        if (data.heroVideo && (data.heroVideo.includes("umbra.page/cdn/shop/videos") || data.heroVideo.includes("41ebdb") || data.heroVideo.includes("8678b1b9"))) {
          data.heroVideo = "";
        }
        setSiteConfig({ ...defaultSiteConfig, ...data } as SiteConfig);
        try {
          localStorage.setItem("shop_site_config", JSON.stringify(data));
        } catch (e) {
          console.error("Local storage sync error", e);
        }
      } else {
        // Seed default config to Firestore for the first run
        setDoc(docRef, defaultSiteConfig).catch((err) => {
          console.warn("Could not seed site configuration, probably lack of auth write permissions (will use local fallback):", err);
        });
      }
      setConfigLoaded(true);
    }, (error) => {
      console.warn("Firestore config listener failed / not fully available without admin auth, offline state active:", error);
      setConfigLoaded(true);
    });

    return unsubscribe;
  }, []);

  // Sync / Listen to Products (with seeding)
  useEffect(() => {
    const path = "products";
    const colRef = collection(db, path);
    
    const unsubscribe = onSnapshot(colRef, async (querySnap) => {
      if (querySnap.empty) {
        // Double-guard: If already seeded locally, respect that they might have been deleted by the admin
        const locallySeeded = localStorage.getItem("seeded_products") === "true";
        if (locallySeeded) {
          console.log("Products already seeded but empty, skipping.");
          setProducts([]);
          return;
        }

        try {
          const statusSnap = await getDoc(doc(db, "site_configs", "seed_status"));
          if (statusSnap.exists() && statusSnap.data()?.products === true) {
            console.log("Products already seeded in DB but empty, skipping.");
            localStorage.setItem("seeded_products", "true");
            setProducts([]);
            return;
          }
        } catch (err) {
          console.warn("Could not retrieve seed status:", err);
        }

        // Seed with products
        console.log("Seeding products to Firestore db...");
        for (const prod of PRODUCTS) {
          try {
            await setDoc(doc(db, "products", prod.id), prod);
          } catch (e) {
            console.error("Failed to seed product", prod.id, e);
          }
        }
        try {
          await setDoc(doc(db, "site_configs", "seed_status"), { products: true }, { merge: true });
        } catch (e) {
          console.error("Failed to write product seed status", e);
        }
        localStorage.setItem("seeded_products", "true");
      } else {
        const prodList: Product[] = [];
        let hasOldProducts = false;
        querySnap.forEach((docSnap) => {
          if (!docSnap.id.startsWith("_")) {
            const data = docSnap.data() as Product;
            prodList.push(data);
            if (data.name !== "ON DGAS" && data.name !== "800 DIAS") {
              hasOldProducts = true;
            }
          }
        });

        // Check if v2 migration has already been recorded
        let isAlreadyMigrated = localStorage.getItem("migrated_v2") === "true";
        if (!isAlreadyMigrated && hasOldProducts) {
          try {
            const statusSnap = await getDoc(doc(db, "site_configs", "seed_status"));
            if (statusSnap.exists() && statusSnap.data()?.migrated_v2 === true) {
              isAlreadyMigrated = true;
              localStorage.setItem("migrated_v2", "true");
            }
          } catch (err) {
            console.warn("Could not retrieve seed status for product migration:", err);
          }
        }

        if (hasOldProducts && !isAlreadyMigrated) {
          console.log("Old products detected. Migrating Firestore products collection...");
          for (const docSnap of querySnap.docs) {
            try {
              await deleteDoc(doc(db, "products", docSnap.id));
            } catch (e) {
              console.error("Failed to delete product doc", docSnap.id, e);
            }
          }
          for (const prod of PRODUCTS) {
            try {
              await setDoc(doc(db, "products", prod.id), prod);
            } catch (e) {
              console.error("Failed to write product doc", prod.id, e);
            }
          }
          try {
            await setDoc(doc(db, "site_configs", "seed_status"), { migrated_v2: true }, { merge: true });
            localStorage.setItem("migrated_v2", "true");
          } catch (e) {
            console.error("Failed to mark migration_v2 status", e);
          }
          return;
        }

        setProducts(prodList);
        localStorage.setItem("seeded_products", "true");
      }
    }, (error) => {
      console.warn("Firestore products reading failed, falling back to local static PRODUCTS:", error);
      // Fallback
      setProducts(PRODUCTS);
    });

    return unsubscribe;
  }, []);

  // Sync / Listen to Reviews (with seeding)
  useEffect(() => {
    const path = "reviews";
    const colRef = collection(db, path);
    
    const unsubscribe = onSnapshot(colRef, async (querySnap) => {
      if (querySnap.empty) {
        // Double-guard: If already seeded locally, respect that they might have been deleted by the admin
        const locallySeeded = localStorage.getItem("seeded_reviews") === "true";
        if (locallySeeded) {
          console.log("Reviews already seeded but empty, skipping.");
          setReviews([]);
          return;
        }

        try {
          const statusSnap = await getDoc(doc(db, "site_configs", "seed_status"));
          if (statusSnap.exists() && statusSnap.data()?.reviews === true) {
            console.log("Reviews already seeded in DB but empty, skipping.");
            localStorage.setItem("seeded_reviews", "true");
            setReviews([]);
            return;
          }
        } catch (err) {
          console.warn("Could not retrieve seed status:", err);
        }

        console.log("Seeding reviews to Firestore db...");
        for (const rev of REVIEWS) {
          try {
            await setDoc(doc(db, "reviews", rev.id), rev);
          } catch (e) {
            console.error("Failed to seed review", rev.id, e);
          }
        }
        try {
          await setDoc(doc(db, "site_configs", "seed_status"), { reviews: true }, { merge: true });
        } catch (e) {
          console.error("Failed to write review seed status", e);
        }
        localStorage.setItem("seeded_reviews", "true");
      } else {
        const revList: Review[] = [];
        let hasOldReviews = false;
        querySnap.forEach((docSnap) => {
          if (!docSnap.id.startsWith("_")) {
            const data = docSnap.data() as Review;
            revList.push(data);
            if (data.capName !== "ON DGAS" && data.capName !== "800 DIAS") {
              hasOldReviews = true;
            }
          }
        });

        // Check if v2 migration has already been recorded
        let isAlreadyMigrated = localStorage.getItem("migrated_v2") === "true";
        if (!isAlreadyMigrated && hasOldReviews) {
          try {
            const statusSnap = await getDoc(doc(db, "site_configs", "seed_status"));
            if (statusSnap.exists() && statusSnap.data()?.migrated_v2 === true) {
              isAlreadyMigrated = true;
              localStorage.setItem("migrated_v2", "true");
            }
          } catch (err) {
            console.warn("Could not retrieve seed status for review migration:", err);
          }
        }

        if (hasOldReviews && !isAlreadyMigrated) {
          console.log("Old reviews detected. Migrating reviews to new cap models...");
          for (const docSnap of querySnap.docs) {
            try {
              await deleteDoc(doc(db, "reviews", docSnap.id));
            } catch (e) {
              console.error("Failed to delete review", docSnap.id, e);
            }
          }
          for (const rev of REVIEWS) {
            try {
              await setDoc(doc(db, "reviews", rev.id), rev);
            } catch (e) {
              console.error("Failed to write review", rev.id, e);
            }
          }
          try {
            await setDoc(doc(db, "site_configs", "seed_status"), { migrated_v2: true }, { merge: true });
            localStorage.setItem("migrated_v2", "true");
          } catch (e) {
            console.error("Failed to mark migration_v2 status", e);
          }
          return;
        }

        setReviews(revList);
        localStorage.setItem("seeded_reviews", "true");
      }
    }, (error) => {
      console.warn("Firestore reviews reading failed, falling back to local REVIEWS:", error);
      setReviews(REVIEWS);
    });

    return unsubscribe;
  }, []);

  // Sync / Listen to Authentic Codes (with seeding)
  useEffect(() => {
    const path = "authentic_codes";
    const colRef = collection(db, path);
    
    const unsubscribe = onSnapshot(colRef, async (querySnap) => {
      if (querySnap.empty) {
        // Double-guard: If already seeded locally, respect that they might have been deleted by the admin
        const locallySeeded = localStorage.getItem("seeded_authentic_codes") === "true";
        if (locallySeeded) {
          console.log("Authentic codes already seeded but empty, skipping.");
          setAuthenticCodes([]);
          return;
        }

        try {
          const statusSnap = await getDoc(doc(db, "site_configs", "seed_status"));
          if (statusSnap.exists() && statusSnap.data()?.authentic_codes === true) {
            console.log("Authentic codes already seeded in DB but empty, skipping.");
            localStorage.setItem("seeded_authentic_codes", "true");
            setAuthenticCodes([]);
            return;
          }
        } catch (err) {
          console.warn("Could not retrieve seed status:", err);
        }

        console.log("Seeding authentic codes to Firestore db...");
        for (const codeObj of AUTHENTIC_CODES) {
          try {
            // Replace any slash for security path compliance
            const safeId = codeObj.code.replace(/\//g, "-");
            await setDoc(doc(db, "authentic_codes", safeId), codeObj);
          } catch (e) {
            console.error("Failed to seed code", codeObj.code, e);
          }
        }
        try {
          await setDoc(doc(db, "site_configs", "seed_status"), { authentic_codes: true }, { merge: true });
        } catch (e) {
          console.error("Failed to write authentic codes seed status", e);
        }
        localStorage.setItem("seeded_authentic_codes", "true");
      } else {
        const list: AuthenticCode[] = [];
        let hasOldCodes = false;
        querySnap.forEach((docSnap) => {
          if (!docSnap.id.startsWith("_")) {
            const data = docSnap.data() as AuthenticCode;
            list.push(data);
            if (!data.item.includes("ON DGAS") && !data.item.includes("800 DIAS")) {
              hasOldCodes = true;
            }
          }
        });

        // Check if v2 migration has already been recorded
        let isAlreadyMigrated = localStorage.getItem("migrated_v2") === "true";
        if (!isAlreadyMigrated && hasOldCodes) {
          try {
            const statusSnap = await getDoc(doc(db, "site_configs", "seed_status"));
            if (statusSnap.exists() && statusSnap.data()?.migrated_v2 === true) {
              isAlreadyMigrated = true;
              localStorage.setItem("migrated_v2", "true");
            }
          } catch (err) {
            console.warn("Could not retrieve seed status for code migration:", err);
          }
        }

        if (hasOldCodes && !isAlreadyMigrated) {
          console.log("Old authentic codes detected. Migrating authentic codes to new cap models...");
          for (const docSnap of querySnap.docs) {
            try {
              await deleteDoc(doc(db, "authentic_codes", docSnap.id));
            } catch (e) {
              console.error("Failed to delete code", docSnap.id, e);
            }
          }
          for (const codeObj of AUTHENTIC_CODES) {
            try {
              const safeId = codeObj.code.replace(/\//g, "-");
              await setDoc(doc(db, "authentic_codes", safeId), codeObj);
            } catch (e) {
              console.error("Failed to write code", codeObj.code, e);
            }
          }
          try {
            await setDoc(doc(db, "site_configs", "seed_status"), { migrated_v2: true }, { merge: true });
            localStorage.setItem("migrated_v2", "true");
          } catch (e) {
            console.error("Failed to mark migration_v2 status", e);
          }
          return;
        }

        setAuthenticCodes(list);
        localStorage.setItem("seeded_authentic_codes", "true");
      }
    }, (error) => {
      console.warn("Firestore authentic codes reading failed, falling back to local AUTHENTIC_CODES:", error);
      setAuthenticCodes(AUTHENTIC_CODES);
    });

    return unsubscribe;
  }, []);

  // Sync Messages (Admins only)
  useEffect(() => {
    if (!isAdmin) {
      setContactMessages([]);
      return;
    }
    const path = "messages";
    const colRef = collection(db, path);
    const unsubscribe = onSnapshot(colRef, (querySnap) => {
      const msgs: ContactMessage[] = [];
      querySnap.forEach((docSnap) => {
        msgs.push(docSnap.data() as ContactMessage);
      });
      // Sort messages descending by date
      msgs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setContactMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return unsubscribe;
  }, [isAdmin]);

  // Sync Orders (Admins see all, signed-in users see theirs)
  useEffect(() => {
    if (!currentUser) {
      setOrders([]);
      return;
    }

    const path = "orders";
    const colRef = collection(db, path);
    const q = isAdmin 
      ? colRef 
      : query(colRef, where("userEmail", "==", (currentUser.email || "").toLowerCase()));

    const unsubscribe = onSnapshot(q, (querySnap) => {
      const orderList: Order[] = [];
      querySnap.forEach((docSnap) => {
        const ord = docSnap.data() as Order;
        orderList.push(ord);
      });
      // Sort descending
      orderList.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setOrders(orderList);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return unsubscribe;
  }, [currentUser, isAdmin]);

  // Auth Operations
  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      if (
        e?.code === "auth/popup-closed-by-user" ||
        e?.code === "auth/cancelled-popup-request" ||
        e?.code === "auth/popup-blocked" ||
        String(e?.message || "").includes("popup-closed-by-user")
      ) {
        console.info("Inicio de sesión con Google cancelado por el usuario.");
        return;
      }
      console.error("Google login failed:", e);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  // Realtime update operations
  const updateSiteConfig = async (newConfig: Partial<SiteConfig>) => {
    const path = "site_configs";
    setSiteConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      try {
        localStorage.setItem("shop_site_config", JSON.stringify(updated));
      } catch (err) {
        console.error("Error saving updated config to localStorage", err);
      }
      return updated;
    });

    try {
      const docRef = doc(db, path, "global");
      await setDoc(docRef, cleanDocData(newConfig), { merge: true });
    } catch (e) {
      console.warn("Config update in Firestore failed. Switched value locally.", e);
    }
  };

  const saveProduct = async (product: Product) => {
    const path = "products";
    try {
      await setDoc(doc(db, path, product.id), cleanDocData(product));
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `${path}/${product.id}`);
    }
  };

  const deleteProduct = async (productId: string) => {
    const path = "products";
    try {
      await deleteDoc(doc(db, path, productId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `${path}/${productId}`);
    }
  };

  const saveReview = async (review: Review) => {
    const path = "reviews";
    try {
      await setDoc(doc(db, path, review.id), cleanDocData(review));
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `${path}/${review.id}`);
    }
  };

  const deleteReview = async (reviewId: string) => {
    const path = "reviews";
    try {
      await deleteDoc(doc(db, path, reviewId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `${path}/${reviewId}`);
    }
  };

  const deductProductStock = async (items: { productId?: string; quantity?: number }[]) => {
    if (!Array.isArray(items) || items.length === 0) return;
    
    // Optimistic / local real-time update
    setProducts((prev) =>
      prev.map((p) => {
        const itemMatch = items.find((i) => i.productId === p.id);
        if (itemMatch) {
          const currentQty = typeof p.stockQuantity === "number" ? p.stockQuantity : 10;
          const deductQty = typeof itemMatch.quantity === "number" ? itemMatch.quantity : 1;
          const newQty = Math.max(0, currentQty - deductQty);
          return {
            ...p,
            stockQuantity: newQty,
            outOfStock: newQty === 0
          };
        }
        return p;
      })
    );

    for (const item of items) {
      if (!item.productId) continue;
      try {
        const prodRef = doc(db, "products", item.productId);
        const prodSnap = await getDoc(prodRef);
        if (prodSnap.exists()) {
          const currentData = prodSnap.data() as Product;
          const currentQty = typeof currentData.stockQuantity === "number" ? currentData.stockQuantity : 10;
          const deductQty = typeof item.quantity === "number" ? item.quantity : 1;
          const newQty = Math.max(0, currentQty - deductQty);
          await updateDoc(prodRef, {
            stockQuantity: newQty,
            outOfStock: newQty === 0
          });
        }
      } catch (err) {
        console.warn("Could not deduct stock for product", item.productId, err);
      }
    }
  };

  const saveOrder = async (orderData: Omit<Order, "id"> & { id?: string }): Promise<string> => {
    const path = "orders";
    try {
      const orderId = orderData.id || ("UM-" + Math.floor(100000 + Math.random() * 900000));
      const newOrder: Order = {
        ...orderData,
        userEmail: (orderData.userEmail || "").toLowerCase(),
        id: orderId
      };
      await setDoc(doc(db, path, orderId), cleanDocData(newOrder));

      // Realtime stock update upon order placement
      if (Array.isArray(newOrder.items) && newOrder.items.length > 0) {
        await deductProductStock(newOrder.items);
      }

      return orderId;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
      throw e;
    }
  };

  const updateOrder = async (orderId: string, updates: Partial<Order>) => {
    const path = "orders";
    try {
      await updateDoc(doc(db, path, orderId), cleanDocData(updates));
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `${path}/${orderId}`);
    }
  };

  const deleteOrder = async (orderId: string) => {
    const path = "orders";
    try {
      await deleteDoc(doc(db, path, orderId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `${path}/${orderId}`);
    }
  };

  const submitMessage = async (name: string, email: string, phone: string, message: string) => {
    const path = "messages";
    try {
      const messageId = "MSG-" + Date.now();
      const newMessage: ContactMessage = {
        id: messageId,
        name,
        email,
        phone,
        message,
        createdAt: new Date().toISOString(),
        read: false
      };
      await setDoc(doc(db, path, messageId), cleanDocData(newMessage));
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  };

  const markMessageRead = async (messageId: string, read: boolean) => {
    const path = "messages";
    try {
      await updateDoc(doc(db, path, messageId), { read });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `${path}/${messageId}`);
    }
  };

  const deleteMessage = async (messageId: string) => {
    const path = "messages";
    try {
      await deleteDoc(doc(db, path, messageId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `${path}/${messageId}`);
    }
  };

  const saveAuthenticCode = async (codeObj: AuthenticCode) => {
    const path = "authentic_codes";
    try {
      const safeId = codeObj.code.replace(/\//g, "-");
      await setDoc(doc(db, path, safeId), cleanDocData(codeObj));
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `${path}/${codeObj.code}`);
    }
  };

  const deleteAuthenticCode = async (code: string) => {
    const path = "authentic_codes";
    try {
      const safeId = code.replace(/\//g, "-");
      await deleteDoc(doc(db, path, safeId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `${path}/${code}`);
    }
  };

  return (
    <SiteContext.Provider
      value={{
        currentUser,
        isAdmin,
        loading,
        siteConfig,
        products,
        reviews,
        orders,
        contactMessages,
        authenticCodes,
        visualEditMode,
        setVisualEditMode,
        loginWithGoogle,
        logout,
        updateSiteConfig,
        saveProduct,
        deleteProduct,
        saveReview,
        deleteReview,
        saveOrder,
        updateOrder,
        deleteOrder,
        submitMessage,
        markMessageRead,
        deleteMessage,
        saveAuthenticCode,
        deleteAuthenticCode,
        deductProductStock
      }}
    >
      {children}
    </SiteContext.Provider>
  );
};

export const useSite = () => {
  const context = useContext(SiteContext);
  if (context === undefined) {
    throw new Error("useSite must be used within a SiteProvider");
  }
  return context;
};
