import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { usePerfil } from "../context/PerfilContext";
import { atualizarPerfil, alterarSenha, atualizarFoto, removerFoto } from "../api/perfil";
import { mensagemDeErro } from "../api/erros";
import { Avatar } from "../components/Avatar";

const TIPOS_FOTO_PERMITIDOS = ["image/png", "image/jpeg"];
const TAMANHO_MAXIMO_FOTO_BYTES = 2 * 1024 * 1024;

// Mesmo padrão de card usado em Objetivos/Últimas despesas/Investimento CDB
// da Home (`home-layout-atual.md` seção 5): fundo branco, borda sutil, sombra leve.
const classeCard = "space-y-4 rounded-lg border border-grouper-sky/20 bg-white p-5 shadow-sm";
const classeInput =
  "w-full rounded-md border border-grouper-sky/40 px-3 py-2 text-grouper-ink focus:border-grouper-mid focus:outline-none focus:ring-2 focus:ring-grouper-mid/50";
const classeLabel = "text-sm font-medium text-grouper-navy";
const classeBotaoSalvar =
  "rounded-md bg-grouper-mid px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-white hover:bg-grouper-deep disabled:opacity-60";
// Título de seção em Khand, igual a todos os outros cards do app.
const classeTitulo = "font-display text-lg font-semibold text-grouper-ink";

