import { applyDecorators } from '@nestjs/common';
import { IsNumber, Min, ValidationOptions } from 'class-validator';

/** Valor monetário não negativo, com no máximo 2 casas decimais — mensagem padronizada em pt-BR. */
export function IsValidMoney(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsNumber(
      { maxDecimalPlaces: 2 },
      {
        message: '$property deve ser um valor monetário válido',
        ...validationOptions,
      },
    ),
    Min(0, {
      message: '$property não pode ser negativo',
      ...validationOptions,
    }),
  );
}
