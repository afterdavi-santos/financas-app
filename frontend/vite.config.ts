import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// A CSP que protege este app contra XSS precisa vir no documento HTML, não na
// resposta da API: o navegador aplica CSP ao documento que carregou a página e
// ignora o header de uma resposta de fetch. Por isso ela mora aqui, e não no
// SecurityConfig do backend (que serve só JSON).
//
// O que ela vale: o JWT fica no localStorage, então um XSS não rouba um dado —
// rouba a sessão inteira, por até 7 dias e sem revogação. `script-src 'self'`
// é a linha que importa: mesmo que um dia entre um sink de XSS (hoje não há
// nenhum: zero dangerouslySetInnerHTML, zero innerHTML) ou uma dependência npm
// comprometida, script inline injetado não executa.
// A origem que o `connect-src` precisa liberar. O axios usa a URL inteira
// (com o /api), mas a CSP raciocina em ORIGEM — esquema + host + porta, sem
// caminho. Daí o `new URL(...).origin`: passar a URL com caminho faria a
// diretiva ser ignorada em silêncio, e o sintoma seria toda chamada à API
// bloqueada só no build (nunca no dev, que não tem CSP).
function origemDaApi(apiUrl: string): string {
  try {
    return new URL(apiUrl).origin
  } catch {
    // URL relativa (ex.: "/api", quando front e API saem do mesmo domínio):
    // não há origem externa a liberar, o 'self' já cobre.
    return ''
  }
}

function montarPolitica(apiUrl: string): string {
  const origemApi = origemDaApi(apiUrl)
  return [
    "default-src 'self'",
    // Sem 'unsafe-inline' e sem 'unsafe-eval' — é o ponto do exercício.
    "script-src 'self'",
    // 'unsafe-inline' aqui é concessão ao React e ao Recharts, que aplicam estilo
    // inline em elemento e injetam <style> em runtime. Em style-src isso é bem
    // menos grave que em script-src: no máximo permite mexer na aparência.
    // fonts.googleapis.com serve o CSS das fontes (index.html:9-12).
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // O CSS do Google aponta para os arquivos .woff2 neste outro domínio.
    "font-src 'self' https://fonts.gstatic.com",
    // data: é obrigatório: a foto de perfil chega como data: URI dentro do JSON
    // (UsuarioController.toResponse).
    "img-src 'self' data:",
    // Onde o axios fala (src/api/client.ts) — a mesma VITE_API_URL, para a
    // política nunca discordar do endereço que o app realmente chama.
    `connect-src 'self'${origemApi ? ' ' + origemApi : ''}`,
    // Nada de <object>/<embed>, e nenhuma página pode ser embutida em iframe.
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ].join('; ')
}

// apply: 'build' é o detalhe que faz isso ser viável. O dev server do Vite usa
// script inline, eval e um WebSocket de HMR — a política acima derrubaria o
// `npm run dev` inteiro. Em produção nada disso existe.
function cspNoBuild(apiUrl: string): Plugin {
  return {
    name: 'csp-no-build',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: {
            'http-equiv': 'Content-Security-Policy',
            content: montarPolitica(apiUrl),
          },
          injectTo: 'head-prepend',
        },
      ]
    },
  }
}

// https://vite.dev/config/
// A função recebe o `mode` para poder ler o .env do ambiente com loadEnv —
// `import.meta.env` não existe aqui, este arquivo roda no Node, não no
// navegador. O terceiro argumento '' desliga o filtro de prefixo, mas
// continuamos lendo só VITE_API_URL.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL ?? 'http://localhost:8080/api'

  return {
    // O plugin do Tailwind v4 substitui o antigo tailwind.config.js + postcss.
    plugins: [react(), tailwindcss(), cspNoBuild(apiUrl)],
    // O preview usaria a 4173 por padrão, mas o CORS do backend libera só a
    // 5173 (app.cors.allowed-origins). Sem fixar aqui, testar o build de
    // produção dá erro de CORS em toda chamada à API — e o sintoma é fácil de
    // confundir com a CSP bloqueando algo. Fixar a porta é melhor que
    // acrescentar mais uma origem à lista do backend só por causa de teste local.
    preview: { port: 5173, strictPort: true },
    build: {
      // Quando o build gera mais de um chunk, o Vite injeta um <script> INLINE
      // com o polyfill de modulepreload — e ele morreria em `script-src 'self'`,
      // levando a página junto. Desligar o polyfill evita uma quebra que só
      // apareceria no dia em que o bundle passasse a ter code splitting. O
      // polyfill só serve a navegadores sem suporte a modulepreload, que é o
      // mesmo conjunto que já não roda um bundle de ES modules moderno.
      modulePreload: { polyfill: false },
    },
  }
})
