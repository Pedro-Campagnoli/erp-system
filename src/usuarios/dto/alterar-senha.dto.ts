import { IsValidPassword } from '../../common/validators/is-valid-password.decorator';

export class AlterarSenhaDto {
  @IsValidPassword()
  senhaAtual!: string;

  @IsValidPassword()
  novaSenha!: string;
}
