export type ParagraphBlock = {
  text: string;
  isContinuation: boolean;
};

export type TocEntry = {
  title: string;
  targetPageIndex: number;
  targetPageNumber: number;
};

export type AssetPair = {
  id: string;
  title: string;
  paragraphs: string[];
  imageUrl?: string;
  /** Veio de resources/historias/. */
  isStory?: boolean;
};

export type LoadedResources = {
  backCoverImageUrl?: string;
  items: AssetPair[];
};

export type CoverPageContent = {
  kind: "cover";
};

export type BackCoverPageContent = {
  kind: "back-cover";
  imageUrl: string;
};

export type BlankPageContent = {
  kind: "blank";
  /**
   * Folha de papel em branco dentro do livro (ex.: apos o sumario). Entra na
   * contagem das paginas, mas nao mostra numero. Sem isso, e o espaco fora do
   * livro ao lado da capa e da contracapa.
   */
  paper?: boolean;
};

export type TocPageContent = {
  kind: "toc";
  title?: string;
  entries: TocEntry[];
};

export type TextPageContent = {
  kind: "text";
  sourceId?: string;
  title?: string;
  paragraphs: ParagraphBlock[];
};

/**
 * Primeira pagina de uma historia com imagem:
 * - "title-image-text": titulo, imagem e o comeco do texto (uma pagina por vez).
 * - "title-image": so titulo e imagem; o texto comeca na pagina seguinte
 *   (duas paginas lado a lado).
 */
export type StoryLayout = "title-image-text" | "title-image";

export type ImagePageContent = {
  kind: "image";
  sourceId?: string;
  title?: string;
  paragraphs: ParagraphBlock[];
  imageUrl: string;
  imageOnly: boolean;
  /** Como a primeira pagina de uma historia e montada (ver StoryLayout). */
  storyLayout?: StoryLayout;
};

export type PageContent =
  | CoverPageContent
  | BackCoverPageContent
  | BlankPageContent
  | TocPageContent
  | TextPageContent
  | ImagePageContent;
