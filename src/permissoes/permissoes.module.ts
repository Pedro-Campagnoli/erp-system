import { Module } from '@nestjs/common';
import { PapeisController } from './papeis.controller';
import { PapeisService } from './papeis.service';
import { PermissoesController } from './permissoes.controller';
import { PermissoesService } from './permissoes.service';

@Module({
  controllers: [PermissoesController, PapeisController],
  providers: [PermissoesService, PapeisService],
  exports: [PermissoesService, PapeisService],
})
export class PermissoesModule {}
