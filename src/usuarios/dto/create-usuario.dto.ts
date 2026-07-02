import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { IsOptionalString } from '../../common/validators/is-optional-string.decorator';
import { IsRequiredString } from '../../common/validators/is-required-string.decorator';
import { IsValidEmail } from '../../common/validators/is-valid-email.decorator';
import { IsValidPassword } from '../../common/validators/is-valid-password.decorator';
import { IsValidUUID } from '../../common/validators/is-valid-uuid.decorator';

class AcessoLojaDto {
  @IsValidUUID()
  lojaId!: string;

  @IsValidUUID()
  papelId!: string;
}

export class CreateUsuarioDto {
  @IsRequiredString(150)
  nome!: string;

  @IsValidEmail()
  email!: string;

  @IsValidPassword()
  senha!: string;

  @IsOptionalString(20)
  telefone?: string;

  @IsOptional()
  @IsBoolean()
  superAdmin?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique((acesso: AcessoLojaDto) => acesso.lojaId)
  @ValidateNested({ each: true })
  @Type(() => AcessoLojaDto)
  lojas?: AcessoLojaDto[];
}
