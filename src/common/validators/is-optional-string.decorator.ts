import { applyDecorators } from '@nestjs/common';
import {
  IsOptional,
  IsString,
  MaxLength,
  ValidationOptions,
} from 'class-validator';

/** Texto opcional, com tamanho máximo — mensagens padronizadas em pt-BR. */
export function IsOptionalString(
  maxLength = 255,
  validationOptions?: ValidationOptions,
) {
  return applyDecorators(
    IsOptional(),
    IsString({
      message: '$property deve ser um texto válido',
      ...validationOptions,
    }),
    MaxLength(maxLength, {
      message: '$property deve ter no máximo $constraint1 caracteres',
      ...validationOptions,
    }),
  );
}
