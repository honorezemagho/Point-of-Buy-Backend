import {
  IsString,
  IsNumber,
  IsUUID,
  IsOptional,
  IsEnum,
  Matches,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { PdvType } from '../enums/pdv.enum';
import { ZoneType } from '../enums/pdv.enum';
import { BusinessAge } from '../enums/pdv.enum';
import { RespondentRole } from '../enums/pdv.enum';
import { ChainStatus } from '../enums/pdv.enum';

export class CreatePdvDto {
  @IsNumber()
  @IsNotEmpty()
  PROJET_POWER_ID!: number;

  @IsUUID('4')
  @IsNotEmpty()
  UNIQUE_ID!: string;

  @IsString()
  @IsNotEmpty()
  REGION!: string;

  @IsString()
  @IsNotEmpty()
  VILLE!: string;

  @IsString()
  @IsNotEmpty()
  ARRONDISSEMENT!: string;

  @IsString()
  @IsNotEmpty()
  QUARTIER!: string;

  @IsString()
  @IsOptional()
  QUARTIER_AUTRES?: string;

  @IsString()
  @IsNotEmpty()
  ENQUETEUR!: string;

  @IsString()
  @IsNotEmpty()
  SUPERVISEUR!: string;

  @IsEnum(PdvType)
  @IsNotEmpty()
  TYPE_PDV!: PdvType;

  @IsString()
  @IsNotEmpty()
  TYPE_QUESTIONNAIRE!: string;

  @IsEnum(ZoneType)
  @IsNotEmpty()
  ZONE_D_ENQUETE!: ZoneType;

  @IsEnum(BusinessAge)
  @IsNotEmpty()
  S1!: BusinessAge;

  @IsEnum(RespondentRole)
  @IsNotEmpty()
  S3!: RespondentRole;

  @IsEnum(ChainStatus)
  @IsNotEmpty()
  S4!: ChainStatus;

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
  @Min(-90)
  @Max(90)
  LATITUDE!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(-180)
  @Max(180)
  LONGITUDE!: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  STAR_TIME_OK?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  END_TIME_OK?: number;

  @IsString()
  @IsNotEmpty()
  fiche_Questionnaire!: string;
}
