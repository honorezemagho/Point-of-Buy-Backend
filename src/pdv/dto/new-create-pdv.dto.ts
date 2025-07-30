import {
  IsOptional,
  IsLatitude,
  IsLongitude,
  IsPhoneNumber,
  IsString,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class NewCreatePdvDto {
  @ApiProperty({ example: 'LITTORAL', description: 'Region of the PDV' })
  @IsOptional()
  @IsString()
  REGION?: string;

  @ApiProperty({ example: 'Douala', description: 'City of the PDV' })
  @IsOptional()
  @IsString()
  VILLE?: string;

  @ApiProperty({
    example: 'DOUALA 4',
    description: 'Arrondissement of the PDV',
  })
  @IsOptional()
  @IsString()
  ARRONDISSEMENT?: string;

  @ApiProperty({ example: 'Ndobo', description: 'Final quarter of the PDV' })
  @IsOptional()
  @IsString()
  QUARTIER_FINALE?: string;

  @ApiProperty({ example: 'SNACK - BAR', description: 'Type of PDV' })
  @IsOptional()
  @IsString()
  TYPE_PDV_OK?: string;

  @ApiProperty({
    example: 'Zone Residentielle',
    description: 'Zone of the PDV',
  })
  @IsOptional()
  @IsString()
  ZONE_D_ENQUETE?: string;

  @ApiProperty({ example: 'NDOBO', description: 'Name of the enterprise' })
  @IsOptional()
  @IsString()
  NOM_ENTREPRISE?: string;

  @ApiProperty({ example: 'S.A', description: 'Legal form of the enterprise' })
  @IsOptional()
  @IsString()
  RAISON_SOCIALE?: string;

  @ApiProperty({
    example: 'Moins de 5 ans',
    description: 'Creation date of the enterprise',
  })
  @IsOptional()
  @IsString()
  CREATION?: string;

  @ApiProperty({
    example: 'à cote de la maison mtn',
    description: 'Physical address of the enterprise',
  })
  @IsOptional()
  @IsString()
  ADRESSE_PHYSIQUE?: string;

  @ApiProperty({
    example: 'Camerounaise',
    description: 'Nationality of the owner',
  })
  @IsOptional()
  @IsString()
  NATIONALITE_DU_PROPRIETAIRE?: string;

  @ApiProperty({ example: 4.101857, description: 'Latitude of the PDV' })
  @IsOptional()
  // @IsLatitude()
  LATITUDE?: number;

  @ApiProperty({ example: 9.631957, description: 'Longitude of the PDV' })
  @IsOptional()
  // @IsLongitude()
  LONGITUDE?: number;

  @ApiProperty({ example: 'Gérant', description: 'Respondent of the PDV' })
  @IsOptional()
  @IsString()
  REONDANT?: string;

  @ApiProperty({ example: 'E', description: 'Name of the respondent' })
  @IsOptional()
  @IsString()
  NOM_DU_REONDANT?: string;

  @ApiProperty({
    example: '671108009',
    description: 'Phone number of the respondent',
  })
  @IsOptional()
  @IsPhoneNumber()
  TELEPHONE_DU_REONDANT?: string;

  @ApiProperty({ example: false, description: 'Is the sign visible' })
  @IsOptional()
  @IsBoolean()
  ENSEIGNE_VISIBLE?: boolean;

  @ApiProperty({ example: false, description: 'Is there a partnership' })
  @IsOptional()
  @IsBoolean()
  PARTENARIAT_PUBLICITAIRE?: boolean;

  @ApiProperty({ example: null, description: 'Classification of the PDV' })
  @IsOptional()
  CLASSEMENT?: string;

  @ApiProperty({ example: null, description: 'Number of rooms' })
  @IsOptional()
  @IsNumber()
  NOMBRE_DE_CHAMBRE?: number;

  @ApiProperty({ example: null, description: 'Standard room price' })
  @IsOptional()
  @IsNumber()
  PRIX_STANDARD_CHAMBRE?: number;

  @ApiProperty({ example: null, description: 'Number of restaurants' })
  @IsOptional()
  @IsNumber()
  NOMBRE_RESTAURANT?: number;

  @ApiProperty({
    example: 'Moins de 20 chaises',
    description: 'Number of chairs',
  })
  @IsOptional()
  @IsString()
  NOMBRE_CHAISE?: string;

  @ApiProperty({ example: 'Autre', description: 'Service offered' })
  @IsOptional()
  @IsString()
  SERVICE_OFFERT?: string;

  @ApiProperty({ example: 'Non', description: 'Is delivery available' })
  @IsOptional()
  @IsString()
  LIVRAISON_DISPONIBLE?: string;

  @ApiProperty({ example: [], description: 'List of products' })
  @IsOptional()
  @IsString({ each: true })
  products?: string[];

  @ApiProperty({
    example: [],
    description: 'List of additional product details',
  })
  @IsOptional()
  products_additionals?: {
    category: string;
    source: string;
    freq: string;
  }[];

  @ApiProperty({ example: [], description: 'List of advertising materials' })
  @IsOptional()
  advertising_materials?: string[];
}
