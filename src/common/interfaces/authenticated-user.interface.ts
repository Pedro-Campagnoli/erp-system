export interface AuthenticatedUserLoja {
  lojaId: string;
  lojaNome: string;
  papel: string;
}

export interface AuthenticatedUser {
  id: string;
  empresaId: string;
  nome: string;
  email: string;
  superAdmin: boolean;
  lojas: AuthenticatedUserLoja[];
  permissoes: string[];
}
