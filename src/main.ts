import "./styles.css";
import { BookApp } from "./modules/book-app";

const appElement = document.querySelector<HTMLDivElement>("#app");

if (!appElement) {
  throw new Error("Elemento #app não encontrado.");
}

const bookApp = new BookApp(appElement);

bookApp.init().catch((error: unknown) => {
  console.error("Falha ao inicializar o livro.", error);
  const message =
    error instanceof Error ? error.message : "Erro desconhecido ao carregar o livro.";
  appElement.innerHTML = `
    <main class="app-shell">
      <section class="empty-state">
        <h1>Não foi possível carregar o livro</h1>
        <p>Verifique os arquivos da pasta <code>resources</code>.</p>
        <p><code>${message}</code></p>
      </section>
    </main>
  `;
});
