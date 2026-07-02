import { applyDecorators } from '@nestjs/common';
import { IsEmail, ValidationOptions } from 'class-validator';

/** E-mail obrigatório — mensagem padronizada em pt-BR. Para campos opcionais, combine com `@IsOptional()`. */
export function IsValidEmail(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsEmail(
      {},
      { message: '$property deve ser um e-mail válido', ...validationOptions },
    ),
  );
}
