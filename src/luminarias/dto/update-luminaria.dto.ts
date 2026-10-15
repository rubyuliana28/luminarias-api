import { PartialType } from '@nestjs/mapped-types';
import { CreateLuminariaDto } from './create-luminaria.dto';

export class UpdateLuminariaDto extends PartialType(CreateLuminariaDto) {}
