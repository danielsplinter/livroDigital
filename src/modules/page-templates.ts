import type { PageContent, ParagraphBlock } from "./types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildParagraphs(paragraphs: ParagraphBlock[]): string {
  return paragraphs
    .map((paragraph) => {
      const continuationClass = paragraph.isContinuation ? " page-paragraph--continuation" : "";
      return `<p class="page-paragraph${continuationClass}">${escapeHtml(paragraph.text)}</p>`;
    })
    .join("");
}

export function renderPageMarkup(page: PageContent, pageNumber?: number): string {
  if (page.kind === "cover") {
    return `
      <article class="book-page book-page--cover">
        <div class="page-content page-content--cover">
          <button type="button" class="cover-open-button" data-open-book>CLIQUE PARA ABRIR</button>
        </div>
      </article>
    `;
  }

  if (page.kind === "back-cover") {
    return `
      <article class="book-page book-page--back-cover">
        <div class="page-content page-content--cover">
          <figure class="page-figure page-figure--cover">
            <img src="${page.imageUrl}" alt="Contra capa do livro" />
          </figure>
        </div>
      </article>
    `;
  }

  if (page.kind === "blank" && page.paper) {
    return `
      <article class="book-page" aria-hidden="true">
        <div class="page-content page-content--blank"></div>
      </article>
    `;
  }

  if (page.kind === "blank") {
    return `
      <article class="book-page book-page--blank" aria-hidden="true">
        <div class="page-content page-content--blank"></div>
      </article>
    `;
  }

  if (page.kind === "toc") {
    const tocTitle = page.title ?? "Sumario";
    const entriesMarkup = page.entries
      .map(
        (entry) => `
          <li class="toc-entry">
            <button type="button" class="toc-entry__button" data-page-target="${entry.targetPageIndex}">
              <span class="toc-entry__title">${escapeHtml(entry.title)}</span>
              <span class="toc-entry__dots" aria-hidden="true"></span>
              <span class="toc-entry__page">${entry.targetPageNumber}</span>
            </button>
          </li>
        `,
      )
      .join("");

    return `
      <article class="book-page">
        <div class="page-content">
          <header class="page-title"><h2>${escapeHtml(tocTitle)}</h2></header>
          <section class="page-text page-text--toc">
            <ol class="toc-list">
              ${entriesMarkup}
            </ol>
          </section>
          <footer class="page-footer">
            <span>${pageNumber ?? ""}</span>
          </footer>
        </div>
      </article>
    `;
  }

  const titleMarkup = page.title
    ? `<header class="page-title"><h2>${escapeHtml(page.title)}</h2></header>`
    : `<header class="page-title page-title--empty" aria-hidden="true"></header>`;

  if (page.kind === "image" && page.imageOnly) {
    return `
      <article class="book-page book-page--image-only">
        <div class="page-content page-content--image-only">
          <figure class="page-figure">
            <img src="${page.imageUrl}" alt="${escapeHtml(page.title ?? "Ilustracao")}" />
          </figure>
        </div>
      </article>
    `;
  }

  const imageMarkup =
    page.kind === "image"
      ? `
        <figure class="page-figure">
          <img src="${page.imageUrl}" alt="${escapeHtml(page.title ?? "Ilustracao")}" />
        </figure>
      `
      : "";

  const storyLayout = page.kind === "image" ? page.storyLayout : undefined;
  const footerMarkup = `
    <footer class="page-footer">
      <span>${pageNumber ?? ""}</span>
    </footer>
  `;

  // Duas paginas lado a lado: titulo e imagem ocupando o resto da pagina.
  if (storyLayout === "title-image") {
    return `
      <article class="book-page">
        <div class="page-content page-content--title-image">
          ${titleMarkup}
          ${imageMarkup}
          ${footerMarkup}
        </div>
      </article>
    `;
  }

  const imageFirst = storyLayout === "title-image-text";

  return `
    <article class="book-page">
      <div class="page-content${imageFirst ? " page-content--image-first" : ""}">
        ${titleMarkup}
        ${imageFirst ? imageMarkup : ""}
        <section class="page-text">
          ${buildParagraphs(page.paragraphs)}
        </section>
        ${imageFirst ? "" : imageMarkup}
        ${footerMarkup}
      </div>
    </article>
  `;
}
