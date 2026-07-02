import { IsOptionalString } from '../../common/validators/is-optional-string.decorator';

export class LogoutDto {
  @IsOptionalString(2000)
  refreshToken?: string;
}
