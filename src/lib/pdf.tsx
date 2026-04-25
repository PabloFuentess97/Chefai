import "server-only";
import { renderToStream } from "@react-pdf/renderer";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type {
  Recipe,
  RecipeIngredient,
  RecipeStep,
} from "@prisma/client";
import path from "node:path";
import { promises as fs } from "node:fs";

type FullRecipe = Recipe & {
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
};

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 11, color: "#0c0a09", fontFamily: "Helvetica" },
  header: { marginBottom: 20 },
  brandRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  brand: { fontSize: 14, fontWeight: 700, color: "#16a34a" },
  brandMeta: { fontSize: 9, color: "#78716c" },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 6 },
  description: { color: "#57534e", marginBottom: 12 },
  meta: { flexDirection: "row", gap: 14, fontSize: 10, color: "#57534e", marginBottom: 16 },
  image: { width: "100%", height: 220, objectFit: "cover", borderRadius: 6, marginBottom: 16 },
  twoCol: { flexDirection: "row", gap: 16 },
  col: { flex: 1 },
  sectionTitle: { fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#16a34a", borderBottom: 1, borderBottomColor: "#e7e5e4", paddingBottom: 4 },
  ingredientRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottom: 0.5, borderBottomColor: "#f5f5f4" },
  step: { flexDirection: "row", marginBottom: 8, gap: 8 },
  stepNum: { width: 18, fontSize: 10, fontWeight: 700, color: "#16a34a" },
  stepContent: { flex: 1, lineHeight: 1.5 },
  macroRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 12, padding: 10, backgroundColor: "#fafaf9", borderRadius: 6 },
  macroLabel: { fontSize: 9, color: "#78716c", textTransform: "uppercase" },
  macroValue: { fontSize: 13, fontWeight: 700 },
  footer: { position: "absolute", bottom: 24, left: 36, right: 36, fontSize: 8, color: "#a3a3a3", textAlign: "center" },
});

async function imageDataUri(absolutePath: string | null): Promise<string | undefined> {
  if (!absolutePath) return undefined;
  try {
    const buf = await fs.readFile(absolutePath);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

function RecipePdf({
  recipe,
  brandName,
  imageDataUrl,
}: {
  recipe: FullRecipe;
  brandName: string;
  imageDataUrl?: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Text style={styles.brand}>{brandName}</Text>
            <Text style={styles.brandMeta}>
              {new Date(recipe.createdAt).toLocaleDateString("es-ES")}
            </Text>
          </View>
          <Text style={styles.title}>{recipe.title}</Text>
          {recipe.description && (
            <Text style={styles.description}>{recipe.description}</Text>
          )}
          <View style={styles.meta}>
            {recipe.prepMinutes != null && (
              <Text>Prep: {recipe.prepMinutes} min</Text>
            )}
            {recipe.cookMinutes != null && (
              <Text>Cocción: {recipe.cookMinutes} min</Text>
            )}
            <Text>Comensales: {recipe.servings}</Text>
            {recipe.cuisine && <Text>Cocina: {recipe.cuisine}</Text>}
          </View>
        </View>

        {imageDataUrl && <Image src={imageDataUrl} style={styles.image} />}

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Ingredientes</Text>
            {recipe.ingredients.map((i) => (
              <View key={i.id} style={styles.ingredientRow}>
                <Text>
                  {i.name}
                  {i.optional ? " (opcional)" : ""}
                </Text>
                <Text>
                  {formatQty(i.quantity)} {i.unit}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Pasos</Text>
            {recipe.steps.map((s, i) => (
              <View key={s.id} style={styles.step}>
                <Text style={styles.stepNum}>{i + 1}.</Text>
                <Text style={styles.stepContent}>{s.content}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.macroRow}>
          <View>
            <Text style={styles.macroLabel}>Calorías</Text>
            <Text style={styles.macroValue}>
              {Math.round(recipe.totalCalories ?? 0)} kcal
            </Text>
          </View>
          <View>
            <Text style={styles.macroLabel}>Proteínas</Text>
            <Text style={styles.macroValue}>
              {Math.round(recipe.totalProteins ?? 0)} g
            </Text>
          </View>
          <View>
            <Text style={styles.macroLabel}>Grasas</Text>
            <Text style={styles.macroValue}>
              {Math.round(recipe.totalFats ?? 0)} g
            </Text>
          </View>
          <View>
            <Text style={styles.macroLabel}>Carbos</Text>
            <Text style={styles.macroValue}>
              {Math.round(recipe.totalCarbs ?? 0)} g
            </Text>
          </View>
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `${brandName} · Página ${pageNumber} de ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

function formatQty(n: number): string {
  if (n >= 100) return Math.round(n).toString();
  if (n >= 10) return n.toFixed(0);
  return n.toFixed(1).replace(/\.0$/, "");
}

export async function renderRecipePdf(
  recipe: FullRecipe,
  brandName: string
): Promise<NodeJS.ReadableStream> {
  const imageDataUrl = await imageDataUri(recipe.imageStoragePath ?? null);
  const stream = await renderToStream(
    <RecipePdf
      recipe={recipe}
      brandName={brandName}
      imageDataUrl={imageDataUrl}
    />
  );
  return stream;
}

void path; // suppress unused
