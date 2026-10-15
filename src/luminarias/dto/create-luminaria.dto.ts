import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateLuminariaDto {
  @IsString()
  @IsNotEmpty()
  sector: string;

  @IsInt()
  @Min(1)
  potencia: number;
}