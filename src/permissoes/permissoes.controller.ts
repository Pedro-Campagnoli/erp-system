import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PermissoesService } from './permissoes.service';

// Catálogo de permissões — leitura liberada a qualquer usuário autenticado,
// usado para montar telas de atribuição de papéis.
@ApiTags('permissoes')
@Controller('permissoes')
export class PermissoesController {
  constructor(private readonly permissoesService: PermissoesService) {}

  @Get()
  findAll() {
    return this.permissoesService.findAll();
  }
}
