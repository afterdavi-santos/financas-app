import { api } from "./client";
import type {
  AlterarSenhaRequest,
  AtualizarFotoRequest,
  AtualizarPerfilRequest,
  PerfilResponse,
} from "../types/perfil";

// GET /api/perfil/me -> dados do usuário autenticado (nome, email, foto).
export async function buscarPerfil(): Promise<PerfilResponse> {
  const resposta = await api.get<PerfilResponse>("/perfil/me");
  return resposta.data;
}

// PUT /api/perfil -> atualiza nome/email (exige senha atual).
export async function atualizarPerfil(
  dados: AtualizarPerfilRequest,
): Promise<PerfilResponse> {
  const resposta = await api.put<PerfilResponse>("/perfil", dados);
  return resposta.data;
}

// PUT /api/perfil/senha -> troca a senha (exige senha atual). 204 sem corpo.
export async function alterarSenha(dados: AlterarSenhaRequest): Promise<void> {
  await api.put("/perfil/senha", dados);
}

// PUT /api/perfil/foto -> envia a foto (base64 puro + tipo MIME).
export async function atualizarFoto(
  dados: AtualizarFotoRequest,
): Promise<PerfilResponse> {
  const resposta = await api.put<PerfilResponse>("/perfil/foto", dados);
  return resposta.data;
}

// DELETE /api/perfil/foto -> remove a foto, volta ao placeholder.
export async function removerFoto(): Promise<PerfilResponse> {
  const resposta = await api.delete<PerfilResponse>("/perfil/foto");
  return resposta.data;
}
