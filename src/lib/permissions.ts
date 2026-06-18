import type { ModuleId } from '../components/Sidebar';

// RBAC do painel (R-001 / decisão 17/04: dados sensíveis têm acesso restrito).
//
// Módulos sensíveis — só papéis privilegiados:
//   financeiro       → custos, burn, receita, vendors
//   cadastro-empresa → identidade legal, contatos, status LGPD
//   clearix          → Central de comando do ecossistema (já tem auth super_admin
//                      próprio por dentro; aqui é só esconder do menu)
//
// Fail-open: papel desconhecido (null) NÃO é bloqueado — evita trancar o dono
// caso current_role_code() falhe. A restrição só vale quando o papel é
// explicitamente um tier mais baixo (staff/viewer).
export const RESTRICTED_MODULES: ModuleId[] = ['financeiro', 'cadastro-empresa', 'clearix', 'cobranca'];

const PRIVILEGED_ROLES = ['super_admin', 'founder', 'admin'];

export function canAccessModule(id: ModuleId, role: string | null): boolean {
  if (!RESTRICTED_MODULES.includes(id)) return true;
  if (!role) return true; // fail-open
  return PRIVILEGED_ROLES.includes(role);
}
