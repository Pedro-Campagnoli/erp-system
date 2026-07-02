import { IsValidEmail } from '../../common/validators/is-valid-email.decorator';
import { IsValidPassword } from '../../common/validators/is-valid-password.decorator';

export class LoginDto {
  @IsValidEmail()
  email!: string;

  @IsValidPassword()
  senha!: string;
}
