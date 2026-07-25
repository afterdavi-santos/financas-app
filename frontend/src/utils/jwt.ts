// Utilitários mínimos para o JWT no cliente. O front NÃO valida a assinatura
// (só o backend faz isso); aqui apenas lemos o campo `exp` para saber se o token
// já venceu e evitar deixar o usuário "logado" numa sessão morta.

interface PayloadJwt {
  exp?: number; // instante de expiração em SEGUNDOS (padrão JWT)
}

// Decodifica o payload (2ª parte do JWT, base64url). Retorna null se malformado.
function lerPayload(token: string): PayloadJwt | null {
  try {
    const base64url = token.split(".")[1];
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64)) as PayloadJwt;
  } catch {
    return null;
  }
}

// true se o token está ausente, malformado ou já expirou.
export function tokenExpirado(token: string | null): boolean {
  if (!token) return true;
  const payload = lerPayload(token);
  if (!payload?.exp) return true; // sem exp: tratamos como inválido
  return payload.exp * 1000 <= Date.now();
}
