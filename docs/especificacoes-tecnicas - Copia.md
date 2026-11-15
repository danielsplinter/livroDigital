# Especificacoes Tecnicas do Livro Digital

## Objetivo

Criar um projeto em TypeScript, usando a versao estavel mais moderna no momento da implementacao, para exibir um livro digital responsivo com efeito de virada de paginas usando a biblioteca `page-flip` (StPageFlip).

## Requisitos Funcionais

1. O livro deve usar a biblioteca apresentada em `https://nodlik.github.io/StPageFlip/`.
2. Todas as paginas devem ser geradas dinamicamente.
3. O livro deve ser responsivo para diferentes tamanhos de tela.
4. Os textos e as imagens devem ser lidos da pasta `resources`.
5. Os arquivos JSON de conteudo e as imagens devem possuir o mesmo nome-base.
6. O titulo deve ser lido do atributo `titulo` do arquivo JSON.
7. Cada paragrafo deve ser lido do atributo `paragrafo` dentro da colecao `listaParagrafos`.
8. O titulo deve ser exibido na area de titulo da primeira pagina referente ao arquivo lido.
9. O restante do conteudo textual deve ser distribuido automaticamente em uma ou mais paginas.
10. Se o texto nao couber em uma unica pagina, novas paginas devem ser criadas ate que todo o conteudo seja exibido.
11. Apos a paginacao completa do texto, a imagem de mesmo nome deve ser carregada.
12. Se a ultima pagina de texto tiver mais de 50% de espaco livre, a imagem deve ser inserida nessa mesma pagina.
13. Se a ultima pagina de texto tiver 50% ou menos de espaco livre, a imagem deve ser inserida em uma nova pagina exclusiva para imagem.
14. Apos concluir texto e imagem de um item, o sistema deve continuar o processamento dos proximos arquivos.
15. Ao chegar a primeira pagina e ocorrer a interacao de clicar, puxar e arrastar para a direita, o livro deve fechar.
16. Quando o livro estiver fechado, nao deve existir uma area visual residual no lado esquerdo.
17. Em vez de uma imagem de capa traseira visivel na area externa, o fundo exposto deve ser o `body` com cor azul escuro.
18. Todas as paginas devem possuir `padding` em todos os lados para evitar que o texto ultrapasse a regiao visivel em telas pequenas.
19. Se existir um arquivo de imagem chamado `CAPA` na pasta `resources`, essa imagem deve ser usada como capa visual do livro.

## Requisitos de Estrutura

1. O projeto deve ser criado com stack moderna baseada em TypeScript.
2. O processo de leitura dos arquivos deve considerar pareamento entre texto e imagem por nome-base.
3. O mecanismo de paginacao deve medir o conteudo dinamicamente para determinar quebras de pagina.
4. O layout deve prever paginas de texto, paginas hibridas de texto + imagem e paginas exclusivas de imagem.
5. A capa deve ser tratada como uma pagina especial, fora do fluxo de paginacao dos capitulos.

## Requisitos Visuais

1. O fundo geral da aplicacao deve ser azul escuro.
2. As paginas devem manter margens internas consistentes.
3. O comportamento visual de abertura e fechamento deve se aproximar do exemplo oficial da biblioteca, com a diferenca de que o fundo visivel deve ser apenas o fundo da aplicacao.
4. Quando presente, a imagem `CAPA` deve ocupar a frente do livro como capa.

## Requisitos de Implementacao

1. O projeto deve conter uma especificacao tecnica em Markdown.
2. O codigo deve estar preparado para adicionar novos arquivos em `resources` sem necessidade de criar paginas manualmente.
3. O fluxo deve priorizar robustez em telas pequenas e medias, preservando legibilidade e area util de leitura.
