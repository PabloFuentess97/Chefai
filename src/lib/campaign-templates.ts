// Campaign landing-page templates.
//
// Each template provides a coherent visual identity (gradient, accent color,
// decorative motif) plus suggested copy and trial defaults. The admin picks
// one from the form; the picker pre-fills every field so they can tweak
// freely afterwards.
//
// All templates share the same component layout (header, hero, signup card,
// bullets, footer) so they're recognizable as "ChefAI". What changes per
// template: accent color, hero gradient, decorative motif and copy patterns.

export type TemplateDecoration =
  | "none"
  | "snowflakes"
  | "hearts"
  | "lightning"
  | "stars"
  | "sun"
  | "leaves"
  | "confetti"
  | "sparkles";

export type CampaignTemplate = {
  key: string;
  name: string;
  emoji: string;
  // Visual
  accentColor: string;
  gradientFrom: string;
  gradientTo: string;
  decoration: TemplateDecoration;
  vibe: string; // short description shown in the picker
  // Suggested defaults the form prefills (everything is editable)
  defaults: {
    name: string;
    slug: string;
    heroBadge: string;
    heroTitle: string;
    heroSubtitle: string;
    bulletList: string; // pipe-separated
    ctaLabel: string;
    trialDays: number;
    trialRecipesPerDay: number;
  };
};

