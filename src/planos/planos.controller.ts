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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { CreatePlanoDto } from './dto/create-plano.dto';
import { UpdatePlanoDto } from './dto/update-plano.dto';
import { PlanosService } from './planos.service';

// CRUD de planos é administração da PLATAFORMA (planos de assinatura
// globais, não de uma empresa) — protegido por `SuperAdminGuard`, não pelo
// sistema de permissões por tenant. Ver `src/common/guards/super-admin.guard.ts`.
@ApiTags('planos')
@Controller('planos')
export class PlanosController {
  constructor(private readonly planosService: PlanosService) {}

  // Listagem pública: necessária para a tela de cadastro de uma nova empresa
  // escolher um plano antes de existir uma sessão autenticada.
  @Public()
  @Get()
  findAll(@Query('ativos') ativos?: string) {
    return this.planosService.findAll(ativos === 'true');
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.planosService.findOne(id);
  }

  @UseGuards(SuperAdminGuard)
  @Post()
  create(@Body() dto: CreatePlanoDto) {
    return this.planosService.create(dto);
  }

  @UseGuards(SuperAdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlanoDto) {
    return this.planosService.update(id, dto);
  }

  @UseGuards(SuperAdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.planosService.remove(id);
  }
}
