import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/** Exige que o usuário autenticado possua todos os códigos de permissão informados. */
export const Permissions = (...codigos: string[]) =>
  SetMetadata(PERMISSIONS_KEY, codigos);
