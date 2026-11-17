# CadernoFrete

Aplicativo React + TypeScript + Vite, com foco em Android e adaptação a tablets e desktop.

## Executar

```bash
npm install
npm run dev
```

## Recursos

- Tela inicial com busca, fretes em andamento e concluídos, troca por gesto horizontal.
- Criar, editar, excluir com confirmação, salvar e marcar como finalizado.
- Recuperar fretes finalizados para a lista de andamento, mediante confirmação.
- Armazenamento no dispositivo via localStorage. Sem sincronização ou backup externo: limpar dados do navegador pode apagar as anotações.
- Cálculo de frete, despesas, imprevistos e caderno manuscrito com variáveis destacadas.
- Campos de dinheiro aceitam expressões como `500 + 600` e `500 % 10` (10% de 500). O resultado é gravado ao sair do campo ou pressionar Enter.
- Histórico legado importado quando disponível.

## Observações

O app é web e o armazenamento é por navegador/perfil no dispositivo. Para armazenamento mais resiliente e grandes volumes, migrar para IndexedDB. O projeto não foi testado em dispositivos físicos neste ambiente.

## Atualizações desta versão
- Imprevistos com sinal explícito: despesa (−) ou recebimento extra (+). Os valores são armazenados como magnitude positiva e o sinal define seu efeito.
- Calculadora inteligente para os dois tipos de imprevisto, inclusive na janela do caderno.
- Sobra da viagem somente leitura, calculada pelas entradas.
- Dados armazenados no localStorage do navegador; sem sincronização ou garantia de preservação após limpeza de dados.
