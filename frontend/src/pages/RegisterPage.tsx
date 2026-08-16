import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registrar } from "../api/auth";
import { mensagemDeErro } from "../api/erros";
import { TermosDeUsoModal } from "../components/TermosDeUsoModal";

export function RegisterPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [modalTermosAberto, setModalTermosAberto] = useState(false);

  const navigate = useNavigate();

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      await registrar({ nome, email, senha, aceitouTermos });
      // O endpoint de registro não devolve token; mandamos o usuário
      // para o login já com um aviso de sucesso (via state da navegação).
      navigate("/login", { state: { registrado: true } });
    } catch (e) {
      setErro(mensagemDeErro(e)); // ex.: 409 -> "E-mail já cadastrado"
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-grouper-ink p-4">
      <img
        src="/brand/Garoupa_fundo_login.png"
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
          Criar conta
        </h1>

        {erro && (
          <p className="bg-red-50 text-red-700 text-sm rounded-md px-3 py-2">
            {erro}
          </p>
        )}

        <div className="space-y-1">
          <label htmlFor="nome" className="text-sm font-medium text-white/80">
            Nome
          </label>
          <input
            id="nome"
            type="text"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-grouper-mid"
          />
        </div>

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
            Senha <span className="text-white/50">(mínimo 8 caracteres)</span>
          </label>
          <input
            id="senha"
            type="password"
            required
            minLength={8}
            maxLength={72}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-grouper-mid"
          />
        </div>

        <label className="flex items-start gap-2 text-xs text-white/70">
          <input
            type="checkbox"
            checked={aceitouTermos}
            onChange={(e) => setAceitouTermos(e.target.checked)}
            required
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/30 bg-white/10 text-grouper-mid focus:ring-2 focus:ring-grouper-mid"
          />
          <span>
            Li e aceito os{" "}
            <button
              type="button"
              onClick={() => setModalTermosAberto(true)}
              className="text-grouper-sky underline hover:text-white"
            >
              Termos de Uso e a Política de Privacidade
            </button>
            .
          </span>
        </label>

        <button
          type="submit"
          disabled={carregando || !aceitouTermos}
          className="w-full bg-grouper-mid text-white font-medium rounded-md py-2 hover:bg-grouper-deep disabled:opacity-60"
        >
          {carregando ? "Criando..." : "Criar conta"}
        </button>

        <p className="text-sm text-center text-white/70">
          Já tem conta?{" "}
          <Link to="/login" className="text-grouper-sky hover:underline">
            Entrar
          </Link>
        </p>
      </form>

      <TermosDeUsoModal
        aberto={modalTermosAberto}
        onClose={() => setModalTermosAberto(false)}
      />
    </div>
  );
}
