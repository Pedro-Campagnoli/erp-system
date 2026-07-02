import { IsBoolean, IsOptional } from 'class-validator';
import { IsOptionalString } from '../../common/validators/is-optional-string.decorator';
import { IsValidEmail } from '../../common/validators/is-valid-email.decorator';

export class UpdateUsuarioDto {
  @IsOptionalString(150)
  nome?: string;

  @IsOptional()
  @IsValidEmail()
  email?: string;

  @IsOptionalString(20)
  telefone?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
