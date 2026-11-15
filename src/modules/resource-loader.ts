import type { LoadedResources } from "./types";

type BookParagraphEntry = {
  paragrafo?: unknown;
};

type BookJsonFile = {
  titulo?: unknown;
  listaParagrafos?: unknown;
  paragrafos?: unknown;
};

const textModules = import.meta.glob("../../resources/*.json", {
  eager: true,
  import: "default",
}) as Record<string, BookJsonFile>;

const imageModules = import.meta.glob(
  "../../resources/*.{png,jpg,jpeg,webp,gif,avif,svg}",
  {
    eager: true,
    import: "default",
  },
) as Record<string, string>;

const collator = new Intl.Collator("pt-BR", {
  numeric: true,
  sensitivity: "base",
});

function getPriorityOrder(id: string): number {
  const normalized = id.toLowerCase();

  const orderedIds = [
    "folha-rosto",
    "dedicatoria",
    "inspiracao",
    "apresentacao",
    "agradecimentos",
  ];

  const orderedIndex = orderedIds.indexOf(normalized);

  if (orderedIndex >= 0) {
    return orderedIndex;
  }

  if (normalized === "creditos-finais") {
    return 10_000;
  }

  return 1_000;
}

function normalizeBaseName(path: string): string {
  const fileName = path.split("/").pop() ?? path;
  return fileName.replace(/\.[^.]+$/, "");
}

function normalizeParagraphs(source: unknown): string[] {
  if (!Array.isArray(source)) {
    return [];
  }

  return source
    .map((item) => {
      const entry = item as BookParagraphEntry;
      return typeof entry.paragrafo === "string" ? entry.paragrafo.trim() : "";
    })
    .filter(Boolean);
}

function parseBookJson(data: BookJsonFile, path: string): { title: string; paragraphs: string[] } {
  if (!data || typeof data !== "object") {
    throw new Error(`Arquivo JSON invalido em ${path}.`);
  }

  const title = typeof data.titulo === "string" && data.titulo.trim()
    ? data.titulo.trim()
    : "Sem titulo";

  const paragraphs = normalizeParagraphs(data.listaParagrafos ?? data.paragrafos);

  return {
    title,
    paragraphs,
  };
}

export async function loadAssets(): Promise<LoadedResources> {
  const imageMap = new Map(
    Object.entries(imageModules).map(([path, url]) => [normalizeBaseName(path), url]),
  );
  const backCoverImageUrl = imageMap.get("CONTRA-CAPA") ?? imageMap.get("contra-capa");

  const textEntries = Object.entries(textModules)
    .map(([path, data]) => {
      const id = normalizeBaseName(path);
      const { title, paragraphs } = parseBookJson(data, path);

      return {
        id,
        title,
        paragraphs,
      };
    })
    .filter((entry) => !/^capa$/i.test(entry.id))
    .sort((left, right) => {
      const priorityDifference = getPriorityOrder(left.id) - getPriorityOrder(right.id);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return collator.compare(left.id, right.id);
    });

  return {
    backCoverImageUrl,
    items: textEntries.map((entry) => ({
      ...entry,
      imageUrl: imageMap.get(entry.id),
    })),
  };
}
