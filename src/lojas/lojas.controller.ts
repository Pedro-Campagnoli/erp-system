import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions.constant';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateLojaDto } from './dto/create-loja.dto';
import { UpdateLojaDto } from './dto/update-loja.dto';
import { LojasService } from './lojas.service';

@Controller('lojas')
export class LojasController {
  constructor(private readonly lojasService: LojasService) {}

  @Permissions(PERMISSIONS.CADASTROS.CRIAR_LOJA)
  @Post()
  create(
    @CurrentUser('empresaId') empresaId: string,
    @Body() dto: CreateLojaDto,
  ) {
    return this.lojasService.create(empresaId, dto);
  }

  @Get()
  findAll(@CurrentUser() usuario: AuthenticatedUser) {
    const allowedLojaIds = usuario.superAdmin
      ? undefined
      : usuario.lojas.map((l) => l.lojaId);
    return this.lojasService.findAll(usuario.empresaId, allowedLojaIds);
  }

  @Get(':id')
  findOne(@CurrentUser() usuario: AuthenticatedUser, @Param('id') id: string) {
    const allowedLojaIds = usuario.superAdmin
      ? undefined
      : usuario.lojas.map((l) => l.lojaId);
    return this.lojasService.findOne(usuario.empresaId, id, allowedLojaIds);
  }

  @Permissions(PERMISSIONS.CADASTROS.EDITAR_LOJA)
  @Patch(':id')
  update(
    @CurrentUser('empresaId') empresaId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLojaDto,
  ) {
    return this.lojasService.update(empresaId, id, dto);
  }

  @Permissions(PERMISSIONS.CADASTROS.EXCLUIR_LOJA)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@CurrentUser('empresaId') empresaId: string, @Param('id') id: string) {
    return this.lojasService.remove(empresaId, id);
  }
}
