export class UsuarioResponseDto {
  id!: string;
  empresaId!: string;
  nome!: string;
  email!: string;
  telefone!: string | null;
  ativo!: boolean;
  superAdmin!: boolean;
  ultimoLoginEm!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class AcessoLojaResponseDto {
  id!: string;
  lojaId!: string;
  lojaNome!: string;
  papelId!: string;
  papelNome!: string;
  ativo!: boolean;
}
