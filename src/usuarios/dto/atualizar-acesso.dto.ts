import { IsBoolean, IsOptional } from 'class-validator';
import { IsValidUUID } from '../../common/validators/is-valid-uuid.decorator';

export class AtualizarAcessoDto {
  @IsOptional()
  @IsValidUUID()
  papelId?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
