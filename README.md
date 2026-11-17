<p align="center">
  <img src="./public/logo.png" alt="CadernoFrete" width="190">
</p>

<p align="center"><em>Seu frete, suas contas, tudo em um só lugar.</em></p>

<p align="center">
  <a href="https://manoelnunes-neto.github.io/Caderno-de-Frete/">Abrir demonstração</a>
</p>

# CadernoFrete

O CadernoFrete é um aplicativo web para caminhoneiros registrarem fretes, acompanharem custos e organizarem anotações de viagem em um só lugar. O projeto foi pensado para funcionar bem no computador, tablet e celular, inclusive sem depender de um servidor para guardar os dados.

> Status: MVP em desenvolvimento — versão preparada localmente como `v0.1.0` (pré-release).

## Funcionalidades implementadas

- Cadastro, edição, renomeação, exclusão, restauração, salvamento e finalização de fretes.
- Busca de fretes e separação entre rascunhos e fretes concluídos.
- Cálculo por quantidade e valor unitário ou por valor fechado.
- Cadastro de gastos previstos e visualização do total de despesas.
- Registro de imprevistos positivos ou negativos, com identificação visual pelo sinal do valor.
- Calculadora de expressões monetárias com `+`, `-`, `*`, `/` e `%`.
- Caderno de anotações com linhas, cursor, variáveis destacadas e inserção de dados do cálculo.
- Alternância entre a visualização da conta e a visualização detalhada dos dados usados no cálculo.
- Controles de zoom do papel, com limites, e navegação lateral entre abas em telas sensíveis ao toque.
- Persistência local no navegador.

## Tecnologias

- React 18
- TypeScript
- Vite
- Lucide React
- CSS responsivo, sem framework de componentes

## Como executar

Requisitos: Node.js 20 ou superior e npm.

```bash
npm install
npm run dev
```

O servidor de desenvolvimento ficará disponível no endereço indicado pelo Vite.

### Verificações locais

```bash
npm run typecheck
npm run build
```

O projeto ainda não possui um script de lint configurado. O workflow de CI executa o lint apenas quando esse script existir, sem adicionar dependências automaticamente.

## Armazenamento dos dados

Os dados são salvos no `localStorage` do navegador. Isso permite usar o caderno sem backend, mas também significa que os dados ficam vinculados ao navegador e ao dispositivo utilizados. Limpar os dados do site, trocar de navegador ou usar outro dispositivo pode remover ou não exibir os registros existentes.

Não há conta de usuário nem sincronização em nuvem implementadas neste momento.

## Estrutura principal

```text
.
├── public/                 # Recursos públicos, incluindo a logo e o manifesto
├── src/main.tsx            # Aplicação React e regras da interface
├── src/style.css           # Estilos responsivos
├── index.html              # Documento base e metadados do aplicativo
├── vite.config.ts          # Configuração do Vite e base do GitHub Pages
└── .github/                # CI, templates e automações do repositório
```

## Capturas de tela

As capturas de tela ainda não estão versionadas neste repositório. Quando forem adicionadas, esta seção será atualizada com imagens reais das principais telas.

## Contribuindo

Leia o [guia de contribuição](./CONTRIBUTING.md) antes de abrir uma issue ou pull request. Alterações de interface devem ser verificadas em desktop, tablet e celular.

## Histórico de versões

As alterações ficam registradas no [CHANGELOG](./CHANGELOG.md). A versão `v0.1.0` está preparada localmente, mas ainda não foi publicada como release.

## Licença

Ainda não há uma licença escolhida para o projeto. A sugestão é a licença MIT, por ser permissiva e simples para um projeto open-source, mas a decisão deve ser confirmada pelo mantenedor antes da criação do arquivo `LICENSE`.
