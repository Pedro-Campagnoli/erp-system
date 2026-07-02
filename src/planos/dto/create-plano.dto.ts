import { IsBoolean, IsObject, IsOptional, Matches } from 'class-validator';
import { IsOptionalString } from '../../common/validators/is-optional-string.decorator';
import { IsPositiveInt } from '../../common/validators/is-positive-int.decorator';
import { IsRequiredString } from '../../common/validators/is-required-string.decorator';
import { IsValidMoney } from '../../common/validators/is-valid-money.decorator';

export class CreatePlanoDto {
  @IsRequiredString(100)
  nome!: string;

  @IsRequiredString(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug deve conter apenas letras minúsculas, números e hífen',
  })
  slug!: string;

  @IsOptionalString(255)
  descricao?: string;

  @IsValidMoney()
  precoMensal!: number;

  @IsOptional()
  @IsPositiveInt()
  limiteLojas?: number;

  @IsOptional()
  @IsPositiveInt()
  limiteUsuarios?: number;

  @IsOptional()
  @IsObject()
  recursos?: Record<string, boolean>;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
