import { IsOptionalString } from '../validators/is-optional-string.decorator';
import { IsRequiredString } from '../validators/is-required-string.decorator';

export class EnderecoDto {
  @IsRequiredString(150)
  logradouro!: string;

  @IsRequiredString(20)
  numero!: string;

  @IsOptionalString(100)
  complemento?: string;

  @IsRequiredString(100)
  bairro!: string;

  @IsRequiredString(100)
  cidade!: string;

  @IsRequiredString(2)
  uf!: string;

  @IsRequiredString(9)
  cep!: string;
}
