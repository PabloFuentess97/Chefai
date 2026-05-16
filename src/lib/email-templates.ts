// Email template registry. Each entry maps a templateKey -> { meta + fields }.
//
// Templates share the same email-safe HTML layout (rendered by lib/email-render.ts)
// but differ in:
//   - kind: "transactional" (verify, reset, welcome, trial-*, payment-*) which
//     bypass the admin UI and are sent inline by the app
//   - "broadcast" (newsletter, generic marketing) and "seasonal" (mother's day,
//     christmas, …) which the admin authors from /admin/emails
//   - accentColor, emoji header decoration, suggested subject/preheader/copy

export type EmailTemplateKind = "transactional" | "broadcast" | "seasonal";

export type EmailTemplateMeta = {
  key: string;
  name: string;
  emoji: string;
  kind: EmailTemplateKind;
  vibe: string;
  accentColor: string;
  decorationGlyph: string; // emoji repeated in the colored banner
  defaults: {
    subject: string;
    preheader: string;
    heroBadge: string;
    heroTitle: string;
    heroBody: string;
    ctaLabel: string;
    ctaUrl: string;
  };
};

export const EMAIL_TEMPLATES: readonly EmailTemplateMeta[] = [
  // ---------------- TRANSACTIONAL ----------------
  {
    key: "welcome",
    name: "Bienvenida",
    emoji: "🎁",
    kind: "transactional",
    vibe: "Email automático tras registro — consejos para empezar",
    accentColor: "#16a34a",
    decorationGlyph: "✨",
    defaults: {
      subject: "Bienvenido a ChefAI",
      preheader: "Empieza con tu primera receta personalizada",
      heroBadge: "Tu cuenta está lista",
      heroTitle: "Cocina con lo que tienes en la nevera",
      heroBody:
        "Hola {name}, gracias por unirte a ChefAI. Aquí tienes 3 consejos rápidos para sacarle el máximo partido:\n\n1. Saca foto a tu nevera y deja que la IA detecte ingredientes automáticamente.\n2. Configura tu perfil dietético (vegano, keto, sin gluten…) para que cada receta lo respete.\n3. Planifica tu semana con el menú semanal y obtén la lista de la compra de un clic.",
      ctaLabel: "Generar mi primera receta",
      ctaUrl: "/generate",
    },
  },
  {
    key: "verify-email",
    name: "Verificar email",
    emoji: "✉️",
    kind: "transactional",
    vibe: "Activación de cuenta",
    accentColor: "#16a34a",
    decorationGlyph: "✓",
    defaults: {
      subject: "Verifica tu email en ChefAI",
      preheader: "Un clic y tu cuenta queda activada",
      heroBadge: "Confirma tu cuenta",
      heroTitle: "Verifica tu email",
      heroBody:
        "Hola {name}, confirma tu email haciendo clic en el botón de abajo. El enlace caduca en 24 horas. Si no creaste esta cuenta, puedes ignorar este mensaje.",
      ctaLabel: "Verificar email",
      ctaUrl: "{link}",
    },
  },
  {
    key: "reset-password",
    name: "Restablecer contraseña",
    emoji: "🔐",
    kind: "transactional",
    vibe: "Recuperación de contraseña",
    accentColor: "#0891b2",
    decorationGlyph: "🔒",
    defaults: {
      subject: "Restablece tu contraseña en ChefAI",
      preheader: "El enlace caduca en una hora",
      heroBadge: "Solicitud de cambio",
      heroTitle: "Restablecer contraseña",
      heroBody:
        "Recibimos una solicitud para restablecer tu contraseña. El enlace caduca en 1 hora. Si no la pediste, ignora este mensaje.",
      ctaLabel: "Cambiar contraseña",
      ctaUrl: "{link}",
    },
  },
  {
    key: "trial-reminder",
    name: "Recordatorio trial",
    emoji: "⏰",
    kind: "transactional",
    vibe: "1 día antes de que expire el trial",
    accentColor: "#f59e0b",
    decorationGlyph: "⏱",
    defaults: {
      subject: "Tu trial de ChefAI termina mañana",
      preheader: "Si quieres seguir usando ChefAI, no tienes que hacer nada",
      heroBadge: "Tu trial expira mañana",
      heroTitle: "¿Seguimos cocinando juntos?",
      heroBody:
        "Hola {name}, tu trial gratuito de ChefAI termina en 24 horas. Si quieres seguir, no tienes que hacer nada: mañana cobraremos automáticamente tu plan {planName} ({planPrice} €/mes). Si prefieres cancelar, puedes hacerlo ahora desde tu cuenta y no se cobra nada.",
      ctaLabel: "Gestionar mi suscripción",
      ctaUrl: "/billing",
    },
  },
  {
    key: "trial-converted",
    name: "Suscripción activada",
    emoji: "✅",
    kind: "transactional",
    vibe: "Tras cobrar el primer pago del trial",
    accentColor: "#16a34a",
    decorationGlyph: "★",
    defaults: {
      subject: "Tu suscripción a ChefAI está activa",
      preheader: "Gracias por seguir cocinando con nosotros",
      heroBadge: "Pago confirmado",
      heroTitle: "Bienvenido al plan {planName}",
      heroBody:
        "Hola {name}, tu suscripción a ChefAI {planName} está activa. Tu próximo cobro será el {nextChargeDate}. Tienes acceso completo a todas las funciones premium.",
      ctaLabel: "Ir al dashboard",
      ctaUrl: "/dashboard",
    },
  },
  {
    key: "payment-failed",
    name: "Pago fallido",
    emoji: "⚠️",
    kind: "transactional",
    vibe: "Cuando el auto-charge falla",
    accentColor: "#dc2626",
    decorationGlyph: "!",
    defaults: {
      subject: "No hemos podido cobrar tu suscripción",
      preheader: "Actualiza tu tarjeta para seguir usando ChefAI",
      heroBadge: "Acción requerida",
      heroTitle: "Tu pago no se ha completado",
      heroBody:
        "Hola {name}, hemos intentado cobrar tu suscripción a ChefAI pero ha fallado. Esto puede deberse a una tarjeta caducada, fondos insuficientes o un bloqueo del banco. Actualiza tu método de pago para seguir disfrutando de todas las funciones.",
      ctaLabel: "Actualizar tarjeta",
      ctaUrl: "/billing",
    },
  },
  {
    key: "weekly-digest",
    name: "Resumen semanal",
    emoji: "📊",
    kind: "transactional",
    vibe: "Cron semanal — stats de cocina",
    accentColor: "#16a34a",
    decorationGlyph: "🍽",
    defaults: {
      subject: "Tu semana en ChefAI",
      preheader: "Cocinaste {count} platos esta semana",
      heroBadge: "Resumen semanal",
      heroTitle: "Esta semana en tu cocina",
      heroBody:
        "Hola {name}, aquí tienes lo que cocinaste esta semana en ChefAI:\n\n• {count} recetas generadas\n• {favoritesCount} favoritas nuevas\n\nLa próxima semana te toca planificar — ahorra tiempo creando un menú semanal completo.",
      ctaLabel: "Crear mi menú semanal",
      ctaUrl: "/planner/new",
    },
  },

  // ---------------- BROADCAST ----------------
  {
    key: "newsletter",
    name: "Newsletter",
    emoji: "📰",
    kind: "broadcast",
    vibe: "Newsletter periódica con color de marca",
    accentColor: "#16a34a",
    decorationGlyph: "✦",
    defaults: {
      subject: "Lo nuevo en ChefAI",
      preheader: "Recetas, trucos de cocina y novedades",
      heroBadge: "Newsletter",
      heroTitle: "Lo nuevo en ChefAI",
      heroBody:
        "Hola {name}, te contamos las novedades de esta semana en ChefAI…\n\n[Escribe aquí el contenido del newsletter — varios párrafos separados por línea en blanco]",
      ctaLabel: "Leer en la app",
      ctaUrl: "/dashboard",
    },
  },
  {
    key: "marketing-generic",
    name: "Marketing genérico",
    emoji: "🎯",
    kind: "broadcast",
    vibe: "Plantilla en blanco · escribe lo que quieras",
    accentColor: "#16a34a",
    decorationGlyph: "•",
    defaults: {
      subject: "[Asunto]",
      preheader: "[Preview corto del email]",
      heroBadge: "",
      heroTitle: "[Título principal]",
      heroBody:
        "[Cuerpo del email. Puedes escribir varios párrafos separados por una línea en blanco. Usa {name} para personalizar con el nombre del destinatario.]",
      ctaLabel: "Ver más",
      ctaUrl: "/",
    },
  },

  // ---------------- SEASONAL ----------------
  {
    key: "mothers-day",
    name: "Día de la Madre",
    emoji: "💐",
    kind: "seasonal",
    vibe: "Tonos rosa · regalo para mamá",
    accentColor: "#db2777",
    decorationGlyph: "💐",
    defaults: {
      subject: "Un regalo que cocina con ella",
      preheader: "14 días gratis de ChefAI para mamá",
      heroBadge: "Día de la Madre",
      heroTitle: "Un regalo que cocina con ella",
      heroBody:
        "Este Día de la Madre regala tiempo. ChefAI le sugiere a mamá qué cocinar cada noche según lo que tenga en la nevera, su dieta y sus gustos. 14 días gratis, sin compromiso.",
      ctaLabel: "Regalar 14 días gratis",
      ctaUrl: "/r/dia-de-la-madre",
    },
  },
  {
    key: "black-friday",
    name: "Black Friday",
    emoji: "⚡",
    kind: "seasonal",
    vibe: "Urgente · descuento agresivo",
    accentColor: "#dc2626",
    decorationGlyph: "⚡",
    defaults: {
      subject: "⚡ Black Friday en ChefAI · 50% el primer mes",
      preheader: "30 días gratis y después la mitad de precio",
      heroBadge: "Solo 48 horas",
      heroTitle: "Black Friday en ChefAI",
      heroBody:
        "30 días gratis. Después, 50% en tu primer mes de Pro. Recetas IA, planificador semanal, lista de la compra y modo cocina por voz incluidos. Solo durante este fin de semana.",
      ctaLabel: "Aprovechar la oferta",
      ctaUrl: "/r/black-friday",
    },
  },
  {
    key: "christmas",
    name: "Navidad",
    emoji: "🎄",
    kind: "seasonal",
    vibe: "Verde + rojo · banquetes de fiestas",
    accentColor: "#dc2626",
    decorationGlyph: "🎄",
    defaults: {
      subject: "🎄 Cocina las fiestas sin estrés",
      preheader: "Menús de Nochebuena, Navidad y Año Nuevo en un clic",
      heroBadge: "Hasta el 6 de enero",
      heroTitle: "Cocina las fiestas sin estrés",
      heroBody:
        "Nochebuena, Navidad, Fin de Año y Reyes. ChefAI te monta los menús completos con la lista de la compra. Dile cuántos sois, qué ingredientes hay y qué presupuesto, y se ocupa del resto.",
      ctaLabel: "Empezar mis fiestas",
      ctaUrl: "/r/navidad",
    },
  },
  {
    key: "new-year",
    name: "Año Nuevo",
    emoji: "✨",
    kind: "seasonal",
    vibe: "Violeta · propósitos saludables",
    accentColor: "#7c3aed",
    decorationGlyph: "✨",
    defaults: {
      subject: "✨ Empieza enero con un plan",
      preheader: "Comida saludable adaptada a tu objetivo",
      heroBadge: "Año Nuevo",
      heroTitle: "Tu propósito de comer mejor, resuelto",
      heroBody:
        "Empieza el año con menús semanales adaptados a tu objetivo: déficit, definición, ganar músculo. Calorías y macros calculados, lista de la compra automática, 14 días gratis para arrancar.",
      ctaLabel: "Empezar enero bien",
      ctaUrl: "/r/ano-nuevo",
    },
  },
  {
    key: "summer",
    name: "Verano",
    emoji: "🌞",
    kind: "seasonal",
    vibe: "Naranja · recetas frescas y rápidas",
    accentColor: "#f59e0b",
    decorationGlyph: "🌞",
    defaults: {
      subject: "🌞 Cocina menos. Disfruta más.",
      preheader: "Recetas frescas en menos de 20 minutos",
      heroBadge: "Verano",
      heroTitle: "Cocina menos. Disfruta más.",
      heroBody:
        "Ensaladas con proteína, gazpachos, bowls, marinados rápidos. ChefAI te sugiere recetas frescas en menos de 20 minutos sin encender el horno. 14 días gratis para probar.",
      ctaLabel: "Empezar mi verano fácil",
      ctaUrl: "/r/verano",
    },
  },
  {
    key: "back-to-school",
    name: "Vuelta al cole",
    emoji: "📚",
    kind: "seasonal",
    vibe: "Cyan · comidas familiares rápidas",
    accentColor: "#0891b2",
    decorationGlyph: "📚",
    defaults: {
      subject: "📚 Resuelve los menús de septiembre",
      preheader: "Comidas rápidas, meriendas y cenas en piloto automático",
      heroBadge: "Vuelta al cole",
      heroTitle: "Resuelve los menús de la semana",
      heroBody:
        "Comidas rápidas que se preparan en 25 minutos, meriendas para los niños, cenas ligeras. ChefAI te planifica la semana entera y ahorra ir al super cada dos días. 21 días gratis.",
      ctaLabel: "Resolver mi semana",
      ctaUrl: "/r/vuelta-al-cole",
    },
  },
  {
    key: "valentines",
    name: "San Valentín",
    emoji: "🌹",
    kind: "seasonal",
    vibe: "Rojo cereza · cena romántica casera",
    accentColor: "#e11d48",
    decorationGlyph: "🌹",
    defaults: {
      subject: "🌹 Sorpréndele con una cena hecha en casa",
      preheader: "Cena romántica de 3 platos en una hora",
      heroBadge: "San Valentín",
      heroTitle: "Una cena para dos, hecha por ti",
      heroBody:
        "Entrante, principal y postre con lo que tengas en la nevera. ChefAI te dicta los pasos por voz mientras tú te concentras en la presentación. 14 días gratis para probar.",
      ctaLabel: "Empezar a cocinar",
      ctaUrl: "/r/san-valentin",
    },
  },
  {
    key: "fitness",
    name: "Reto fitness",
    emoji: "💪",
    kind: "seasonal",
    vibe: "Verde teal · macros y objetivos",
    accentColor: "#0d9488",
    decorationGlyph: "💪",
    defaults: {
      subject: "💪 Come para tu objetivo. Sin contar nada.",
      preheader: "30 días gratis de menús con macros calculados",
      heroBadge: "Reto fitness",
      heroTitle: "Come para tu objetivo, sin contar nada",
      heroBody:
        "Dile a ChefAI 'definición' o 'volumen' y te genera recetas con las calorías y proteína que necesitas, con la lista de la compra incluida. 30 días gratis para probar.",
      ctaLabel: "Empezar mi reto",
      ctaUrl: "/r/reto-fitness",
    },
  },
] as const;

export function getEmailTemplate(key: string): EmailTemplateMeta | null {
  return EMAIL_TEMPLATES.find((t) => t.key === key) ?? null;
}

export function getBroadcastTemplates(): readonly EmailTemplateMeta[] {
  return EMAIL_TEMPLATES.filter(
    (t) => t.kind === "broadcast" || t.kind === "seasonal"
  );
}
