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
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions.constant';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AlterarSenhaDto } from './dto/alterar-senha.dto';
import { AtualizarAcessoDto } from './dto/atualizar-acesso.dto';
import { ConcederAcessoDto } from './dto/conceder-acesso.dto';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UsuariosService } from './usuarios.service';

@ApiTags('usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get('me')
  me(@CurrentUser() usuario: AuthenticatedUser) {
    return usuario;
  }

  @Patch('me/senha')
  @HttpCode(HttpStatus.NO_CONTENT)
  alterarSenha(
    @CurrentUser('id') usuarioId: string,
    @Body() dto: AlterarSenhaDto,
  ) {
    return this.usuariosService.alterarSenha(usuarioId, dto);
  }

  @Permissions(PERMISSIONS.CADASTROS.CRIAR_USUARIO)
  @Post()
  create(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('superAdmin') atorSuperAdmin: boolean,
    @Body() dto: CreateUsuarioDto,
  ) {
    return this.usuariosService.create(empresaId, dto, atorSuperAdmin);
  }

  @Get()
  findAll(@CurrentUser('empresaId') empresaId: string) {
    return this.usuariosService.findAll(empresaId);
  }

  @Get(':id')
  findOne(
    @CurrentUser('empresaId') empresaId: string,
    @Param('id') id: string,
  ) {
    return this.usuariosService.findOne(empresaId, id);
  }

  @Permissions(PERMISSIONS.CADASTROS.EDITAR_USUARIO)
  @Patch(':id')
  update(
    @CurrentUser('empresaId') empresaId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUsuarioDto,
  ) {
    return this.usuariosService.update(empresaId, id, dto);
  }

  @Permissions(PERMISSIONS.CADASTROS.EXCLUIR_USUARIO)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@CurrentUser('empresaId') empresaId: string, @Param('id') id: string) {
    return this.usuariosService.remove(empresaId, id);
  }

  @Get(':id/lojas')
  listarAcessos(
    @CurrentUser('empresaId') empresaId: string,
    @Param('id') id: string,
  ) {
    return this.usuariosService.listarAcessos(empresaId, id);
  }

  @Permissions(PERMISSIONS.CADASTROS.GERENCIAR_ACESSOS)
  @Post(':id/lojas')
  concederAcesso(
    @CurrentUser('empresaId') empresaId: string,
    @Param('id') id: string,
    @Body() dto: ConcederAcessoDto,
  ) {
    return this.usuariosService.concederAcesso(empresaId, id, dto);
  }

  @Permissions(PERMISSIONS.CADASTROS.GERENCIAR_ACESSOS)
  @Patch(':id/lojas/:lojaId')
  atualizarAcesso(
    @CurrentUser('empresaId') empresaId: string,
    @Param('id') id: string,
    @Param('lojaId') lojaId: string,
    @Body() dto: AtualizarAcessoDto,
  ) {
    return this.usuariosService.atualizarAcesso(empresaId, id, lojaId, dto);
  }

  @Permissions(PERMISSIONS.CADASTROS.GERENCIAR_ACESSOS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id/lojas/:lojaId')
  revogarAcesso(
    @CurrentUser('empresaId') empresaId: string,
    @Param('id') id: string,
    @Param('lojaId') lojaId: string,
  ) {
    return this.usuariosService.revogarAcesso(empresaId, id, lojaId);
  }
}
