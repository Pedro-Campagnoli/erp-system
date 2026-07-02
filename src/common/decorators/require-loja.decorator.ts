import { SetMetadata } from '@nestjs/common';

export const REQUIRE_LOJA_KEY = 'requireLoja';

/**
 * Exige que a requisição informe uma loja de contexto (header `x-loja-id`) e que
 * o usuário autenticado tenha acesso a ela. Sem este decorator, o LojaAccessGuard
 * apenas valida o acesso quando o header é enviado, sem torná-lo obrigatório.
 */
export const RequireLoja = () => SetMetadata(REQUIRE_LOJA_KEY, true);
