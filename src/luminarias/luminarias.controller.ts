import { Controller, Get, Post, Body, Patch, Param, Delete,UseGuards } from '@nestjs/common';
import { LuminariasService } from './luminarias.service';
import { CreateLuminariaDto } from './dto/create-luminaria.dto';
import { UpdateLuminariaDto } from './dto/update-luminaria.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';



@UseGuards(RolesGuard)
@Controller('luminarias')
export class LuminariasController {
  constructor(private readonly luminariasService: LuminariasService) {}

  @Post()
  create(@Body() createLuminariaDto: CreateLuminariaDto) {
    return this.luminariasService.create(createLuminariaDto);
  }

  @Get()
  findAll() {
    return this.luminariasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.luminariasService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLuminariaDto: UpdateLuminariaDto) {
    return this.luminariasService.update(+id, updateLuminariaDto);
  }


  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.luminariasService.remove(+id);
  }
}
