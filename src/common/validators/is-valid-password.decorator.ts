import { applyDecorators } from '@nestjs/common';
import { IsString, MinLength, ValidationOptions } from 'class-validator';

/** Senha obrigatória com tamanho mínimo — mensagem padronizada em pt-BR. */
export function IsValidPassword(
  minLength = 6,
  validationOptions?: ValidationOptions,
) {
  return applyDecorators(
    IsString({
      message: '$property deve ser um texto válido',
      ...validationOptions,
    }),
    MinLength(minLength, {
      message: '$property deve ter no mínimo $constraint1 caracteres',
      ...validationOptions,
    }),
  );
}
