import { PageFlip } from "page-flip";
import type { PageRect } from "page-flip";
import type { SizeType } from "page-flip";
import { renderPageMarkup } from "./page-templates";
import { paginateContent } from "./paginator";
import { FRONT_MATTER_IDS, loadAssets, stripOrderPrefix } from "./resource-loader";
import type { AssetPair, PageContent, TocEntry } from "./types";

const BOOK_SETTINGS = {
  width: 540,
  height: 720,
  minWidth: 280,
  maxWidth: 820,
  minHeight: 240,
  maxHeight: 1100,
} as const;



// Telas ate esta largura (celular, tablet) usam o livro de borda a borda.
const COMPACT_MAX_WIDTH = 960;

/** Onde o leitor estava: qual trecho (sourceId) e em que parte dele. */
type ReadingAnchor = {
  key: string;
  nth: number;
  total: number;
};

type BookLayout = {
  /** Celular ou tablet: o livro ocupa a tela inteira, com tamanho fixo calculado. */
  compact: boolean;
  /** Celular/tablet em pe: uma pagina por vez. Deitado ou computador: duas paginas. */
  singlePage: boolean;
};

export class BookApp {
  private readonly host: HTMLDivElement;
  private readonly shell: HTMLDivElement;
  private readonly stage: HTMLDivElement;
  private pageFlip?: PageFlip;
  private contentItems: AssetPair[] = [];
  private backCoverImageUrl?: string;
  private resizeTimer?: number;
  private layout?: BookLayout;
  private bookPages: PageContent[] = [];

  constructor(host: HTMLDivElement) {
    this.host = host;
    this.shell = document.createElement("div");
    this.shell.className = "app-shell";
    this.stage = document.createElement("div");
    this.stage.className = "book-stage";
    this.shell.appendChild(this.stage);
  }

  async init(): Promise<void> {
    this.host.replaceChildren(this.shell);
    const { backCoverImageUrl, items } = await loadAssets();
    this.backCoverImageUrl = backCoverImageUrl;
    this.contentItems = items;

    if (items.length === 0) {
      this.stage.innerHTML = `
        <section class="empty-state">
          <h1>Nenhum conteudo encontrado</h1>
          <p>Adicione arquivos de texto e imagens na pasta <code>resources</code>.</p>
        </section>
      `;
      return;
    }

    this.stage.addEventListener("click", this.handleOpenBookClick, true);
    this.stage.addEventListener("click", this.handleTocClick, true);
    this.bindResponsiveRepagination();
    await this.buildBook();
  }

  private detectLayout(): BookLayout {
    const compact = window.innerWidth <= COMPACT_MAX_WIDTH;

    return {
      compact,
      singlePage: compact && window.innerHeight > window.innerWidth,
    };
  }

  // A paginacao muda com o tamanho da tela, entao a posicao e guardada pelo
  // conteudo (trecho + fracao dentro dele), nao pelo numero da pagina.
  private anchorKey(index: number): string {
    const page = this.bookPages[index];

    if (!page) {
      return "cover";
    }

    if ("sourceId" in page && page.sourceId) {
      return `source:${page.sourceId}`;
    }

    if (page.kind === "blank") {
      // Folha em branco apos o sumario: volta para perto do sumario.
      if (page.paper) {
        return "toc";
      }

      // Espaco ao lado da capa (inicio) ou da contracapa (fim).
      return index === 0 ? "cover" : "back-cover";
    }

    return page.kind;
  }

  private getReadingAnchor(): ReadingAnchor | undefined {
    if (!this.pageFlip) {
      return undefined;
    }

    const index = this.pageFlip.getCurrentPageIndex();
    const key = this.anchorKey(index);
    const sameKey = this.bookPages
      .map((_, i) => i)
      .filter((i) => this.anchorKey(i) === key);

    return {
      key,
      nth: Math.max(0, sameKey.indexOf(index)),
      total: Math.max(1, sameKey.length),
    };
  }

