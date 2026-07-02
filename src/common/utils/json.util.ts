import { Prisma } from '../../../generated/prisma/client';

/**
 * Prepara um valor (ex.: um DTO com @ValidateNested) para ser gravado em uma
 * coluna Json do Prisma. Instâncias de classe não satisfazem a index
 * signature exigida por `Prisma.InputJsonValue`, então serializamos para um
 * objeto plano.
 */
export function toJsonInput(
  value: object | undefined,
): Prisma.InputJsonValue | undefined {
  return value === undefined
    ? undefined
    : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
}
