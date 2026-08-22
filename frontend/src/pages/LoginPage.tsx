import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { login as loginApi } from "../api/auth";
import { mensagemDeErro } from "../api/erros";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  // "Estado controlado": cada input tem seu valor no estado do React.
  // A cada tecla, onChange atualiza o estado e o React re-renderiza o campo.
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const { login } = useAuth(); // guarda o token no contexto/localStorage
  const navigate = useNavigate(); // troca de rota sem recarregar a página
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Vindo de /registrar com sucesso? Mostra um aviso verde uma única vez.
  const recemRegistrado =
    (location.state as { registrado?: boolean } | null)?.registrado === true;

  // Redirecionado por sessão expirada (interceptor de 401 em api/client.ts).
  const sessaoExpirada = searchParams.get("expirada") === "1";

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault(); // impede o reload padrão do <form> do HTML
    setErro(null);
    setCarregando(true);
    try {
      const { token } = await loginApi({ email, senha });
      login(token); // agora estamos autenticados
      navigate("/"); // vai para o dashboard (rota protegida)
    } catch (e) {
      setErro(mensagemDeErro(e)); // ex.: 401 -> "Credenciais inválidas"
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-grouper-ink p-4">
      <img
        src="/brand/garoupa-fundo-login.webp"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-15"
      />
      <form
        onSubmit={aoEnviar}
        className="relative z-10 w-full max-w-sm bg-grouper-ink border border-white/10 rounded-xl shadow-xl p-8 space-y-5"
      >
        <img
          src="/brand/logomarca-branca.svg"
          alt="Logo"
          className="h-24 w-auto mx-auto"
        />

        <h1 className="font-display text-2xl font-bold text-white text-center">
          Entrar
        </h1>

        {recemRegistrado && !erro && (
          <p className="bg-green-50 text-green-700 text-sm rounded-md px-3 py-2">
            Conta criada! Faça login para continuar.
          </p>
        )}

        {sessaoExpirada && !erro && (
          <p className="bg-amber-50 text-amber-700 text-sm rounded-md px-3 py-2">
            Sua sessão expirou. Entre novamente para continuar.
          </p>
        )}

        {erro && (
          <p className="bg-red-50 text-red-700 text-sm rounded-md px-3 py-2">
            {erro}
          </p>
        )}

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-white/80">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-grouper-mid"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="senha" className="text-sm font-medium text-white/80">
            Senha
          </label>
          <input
            id="senha"
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-grouper-mid"
          />
        </div>

        <button
          type="submit"
          disabled={carregando}
          className="w-full bg-grouper-mid text-white font-medium rounded-md py-2 hover:bg-grouper-deep disabled:opacity-60"
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>

        <p className="text-sm text-center text-white/70">
          Não tem conta?{" "}
          <Link to="/registrar" className="text-grouper-sky hover:underline">
            Criar conta
          </Link>
        </p>
      </form>
    </div>
  );
}