  private resolveAnchor(anchor: ReadingAnchor): number {
    const candidates = this.bookPages
      .map((_, i) => i)
      .filter((i) => this.anchorKey(i) === anchor.key);

    if (candidates.length === 0) {
      return 0;
    }

    const position = Math.floor((anchor.nth / anchor.total) * candidates.length);
    return candidates[Math.min(candidates.length - 1, position)];
  }

  /**
   * Monta (ou remonta) o page-flip para o layout atual. Ao girar o aparelho o
   * numero de paginas visiveis muda, e o page-flip so aceita isso sendo recriado.
   * `anchor` reabre o livro no trecho onde o leitor estava.
   */
  private async buildBook(anchor?: ReadingAnchor): Promise<void> {
    this.pageFlip?.destroy();
    this.pageFlip = undefined;
    this.stage.innerHTML = `<div class="book"></div>`;

    const bookElement = this.stage.querySelector<HTMLDivElement>(".book");

    if (!bookElement) {
      throw new Error("Elemento do livro nao foi criado.");
    }

    const layout = this.detectLayout();
    this.layout = layout;
    const measureSize = this.calculatePageMeasureSize(layout);
    const pageElements = await this.createPageElements(measureSize);
    const { compact } = layout;
    const dynamicPageWidth = compact ? measureSize.pageWidth : BOOK_SETTINGS.width;
    const dynamicPageHeight = compact ? measureSize.pageHeight : BOOK_SETTINGS.height;
    const minWidth = compact ? measureSize.pageWidth : BOOK_SETTINGS.minWidth;
    const maxWidth = compact ? measureSize.pageWidth : BOOK_SETTINGS.maxWidth;
    const minHeight = compact ? measureSize.pageHeight : BOOK_SETTINGS.minHeight;
    const maxHeight = compact ? measureSize.pageHeight : BOOK_SETTINGS.maxHeight;

    this.pageFlip = new PageFlip(bookElement, {
      width: dynamicPageWidth,
      height: dynamicPageHeight,
      minWidth,
      maxWidth,
      minHeight,
      maxHeight,
      size: "stretch" as SizeType,
      maxShadowOpacity: 0.18,
      showCover: false,
      mobileScrollSupport: false,
      usePortrait: true,
      autoSize: true,
      drawShadow: true,
      showPageCorners: false,
      flippingTime: compact ? 700 : 900,
      startZIndex: 10,
    });

    this.pageFlip.loadFromHTML(pageElements);
    await this.repaginateUsingActualBounds();

    const target = anchor ? this.resolveAnchor(anchor) : 0;

    if (target > 0) {
      this.pageFlip.turnToPage(target);
    }
  }

  private calculatePageMeasureSize(layout: BookLayout): { pageWidth: number; pageHeight: number } {
    const isMobile = layout.compact;
    const shellPadding = isMobile ? 0 : 72;
    // clientWidth/clientHeight: area util, sem a barra de rolagem (no computador ela ocupa espaco).
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const safeViewportWidth = Math.max(viewportWidth - shellPadding, BOOK_SETTINGS.minWidth);
    const safeViewportHeight = Math.max(viewportHeight - shellPadding, BOOK_SETTINGS.minHeight);
    const stageWidth = Math.min(safeViewportWidth, 1440);
    const bookWidth = isMobile ? stageWidth : Math.min(stageWidth, 1180);
    const bookHeight = isMobile
      ? safeViewportHeight
      : Math.min(viewportHeight * 0.82, 860);
    // floor: o page-flip volta para uma pagina so se a largura do livro for
    // menor que 2x a largura minima da pagina — nem um pixel pode sobrar.
    const rawPageWidth = Math.floor(layout.singlePage ? bookWidth : bookWidth / 2);

    return {
      pageWidth: Math.max(BOOK_SETTINGS.minWidth, Math.min(rawPageWidth, BOOK_SETTINGS.maxWidth)),
      pageHeight: Math.max(BOOK_SETTINGS.minHeight, Math.min(bookHeight, BOOK_SETTINGS.maxHeight)),
    };
  }

