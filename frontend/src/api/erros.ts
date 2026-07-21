import { AxiosError } from "axios";

// Formato do ErrorResponse do backend (com.financas.app.exception.ErrorResponse).
interface ErrorResponseBody {
  status: number;
  mensagem: string;
  erros?: string[];
}

// Traduz qualquer erro (de rede ou HTTP) numa mensagem legível para o usuário.
// - Sem resposta do servidor (backend desligado / CORS) -> aviso de conexão.
// - Com resposta -> usa o campo "mensagem" do ErrorResponse; se houver "erros"
//   de validação (@Valid -> 400), junta todos.
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof AxiosError) {
    if (!erro.response) {
      return "Não foi possível conectar ao servidor. Ele está rodando?";
    }
    const corpo = erro.response.data as ErrorResponseBody | undefined;
    if (corpo?.erros && corpo.erros.length > 0) {
      return corpo.erros.join(" • ");
    }
    if (corpo?.mensagem) {
      return corpo.mensagem;
    }
  }
  return "Ocorreu um erro inesperado. Tente novamente.";
}
