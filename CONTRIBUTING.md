# Contribuindo com o CadernoFrete

Obrigado pelo interesse em melhorar o CadernoFrete. O projeto está em desenvolvimento e contribuições pequenas, bem descritas e fáceis de testar são especialmente úteis.

## Antes de começar

- Use Node.js 20 ou superior e npm.
- Leia o README e verifique se a alteração já foi reportada em uma issue.
- Não inclua chaves, credenciais, dados pessoais ou arquivos gerados no commit.

## Ambiente local

```bash
npm install
npm run dev
```

## Branches e commits

Crie uma branch curta a partir de `main`, usando um prefixo que descreva o trabalho:

- `feat/` para melhorias ou novos recursos;
- `fix/` para correções;
- `docs/` para documentação;
- `chore/` para manutenção.

Escreva commits objetivos e explique a motivação quando a mudança não for evidente.

## Cuidados com o aplicativo

- Preserve o comportamento existente e a compatibilidade com os dados salvos no `localStorage`.
- Confira a interface em desktop, tablet e celular, especialmente quando alterar estilos ou navegação por toque.
- Evite adicionar dependências sem necessidade e justifique a inclusão no pull request.
- Não altere a logo oficial sem autorização.

## Verificações

Antes de abrir o pull request, execute:

```bash
npm run typecheck
npm run build
npm run lint --if-present
```

O lint é opcional no estado atual do projeto porque ainda não existe um script configurado para ele.

## Pull requests

Descreva o problema, a solução e os impactos da alteração. Inclua passos de reprodução para correções e capturas de tela ou gravações para mudanças visuais. Informe quais comandos foram executados e qualquer limitação conhecida.

Pull requests devem ser pequenos o suficiente para uma revisão cuidadosa. Alterações de escopo diferente devem ser separadas quando possível.
