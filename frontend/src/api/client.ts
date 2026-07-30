import axios from "axios";

// Chave usada no localStorage do navegador para guardar o JWT.
// Exportada para o AuthContext usar a MESMA chave (fonte única de verdade).
export const TOKEN_KEY = "financas.token";

// Instância única do axios para todo o app.
// baseURL = onde o backend Spring Boot responde (dev local, porta 8080).
// Assim, nas chamadas usamos só o caminho relativo: api.post("/auth/login", ...).
export const api = axios.create({
  baseURL: "http://localhost:8080/api",
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

// INTERCEPTOR DE RESPONSE: trata a SESSÃO EXPIRADA de forma global.
// Quando o token vence (2h), o backend responde 401. Como esse interceptor vive
// fora do React Router, limpamos o token e forçamos a navegação para /login
// (com ?expirada=1, para o Login exibir o aviso). Assim o app não fica travado
// dando erro em toda tela — ele volta para o login sozinho.
// Exceções: 401 no próprio /auth/login|registrar é "credencial inválida", não
// sessão expirada, então deixamos a página tratar normalmente.
api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    const url = erro.config?.url ?? "";
    const ehRotaDeAuth = url.includes("/auth/");
    if (erro.response?.status === 401 && !ehRotaDeAuth) {
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
