import type { AssetPair, PageContent, ParagraphBlock, StoryLayout } from "./types";

const IMAGE_SHARE_THRESHOLD = 0.5;
const MIN_WORDS_FOR_PARAGRAPH_START_SPLIT = 8;

export type PageMeasureSize = {
  pageWidth: number;
  pageHeight: number;
};

type PendingParagraph = {
  text: string;
  isContinuation: boolean;
};

function createMeasureRoot(size: PageMeasureSize): HTMLDivElement {
  const element = document.createElement("div");
  element.className = "measure-root";
  element.style.width = `${size.pageWidth}px`;
  element.style.height = `${size.pageHeight}px`;
  document.body.appendChild(element);
  return element;
}

function createMeasurePage(size: PageMeasureSize): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.className = "book-page";
  wrapper.style.width = `${size.pageWidth}px`;
  wrapper.style.height = `${size.pageHeight}px`;
  wrapper.innerHTML = `
    <div class="page-content">
      <header class="page-title"><h2></h2></header>
      <section class="page-text"></section>
      <figure class="page-figure">
        <img alt="" />
      </figure>
      <footer class="page-footer"><span>0</span></footer>
    </div>
  `;
  return wrapper;
}

function fitsWithinTextArea(textElement: HTMLElement, limit: number): boolean {
  return textElement.scrollHeight <= limit;
}

function paragraphToHtml(paragraph: PendingParagraph | ParagraphBlock): string {
  const continuationClass = paragraph.isContinuation ? " page-paragraph--continuation" : "";
  return `<p class="page-paragraph${continuationClass}">${paragraph.text}</p>`;
}

function renderParagraphs(paragraphs: Array<PendingParagraph | ParagraphBlock>): string {
  return paragraphs.map(paragraphToHtml).join("");
}

