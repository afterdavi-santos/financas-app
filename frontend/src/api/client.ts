import axios from "axios";

// Chave usada no localStorage do navegador para guardar o JWT.
// Exportada para o AuthContext usar a MESMA chave (fonte única de verdade).
export const TOKEN_KEY = "financas.token";

// Instância única do axios para todo o app.
// baseURL = onde o backend Spring Boot responde. Assim, nas chamadas usamos
// só o caminho relativo: api.post("/auth/login", ...).
//
// Vem de VITE_API_URL, com o endereço local como padrão: sem a variável
// definida (o seu dia a dia), nada muda; no deploy, o painel da hospedagem
// define a variável e o mesmo código aponta para a API publicada.
//
// É lida em tempo de BUILD, não em runtime: o Vite substitui a expressão
// pelo literal ao gerar o bundle. Mudar a variável exige rebuildar o front —
// não adianta trocá-la e reiniciar, como se faria no backend.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8080/api",
  headers: { "Content-Type": "application/json" },
});

// INTERCEPTOR DE REQUEST: roda automaticamente ANTES de cada requisição sair.
// Se houver token salvo, injeta o header "Authorization: Bearer <token>".
// É o modelo stateless: o backend não guarda sessão, o cliente reenvia o JWT sempre.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Header em que o backend devolve um token renovado (sessão de janela
// deslizante — ver JwtAuthenticationFilter). Nome em minúsculas porque o
// axios normaliza as chaves de resposta assim.
const HEADER_TOKEN_RENOVADO = "x-renewed-token";

// INTERCEPTOR DE RESPONSE: trata a SESSÃO EXPIRADA de forma global, e
// atualiza o token salvo sempre que o backend renova (a cada requisição
// autenticada, enquanto a pessoa continuar usando — só é desconectada após
// 24h sem uso). Como esse interceptor vive fora do React Router, no caso de
// sessão expirada limpamos o token e forçamos a navegação para /login
// (com ?expirada=1, para o Login exibir o aviso) — assim o app não fica
// travado dando erro em toda tela, ele volta para o login sozinho.
// Exceções: 401 no próprio /auth/login|registrar é "credencial inválida", não
// sessão expirada, então deixamos a página tratar normalmente.
api.interceptors.response.use(
  (resposta) => {
    const tokenRenovado = resposta.headers[HEADER_TOKEN_RENOVADO];
    if (tokenRenovado) {
      localStorage.setItem(TOKEN_KEY, tokenRenovado);
    }
    return resposta;
  },
  (erro) => {
    const url = erro.config?.url ?? "";
    // /auth/* -> credenciais de login inválidas; /perfil* -> senha atual
    // errada ao editar dados/senha (SenhaAtualInvalidaException, também 401).
    // Nenhum dos dois é sessão expirada — deixamos a própria página tratar.
    const ehRotaSemLogoutAutomatico =
      url.includes("/auth/") || url.includes("/perfil");
    if (erro.response?.status === 401 && !ehRotaSemLogoutAutomatico) {
      const tinhaToken = localStorage.getItem(TOKEN_KEY) !== null;
      localStorage.removeItem(TOKEN_KEY);
      // Evita loop se já estivermos no login.
      if (tinhaToken && !window.location.pathname.startsWith("/login")) {
        window.location.assign("/login?expirada=1");
      }
    }
    return Promise.reject(erro);
  },
);
