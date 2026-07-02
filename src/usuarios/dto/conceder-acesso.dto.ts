import { IsValidUUID } from '../../common/validators/is-valid-uuid.decorator';

export class ConcederAcessoDto {
  @IsValidUUID()
  lojaId!: string;

  @IsValidUUID()
  papelId!: string;
}
