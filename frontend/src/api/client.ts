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
