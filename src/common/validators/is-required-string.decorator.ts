import { applyDecorators } from '@nestjs/common';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidationOptions,
} from 'class-validator';

/** Texto obrigatório, não vazio, com tamanho máximo — mensagens padronizadas em pt-BR. */
export function IsRequiredString(
  maxLength = 255,
  validationOptions?: ValidationOptions,
) {
  return applyDecorators(
    IsString({
      message: '$property deve ser um texto válido',
      ...validationOptions,
    }),
    IsNotEmpty({ message: '$property é obrigatório', ...validationOptions }),
    MaxLength(maxLength, {
      message: '$property deve ter no máximo $constraint1 caracteres',
      ...validationOptions,
    }),
  );
}
