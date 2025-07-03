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
  ZONE_D_ENQUETE?: string;

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

  @IsString()
  @IsOptional()
  Q2?: string;

  @IsString()
  @IsOptional()
  Q3?: string;

  @IsString()
  @IsOptional()
  NOM_ENTREPRISE?: string;

  @IsString()
  @IsOptional()
  NOM_DU_REPONDANT?: string;

  @IsString()
  @IsOptional()
  @Matches(/^(?:\d{9}|Refus)?$/, {
    message: 'TELEPHONE_DU_REPONDANT must be a 9-digit number or "Refus"',
  })
  TELEPHONE_DU_REPONDANT?: string;

  @IsString()
  @IsOptional()
  @Matches(/^(?:\d{9}|Refus)?$/, {
    message: 'TELEPHONE_ENTREPRISE must be a 9-digit number or "Refus"',
  })
  TELEPHONE_ENTREPRISE?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{8}$/, { message: 'DATE must be in YYYYMMDD format' })
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

  @IsNumber()
  @IsOptional()
  STAR_TIME_OK?: number;

  @IsNumber()
  @IsOptional()
  END_TIME_OK?: number;

  @IsString()
  @IsOptional()
  fiche_Questionnaire?: string;
}
