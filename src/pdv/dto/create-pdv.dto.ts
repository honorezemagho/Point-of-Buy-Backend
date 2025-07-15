import {
  IsString,
  IsNumber,
  IsOptional,
  Matches,
  IsNotEmpty,
} from 'class-validator';

export class CreatePdvDto {
  @IsNumber()
  @IsOptional()
  PROJET_POWER_ID?: number;

  @IsOptional()
  @IsString()
  UNIQUE_ID?: string;

  @IsString()
  @IsOptional()
  REGION?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  VILLE!: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  ARRONDISSEMENT!: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  QUARTIER!: string;

  @IsString()
  @IsOptional()
  QUARTIER_AUTRES?: string;

  @IsString()
  @IsOptional()
  ENQUETEUR?: string;

  @IsString()
  @IsOptional()
  SUPERVISEUR?: string;

  @IsString()
  @IsOptional()
  TYPE_PDV?: string;

  @IsString()
  @IsOptional()
  TYPE_QUESTIONNAIRE?: string;

  @IsString()
  @IsOptional()
  PRESENCE_RESTAURATION?: string;

  @IsString()
  @IsOptional()
  ZONE_D_ENQUETE?: string;

  @IsString()
  @IsOptional()
  NOM_ENTREPRISE?: string;

  @IsString()
  @IsOptional()
  NOM_DU_REPONDANT?: string;

  @IsString()
  @IsOptional()
  TELEPHONE_DU_REPONDANT?: string;

  @IsString()
  @IsOptional()
  TELEPHONE_ENTREPRISE?: string;

  @IsString()
  @IsNotEmpty()
  DATE!: string;

  @IsString()
  @IsOptional()
  ADRESSE_PHYSIQUE?: string;

  @IsNumber()
  @IsNotEmpty()
  LATITUDE!: number;

  @IsNumber()
  @IsNotEmpty()
  LONGITUDE!: number;

  @IsString()
  @IsOptional()
  STAR_TIME_OK?: string;

  @IsString()
  @IsOptional()
  END_TIME_OK?: string;

  @IsString()
  @IsOptional()
  S1?: string;

  @IsString()
  @IsOptional()
  S3?: string;

  @IsString()
  @IsOptional()
  S4?: string;

  @IsString()
  @IsOptional()
  Q1?: string;
}