function splitParagraphToFit(
  textElement: HTMLElement,
  paragraph: PendingParagraph,
  fixedParagraphs: PendingParagraph[],
  availableHeight: number,
): { accepted?: PendingParagraph; remainder?: PendingParagraph } {
  const words = paragraph.text.split(/\s+/).filter(Boolean);

  if (words.length <= 1) {
    return { accepted: paragraph };
  }

  let low = 1;
  let high = words.length;
  let best = 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate: PendingParagraph = {
      text: words.slice(0, middle).join(" "),
      isContinuation: paragraph.isContinuation,
    };
    textElement.innerHTML = renderParagraphs([...fixedParagraphs, candidate]);

    if (fitsWithinTextArea(textElement, availableHeight)) {
      best = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  const acceptedText = words.slice(0, best).join(" ").trim();
  const remainderText = words.slice(best).join(" ").trim();

  return {
    accepted: acceptedText
      ? { text: acceptedText, isContinuation: paragraph.isContinuation }
      : undefined,
    remainder: remainderText
      ? { text: remainderText, isContinuation: true }
      : undefined,
  };
}

function fillPageParagraphs(
  textElement: HTMLElement,
  paragraphPool: PendingParagraph[],
  availableHeight: number,
): ParagraphBlock[] {
  const accepted: PendingParagraph[] = [];

  while (paragraphPool.length > 0) {
    const nextParagraph = paragraphPool[0];
    textElement.innerHTML = renderParagraphs([...accepted, nextParagraph]);

    if (fitsWithinTextArea(textElement, availableHeight)) {
      accepted.push(paragraphPool.shift() as PendingParagraph);
      continue;
    }

    const splitResult = splitParagraphToFit(
      textElement,
      nextParagraph,
      accepted,
      availableHeight,
    );

    const acceptedWordCount = splitResult.accepted?.text.split(/\s+/).filter(Boolean).length ?? 0;
    const shouldPushWholeParagraphToNextPage =
      accepted.length > 0 &&
      !nextParagraph.isContinuation &&
      acceptedWordCount > 0 &&
      acceptedWordCount < MIN_WORDS_FOR_PARAGRAPH_START_SPLIT;

    if (shouldPushWholeParagraphToNextPage) {
      textElement.innerHTML = renderParagraphs(accepted);
      break;
    }

    if (splitResult.accepted) {
      accepted.push(splitResult.accepted);
      paragraphPool[0] = splitResult.remainder ?? { text: "", isContinuation: true };
      textElement.innerHTML = renderParagraphs(accepted);

      if (!splitResult.remainder) {
        paragraphPool.shift();
      }
    } else if (accepted.length === 0) {
      accepted.push(paragraphPool.shift() as PendingParagraph);
      textElement.innerHTML = renderParagraphs(accepted);
    }

    break;
  }

  while (paragraphPool[0]?.text === "") {
    paragraphPool.shift();
  }

  return accepted.map((paragraph) => ({
    text: paragraph.text,
    isContinuation: paragraph.isContinuation,
  }));
}

function estimateFreeRatio(textElement: HTMLElement, availableHeight: number): number {
  if (availableHeight <= 0) {
    return 0;
  }

  return Math.max(0, (availableHeight - textElement.scrollHeight) / availableHeight);
}

export type PaginateOptions = {
  /** Como abrir as historias com imagem. Sem valor: imagem depois do texto. */
  storyLayout?: StoryLayout;
};

export async function paginateContent(
  items: AssetPair[],
  size: PageMeasureSize,
  options: PaginateOptions = {},
): Promise<PageContent[]> {
  const measureRoot = createMeasureRoot(size);
  const measurePage = createMeasurePage(size);
  measureRoot.appendChild(measurePage);

  const titleElement = measurePage.querySelector<HTMLHeadingElement>(".page-title h2");
  const textElement = measurePage.querySelector<HTMLElement>(".page-text");
  const figureElement = measurePage.querySelector<HTMLElement>(".page-figure");
  const contentElement = measurePage.querySelector<HTMLElement>(".page-content");

  if (!titleElement || !textElement || !figureElement || !contentElement) {
    throw new Error("Falha ao montar os elementos de medicao.");
  }

  const pages: PageContent[] = [];

  for (const item of items) {
    const pendingParagraphs: PendingParagraph[] = item.paragraphs.map((text) => ({
      text,
      isContinuation: false,
    }));
    let isFirstPageForItem = true;
    let lastTextPageIndex = -1;
    let imagePlaced = false;

    // Historias com imagem abrem com o titulo e a imagem logo abaixo.
    // - "title-image-text" (celular em pe): o texto comeca na mesma pagina,
    //   abaixo da imagem, e continua nas seguintes.
    // - "title-image" (duas paginas lado a lado): a pagina tem so titulo e
    //   imagem; o texto comeca na pagina seguinte.
    if (options.storyLayout && item.imageUrl) {
      let pageParagraphs: ParagraphBlock[] = [];

      if (options.storyLayout === "title-image-text" && pendingParagraphs.length > 0) {
        contentElement.classList.add("page-content--image-first");
        figureElement.style.display = "";
        titleElement.textContent = item.title;
        textElement.innerHTML = "";
        const availableHeight = textElement.clientHeight;
        pageParagraphs = fillPageParagraphs(textElement, pendingParagraphs, availableHeight);
        contentElement.classList.remove("page-content--image-first");
        figureElement.style.display = "none";
      }

      pages.push({
        kind: "image",
        sourceId: item.id,
        title: item.title,
        paragraphs: pageParagraphs,
        imageUrl: item.imageUrl,
        imageOnly: false,
        storyLayout: options.storyLayout,
      });
      isFirstPageForItem = false;
      imagePlaced = true;
    }

    if (!imagePlaced && pendingParagraphs.length === 0) {
      pages.push({
        kind: "text",
        sourceId: item.id,
        title: item.title,
        paragraphs: [],
      });
      lastTextPageIndex = pages.length - 1;
      isFirstPageForItem = false;
    }

    while (pendingParagraphs.length > 0) {
      const currentTitle = isFirstPageForItem ? item.title : undefined;
      titleElement.textContent = currentTitle ?? "";
      figureElement.style.display = "none";
      textElement.innerHTML = "";
      const availableHeight = textElement.clientHeight;

      const pageParagraphs = fillPageParagraphs(
        textElement,
        pendingParagraphs,
        availableHeight,
      );

      pages.push({
        kind: "text",
        sourceId: item.id,
        title: currentTitle,
        paragraphs: pageParagraphs,
      });
      lastTextPageIndex = pages.length - 1;
      isFirstPageForItem = false;
    }

    if (!item.imageUrl || imagePlaced) {
      continue;
    }

    if (lastTextPageIndex >= 0) {
      const lastTextPage = pages[lastTextPageIndex];

      if (lastTextPage.kind === "text") {
        titleElement.textContent = lastTextPage.title ?? "";
        textElement.innerHTML = renderParagraphs(lastTextPage.paragraphs);
        figureElement.style.display = "none";
        const freeRatio = estimateFreeRatio(textElement, textElement.clientHeight);

        if (freeRatio > IMAGE_SHARE_THRESHOLD) {
          pages[lastTextPageIndex] = {
            kind: "image",
            sourceId: item.id,
            title: lastTextPage.title,
            paragraphs: lastTextPage.paragraphs,
            imageUrl: item.imageUrl,
            imageOnly: false,
          };
          continue;
        }
      }
    }

    pages.push({
      kind: "image",
      sourceId: item.id,
      title: item.title,
      paragraphs: [],
      imageUrl: item.imageUrl,
      imageOnly: true,
    });
  }

  measureRoot.remove();
  return pages;
}
