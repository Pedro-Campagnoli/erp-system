import { applyDecorators } from '@nestjs/common';
import { IsInt, Min, ValidationOptions } from 'class-validator';

/** Número inteiro maior que zero — mensagem padronizada em pt-BR. */
export function IsPositiveInt(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsInt({
      message: '$property deve ser um número inteiro',
      ...validationOptions,
    }),
    Min(1, {
      message: '$property deve ser maior que zero',
      ...validationOptions,
    }),
  );
}
