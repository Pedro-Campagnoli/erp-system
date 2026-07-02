export class UsuarioPerfilDto {
  id!: string;
  nome!: string;
  email!: string;
  empresaId!: string;
  superAdmin!: boolean;
  lojas!: { lojaId: string; lojaNome: string; papel: string }[];
  permissoes!: string[];
}

export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
  usuario!: UsuarioPerfilDto;
}
