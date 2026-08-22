# Fontes da identidade visual

O que **não** é servido ao navegador, mas precisa ser guardado.

- `brandbook.pptx` — fonte oficial dos 5 tons de azul e da tipografia.

Ficava em `frontend/public/`, que o Netlify publica inteira: qualquer pessoa com o
endereço baixava o brandbook, e ele contava 866 KB no site sem nunca ser usado por
nenhuma tela.

## Os originais das imagens de fundo

`garoupas_fundo_1.png` (11 MB), `Garoupa_fundo_login.png` (1,6 MB) e
`garoupas_fundo.jpeg` foram removidos de `public/` e substituídos pelas versões
WebP que as telas usam hoje. Os originais continuam recuperáveis do histórico do
git:

```
git log --all --oneline -- frontend/public/brand/garoupas_fundo_1.png
git show <commit>:frontend/public/brand/garoupas_fundo_1.png > original.png
```

Para regerar as versões servidas, o critério foi: as duas são **decorativas, a 15%
de opacidade**, então resolução e qualidade altas não têm efeito visível. A da
sidebar foi reduzida para 800px de altura (o `object-cover` de uma coluna de 240px
escala pela altura) com WebP q62; a de login manteve a largura original com q72.
