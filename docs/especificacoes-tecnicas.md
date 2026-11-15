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
20. O arquivo `agradecimentos.json` deve ser carregado imediatamente apos a capa, antes dos demais conteudos do livro.
21. A priorizacao especial apos a capa deve considerar especificamente o arquivo `agradecimentos.json`, com esse nome.
22. O livro deve conter um sumario gerado dinamicamente.
23. O sumario deve exibir cada titulo carregado do conteudo.
24. Cada item do sumario deve exibir tambem o numero da pagina em que o respectivo titulo aparece.
25. Ao clicar em um item do sumario, o livro deve navegar para a pagina que contem o titulo selecionado.
26. Cada titulo deve aparecer apenas uma vez no sumario.
27. Quando um mesmo conteudo ocupar varias paginas, o sumario deve apontar para a primeira pagina em que o titulo desse conteudo aparece.
28. Se existir um arquivo de imagem chamado `CONTRA-CAPA` na pasta `resources`, essa imagem deve ser usada como contracapa visual do livro.
29. A contracapa deve ser exibida apos `creditos-finais`.
30. A contracapa deve se comportar como capa rigida de fechamento do livro.
31. A pagina `creditos-finais` nao deve ser tratada como capa rigida; sua virada deve permanecer suave como a das paginas internas.

## Requisitos de Estrutura

1. O projeto deve ser criado com stack moderna baseada em TypeScript.
2. O processo de leitura dos arquivos deve considerar pareamento entre texto e imagem por nome-base.
3. O mecanismo de paginacao deve medir o conteudo dinamicamente para determinar quebras de pagina.
4. O layout deve prever paginas de texto, paginas hibridas de texto + imagem e paginas exclusivas de imagem.
5. A capa deve ser tratada como uma pagina especial, fora do fluxo de paginacao dos capitulos.

## Regras de Conteudo e Paginacao

1. O arquivo de conteudo deve ser lido em formato JSON.
2. O titulo principal de cada item deve vir do atributo `titulo`.
3. O conteudo textual deve ser obtido a partir do atributo `listaParagrafos`, usando o valor de `paragrafo` em cada item da colecao.
4. Enquanto ainda existir texto nao renderizado do mesmo arquivo JSON, novas paginas devem ser criadas para continuar exatamente esse mesmo conteudo.
5. Cada pagina deve ser preenchida com a maior quantidade de texto possivel antes da criacao da proxima pagina.
6. Quando um mesmo `paragrafo` do JSON continuar na pagina seguinte, essa continuacao nao deve ser tratada como um novo paragrafo.
7. A tabulacao deve aparecer apenas no inicio real de cada `paragrafo` original vindo do JSON.
8. A continuacao de um `paragrafo` quebrado entre paginas nao deve receber nova tabulacao.
9. Deve haver separacao visual entre paragrafos distintos, preservando a quebra entre um item `paragrafo` e o proximo.
10. O sistema deve evitar deixar fragmentos muito pequenos do proximo `paragrafo` no fim da pagina.
11. Se no espaco restante da pagina couber apenas um trecho muito curto do proximo `paragrafo`, esse `paragrafo` deve ser movido integralmente para a pagina seguinte.
12. Em telas pequenas, a regra de paginacao deve permanecer a mesma: o texto deve continuar sendo quebrado dinamicamente e distribuido em novas paginas sempre que nao couber no espaco visivel.
13. O sistema deve considerar o tamanho real da pagina renderizada para calcular as quebras de texto, inclusive em dispositivos moveis.
14. Sempre que houver mudanca relevante de tamanho de tela ou orientacao, o livro deve recalcular a paginacao para evitar corte de texto.
15. O sumario tambem deve ser recalculado dinamicamente sempre que a paginacao mudar, para manter corretos os numeros das paginas e os destinos dos links.

## Regras de Numeracao

1. As paginas internas do livro devem exibir numeracao no rodape.
2. A capa nao deve exibir numero de pagina.

## Requisitos Visuais

1. O fundo geral da aplicacao deve ser azul escuro.
2. As paginas devem manter margens internas consistentes.
3. O comportamento visual de abertura e fechamento deve se aproximar do exemplo oficial da biblioteca, com a diferenca de que o fundo visivel deve ser apenas o fundo da aplicacao.
4. Quando presente, a imagem `CAPA` deve ocupar a frente do livro como capa.
5. Quando presente, a imagem `CONTRA-CAPA` deve ocupar a parte final do livro como contracapa.

## Requisitos de Implementacao

1. O projeto deve conter uma especificacao tecnica em Markdown.
2. O codigo deve estar preparado para adicionar novos arquivos em `resources` sem necessidade de criar paginas manualmente.
3. O fluxo deve priorizar robustez em telas pequenas e medias, preservando legibilidade e area util de leitura.
