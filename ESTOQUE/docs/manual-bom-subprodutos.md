# Manual de Subprodutos/Co-produtos e Estrutura (BOM)

Este guia explica, passo a passo, como configurar a Estrutura de Produto (BOM) e o cadastro de Subprodutos/Co-produtos no módulo **🛠️ Produção (BOM)** do sistema Casa Rosa. Ele descreve o propósito de cada formulário, os campos obrigatórios e o impacto nas rotinas de produção.

## 1. Visão geral dos conceitos

### Estrutura (BOM)
A **Bill of Materials (BOM)** é a ficha técnica do produto. Nela você vincula todos os insumos/itens necessários para fabricar uma unidade do produto acabado, informando também a perda padrão esperada. Cada componente registrado será baixado automaticamente do estoque quando uma produção for apontada.【F:ESTOQUE/app.html†L126-L150】【F:ESTOQUE/app.js†L374-L427】【F:ESTOQUE/app.js†L681-L751】

### Subprodutos / Co-produtos
Subprodutos (ou co-produtos) são itens gerados como resultado paralelo da produção, por exemplo, sobras aproveitáveis ou produtos irmãos. Ao cadastrá-los, o sistema lança automaticamente entradas desses itens sempre que uma produção é concluída, com custo zero ou o custo definido nas regras internas.【F:ESTOQUE/app.html†L151-L176】【F:ESTOQUE/app.js†L429-L481】【F:ESTOQUE/app.js†L681-L738】【F:ESTOQUE/app.js†L765-L775】

## 2. Pré-requisitos antes do cadastro

1. **Itens e insumos cadastrados:** certifique-se de que todos os produtos acabados, componentes e subprodutos estejam registrados no módulo *📦 Itens & Insumos*. Os códigos digitados nos formulários devem coincidir com os códigos cadastrados.【F:ESTOQUE/app.html†L56-L107】
2. **Usuário autenticado:** somente usuários logados pelo Firebase Auth acessam a tela principal, onde estão os formulários de produção.【F:ESTOQUE/app.js†L46-L69】
3. **Unidades de medida e conversões (opcional):** se o consumo de algum componente for registrado em unidade diferente da unidade base, configure a conversão em *Conversão de unidades* antes de montar a BOM.【F:ESTOQUE/app.html†L108-L124】

## 3. Acessando o módulo Produção (BOM)

1. Após o login, utilize o menu lateral e clique em **🛠️ Produção (BOM)** para exibir os cartões de Estrutura de Produto, Subprodutos e demais rotinas de produção.【F:ESTOQUE/app.html†L21-L177】
2. Confira se os formulários exibidos correspondem ao produto que deseja configurar.

## 4. Como preencher a Estrutura (BOM)

O cartão **Estrutura (BOM) de produto** contém um formulário para adicionar componentes e uma tabela que lista os itens já vinculados.

### 4.1 Campos do formulário
- **Produto (código):** informe o código do produto acabado. O sistema converte automaticamente para letras maiúsculas ao salvar.【F:ESTOQUE/app.html†L126-L150】【F:ESTOQUE/app.js†L375-L386】
- **Item/insumo:** código do componente que será baixado do estoque durante a produção.【F:ESTOQUE/app.html†L126-L150】【F:ESTOQUE/app.js†L375-L386】
- **Quantidade por produto:** quantidade consumida do componente para fabricar uma unidade do produto. Aceita casas decimais com quatro dígitos.【F:ESTOQUE/app.html†L126-L150】【F:ESTOQUE/app.js†L375-L386】
- **Perda padrão (%):** percentual adicional aplicado automaticamente no consumo para cobrir perdas de processo.【F:ESTOQUE/app.html†L126-L150】【F:ESTOQUE/app.js†L375-L386】

### 4.2 Salvando e revisando a BOM
1. Preencha todos os campos e clique em **Adicionar à BOM**. O sistema grava o componente na coleção `bom/{produto}/componentes` e limpa o formulário para o próximo item.【F:ESTOQUE/app.html†L145-L150】【F:ESTOQUE/app.js†L375-L386】
2. A tabela logo abaixo é atualizada automaticamente com os componentes atuais. Cada linha mostra o produto, o item, a quantidade e a perda padrão configurada.【F:ESTOQUE/app.html†L148-L150】【F:ESTOQUE/app.js†L388-L408】
3. Para remover um componente, clique em **Remover** na linha correspondente. O registro é marcado como excluído e a tabela é recarregada.【F:ESTOQUE/app.html†L148-L150】【F:ESTOQUE/app.js†L410-L412】
4. Utilize o botão **Carregar BOM** (na seção *BOM do produto (visualização)*) para consultar a ficha técnica de um produto sem alterá-la. Informe o código em *Produto (código)* e clique no botão para preencher a grade somente leitura.【F:ESTOQUE/app.html†L401-L406】【F:ESTOQUE/app.js†L415-L427】

