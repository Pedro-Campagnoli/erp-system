import { applyDecorators } from '@nestjs/common';
import { IsUUID, ValidationOptions } from 'class-validator';

/**
 * Identificador (UUID v4) obrigatório — mensagem padronizada em pt-BR.
 * Use `{ each: true }` para validar cada item de um array de ids.
 */
export function IsValidUUID(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsUUID('4', {
      message: '$property deve ser um identificador válido',
      ...validationOptions,
    }),
  );
}