// Ícone de câmera (mesmo estilo outline/currentColor de IconesInvestimento.tsx),
// só usado aqui para o botão de trocar foto sobreposto ao avatar.
function IconeCamera({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M3 7a1 1 0 011-1h2l1-1.5h6L14 6h2a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V7z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10.5" r="2.3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function BannerErro({ mensagem }: { mensagem: string }) {
  return (
    <p className="rounded-md border-l-4 border-black bg-black/5 px-3 py-2 text-sm text-grouper-ink">
      {mensagem}
    </p>
  );
}

function BannerSucesso({ mensagem }: { mensagem: string }) {
  return (
    <p className="rounded-md border border-grouper-mid bg-grouper-mist px-3 py-2 text-sm text-grouper-ink">
      {mensagem}
    </p>
  );
}

// Cartão de identidade no topo: avatar grande com botão de câmera sobreposto
// (hover) para trocar a foto direto por ali, nome + e-mail em destaque. É o
// elemento de assinatura da página — a foto de perfil deixa de ser um campo
// de formulário qualquer e vira o centro visual de "quem é você" no app.
function CartaoIdentidade() {
  const { perfil, recarregar } = usePerfil();
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function aoEscolherArquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;
    setErro(null);

    if (!TIPOS_FOTO_PERMITIDOS.includes(arquivo.type)) {
      setErro("Formato de imagem não suportado. Use PNG ou JPEG.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_FOTO_BYTES) {
      setErro("Imagem excede o tamanho máximo de 2MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setCarregando(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(leitor.result as string);
        leitor.onerror = () => reject(leitor.error);
        leitor.readAsDataURL(arquivo);
      });
      // dataUrl = "data:image/png;base64,AAAA..." — o backend espera só a
      // parte pura do base64, sem o prefixo.
      const fotoBase64 = dataUrl.split(",")[1] ?? "";
      await atualizarFoto({ fotoBase64, tipo: arquivo.type });
      await recarregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function aoRemover() {
    setErro(null);
    setCarregando(true);
    try {
      await removerFoto();
      await recarregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className={classeCard}>
      {erro && <BannerErro mensagem={erro} />}
      <div className="flex items-center gap-5">
        <div className="group relative shrink-0">
          <Avatar tamanho="lg" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={carregando}
            aria-label="Alterar foto de perfil"
            title="Alterar foto de perfil"
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-grouper-mid text-white shadow-sm transition-colors hover:bg-grouper-deep disabled:opacity-60"
          >
            <IconeCamera />
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={aoEscolherArquivo}
            disabled={carregando}
            className="hidden"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-2xl font-semibold text-grouper-ink">
            {perfil?.nome || " "}
          </p>
          <p className="truncate text-sm text-grouper-navy/70">{perfil?.email}</p>
          {carregando && (
            <p className="mt-1 text-xs font-medium text-grouper-deep">Enviando foto...</p>
          )}
          {!carregando && perfil?.fotoBase64 && (
            <button
              type="button"
              onClick={aoRemover}
              className="mt-1 text-xs font-medium text-grouper-navy/60 underline-offset-2 hover:text-grouper-ink hover:underline"
            >
              Remover foto
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Seção "Dados pessoais": nome + e-mail, exige senha atual para confirmar.
function SecaoDadosPessoais() {
  const { perfil, recarregar } = usePerfil();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!perfil) return;
    setNome(perfil.nome);
    setEmail(perfil.email);
  }, [perfil]);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSucesso(false);
    setCarregando(true);
    try {
      await atualizarPerfil({ nome, email, senhaAtual });
      setSenhaAtual("");
      setSucesso(true);
      await recarregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={aoEnviar} className={classeCard}>
      <h2 className={classeTitulo}>Dados pessoais</h2>
      {erro && <BannerErro mensagem={erro} />}
      {sucesso && <BannerSucesso mensagem="Dados atualizados com sucesso." />}

      <div className="space-y-1">
        <label htmlFor="perfil-nome" className={classeLabel}>
          Nome
        </label>
        <input
          id="perfil-nome"
          type="text"
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className={classeInput}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="perfil-email" className={classeLabel}>
          E-mail
        </label>
        <input
          id="perfil-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={classeInput}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="perfil-senha-atual" className={classeLabel}>
          Senha atual <span className="text-grouper-navy/50">(para confirmar)</span>
        </label>
        <input
          id="perfil-senha-atual"
          type="password"
          required
          value={senhaAtual}
          onChange={(e) => setSenhaAtual(e.target.value)}
          className={classeInput}
        />
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={carregando} className={classeBotaoSalvar}>
          {carregando ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}

// Seção "Alterar senha": senha atual + nova senha + confirmação.
function SecaoAlterarSenha() {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSucesso(false);
    if (novaSenha === senhaAtual) {
      setErro("A nova senha não pode ser igual à senha atual.");
      return;
    }
    if (novaSenha !== confirmarNovaSenha) {
      setErro("A confirmação não bate com a nova senha.");
      return;
    }
    setCarregando(true);
    try {
      await alterarSenha({ senhaAtual, novaSenha });
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarNovaSenha("");
      setSucesso(true);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={aoEnviar} className={classeCard}>
      <h2 className={classeTitulo}>Alterar senha</h2>
      {erro && <BannerErro mensagem={erro} />}
      {sucesso && <BannerSucesso mensagem="Senha alterada com sucesso." />}

      <div className="space-y-1">
        <label htmlFor="senha-atual" className={classeLabel}>
          Senha atual
        </label>
        <input
          id="senha-atual"
          type="password"
          required
          value={senhaAtual}
          onChange={(e) => setSenhaAtual(e.target.value)}
          className={classeInput}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="nova-senha" className={classeLabel}>
          Nova senha <span className="text-grouper-navy/50">(mínimo 8 caracteres)</span>
        </label>
        <input
          id="nova-senha"
          type="password"
          required
          minLength={8}
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          className={classeInput}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="confirmar-nova-senha" className={classeLabel}>
          Confirmar nova senha
        </label>
        <input
          id="confirmar-nova-senha"
          type="password"
          required
          minLength={8}
          value={confirmarNovaSenha}
          onChange={(e) => setConfirmarNovaSenha(e.target.value)}
          className={classeInput}
        />
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={carregando} className={classeBotaoSalvar}>
          {carregando ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}

export function ConfiguracoesPage() {
  return (
    <div className="w-full space-y-4">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-grouper-ink">
        Configurações
      </h1>

      <CartaoIdentidade />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SecaoDadosPessoais />
        <SecaoAlterarSenha />
      </div>
    </div>
  );
}
