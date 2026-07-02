import { IsRequiredString } from '../../common/validators/is-required-string.decorator';

export class RefreshTokenDto {
  @IsRequiredString(2000)
  refreshToken!: string;
}
