import type { LoadedResources } from "./types";

type BookParagraphEntry = {
  paragrafo?: unknown;
};

type BookJsonFile = {
  titulo?: unknown;
  /** Caminho da imagem da historia, relativo ao proprio .json (ex.: "./1-helennar-1.gif"). */
  imagem?: unknown;
  /** Posicao no livro e no sumario: 1, 2, 3... */
  ordem?: unknown;
  listaParagrafos?: unknown;
  paragrafos?: unknown;
};

// Textos de abertura e encerramento (folha de rosto, creditos...) ficam em
// resources/; as historias, em resources/historias/. Outras subpastas sao ignoradas.
const textModules = import.meta.glob(
  ["../../resources/*.json", "../../resources/historias/*.json"],
  {
    eager: true,
    import: "default",
  },
) as Record<string, BookJsonFile>;

const imageModules = import.meta.glob(
  [
    "../../resources/*.{png,jpg,jpeg,webp,gif,avif,svg}",
    "../../resources/historias/*.{png,jpg,jpeg,webp,gif,avif,svg}",
  ],
  {
    eager: true,
    import: "default",
  },
) as Record<string, string>;

/** Secoes de abertura: o sumario entra logo depois delas. */
export const FRONT_MATTER_IDS = new Set([
  "folha-rosto",
  "dedicatoria",
  "inspiracao",
  "apresentacao",
  "agradecimentos",
]);

const collator = new Intl.Collator("pt-BR", {
  numeric: true,
  sensitivity: "base",
});

const ORDER_PREFIX = /^(\d+)-/;

/** Numero antes do traco no nome do arquivo ("3-dedicatoria" -> 3). Sem numero, vai para o fim. */
function getFileOrder(id: string): number {
  const match = ORDER_PREFIX.exec(id);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

/** Nome do arquivo sem o numero de ordem ("3-dedicatoria" -> "dedicatoria"). */
export function stripOrderPrefix(id: string): string {
  return id.replace(ORDER_PREFIX, "");
}

/** Valor do atributo "ordem". Sem ele (ou invalido), o texto vai para o fim do livro. */
function getDisplayOrder(data: BookJsonFile): number {
  const value = typeof data.ordem === "string" ? Number(data.ordem) : data.ordem;
  return typeof value === "number" && Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function compareNumbers(left: number, right: number): number {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

/** Junta a pasta do .json com o caminho relativo do atributo "imagem". */
function resolveRelativePath(jsonPath: string, relativePath: string): string {
  const parts = jsonPath.split("/").slice(0, -1);

  for (const segment of relativePath.replaceAll("\\", "/").split("/")) {
    if (segment === "" || segment === ".") {
      continue;
    }

    if (segment === "..") {
      parts.pop();
    } else {
      parts.push(segment);
    }
  }

  return parts.join("/");
}

function resolveImageUrl(jsonPath: string, data: BookJsonFile, id: string): string | undefined {
  if (typeof data.imagem === "string" && data.imagem.trim()) {
    const imagePath = resolveRelativePath(jsonPath, data.imagem.trim());
    const url = imageModules[imagePath];

    if (!url) {
      console.warn(`Imagem "${data.imagem}" de ${jsonPath} nao encontrada.`);
    }

    return url;
  }

  // Sem o atributo "imagem": usa a imagem de mesmo nome na mesma pasta, se houver.
  const folder = jsonPath.slice(0, jsonPath.lastIndexOf("/") + 1);
  const sameName = Object.keys(imageModules).find(
    (imagePath) => imagePath.startsWith(folder) && normalizeBaseName(imagePath) === id
      && !imagePath.slice(folder.length).includes("/"),
  );
  return sameName ? imageModules[sameName] : undefined;
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
  const backCoverPath = Object.keys(imageModules).find(
    (path) => !path.includes("/historias/") && /^contra-capa$/i.test(normalizeBaseName(path)),
  );
  const backCoverImageUrl = backCoverPath ? imageModules[backCoverPath] : undefined;

  const entries = Object.entries(textModules)
    .map(([path, data]) => {
      const id = normalizeBaseName(path);
      const { title, paragraphs } = parseBookJson(data, path);

      return {
        id,
        title,
        paragraphs,
        imageUrl: resolveImageUrl(path, data, id),
        order: getDisplayOrder(data),
      };
    })
    .filter((entry) => !/^capa$/i.test(entry.id))
    // A ordem do livro (e do sumario) e o atributo "ordem" de cada .json, em
    // qualquer pasta. Empate ou sem "ordem": numero do nome do arquivo, depois
    // ordem alfabetica.
    .sort(
      (left, right) =>
        compareNumbers(left.order, right.order) ||
        compareNumbers(getFileOrder(left.id), getFileOrder(right.id)) ||
        collator.compare(left.id, right.id),
    );

  return {
    backCoverImageUrl,
    items: entries.map(({ order: _order, ...entry }) => entry),
  };
}
