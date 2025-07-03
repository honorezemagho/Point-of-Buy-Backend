import {
  PdvType,
  ZoneType,
  BusinessAge,
  RespondentRole,
  ChainStatus,
} from '../enums/pdv.enum';

export type GetPdvType = {
  PROJET_POWER_ID: number;
  UNIQUE_ID: string;
  REGION: string;
  VILLE: string;
  ARRONDISSEMENT: string;
  QUARTIER: string;
  QUARTIER_AUTRES?: string;
  ENQUETEUR: string;
  SUPERVISEUR: string;
  TYPE_PDV: PdvType;
  TYPE_QUESTIONNAIRE: string;
  ZONE_D_ENQUETE: ZoneType;
  S1: BusinessAge;
  S3: RespondentRole;
  S4: ChainStatus;
  Q1?: string;
  Q2?: string;
  Q3?: string;
  NOM_ENTREPRISE?: string;
  NOM_DU_REPONDANT?: string;
  TELEPHONE_DU_REPONDANT?: string;
  TELEPHONE_ENTREPRISE?: string;
  DATE: string;
  ADRESSE_PHYSIQUE?: string;
  LATITUDE: number;
  LONGITUDE: number;
  STAR_TIME_OK?: number;
  END_TIME_OK?: number;
  fiche_Questionnaire: string;
};
