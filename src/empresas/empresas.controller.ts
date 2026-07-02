import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions.constant';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { EmpresasService } from './empresas.service';

@Controller('empresas')
export class EmpresasController {
  constructor(
    private readonly empresasService: EmpresasService,
    private readonly authService: AuthService,
  ) {}

  // Onboarding público de um novo tenant: cria a empresa, a loja matriz e o
  // usuário administrador, e já retorna os tokens de acesso (signup + login).
  @Public()
  @Post()
  async create(@Body() dto: CreateEmpresaDto) {
    await this.empresasService.create(dto);
    return this.authService.login({
      email: dto.usuarioAdmin.email,
      senha: dto.usuarioAdmin.senha,
    });
  }

  @Permissions(PERMISSIONS.ADMIN.LISTAR_EMPRESAS)
  @Get()
  findAll() {
    return this.empresasService.findAll();
  }

  @Get('me')
  findMe(@CurrentUser('empresaId') empresaId: string) {
    return this.empresasService.findOne(empresaId);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() dto: UpdateEmpresaDto,
  ) {
    if (!usuario.superAdmin) {
      throw new ForbiddenException(
        'Apenas administradores podem editar os dados da empresa',
      );
    }
    return this.empresasService.update(usuario.empresaId, dto);
  }

  @Permissions(PERMISSIONS.ADMIN.LISTAR_EMPRESAS)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.empresasService.findOne(id);
  }
}
