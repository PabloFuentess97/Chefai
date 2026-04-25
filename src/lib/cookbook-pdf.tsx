import "server-only";
import { renderToStream } from "@react-pdf/renderer";
import {
  Document,
  Page,
  View,
  Text,
  Image as PdfImage,
  StyleSheet,
} from "@react-pdf/renderer";
import { promises as fs } from "node:fs";
import type {
  Recipe,
  RecipeIngredient,
  RecipeStep,
} from "@prisma/client";

type FullRecipe = Recipe & {
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
};

export type CookbookInput = {
  brandName: string;
  brandColor: string;
  authorName: string;
  recipes: FullRecipe[];
};

// ------------------------------------------------------------------
// Color helpers
// ------------------------------------------------------------------

function withAlpha(hex: string, alpha: number): string {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m) return hex;
  const [r, g, b] = m.map((h) => parseInt(h, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

async function imageDataUri(absolutePath: string | null): Promise<string | undefined> {
  if (!absolutePath) return undefined;
  try {
    const buf = await fs.readFile(absolutePath);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

// ------------------------------------------------------------------
// Styles
// ------------------------------------------------------------------

const styles = StyleSheet.create({
  // Pages
  page: {
    backgroundColor: "#fafaf9",
    fontFamily: "Helvetica",
    color: "#1c1917",
  },

  // ----- Cover -----
  coverWrap: { width: "100%", height: "100%", position: "relative" },
  coverImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  coverFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#16a34a",
  },
  coverOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  coverContent: {
    position: "absolute",
    left: 48,
    right: 48,
    bottom: 64,
    color: "#ffffff",
  },
  coverEyebrow: {
    fontSize: 11,
    letterSpacing: 4,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 14,
    color: "#ffffff",
  },
  coverTitle: {
    fontSize: 60,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.05,
    marginBottom: 16,
    color: "#ffffff",
  },
  coverAuthor: {
    fontSize: 18,
    fontStyle: "italic",
    color: "rgba(255,255,255,0.92)",
  },
  coverFoot: {
    position: "absolute",
    left: 48,
    top: 48,
    color: "#ffffff",
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  coverYear: {
    position: "absolute",
    right: 48,
    top: 48,
    color: "#ffffff",
    fontSize: 11,
    letterSpacing: 2,
  },

  // ----- Generic page -----
  contentPage: {
    padding: 56,
    backgroundColor: "#fafaf9",
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
    paddingBottom: 12,
    borderBottom: 0.5,
    borderBottomColor: "#d6d3d1",
  },
  brandMark: {
    fontSize: 9,
    letterSpacing: 3,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },
  pageNum: {
    fontSize: 9,
    color: "#78716c",
  },

  // Footer
  footer: {
    position: "absolute",
    left: 56,
    right: 56,
    bottom: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#a8a29e",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // ----- Intro page -----
  introTitle: {
    fontSize: 38,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.1,
    marginTop: 32,
    marginBottom: 18,
  },
  introBody: {
    fontSize: 12,
    lineHeight: 1.7,
    color: "#44403c",
    marginBottom: 12,
  },
  introStatsRow: {
    marginTop: 28,
    flexDirection: "row",
    gap: 16,
  },
  introStat: {
    flex: 1,
    backgroundColor: "#ffffff",
    border: 1,
    borderColor: "#e7e5e4",
    borderRadius: 8,
    padding: 14,
  },
  introStatLabel: {
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#a8a29e",
    marginBottom: 6,
  },
  introStatValue: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.1,
  },
  introStatUnit: {
    fontSize: 10,
    color: "#78716c",
    marginTop: 2,
  },

  // ----- TOC -----
  tocTitle: {
    fontSize: 38,
    fontFamily: "Helvetica-Bold",
    marginTop: 6,
    marginBottom: 28,
  },
  tocItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottom: 0.5,
    borderBottomColor: "#e7e5e4",
  },
  tocNum: {
    width: 38,
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  tocBody: { flex: 1, paddingRight: 12 },
  tocName: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  tocMeta: {
    fontSize: 9,
    color: "#78716c",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  tocTime: {
    fontSize: 10,
    color: "#57534e",
    minWidth: 60,
    textAlign: "right",
  },

  // ----- Recipe page -----
  recipeChapter: {
    fontSize: 11,
    letterSpacing: 6,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginTop: 4,
    marginBottom: 4,
  },
  recipeCuisine: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#78716c",
    marginBottom: 14,
  },
  recipeTitle: {
    fontSize: 36,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.05,
    marginBottom: 10,
  },
  recipeDesc: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#57534e",
    lineHeight: 1.55,
    marginBottom: 18,
  },
  recipeImage: {
    width: "100%",
    height: 230,
    objectFit: "cover",
    borderRadius: 6,
    marginBottom: 14,
  },
  recipeImagePlaceholder: {
    width: "100%",
    height: 230,
    borderRadius: 6,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  metaPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: "#ffffff",
    border: 0.5,
    borderColor: "#e7e5e4",
  },
  metaLabel: {
    fontSize: 7,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#a8a29e",
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  nutritionLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingVertical: 6,
    marginBottom: 16,
    fontSize: 9,
    color: "#57534e",
    letterSpacing: 0.5,
  },
  nutritionItem: {
    fontFamily: "Helvetica-Bold",
  },
  nutritionDivider: {
    color: "#d6d3d1",
  },

  twoCol: {
    flexDirection: "row",
    gap: 18,
    marginBottom: 14,
  },
  ingredientsBox: {
    width: 200,
    backgroundColor: "#ffffff",
    border: 0.5,
    borderColor: "#e7e5e4",
    borderRadius: 6,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 9,
    letterSpacing: 3,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 10,
  },
  ingredientItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    fontSize: 10,
    borderBottom: 0.5,
    borderBottomColor: "#f5f5f4",
  },
  ingredientName: { flex: 1, paddingRight: 6 },
  ingredientQty: { fontFamily: "Helvetica-Bold" },

  stepsCol: { flex: 1 },
  step: {
    flexDirection: "row",
    marginBottom: 10,
    alignItems: "flex-start",
  },
  stepNumDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    paddingTop: 4,
    color: "#ffffff",
    marginRight: 8,
  },
  stepText: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 1.55,
    color: "#1c1917",
  },
  stepDurationInline: {
    fontSize: 8.5,
    color: "#a8a29e",
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // (macroRow removed — moved into a compact nutritionLine right below metaRow)

  // ----- Back cover -----
  backCover: {
    backgroundColor: "#1c1917",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: 64,
    color: "#fafaf9",
    height: "100%",
  },
  backTop: {},
  backBrand: {
    fontSize: 12,
    letterSpacing: 4,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    color: "#fafaf9",
  },
  backQuote: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: "#fafaf9",
    lineHeight: 1.2,
    marginTop: 24,
  },
  backFooter: {
    fontSize: 10,
    color: "#a8a29e",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});

// ------------------------------------------------------------------
// Pages
// ------------------------------------------------------------------

function CoverPage({
  brandName,
  brandColor,
  authorName,
  coverImage,
}: {
  brandName: string;
  brandColor: string;
  authorName: string;
  coverImage?: string;
}) {
  return (
    <Page size="A4" style={[styles.page, { padding: 0 }]}>
      <View style={styles.coverWrap}>
        {coverImage ? (
          <PdfImage src={coverImage} style={styles.coverImage} />
        ) : (
          <View style={[styles.coverFallback, { backgroundColor: brandColor }]} />
        )}
        <View style={styles.coverOverlay} />

        <Text style={styles.coverFoot}>{brandName}</Text>
        <Text style={styles.coverYear}>
          MMXXVI · {new Date().getFullYear()}
        </Text>

        <View style={styles.coverContent}>
          <Text style={styles.coverEyebrow}>Recetario personal</Text>
          <Text style={styles.coverTitle}>
            La cocina de{"\n"}
            {authorName}
          </Text>
          <Text style={styles.coverAuthor}>
            una colección curada — generada con {brandName}
          </Text>
        </View>
      </View>
    </Page>
  );
}

function IntroPage({
  brandName,
  brandColor,
  authorName,
  recipeCount,
  totalMinutes,
  cuisinesCount,
}: {
  brandName: string;
  brandColor: string;
  authorName: string;
  recipeCount: number;
  totalMinutes: number;
  cuisinesCount: number;
}) {
  return (
    <Page size="A4" style={[styles.page, styles.contentPage]}>
      <View style={styles.pageHeader}>
        <Text style={[styles.brandMark, { color: brandColor }]}>
          {brandName} · Cookbook
        </Text>
        <Text style={styles.pageNum}>Introducción</Text>
      </View>

      <Text style={styles.introTitle}>
        Bienvenido a tu{"\n"}recetario, {authorName}.
      </Text>

      <Text style={styles.introBody}>
        Cada receta de este libro fue elegida por ti, a mano, en algún momento
        en el que dijiste «esta sí». Lo que tienes delante no es una colección
        cualquiera: es el reflejo de cómo cocinas, de qué te gusta y de cómo
        comes en casa.
      </Text>
      <Text style={styles.introBody}>
        La idea es simple. Imprime estas páginas, ponles una funda bonita y
        que vivan en tu cocina. Mancha las hojas, anota al margen, vuelve a
        las que funcionan. Un recetario de verdad se hace usándolo.
      </Text>
      <Text style={styles.introBody}>
        Buen provecho.
      </Text>

      <View style={styles.introStatsRow}>
        <View style={styles.introStat}>
          <Text style={styles.introStatLabel}>Recetas</Text>
          <Text style={styles.introStatValue}>{recipeCount}</Text>
          <Text style={styles.introStatUnit}>favoritas tuyas</Text>
        </View>
        <View style={styles.introStat}>
          <Text style={styles.introStatLabel}>Cocinas</Text>
          <Text style={styles.introStatValue}>{cuisinesCount}</Text>
          <Text style={styles.introStatUnit}>tradiciones</Text>
        </View>
        <View style={styles.introStat}>
          <Text style={styles.introStatLabel}>Tiempo</Text>
          <Text style={styles.introStatValue}>
            {Math.round(totalMinutes / 60)}
          </Text>
          <Text style={styles.introStatUnit}>horas de cocina</Text>
        </View>
      </View>

      <PageFooter brand={brandName} label="Introducción" />
    </Page>
  );
}

function TocPage({
  brandName,
  brandColor,
  recipes,
}: {
  brandName: string;
  brandColor: string;
  recipes: FullRecipe[];
}) {
  return (
    <Page size="A4" style={[styles.page, styles.contentPage]}>
      <View style={styles.pageHeader}>
        <Text style={[styles.brandMark, { color: brandColor }]}>
          {brandName} · Cookbook
        </Text>
        <Text style={styles.pageNum}>Índice</Text>
      </View>

      <Text style={styles.tocTitle}>Índice de recetas</Text>

      <View>
        {recipes.map((r, i) => {
          const time = (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0);
          return (
            <View
              key={r.id}
              style={styles.tocItem}
              wrap={false}
            >
              <Text style={[styles.tocNum, { color: brandColor }]}>
                {String(i + 1).padStart(2, "0")}
              </Text>
              <View style={styles.tocBody}>
                <Text style={styles.tocName}>{r.title}</Text>
                <Text style={styles.tocMeta}>
                  {r.cuisine ? `${r.cuisine} · ` : ""}
                  {r.difficulty
                    ? r.difficulty === "easy"
                      ? "Fácil"
                      : r.difficulty === "medium"
                        ? "Media"
                        : "Difícil"
                    : ""}
                </Text>
              </View>
              {time > 0 && (
                <Text style={styles.tocTime}>{time} min</Text>
              )}
            </View>
          );
        })}
      </View>

      <PageFooter brand={brandName} label="Índice" />
    </Page>
  );
}

function RecipePage({
  recipe,
  number,
  total,
  brandName,
  brandColor,
  imageDataUrl,
}: {
  recipe: FullRecipe;
  number: number;
  total: number;
  brandName: string;
  brandColor: string;
  imageDataUrl?: string;
}) {
  const time = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);

  return (
    <Page
      size="A4"
      style={[styles.page, styles.contentPage]}
      bookmark={{
        title: `${String(number).padStart(2, "0")} · ${recipe.title}`,
        fit: true,
      }}
    >
      <View style={styles.pageHeader}>
        <Text style={[styles.brandMark, { color: brandColor }]}>
          {brandName} · Cookbook
        </Text>
        <Text style={styles.pageNum}>
          {String(number).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </Text>
      </View>

      <Text style={[styles.recipeChapter, { color: brandColor }]}>
        Receta {String(number).padStart(2, "0")}
      </Text>
      {recipe.cuisine && (
        <Text style={styles.recipeCuisine}>{recipe.cuisine}</Text>
      )}
      <Text style={styles.recipeTitle}>{recipe.title}</Text>
      {recipe.description && (
        <Text style={styles.recipeDesc}>{recipe.description}</Text>
      )}

      {imageDataUrl ? (
        <PdfImage src={imageDataUrl} style={styles.recipeImage} />
      ) : (
        <View
          style={[
            styles.recipeImagePlaceholder,
            { backgroundColor: withAlpha(brandColor, 0.12) },
          ]}
        />
      )}

      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <Text style={styles.metaLabel}>Tiempo total</Text>
          <Text style={styles.metaValue}>{time > 0 ? `${time} min` : "—"}</Text>
        </View>
        <View style={styles.metaPill}>
          <Text style={styles.metaLabel}>Comensales</Text>
          <Text style={styles.metaValue}>{recipe.servings}</Text>
        </View>
        <View style={styles.metaPill}>
          <Text style={styles.metaLabel}>Dificultad</Text>
          <Text style={styles.metaValue}>
            {recipe.difficulty === "easy"
              ? "Fácil"
              : recipe.difficulty === "medium"
                ? "Media"
                : recipe.difficulty === "hard"
                  ? "Difícil"
                  : "—"}
          </Text>
        </View>
        <View style={styles.metaPill}>
          <Text style={styles.metaLabel}>Calorías</Text>
          <Text style={styles.metaValue}>
            {recipe.totalCalories
              ? `${Math.round(recipe.totalCalories)} kcal`
              : "—"}
          </Text>
        </View>
      </View>

      <View style={styles.nutritionLine}>
        <Text>
          POR RACIÓN ·{" "}
          <Text style={styles.nutritionItem}>
            {Math.round(recipe.totalProteins ?? 0)}g
          </Text>{" "}
          proteínas
          <Text style={styles.nutritionDivider}>  ·  </Text>
          <Text style={styles.nutritionItem}>
            {Math.round(recipe.totalFats ?? 0)}g
          </Text>{" "}
          grasas
          <Text style={styles.nutritionDivider}>  ·  </Text>
          <Text style={styles.nutritionItem}>
            {Math.round(recipe.totalCarbs ?? 0)}g
          </Text>{" "}
          carbos
        </Text>
      </View>

      <View style={styles.twoCol}>
        <View style={styles.ingredientsBox}>
          <Text style={[styles.sectionTitle, { color: brandColor }]}>
            Ingredientes
          </Text>
          {recipe.ingredients.map((ing) => (
            <View key={ing.id} style={styles.ingredientItem}>
              <Text style={styles.ingredientName}>
                {ing.name}
                {ing.optional ? " (opcional)" : ""}
              </Text>
              <Text style={styles.ingredientQty}>
                {formatQty(ing.quantity)} {ing.unit}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.stepsCol}>
          <Text style={[styles.sectionTitle, { color: brandColor }]}>
            Preparación
          </Text>
          {recipe.steps.map((s, i) => (
            <View key={s.id} style={styles.step} wrap={false}>
              <Text
                style={[styles.stepNumDot, { backgroundColor: brandColor }]}
              >
                {i + 1}
              </Text>
              <Text style={styles.stepText}>
                {s.content}
                {s.durationMin != null && s.durationMin > 0 && (
                  <Text style={styles.stepDurationInline}>
                    {"  ·  "}
                    {s.durationMin} MIN
                  </Text>
                )}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <PageFooter brand={brandName} label={`Receta ${number} de ${total}`} />
    </Page>
  );
}

function BackCoverPage({
  brandName,
  authorName,
  recipeCount,
}: {
  brandName: string;
  authorName: string;
  recipeCount: number;
}) {
  return (
    <Page size="A4" style={[styles.page, { padding: 0 }]}>
      <View style={styles.backCover}>
        <View style={styles.backTop}>
          <Text style={styles.backBrand}>{brandName}</Text>
          <Text style={styles.backQuote}>
            «La cocina es el lenguaje en el que se traducen los días buenos.»
          </Text>
        </View>
        <View>
          <Text
            style={{
              fontSize: 13,
              color: "#fafaf9",
              fontFamily: "Helvetica-Bold",
              marginBottom: 6,
            }}
          >
            {recipeCount} recetas curadas por {authorName}
          </Text>
          <Text style={styles.backFooter}>
            Generado con {brandName}
          </Text>
        </View>
      </View>
    </Page>
  );
}

function PageFooter({
  brand,
  label,
}: {
  brand: string;
  label: string;
}) {
  return (
    <View style={styles.footer} fixed>
      <Text>{brand}</Text>
      <Text>{label}</Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `${pageNumber} / ${totalPages}`
        }
      />
    </View>
  );
}

// ------------------------------------------------------------------
// Document
// ------------------------------------------------------------------

async function CookbookDocument({ input }: { input: CookbookInput }) {
  const { brandName, brandColor, authorName, recipes } = input;

  const coverImage = await imageDataUri(
    recipes.find((r) => r.imageStoragePath)?.imageStoragePath ?? null
  );

  const recipeImages = await Promise.all(
    recipes.map((r) => imageDataUri(r.imageStoragePath ?? null))
  );

  const totalMinutes = recipes.reduce(
    (acc, r) => acc + (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0),
    0
  );
  const cuisinesCount = new Set(
    recipes.map((r) => r.cuisine).filter(Boolean)
  ).size;

  return (
    <Document
      title={`Recetario de ${authorName}`}
      author={authorName}
      subject={`Recetario personal generado con ${brandName}`}
      keywords="recetas, cocina, recetario, ai, chefai"
    >
      <CoverPage
        brandName={brandName}
        brandColor={brandColor}
        authorName={authorName}
        coverImage={coverImage}
      />
      <IntroPage
        brandName={brandName}
        brandColor={brandColor}
        authorName={authorName}
        recipeCount={recipes.length}
        totalMinutes={totalMinutes}
        cuisinesCount={cuisinesCount || 1}
      />
      <TocPage
        brandName={brandName}
        brandColor={brandColor}
        recipes={recipes}
      />
      {recipes.map((r, i) => (
        <RecipePage
          key={r.id}
          recipe={r}
          number={i + 1}
          total={recipes.length}
          brandName={brandName}
          brandColor={brandColor}
          imageDataUrl={recipeImages[i]}
        />
      ))}
      <BackCoverPage
        brandName={brandName}
        authorName={authorName}
        recipeCount={recipes.length}
      />
    </Document>
  );
}

function formatQty(n: number): string {
  if (n >= 100) return Math.round(n).toString();
  if (n >= 10) return n.toFixed(0);
  return n.toFixed(1).replace(/\.0$/, "");
}

export async function renderCookbookPdf(
  input: CookbookInput
): Promise<NodeJS.ReadableStream> {
  const doc = await CookbookDocument({ input });
  return renderToStream(doc);
}
