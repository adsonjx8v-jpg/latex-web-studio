Terceiros incluídos no LumaTex

## TeXlyre BusyTeX

O diretório `vendor/busytex/` contém a API JavaScript do TeXlyre BusyTeX 1.4.0 e os auxiliares da engine TeX Live 2026. O WASM principal é carregado sob demanda pelo `busytex-sw.js` do host público do BusyTeX; `vendor/busytex/busytex.wasm` é apenas uma nota pequena para o limite de envio do GitHub. A API e os assets BusyTeX são distribuídos sob GNU AGPL versão 3 ou posterior, conforme os avisos dos projetos de origem. Os textos das licenças estão em `vendor/busytex/LICENSE` e `vendor/busytex/BUILD-LICENSE`.

- API e código-fonte: https://github.com/TeXlyre/texlyre-busytex/tree/1d9ba827ad0da2c85d05da2ada26a4debf6df81e
- Build da engine TeX Live 2026: https://github.com/TeXlyre/texlyre-busytex-build/tree/v2026.1.0
- Compilação no navegador e busca de pacotes: https://github.com/TeXlyre/texlyre-busytex

Os arquivos base TeX Live são carregados do projeto público BusyTeX, e pacotes adicionais são buscados do servidor TeX Live 2026. Os pacotes CTAN mantêm suas próprias licenças e avisos.

## MathJax

A prévia rápida usa MathJax hospedado no jsDelivr. O PDF baixado é produzido pelo compilador TeX Live, não pelo MathJax.
## SwiftLaTeX legado

Os arquivos preservados em `vendor/swiftlatex/` são uma cópia não utilizada pela compilação atual, obtida do TeXbrain (https://github.com/swimmingbrain/texbrain/tree/main/static/swiftlatex). O wrapper identifica a licença EPL-2.0 ou GPL-2.0 com Classpath exception; o texto EPL-2.0 está em `vendor/swiftlatex/EPL-2.0.html`. O código-fonte está em https://github.com/SwiftLaTeX/SwiftLaTeX.