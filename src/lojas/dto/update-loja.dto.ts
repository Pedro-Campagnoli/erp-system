import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateLojaDto } from './create-loja.dto';

export class UpdateLojaDto extends PartialType(CreateLojaDto) {
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
