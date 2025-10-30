# Casa Rosa • Financeiro (Firebase)
Sistema web de gestão financeira completo, focado em **baixo consumo de Storage** com:
- Contas a pagar/receber com anexos (compressão WEBP + deduplicação por hash)
- Fluxo de caixa e relatórios (30 dias)
- Centros de custo e categorias
- Recorrências locais (gera próximos lançamentos ao abrir o app)
- Conciliação bancária (CSV simples: `data;descricao;valor`)

## Instalação
1. Publique os arquivos em um servidor estático (Firebase Hosting, GitHub Pages com CSP liberado, etc.).
2. No projeto Firebase `matheus-35023`, publique as regras:
   - `firestore.rules`
   - `storage.rules`

## Uso
- Clique em **Entrar** (Google). Se falhar, entra como anônimo.
- Vá em **Contas a Pagar/Receber** para criar lançamentos.
- Use **Anexar** para subir comprovantes/boletos — imagens serão convertidas para **WEBP** e deduplicadas por **SHA-256**.
- Em **Conciliação**, importe um CSV (cabecalho `data;descricao;valor`) e clique **Conciliar**.
- Em **Relatórios**, veja gráficos rápidos (Chart.js).

## Observações
- Estrutura padrão em `financeiro/default/...`.
- Ajuste `empresa` e qualidade de conversão em **Configurações**.
- Para Open Finance/API bancária, adicione um backend (Cloud Functions) e tokens do seu banco.