export const CAMPAIGN_TEMPLATES: readonly CampaignTemplate[] = [
  {
    key: "trial-7days",
    name: "7 días gratis",
    emoji: "🎁",
    accentColor: "#16a34a",
    gradientFrom: "#16a34a",
    gradientTo: "#0f7a37",
    decoration: "sparkles",
    vibe: "Plantilla limpia con el color de marca · trial corto",
    defaults: {
      name: "Trial 7 días gratis",
      slug: "7dias-gratis",
      heroBadge: "7 días gratis",
      heroTitle: "Cocina con lo que tienes en la nevera",
      heroSubtitle:
        "Prueba ChefAI 7 días sin pagar nada. Recetas personalizadas con IA, foto de la nevera, lista de la compra automática y planificador semanal.",
      bulletList:
        "Recetas IA en 10 segundos|Foto de la nevera con visión IA|Cocina por voz mientras preparas|Cancela cuando quieras",
      ctaLabel: "Empezar mi semana gratis",
      trialDays: 7,
      trialRecipesPerDay: 5,
    },
  },
  {
    key: "mothers-day",
    name: "Día de la Madre",
    emoji: "💐",
    accentColor: "#db2777", // pink-600
    gradientFrom: "#fb7185", // rose-400
    gradientTo: "#be185d", // pink-700
    decoration: "hearts",
    vibe: "Tonos cálidos rosa · pensado para mamá",
    defaults: {
      name: "Día de la Madre",
      slug: "dia-de-la-madre",
      heroBadge: "Solo este mes · 14 días gratis",
      heroTitle: "Un regalo que cocina con ella",
      heroSubtitle:
        "Regala a mamá dos semanas de cenas resueltas: ChefAI le sugiere qué cocinar cada noche según lo que tenga en la nevera, su dieta y sus gustos.",
      bulletList:
        "14 días gratis para mamá|Sin tener que pensar el menú|Adaptado a sus gustos y restricciones|Cancela antes y no se cobra",
      ctaLabel: "Regalar 14 días a mamá",
      trialDays: 14,
      trialRecipesPerDay: 6,
    },
  },
  {
    key: "black-friday",
    name: "Black Friday",
    emoji: "⚡",
    accentColor: "#dc2626", // red-600
    gradientFrom: "#0a0a0a",
    gradientTo: "#7f1d1d", // red-900
    decoration: "lightning",
    vibe: "Urgente, oscuro · descuento agresivo",
    defaults: {
      name: "Black Friday",
      slug: "black-friday",
      heroBadge: "48 horas · 50% el primer mes",
      heroTitle: "Black Friday en ChefAI",
      heroSubtitle:
        "30 días gratis y después 50% en tu primer mes de Pro. Recetas IA, planificador semanal, lista de la compra y modo cocina por voz incluidos.",
      bulletList:
        "30 días gratis · sin compromiso|50% en tu primer mes después del trial|Plan Pro completo desde el día uno|Cancela cuando quieras",
      ctaLabel: "Aprovechar la oferta",
      trialDays: 30,
      trialRecipesPerDay: 8,
    },
  },
  {
    key: "christmas",
    name: "Navidad",
    emoji: "🎄",
    accentColor: "#dc2626", // red
    gradientFrom: "#065f46", // emerald-800
    gradientTo: "#7f1d1d", // red-900
    decoration: "snowflakes",
    vibe: "Verde + rojo navideño · cocina festiva",
    defaults: {
      name: "Navidad",
      slug: "navidad",
      heroBadge: "Hasta el 6 de enero · 21 días gratis",
      heroTitle: "Cocina las fiestas sin estrés",
      heroSubtitle:
        "ChefAI te ayuda con los menús de Nochebuena, Navidad, Fin de Año y Reyes. Le dices cuántos sois, qué ingredientes hay y qué presupuesto, y te monta todo el banquete.",
      bulletList:
        "Menús de Nochebuena y Año Nuevo|Lista de la compra para todo el puente|Cocina por voz mientras cocinas en familia|Recetas para cualquier dieta (vegana, sin gluten…)",
      ctaLabel: "Empezar mis fiestas",
      trialDays: 21,
      trialRecipesPerDay: 10,
    },
  },
  {
    key: "new-year",
    name: "Año Nuevo",
    emoji: "✨",
    accentColor: "#7c3aed", // violet-600
    gradientFrom: "#4c1d95", // violet-900
    gradientTo: "#1e1b4b", // indigo-950
    decoration: "stars",
    vibe: "Violeta + dorado · propósitos de año nuevo",
    defaults: {
      name: "Año Nuevo · Empieza ligero",
      slug: "ano-nuevo",
      heroBadge: "Empieza enero con un plan",
      heroTitle: "Tu propósito de cocinar mejor, resuelto",
      heroSubtitle:
        "ChefAI te planifica menús saludables adaptados a tu objetivo (déficit, definición, ganar músculo) durante todo enero. Sin pensar qué cenar, sin acabar pidiendo a domicilio.",
      bulletList:
        "14 días gratis para arrancar el año|Menús semanales adaptados a tu objetivo|Calorías y macros calculados|Lista de la compra automática",
      ctaLabel: "Empezar enero bien",
      trialDays: 14,
      trialRecipesPerDay: 6,
    },
  },
  {
    key: "summer",
    name: "Verano",
    emoji: "🌞",
    accentColor: "#f59e0b", // amber-500
    gradientFrom: "#fb923c", // orange-400
    gradientTo: "#dc2626", // red-600
    decoration: "sun",
    vibe: "Naranja cálido · recetas frescas y rápidas",
    defaults: {
      name: "Verano · Rápido y fresco",
      slug: "verano",
      heroBadge: "Recetas en menos de 20 min",
      heroTitle: "Cocina menos. Disfruta más.",
      heroSubtitle:
        "ChefAI te sugiere recetas frescas, rápidas y sin pasar dos horas en la cocina. Ensaladas con proteína, gazpachos, bowls, marinados rápidos. Todo en menos de 20 minutos.",
      bulletList:
        "Recetas frescas en menos de 20 min|Sin encender el horno|Ajustadas a la fruta y verdura de temporada|14 días gratis",
      ctaLabel: "Empezar mi verano fácil",
      trialDays: 14,
      trialRecipesPerDay: 6,
    },
  },
  {
    key: "back-to-school",
    name: "Vuelta al cole",
    emoji: "📚",
    accentColor: "#0891b2", // cyan-600
    gradientFrom: "#0e7490", // cyan-700
    gradientTo: "#1e3a8a", // blue-900
    decoration: "leaves",
    vibe: "Azul fresco · comidas rápidas de septiembre",
    defaults: {
      name: "Vuelta al cole",
      slug: "vuelta-al-cole",
      heroBadge: "Septiembre · 21 días gratis",
      heroTitle: "Resuelve los menús de la semana",
      heroSubtitle:
        "Comidas rápidas que se preparan en 25 minutos, meriendas para los niños, cenas ligeras y un planificador semanal que ahorra ir al super cada dos días.",
      bulletList:
        "Menús semanales completos|Recetas family-friendly|Lista de la compra para toda la semana|Cancela cuando quieras",
      ctaLabel: "Resolver mi semana",
      trialDays: 21,
      trialRecipesPerDay: 8,
    },
  },
  {
    key: "valentines",
    name: "San Valentín",
    emoji: "🌹",
    accentColor: "#e11d48", // rose-600
    gradientFrom: "#9f1239", // rose-800
    gradientTo: "#450a0a", // red-950
    decoration: "hearts",
    vibe: "Rojo cereza · cena romántica casera",
    defaults: {
      name: "San Valentín",
      slug: "san-valentin",
      heroBadge: "Cena de San Valentín · 14 días gratis",
      heroTitle: "Sorpréndele con una cena hecha en casa",
      heroSubtitle:
        "ChefAI te genera una cena romántica para dos con lo que tengas en la nevera. Entrante, principal y postre. Te dicta los pasos por voz mientras tú te concentras en la presentación.",
      bulletList:
        "Cenas de 3 platos en una hora|Modo cocina por voz · manos libres|Adaptado a vuestras restricciones|14 días gratis para probar",
      ctaLabel: "Empezar a cocinar",
      trialDays: 14,
      trialRecipesPerDay: 5,
    },
  },
  {
    key: "fitness",
    name: "Reto fitness",
    emoji: "💪",
    accentColor: "#0d9488", // teal-600
    gradientFrom: "#134e4a", // teal-900
    gradientTo: "#064e3b", // emerald-900
    decoration: "lightning",
    vibe: "Verde teal · objetivos de gimnasio",
    defaults: {
      name: "Reto fitness · 30 días",
      slug: "reto-fitness",
      heroBadge: "30 días · plan completo gratis",
      heroTitle: "Come para tu objetivo. Sin contar nada.",
      heroSubtitle:
        "Tú dices «definición» o «volumen» y ChefAI te genera recetas con las calorías y proteína que necesitas, con la lista de la compra incluida. 30 días gratis para probar.",
      bulletList:
        "Macros calculados por ración|Mínimo de proteína por receta|Planificador semanal completo|Lista de la compra automática",
      ctaLabel: "Empezar mi reto",
      trialDays: 30,
      trialRecipesPerDay: 10,
    },
  },
] as const;

export function getCampaignTemplate(key?: string | null): CampaignTemplate | null {
  if (!key) return null;
  return CAMPAIGN_TEMPLATES.find((t) => t.key === key) ?? null;
}
