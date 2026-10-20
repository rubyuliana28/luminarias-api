import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, HttpCode, HttpStatus, ParseIntPipe, ParseUUIDPipe } from '@nestjs/common';
import { LuminariasService } from './luminarias.service';
import { CreateLuminariaDto } from './dto/create-luminaria.dto';
import { UpdateLuminariaDto } from './dto/update-luminaria.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ListarLuminariasDto } from './dto/listar-luminarias.dto';

@UseGuards(RolesGuard)
@Controller('luminarias')
export class LuminariasController {
  constructor(private readonly luminariasService: LuminariasService) {}

  @Post()
  create(@Body() createLuminariaDto: CreateLuminariaDto) {
    return this.luminariasService.create(createLuminariaDto);
  }

  @Get()
  findAll(@Query() query: ListarLuminariasDto) {
    return this.luminariasService.findAll(query);
  }

  @Roles('admin')
  @Post('resumen-sectores')
  @HttpCode(HttpStatus.ACCEPTED)
  resumenSectores() {
    return this.luminariasService.encolarResumenSectores();
  }

  @Roles('admin')
  @Get('resumen-sectores/:trabajoId')
  estadoResumenSectores(@Param('trabajoId', ParseUUIDPipe) trabajoId: string) {
    return this.luminariasService.estadoResumenSectores(trabajoId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.luminariasService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateLuminariaDto: UpdateLuminariaDto) {
    return this.luminariasService.update(id, updateLuminariaDto);
  }


  @Roles('admin')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.luminariasService.remove(id);
  }
}
