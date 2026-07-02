import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

function calcularDigitoVerificador(base: string, pesos: number[]): number {
  const soma = base
    .split('')
    .reduce(
      (acumulado, digito, index) => acumulado + Number(digito) * pesos[index],
      0,
    );
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

@ValidatorConstraint({ name: 'isCNPJ', async: false })
class IsCNPJConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    const cnpj = value.replace(/\D/g, '');

    // 14 dígitos e não é uma sequência repetida (ex.: "00000000000000")
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
      return false;
    }

    const base = cnpj.slice(0, 12);
    const digito1 = calcularDigitoVerificador(
      base,
      [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    );
    const digito2 = calcularDigitoVerificador(
      base + digito1,
      [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    );

    return cnpj === `${base}${digito1}${digito2}`;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} deve ser um CNPJ válido`;
  }
}

/**
 * CNPJ obrigatório, validado pelo algoritmo oficial de dígitos verificadores.
 * Normaliza automaticamente o valor para apenas dígitos antes de validar/persistir
 * (aceita tanto "12345678000199" quanto "12.345.678/0001-99").
 */
export function IsValidCNPJ(validationOptions?: ValidationOptions) {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.replace(/\D/g, '') : value,
    ),
    (object: object, propertyName: string) => {
      registerDecorator({
        target: object.constructor,
        propertyName,
        options: validationOptions,
        constraints: [],
        validator: IsCNPJConstraint,
      });
    },
  );
}
