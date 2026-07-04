import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions.constant';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { EmpresasService } from './empresas.service';

@ApiTags('empresas')
@Controller('empresas')
export class EmpresasController {
  constructor(
    private readonly empresasService: EmpresasService,
    private readonly authService: AuthService,
  ) {}

  // Onboarding público de um novo tenant: cria a empresa, a loja matriz e o
  // usuário administrador, e já retorna os tokens de acesso (signup + login).
  // Throttle mais estrito que o padrão global: signup é caro (grava dados) e
  // não deveria ser usado para enumerar/forçar CNPJs ou e-mails.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Public()
  @Post()
  async create(@Body() dto: CreateEmpresaDto) {
    await this.empresasService.create(dto);
    return this.authService.login({
      email: dto.usuarioAdmin.email,
      senha: dto.usuarioAdmin.senha,
    });
  }

  // Rota de administração da PLATAFORMA (lista todas as empresas clientes) —
  // ver `SuperAdminGuard`: não é gateada pelo sistema de permissões por
  // tenant, exige `usuario.superAdmin === true`.
  @UseGuards(SuperAdminGuard)
  @Get()
  findAll() {
    return this.empresasService.findAll();
  }

  @Get('me')
  findMe(@CurrentUser('empresaId') empresaId: string) {
    return this.empresasService.findOne(empresaId);
  }

  @Permissions(PERMISSIONS.CADASTROS.EDITAR_EMPRESA)
  @Patch('me')
  updateMe(
    @CurrentUser('empresaId') empresaId: string,
    @Body() dto: UpdateEmpresaDto,
  ) {
    return this.empresasService.update(empresaId, dto);
  }

  // Rota de administração da PLATAFORMA — ver comentário em `findAll`.
  @UseGuards(SuperAdminGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.empresasService.findOne(id);
  }
}
