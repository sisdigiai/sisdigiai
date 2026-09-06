import type { ModuleId } from '../components/Sidebar';

// RBAC do painel (R-001 / decisão 17/04: dados sensíveis têm acesso restrito).
//
// Módulos sensíveis — só papéis privilegiados:
//   financeiro       → custos, burn, receita, vendors
//   cadastro-empresa → identidade legal, contatos, status LGPD
//   clearix          → Central de comando do ecossistema (já tem auth super_admin
//                      próprio por dentro; aqui é só esconder do menu)
//
// FAIL-CLOSED (corrigido em 06/09/2026). Antes disto, `!role` liberava o módulo
// — "evita trancar o dono caso current_role_code() falhe". A intenção era boa e o
// efeito era o oposto: RPC com erro abria Financeiro, Cadastro Empresa, Clearix e
// Cobrança para qualquer sessão. Portão que abre no erro não é portão (R-037).
//
// O medo de trancar o dono não se sustenta: ele é `super_admin` ativo em
// `iam.users` com `auth_id` ligado, e a RPC o resolve — conferido no banco.
//
// Quem chama precisa distinguir CARREGANDO de SEM PAPEL: use `papelCarregando`
// do AuthContext e não decida enquanto for true. Aqui, `null` = sem acesso.
export const RESTRICTED_MODULES: ModuleId[] = ['financeiro', 'cadastro-empresa', 'clearix', 'cobranca'];

const PRIVILEGED_ROLES = ['super_admin', 'founder', 'admin'];

export function canAccessModule(id: ModuleId, role: string | null): boolean {
  if (!RESTRICTED_MODULES.includes(id)) return true;
  if (!role) return false;
  return PRIVILEGED_ROLES.includes(role);
}
