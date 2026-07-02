import { ArrayUnique, IsArray } from 'class-validator';
import { IsValidUUID } from '../../common/validators/is-valid-uuid.decorator';

export class AtribuirPermissoesDto {
  @IsArray()
  @ArrayUnique()
  @IsValidUUID({ each: true })
  permissoesIds!: string[];
}
