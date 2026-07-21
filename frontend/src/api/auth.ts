import { api } from "./client";
import type {
  LoginRequest,
  RegistroRequest,
  TokenResponse,
  UsuarioResponse,
} from "../types/auth";

// POST /api/auth/registrar -> cria usuário, devolve 201 com os dados públicos.
export async function registrar(
  dados: RegistroRequest,
): Promise<UsuarioResponse> {
  const resposta = await api.post<UsuarioResponse>("/auth/registrar", dados);
  return resposta.data;
}

// POST /api/auth/login -> valida credenciais, devolve o JWT.
export async function login(dados: LoginRequest): Promise<TokenResponse> {
  const resposta = await api.post<TokenResponse>("/auth/login", dados);
  return resposta.data;
}
