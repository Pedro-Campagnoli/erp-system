import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { EnderecoDto } from '../../common/dto/endereco.dto';
import { IsOptionalString } from '../../common/validators/is-optional-string.decorator';
import { IsValidEmail } from '../../common/validators/is-valid-email.decorator';

export class UpdateEmpresaDto {
  @IsOptionalString(200)
  razaoSocial?: string;

  @IsOptionalString(200)
  nomeFantasia?: string;

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