  private async createPageElements(size: { pageWidth: number; pageHeight: number }): Promise<HTMLElement[]> {
    const pages = await paginateContent(this.contentItems, size, {
      // Em pe: titulo, imagem e texto na mesma pagina. Deitado/computador:
      // titulo e imagem numa pagina, texto a partir da seguinte.
      storyLayout: this.layout?.singlePage ? "title-image-text" : "title-image",
    });
    const bookPages = this.buildBookPagesWithToc(pages, size);
    this.bookPages = bookPages;

    return this.renderPageElements(bookPages);
  }

  private renderPageElements(bookPages: PageContent[]): HTMLElement[] {
    let numberedPage = 0;

    return bookPages.map((page) => {
      const wrapper = document.createElement("div");
      wrapper.className = "page";
      // Capa, contracapa e o espaco fora do livro nao contam. A folha em branco
      // apos o sumario conta, mas nao exibe o numero.
      const counts = !(page.kind === "cover" || page.kind === "back-cover" || (page.kind === "blank" && !page.paper));
      const pageNumber = counts ? ++numberedPage : undefined;
      wrapper.innerHTML = renderPageMarkup(page, pageNumber);
      return wrapper;
    });
  }

  private async repaginateUsingActualBounds(): Promise<void> {
    if (!this.pageFlip) {
      return;
    }

    this.pageFlip.update();
    const bounds = this.pageFlip.getBoundsRect();
    const actualMeasureSize = this.getActualMeasureSize(bounds);
    const updatedElements = await this.createPageElements(actualMeasureSize);
    this.pageFlip.updateFromHtml(updatedElements);
  }

  private getActualMeasureSize(bounds: PageRect): { pageWidth: number; pageHeight: number } {
    return {
      pageWidth: Math.max(BOOK_SETTINGS.minWidth, Math.min(bounds.pageWidth, BOOK_SETTINGS.maxWidth)),
      pageHeight: Math.max(BOOK_SETTINGS.minHeight, Math.min(bounds.height, BOOK_SETTINGS.maxHeight)),
    };
  }

  private bindResponsiveRepagination(): void {
    window.addEventListener("resize", this.handleResize);
  }

