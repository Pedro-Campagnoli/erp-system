import { ValidationError } from 'class-validator';

export interface ValidationErrorDetail {
  field: string;
  messages: string[];
}

function flatten(
  error: ValidationError,
  parentPath: string,
): ValidationErrorDetail[] {
  const path = parentPath ? `${parentPath}.${error.property}` : error.property;
  const messages = error.constraints ? Object.values(error.constraints) : [];
  const own = messages.length ? [{ field: path, messages }] : [];
  const children = (error.children ?? []).flatMap((child) =>
    flatten(child, path),
  );
  return [...own, ...children];
}

/**
 * Achata os `ValidationError`s do class-validator (incluindo erros de DTOs
 * aninhados, ex.: `endereco.cep`) em uma lista simples de `{ field, messages }`,
 * usada pelo `exceptionFactory` do ValidationPipe para padronizar o corpo de
 * erro de todas as rotas.
 */
export function formatValidationErrors(errors: ValidationError[]): {
  message: string;
  errors: ValidationErrorDetail[];
} {
  return {
    message: 'Dados inválidos',
    errors: errors.flatMap((error) => flatten(error, '')),
  };
}
