import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { EnderecoDto } from '../../common/dto/endereco.dto';
import { IsOptionalString } from '../../common/validators/is-optional-string.decorator';
import { IsRequiredString } from '../../common/validators/is-required-string.decorator';
import { IsValidCNPJ } from '../../common/validators/is-valid-cnpj.decorator';
import { IsValidEmail } from '../../common/validators/is-valid-email.decorator';
import { IsValidPassword } from '../../common/validators/is-valid-password.decorator';
import { IsValidUUID } from '../../common/validators/is-valid-uuid.decorator';

class UsuarioAdminDto {
  @IsRequiredString(150)
  nome!: string;

  @IsValidEmail()
  email!: string;

  @IsValidPassword()
  senha!: string;
}

export class CreateEmpresaDto {
  @IsValidCNPJ()
  cnpj!: string;

  @IsRequiredString(200)
  razaoSocial!: string;

  @IsOptionalString(200)
  nomeFantasia?: string;

  @IsOptionalString(20)
  inscricaoEstadual?: string;

  @IsValidEmail()
  email!: string;

  @IsOptionalString(20)
  telefone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EnderecoDto)
  endereco?: EnderecoDto;

  @IsValidUUID()
  planoId!: string;

  @ValidateNested()
  @Type(() => UsuarioAdminDto)
  usuarioAdmin!: UsuarioAdminDto;
}
