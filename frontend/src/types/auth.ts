// Espelha os DTOs do backend (pacote com.financas.app.dto).
// Manter em sincronia com os records Java garante que o TypeScript
// avise em tempo de compilação se o formato de um payload divergir.

// -> RegistroRequest.java (nome, email, senha, aceitouTermos)
export interface RegistroRequest {
  nome: string;
  email: string;
  senha: string;
  aceitouTermos: boolean;
}

// -> LoginRequest.java (email, senha)
export interface LoginRequest {
  email: string;
  senha: string;
}

// -> TokenResponse.java ({ token })
export interface TokenResponse {
  token: string;
}

// -> UsuarioResponse.java ({ id, nome, email })
export interface UsuarioResponse {
  id: number;
  nome: string;
  email: string;
}
