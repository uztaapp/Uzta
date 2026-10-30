import { marketLabels } from "./market-labels";
import { producerActivityLabels } from "./producer-activity-labels";
import { releaseLabels } from "./release-labels";
import { googleLabels } from "./google-labels";
import { reviewLabels } from "./review-labels";
import { euskoLabels } from "./eusko-labels";
import { commissionLabels } from "./commission-labels";
import { availabilityLabels } from "./availability-labels";
import { favoriteLabels } from "./favorite-labels";
import { useSyncExternalStore } from "react";
import { notificationLabels } from "./notification-labels";
import { sellerLabels } from "./seller-labels";
import { bookingLabels } from "./booking-labels";
import { extraLabels } from "./language-extra";
export const languages = [
  { code: "es", name: "Español" },
  { code: "eu", name: "Euskara" },
  { code: "fr", name: "Français" },
  { code: "en", name: "English" },
] as const;
export type Language = (typeof languages)[number]["code"];
export type LanguagePreference = Language | "auto";
export const LANGUAGE_KEY = "uzta.language.v1";
let preference: LanguagePreference = "es";
const listeners = new Set<() => void>();
const valid = (value: string | null): value is LanguagePreference =>
  value === "auto" || languages.some((l) => l.code === value);
export function detectLanguage(tags: readonly string[]): Language {
  for (const tag of tags) {
    const code = tag.trim().replaceAll("_", "-").toLowerCase().split("-")[0];
    if (languages.some((l) => l.code === code)) return code as Language;
  }
  return "es";
}
export function currentLanguage(): Language {
  return preference === "auto"
    ? detectLanguage(
        navigator.languages?.length
          ? navigator.languages
          : [navigator.language],
      )
    : preference;
}
export const languagePreference = () => preference;
function emit() {
  document.documentElement.lang = currentLanguage();
  listeners.forEach((l) => l());
}
export function setLanguage(value: LanguagePreference) {
  if (!valid(value)) return;
  preference = value;
  try {
    localStorage.setItem(LANGUAGE_KEY, value);
  } catch {}
  emit();
}
export function initializeLanguage() {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    preference = valid(saved) ? saved : "auto";
  } catch {
    preference = "auto";
  }
  emit();
  const change = () => emit();
  const sync = (e: StorageEvent) => {
    if (e.key === LANGUAGE_KEY) {
      preference = valid(e.newValue) ? e.newValue : "auto";
      emit();
    }
  };
  window.addEventListener("languagechange", change);
  window.addEventListener("storage", sync);
  return () => {
    window.removeEventListener("languagechange", change);
    window.removeEventListener("storage", sync);
  };
}
export function useLanguage() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    currentLanguage,
    () => "es" as Language,
  );
}
export function useLanguagePreference() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    languagePreference,
    () => "es" as LanguagePreference,
  );
}
// Display labels only. Never translate database identifiers or user-authored text.
const dictionary: Record<string, readonly [string, string, string]> = {
  ...marketLabels,
  ...extraLabels,
  ...sellerLabels,
  ...notificationLabels,
  ...releaseLabels,
  ...producerActivityLabels,
  ...googleLabels,
  ...reviewLabels,
  ...euskoLabels,
  ...commissionLabels,
  ...availabilityLabels,
  ...favoriteLabels,
  ...bookingLabels,
  Inicio: ["Accueil", "Home", "Hasiera"],
  Productor: ["Producteur", "Producer", "Ekoizlea"],
  Cesta: ["Panier", "Basket", "Saskia"],
  Pedidos: ["Commandes", "Orders", "Eskaerak"],
  Perfil: ["Profil", "Profile", "Profila"],
  "Mi perfil": ["Mon profil", "My profile", "Nire profila"],
  "Mi tienda": ["Ma boutique", "My shop", "Nire denda"],
  Productos: ["Produits", "Products", "Produktuak"],
  Información: ["Informations", "Information", "Informazioa"],
  Horarios: ["Horaires", "Times", "Ordutegiak"],
  Opiniones: ["Avis", "Reviews", "Iritziak"],
  Verduras: ["Légumes", "Vegetables", "Barazkiak"],
  Frutas: ["Fruits", "Fruit", "Frutak"],
  Huevos: ["Œufs", "Eggs", "Arrautzak"],
  Lácteos: ["Produits laitiers", "Dairy", "Esnekiak"],
  Miel: ["Miel", "Honey", "Eztia"],
  Otros: ["Autres", "Other", "Besteak"],
  "Productos cerca de ti": [
    "Produits près de chez vous",
    "Products near you",
    "Zure inguruko produktuak",
  ],
  "Ver todos": ["Tout voir", "View all", "Ikusi guztiak"],
  "Mis favoritos": ["Mes favoris", "My favourites", "Nire gogokoak"],
  "Directamente del productor": [
    "Directement du producteur",
    "Direct from the producer",
    "Ekoizlearengandik zuzenean",
  ],
  "Productos disponibles": [
    "Produits disponibles",
    "Available products",
    "Eskuragarri dauden produktuak",
  ],
  "Ver cesta": ["Voir le panier", "View basket", "Ikusi saskia"],
  "Cesta de compra": ["Panier", "Shopping basket", "Erosketa saskia"],
  "La cesta está vacía": [
    "Le panier est vide",
    "Your basket is empty",
    "Saskia hutsik dago",
  ],
  "Ver productos": ["Voir les produits", "View products", "Ikusi produktuak"],
  "Total de productos": [
    "Total des produits",
    "Product total",
    "Produktuen guztizkoa",
  ],
  "Confirmar reserva": [
    "Confirmer la réservation",
    "Confirm reservation",
    "Berretsi erreserba",
  ],
  "Fecha y hora de recogida": [
    "Date et heure de retrait",
    "Collection date and time",
    "Bilketa eguna eta ordua",
  ],
  "Selecciona una franja": [
    "Choisissez un créneau",
    "Choose a time slot",
    "Aukeratu ordu tartea",
  ],
  "Volver a la cesta": ["Retour au panier", "Back to basket", "Itzuli saskira"],
  "Mis pedidos": ["Mes commandes", "My orders", "Nire eskaerak"],
  Compras: ["Achats", "Purchases", "Erosketak"],
  "Como productor": ["Comme producteur", "As producer", "Ekoizle gisa"],
  Pendiente: ["En attente", "Pending", "Zain"],
  Completado: ["Terminé", "Completed", "Osatua"],
  "Actualizar pedidos": [
    "Actualiser les commandes",
    "Refresh orders",
    "Eguneratu eskaerak",
  ],
  "No hay pedidos todavía": [
    "Aucune commande pour le moment",
    "No orders yet",
    "Oraindik ez dago eskaerarik",
  ],
  "Para productores": [
    "Pour les producteurs",
    "For producers",
    "Ekoizleentzat",
  ],
  "Editar perfil": ["Modifier le profil", "Edit profile", "Editatu profila"],
  Idioma: ["Langue", "Language", "Hizkuntza"],
  "Ayuda y soporte": ["Aide et assistance", "Help and support", "Laguntza"],
  "Condiciones de uso": [
    "Conditions d’utilisation",
    "Terms of use",
    "Erabilera baldintzak",
  ],
  "Cerrar sesión": ["Se déconnecter", "Sign out", "Itxi saioa"],
  "Pedidos recibidos": [
    "Commandes reçues",
    "Received orders",
    "Jasotako eskaerak",
  ],
  "Horarios y entregas": [
    "Horaires et retraits",
    "Times and collections",
    "Ordutegiak eta bilketak",
  ],
  Estadísticas: ["Statistiques", "Statistics", "Estatistikak"],
  Nombre: ["Nom", "Name", "Izena"],
  "Correo electrónico": [
    "Adresse e-mail",
    "Email address",
    "Helbide elektronikoa",
  ],
  Contraseña: ["Mot de passe", "Password", "Pasahitza"],
  Ubicación: ["Localité", "Location", "Kokapena"],
  Descripción: ["Description", "Description", "Deskribapena"],
  "Guardar perfil": ["Enregistrer le profil", "Save profile", "Gorde profila"],
  "Guardar producto": [
    "Enregistrer le produit",
    "Save product",
    "Gorde produktua",
  ],
  "Guardar tienda": ["Enregistrer la boutique", "Save shop", "Gorde denda"],
  "Añadir producto": ["Ajouter un produit", "Add product", "Gehitu produktua"],
  "Nombre de la tienda": ["Nom de la boutique", "Shop name", "Dendaren izena"],
  Existencias: ["Stock", "Stock", "Izakinak"],
  Categoría: ["Catégorie", "Category", "Kategoria"],
  Unidad: ["Unité", "Unit", "Unitatea"],
  "Precio (€)": ["Prix (€)", "Price (€)", "Prezioa (€)"],
  Publicado: ["Publié", "Published", "Argitaratua"],
  "Mostrar en inicio": [
    "Afficher à l’accueil",
    "Show on home",
    "Erakutsi hasieran",
  ],
  Fecha: ["Date", "Date", "Data"],
  Desde: ["De", "From", "Hasiera"],
  Hasta: ["À", "Until", "Amaiera"],
  "Añadir franja": [
    "Ajouter un créneau",
    "Add time slot",
    "Gehitu ordu tartea",
  ],
  Editar: ["Modifier", "Edit", "Editatu"],
  "Producción ecológica": [
    "Production biologique",
    "Organic production",
    "Ekoizpen ekologikoa",
  ],
};
export function t(text: string): string {
  const lang = currentLanguage();
  if (lang === "es") return text;
  const row = dictionary[text];
  return row?.[lang === "fr" ? 0 : lang === "en" ? 1 : 2] ?? text;
}
export const translatedLabels = () => Object.keys(dictionary);
