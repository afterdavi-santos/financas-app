// Espelha os DTOs do backend (pacote com.financas.app.dto), rota /api/perfil.

// -> PerfilResponse.java ({ id, nome, email, fotoBase64 })
export interface PerfilResponse {
  id: number;
  nome: string;
  email: string;
  fotoBase64: string | null;
}

// -> AtualizarPerfilRequest.java (nome, email, senhaAtual)
export interface AtualizarPerfilRequest {
  nome: string;
  email: string;
  senhaAtual: string;
}

// -> AlterarSenhaRequest.java (senhaAtual, novaSenha)
export interface AlterarSenhaRequest {
  senhaAtual: string;
  novaSenha: string;
}

// -> AtualizarFotoRequest.java (fotoBase64 puro, sem prefixo "data:...", tipo)
export interface AtualizarFotoRequest {
  fotoBase64: string;
  tipo: string;
}
