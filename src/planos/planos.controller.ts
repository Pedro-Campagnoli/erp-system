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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions.constant';
import { CreatePlanoDto } from './dto/create-plano.dto';
import { UpdatePlanoDto } from './dto/update-plano.dto';
import { PlanosService } from './planos.service';

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

  @Permissions(PERMISSIONS.ADMIN.GERENCIAR_PLANOS)
  @Post()
  create(@Body() dto: CreatePlanoDto) {
    return this.planosService.create(dto);
  }

  @Permissions(PERMISSIONS.ADMIN.GERENCIAR_PLANOS)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlanoDto) {
    return this.planosService.update(id, dto);
  }

  @Permissions(PERMISSIONS.ADMIN.GERENCIAR_PLANOS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.planosService.remove(id);
  }
}
