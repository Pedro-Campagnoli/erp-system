import { Type } from 'class-transformer';
import { IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { EnderecoDto } from '../../common/dto/endereco.dto';
import { IsOptionalString } from '../../common/validators/is-optional-string.decorator';
import { IsRequiredString } from '../../common/validators/is-required-string.decorator';
import { IsValidCNPJ } from '../../common/validators/is-valid-cnpj.decorator';
import { IsValidEmail } from '../../common/validators/is-valid-email.decorator';
import { TipoLoja } from '../../../generated/prisma/enums';

export class CreateLojaDto {
  @IsRequiredString(20)
  codigo!: string;

  @IsRequiredString(150)
  nome!: string;

  @IsOptional()
  @IsEnum(TipoLoja, { message: 'tipo deve ser MATRIZ ou FILIAL' })
  tipo?: TipoLoja;

  @IsOptional()
  @IsValidCNPJ()
  cnpj?: string;

  @IsOptionalString(20)
  inscricaoEstadual?: string;

  @IsOptional()
  @IsValidEmail()
  email?: string;

  @IsOptionalString(20)
  telefone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EnderecoDto)
  endereco?: EnderecoDto;
}
