import { createHash } from 'node:crypto';

/**
 * Hash determinístico (SHA-256) para valores de alta entropia como tokens
 * assinados (JWT). Não usar para senhas: bcrypt continua sendo o algoritmo
 * correto ali, pois senhas têm baixa entropia e precisam de custo computacional.
 *
 * Importante: bcrypt trunca a entrada em 72 bytes, e JWTs do mesmo usuário
 * compartilham um prefixo idêntico (header + claim "sub"), o que faria
 * bcrypt.compare retornar `true` para tokens diferentes. SHA-256 processa
 * a string inteira e é a escolha correta aqui.
 */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