  private readonly handleResize = (): void => {
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      // Repaginar no meio de uma virada interrompe a animacao: tenta de novo depois.
      if (this.pageFlip && (this.pageFlip.getState() as string) !== "read") {
        this.handleResize();
        return;
      }

      const next = this.detectLayout();
      const layoutChanged =
        !this.layout ||
        next.compact !== this.layout.compact ||
        next.singlePage !== this.layout.singlePage;

      if (layoutChanged && this.pageFlip) {
        // Girou o aparelho (ou cruzou a largura de celular): remonta o livro.
        this.buildBook(this.getReadingAnchor()).catch((error: unknown) => {
          console.error("Falha ao remontar o livro apos girar a tela.", error);
        });
        return;
      }

      // Em celular/tablet o tamanho da pagina e fixo: se a tela mudou (tela
      // cheia, barra do navegador), remonta para recalcular o tamanho.
      if (next.compact && this.pageFlip) {
        this.buildBook(this.getReadingAnchor()).catch((error: unknown) => {
          console.error("Falha ao remontar o livro apos redimensionar.", error);
        });
        return;
      }

      this.repaginateUsingActualBounds().catch((error: unknown) => {
        console.error("Falha ao repaginar apos resize.", error);
      });
    }, 120);
  };

  private buildBookPagesWithToc(
    contentPages: PageContent[],
    size: { pageWidth: number; pageHeight: number },
  ): PageContent[] {
    // Com duas paginas lado a lado, a folha em branco deixa a capa na direita.
    const singlePage = this.layout?.singlePage ?? false;
    const coverPages: PageContent[] = [
      ...(singlePage ? [] : [{ kind: "blank" } as const]),
      { kind: "cover" } as const,
    ];
    // As paginas ja vem na ordem dos numeros dos arquivos. O sumario entra logo
    // depois das secoes iniciais (folha de rosto, dedicatoria...) que abrem o livro.
    const firstMainIndex = contentPages.findIndex((page) => !this.isFrontMatter(page));
    const frontMatterCount = firstMainIndex === -1 ? contentPages.length : firstMainIndex;
    const frontMatterPages = contentPages.slice(0, frontMatterCount);
    const mainContentPages = contentPages.slice(frontMatterCount);
    const titleEntries = this.extractTitleEntries(contentPages);
    let tocPages = this.paginateTocEntries([], size);

    // Se o sumario termina numa pagina de numero impar, entra uma pagina em
    // branco depois dele. Ela conta na numeracao, entao o conteudo seguinte
    // avanca um numero — e os destinos do sumario tambem.
    const blankAfterTocCount = (tocCount: number): number =>
      (frontMatterCount + tocCount) % 2 === 1 ? 1 : 0;

    while (true) {
      const tocCount = tocPages.length;
      const resolvedEntries = titleEntries.map((entry) => {
        const targetPageIndex = this.resolveTocTargetPageIndex(
          entry.contentPageIndex,
          coverPages.length,
          frontMatterCount,
          tocCount + blankAfterTocCount(tocCount),
        );

        return {
          title: entry.title,
          targetPageIndex,
          // Mesmo numero do rodape: a contagem comeca depois da capa (e da
          // folha em branco antes dela), que nao sao numeradas.
          targetPageNumber: targetPageIndex - coverPages.length + 1,
        };
      });

      const nextTocPages = this.paginateTocEntries(resolvedEntries, size);

      if (nextTocPages.length === tocPages.length) {
        tocPages = nextTocPages;
        break;
      }

      tocPages = nextTocPages;
    }

    return [
      ...coverPages,
      ...frontMatterPages,
      ...tocPages,
      ...(blankAfterTocCount(tocPages.length) ? [{ kind: "blank", paper: true } as const] : []),
      ...mainContentPages,
      ...(this.backCoverImageUrl ? [{ kind: "back-cover", imageUrl: this.backCoverImageUrl } as const] : []),
      { kind: "blank" } as const,
    ];
  }

  private extractTitleEntries(
    contentPages: PageContent[],
  ): Array<{ title: string; contentPageIndex: number; sourceId?: string }> {
    const entries: Array<{ title: string; contentPageIndex: number; sourceId?: string }> = [];
    const seenTitles = new Set<string>();

    contentPages.forEach((page, index) => {
      if (
        (page.kind === "text" || page.kind === "image") &&
        page.title &&
        !seenTitles.has(page.title)
      ) {
        seenTitles.add(page.title);
        entries.push({
          title: page.title,
          contentPageIndex: index,
          sourceId: "sourceId" in page ? page.sourceId : undefined,
        });
      }
    });

    return entries;
  }

  private isFrontMatter(page: PageContent): boolean {
    return (
      "sourceId" in page &&
      typeof page.sourceId === "string" &&
      FRONT_MATTER_IDS.has(stripOrderPrefix(page.sourceId))
    );
  }

  private resolveTocTargetPageIndex(
    contentPageIndex: number,
    coverCount: number,
    frontMatterCount: number,
    tocCount: number,
  ): number {
    // Paginas antes do sumario nao sao deslocadas por ele.
    if (contentPageIndex < frontMatterCount) {
      return coverCount + contentPageIndex;
    }

    return coverCount + tocCount + contentPageIndex;
  }

  private paginateTocEntries(
    entries: TocEntry[],
    size: { pageWidth: number; pageHeight: number },
  ): PageContent[] {
    const probeRoot = document.createElement("div");
    probeRoot.className = "measure-root";
    probeRoot.style.width = `${size.pageWidth}px`;
    probeRoot.style.height = `${size.pageHeight}px`;
    document.body.appendChild(probeRoot);

    const probePage = document.createElement("article");
    probePage.className = "book-page";
    probePage.style.width = `${size.pageWidth}px`;
    probePage.style.height = `${size.pageHeight}px`;
    probePage.innerHTML = `
      <div class="page-content">
        <header class="page-title"><h2>Sumario</h2></header>
        <section class="page-text page-text--toc">
          <ol class="toc-list"></ol>
        </section>
        <footer class="page-footer"><span>0</span></footer>
      </div>
    `;
    probeRoot.appendChild(probePage);

    const tocList = probePage.querySelector<HTMLOListElement>(".toc-list");
    const tocText = probePage.querySelector<HTMLElement>(".page-text");

    if (!tocList || !tocText) {
      probeRoot.remove();
      throw new Error("Falha ao medir o sumario.");
    }

    const pages: PageContent[] = [];
    let currentEntries: TocEntry[] = [];

    for (const entry of entries) {
      const candidateEntries = [...currentEntries, entry];
      tocList.innerHTML = this.renderTocItems(candidateEntries);

      if (tocText.scrollHeight <= tocText.clientHeight) {
        currentEntries = candidateEntries;
        continue;
      }

      if (currentEntries.length > 0) {
        pages.push({
          kind: "toc",
          title: pages.length === 0 ? "Sumario" : undefined,
          entries: currentEntries,
        });
        currentEntries = [entry];
        tocList.innerHTML = this.renderTocItems(currentEntries);
        continue;
      }

      currentEntries = [entry];
    }

    if (currentEntries.length > 0 || entries.length === 0) {
      pages.push({
        kind: "toc",
        title: "Sumario",
        entries: currentEntries,
      });
    }

    probeRoot.remove();
    return pages;
  }

  private renderTocItems(entries: TocEntry[]): string {
    return entries
      .map(
        (entry) => `
          <li class="toc-entry">
            <button type="button" class="toc-entry__button" data-page-target="${entry.targetPageIndex}">
              <span class="toc-entry__title">${entry.title}</span>
              <span class="toc-entry__dots"></span>
              <span class="toc-entry__page">${entry.targetPageNumber}</span>
            </button>
          </li>
        `,
      )
      .join("");
  }

  private readonly handleTocClick = (event: Event): void => {
    const target = event.target;

    if (!(target instanceof HTMLElement) || !this.pageFlip) {
      return;
    }

    const button = target.closest<HTMLElement>("[data-page-target]");

    if (!button) {
      return;
    }

    const pageTarget = Number(button.dataset.pageTarget);

    if (Number.isNaN(pageTarget)) {
      return;
    }

    this.pageFlip.flip(pageTarget);
  };

  // A capa e um <button>: o page-flip ignora toques em botoes, entao o clique
  // chega aqui como gesto do usuario — exigido pelo navegador para a tela cheia.
  private readonly handleOpenBookClick = (event: Event): void => {
    const target = event.target;

    if (!(target instanceof HTMLElement) || !target.closest("[data-open-book]")) {
      return;
    }

    this.openBook();
  };

  private openBook(): void {
    if (!this.pageFlip) {
      return;
    }

    // Nao espera a tela cheia: se ela mudar o tamanho da tela, o handleResize
    // repagina assim que a virada da capa terminar.
    this.requestFullscreen();
    this.pageFlip.flipNext();
  }

  private requestFullscreen(): void {
    const root = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    const doc = document as Document & { webkitFullscreenElement?: Element | null };

    if (document.fullscreenElement || doc.webkitFullscreenElement) {
      return;
    }

    try {
      const result = root.requestFullscreen
        ? root.requestFullscreen()
        : root.webkitRequestFullscreen?.();

      // Safari no iPhone nao suporta, ou o navegador recusou: o livro abre sem tela cheia.
      if (result instanceof Promise) {
        result.catch(() => undefined);
      }
    } catch {
      // Idem: segue sem tela cheia.
    }
  }

}
