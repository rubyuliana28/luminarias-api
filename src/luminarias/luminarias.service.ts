import { Injectable } from '@nestjs/common';
import { CreateLuminariaDto } from './dto/create-luminaria.dto';
import { UpdateLuminariaDto } from './dto/update-luminaria.dto';

@Injectable()
export class LuminariasService {
  create(createLuminariaDto: CreateLuminariaDto) {
    return 'This action adds a new luminaria';
  }

  findAll() {
    return `This action returns all luminarias`;
  }

  findOne(id: number) {
    return `This action returns a #${id} luminaria`;
  }

  update(id: number, updateLuminariaDto: UpdateLuminariaDto) {
    return `This action updates a #${id} luminaria`;
  }

  remove(id: number) {
    return `This action removes a #${id} luminaria`;
  }
}
