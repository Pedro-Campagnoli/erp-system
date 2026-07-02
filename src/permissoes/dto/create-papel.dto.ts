import { ArrayUnique, IsArray, IsOptional } from 'class-validator';
import { IsOptionalString } from '../../common/validators/is-optional-string.decorator';
import { IsRequiredString } from '../../common/validators/is-required-string.decorator';
import { IsValidUUID } from '../../common/validators/is-valid-uuid.decorator';

export class CreatePapelDto {
  @IsRequiredString(100)
  nome!: string;

  @IsOptionalString(255)
  descricao?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsValidUUID({ each: true })
  permissoesIds?: string[];
}