### 4.3 Como a BOM é utilizada na produção
- Ao criar uma nova Ordem de Produção (OP), o sistema verifica se a BOM existe. Sem ela, a OP não pode ser gerada.【F:ESTOQUE/app.js†L483-L505】
- Durante o apontamento parcial ou final (`Produzir parcial`), cada componente da BOM é baixado automaticamente, considerando a quantidade produzida e o percentual de perda padrão.【F:ESTOQUE/app.js†L681-L711】
- As informações da BOM também alimentam o cálculo de custo previsto da OP, somando o custo médio dos insumos e a perda padrão configurada.【F:ESTOQUE/app.js†L818-L855】

## 5. Como cadastrar Subprodutos / Co-produtos

O cartão **Subprodutos / Co-produtos** permite registrar itens gerados paralelamente à produção principal.

### 5.1 Campos do formulário
- **Produto (código):** código do produto principal ao qual o subproduto está vinculado.【F:ESTOQUE/app.html†L151-L176】【F:ESTOQUE/app.js†L429-L441】
- **Item subproduto:** código do item que será movimentado como entrada quando a produção ocorrer.【F:ESTOQUE/app.html†L151-L176】【F:ESTOQUE/app.js†L429-L441】
- **Qtd por unidade produzida:** quantidade do subproduto gerada para cada unidade final produzida. Aceita decimais com quatro casas.【F:ESTOQUE/app.html†L151-L176】【F:ESTOQUE/app.js†L429-L441】

### 5.2 Salvando e revisando subprodutos
1. Informe os campos e clique em **Adicionar subproduto**. O sistema valida se produto e item foram preenchidos, grava o registro em `subprodutos/{produto}/itens` e limpa o formulário.【F:ESTOQUE/app.html†L151-L176】【F:ESTOQUE/app.js†L429-L441】
2. Para listar os subprodutos existentes, digite o código do produto em *Produto (código)* na barra da tabela e clique em **Listar subprodutos**. A grade será preenchida com os registros ativos.【F:ESTOQUE/app.html†L171-L176】【F:ESTOQUE/app.js†L443-L476】
3. Utilize o botão **Remover** para excluir um subproduto específico. O sistema marca o registro como excluído e atualiza a lista.【F:ESTOQUE/app.html†L171-L176】【F:ESTOQUE/app.js†L475-L480】

### 5.3 Como os subprodutos são aplicados
- Quando uma produção é apontada, cada subproduto cadastrado gera automaticamente uma movimentação de **ENTRADA** com a quantidade proporcional à produção. O movimento é registrado com causa `SUBPRODUTO` e centro de custo `PRODUCAO`.【F:ESTOQUE/app.js†L681-L738】
- A função `obterSubprodutos` garante que apenas registros ativos (não excluídos) sejam considerados nas entradas automáticas.【F:ESTOQUE/app.js†L765-L775】

## 6. Boas práticas de uso

1. **Nomeie códigos de forma consistente:** utilize padrões como `PRODUTO-ACABADO` e `ITEM-COMPONENTE` para facilitar buscas e evitar duplicidades.
2. **Revise perdas padrão periodicamente:** acompanhe o relatório de perdas reais em *Produção* e ajuste a perda padrão na BOM sempre que houver desvios significativos.【F:ESTOQUE/app.js†L818-L855】
3. **Acompanhe estoques de subprodutos:** monitore se as entradas automáticas estão coerentes com a produção real e crie relatórios específicos quando necessário.
4. **Use o recurso de conversão de unidades** para garantir que os consumos lançados em unidades alternativas (ex.: folha, chapa, kg) sejam convertidos corretamente para a unidade base do item.【F:ESTOQUE/app.html†L108-L124】
5. **Teste em ambiente seguro:** antes de aplicar mudanças críticas na BOM ou nos subprodutos, simule em um produto de teste ou revise com a equipe de PCP para garantir consistência no custo e nas baixas de estoque.

Com esses passos, você terá a Estrutura de Produto e os Subprodutos configurados corretamente, garantindo que o sistema aplique automaticamente as baixas de insumos, entradas de produtos e subprodutos em cada ordem de produção.
