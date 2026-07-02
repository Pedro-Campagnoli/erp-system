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
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions.constant';
import { AtribuirPermissoesDto } from './dto/atribuir-permissoes.dto';
import { CreatePapelDto } from './dto/create-papel.dto';
import { UpdatePapelDto } from './dto/update-papel.dto';
import { PapeisService } from './papeis.service';

@Controller('papeis')
export class PapeisController {
  constructor(private readonly papeisService: PapeisService) {}

  @Get()
  findAll(@CurrentUser('empresaId') empresaId: string) {
    return this.papeisService.findAll(empresaId);
  }

  @Get(':id')
  findOne(
    @CurrentUser('empresaId') empresaId: string,
    @Param('id') id: string,
  ) {
    return this.papeisService.findOne(empresaId, id);
  }

  @Permissions(PERMISSIONS.CADASTROS.GERENCIAR_PAPEIS)
  @Post()
  create(
    @CurrentUser('empresaId') empresaId: string,
    @Body() dto: CreatePapelDto,
  ) {
    return this.papeisService.create(empresaId, dto);
  }

  @Permissions(PERMISSIONS.CADASTROS.GERENCIAR_PAPEIS)
  @Patch(':id')
  update(
    @CurrentUser('empresaId') empresaId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePapelDto,
  ) {
    return this.papeisService.update(empresaId, id, dto);
  }

  @Permissions(PERMISSIONS.CADASTROS.GERENCIAR_PAPEIS)
  @Put(':id/permissoes')
  atribuirPermissoes(
    @CurrentUser('empresaId') empresaId: string,
    @Param('id') id: string,
    @Body() dto: AtribuirPermissoesDto,
  ) {
    return this.papeisService.atribuirPermissoes(empresaId, id, dto);
  }

  @Permissions(PERMISSIONS.CADASTROS.GERENCIAR_PAPEIS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@CurrentUser('empresaId') empresaId: string, @Param('id') id: string) {
    return this.papeisService.remove(empresaId, id);
  }
}
