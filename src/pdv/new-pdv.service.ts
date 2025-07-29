/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as XLSX from 'xlsx';
import { CreatePdvDto } from './dto/create-pdv.dto';
import * as fs from 'fs';
import path from 'path';
import { NewCreatePdvDto } from './dto/new-create-pdv.dto';

@Injectable()
export class NewPdvService {
  private readonly logger = new Logger(NewPdvService.name);
  private outputDir = './output'; // Specify the output directory

  constructor() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  private cleanPhone(str: string): string {
    return str ? str.replace(/\.0$/, '') : '';
  }

  private transformRow(raw: any, idx: number): any {
    return {
      outlet_id: idx + 1,
      region: raw.REGION || null,
      ville: raw.VILLE || null,
      arrondissement: raw.ARRONDISSEMENT || null,
      quartier_final: raw['QUARTIER FINALE'] || null,
      type_pdv_ok: raw['TYPE_PDV_OK'] || null,
      zone_enquete: raw['ZONE_D_ENQUETE'] || null,
      nom_entreprise: raw['NOM_ENTREPRISE'] || null,
      chiffre_affaires: raw["Chiffre d'affaires"] || null,
      raison_sociale: raw['Raison sociale'] || null,
      creation: raw['Creation'] || null,
      adresse_physique: raw['ADRESSE_PHYSIQUE'] || null,
      nationalite_proprietaire: raw['Nationalité du propriétaire'] || null,
      latitude: parseFloat(raw['LATITUDE']) || null,
      longitude: parseFloat(raw['LONGITUDE']) || null,
      repondant: raw['Repondant'] || null,
      nom_repondant: raw['NOM_DU_REPONDANT'] || null,
      tel_repondant: this.cleanPhone(raw['TELEPHONE_DU_REPONDANT']),
      enseigne_visible: raw['Enseigne visible'] === 'Oui',
      partenariat_publicitaire: raw['Partenariat publicitaire'] === 'Oui',
      classement: raw['Classement'] || null,
      nombre_chambre: raw['Nombre de chambre'] || null,
      prix_chambre_std: raw['Prix standard chambre'] || null,
      nombre_restaurant:
        raw['Combien de restaurant dispose votre établissement ?'] || null,
      nombre_chaise: raw['Nombre de chaise'] || null,
      service_offert: raw['Service offert'] || null,
      livraison_disponible: raw['Livraison disponible ?'] || null,
      products: [
        ...new Set(
          [
            ...Array.from(
              { length: 11 },
              (_, i) => raw[`Eau minerale disponible${i === 0 ? '' : i + 1}`],
            ),
            ...Array.from(
              { length: 21 },
              (_, i) =>
                raw[`Boissons gazeuses présentes${i === 0 ? '' : i + 1}`],
            ),
            ...Array.from(
              { length: 12 },
              (_, i) =>
                raw[`Boissons energisantes présentes${i === 0 ? '' : i + 1}`],
            ),
            ...Array.from(
              { length: 25 },
              (_, i) =>
                raw[
                  `Marques de boissons alcoolisées présentes${i === 0 ? '' : i + 1}`
                ],
            ),
            ...Array.from(
              { length: 10 },
              (_, i) =>
                raw[
                  `Marques produits laitiers présents${i === 0 ? '' : i + 1}`
                ],
            ),
            ...Array.from(
              { length: 10 },
              (_, i) =>
                raw[`Marques culinaires présentes${i === 0 ? '' : i + 1}`],
            ),
            ...Array.from(
              { length: 20 },
              (_, i) =>
                raw[
                  `marques de pates alimentaires consommées${i === 0 ? '' : i + 1}`
                ],
            ),
          ].filter(Boolean),
        ),
      ],
      products_additionals: [
        {
          category: 'EAU_MINERALE',
          source: raw['Source appro EAU'],
          freq: raw['Frequence appro livraison directe EAU'],
        },
        {
          category: 'BOISSONS_GAZEUSES',
          source: raw["Lieu d'appro boissons gazeuses2"],
          freq: raw['Frequence appro boissons gazeuses3'],
        },
        {
          category: 'BOISSONS_ENERGISANTES',
          source: raw['Appro Boissons energisantes'],
          freq: raw['Frequence appro Boissons energisantes3'],
        },
        {
          category: 'BOISSONS_ALCOOLISEES',
          source: raw['Approvisionnement principal boissons alcoolisées'],
          freq: raw['Freq appro grossistes'],
        },
        {
          category: 'PRODUITS_LAITIERS',
          source: raw['Lieu appro produits laitiers'],
          freq: raw['Freq appro livraison directe produits laitiers'],
        },
        {
          category: 'PRODUITS_CULINAIRES',
          source: raw["Lieu d'appro produits culinaires"],
          freq: raw['Freq appro culinaire livraison directe'],
        },
        {
          category: 'PATES_ALIMENTAIRE',
          source: raw['Appro pates alimentaires'],
          freq: raw['Freq appro livraison directe pate alimentaire'],
        },
      ].filter((o) => o.source || o.freq),
      advertising_materials: [],
    };
  }

  private async validateDto(raw: any): Promise<boolean> {
    const dto = plainToInstance(NewCreatePdvDto, raw, {
      enableImplicitConversion: true,
    });
    const errors = await validate(dto);
    if (errors.length) {
      this.logger.warn(`Validation failed: ${JSON.stringify(errors)}`);
      return false;
    }
    return true;
  }

  async processFirstFive(buffer: Buffer): Promise<string[]> {
    const wb = XLSX.read(buffer, { type: 'buffer', cellText: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' });

    const written: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!(await this.validateDto(row))) continue;
      const json = this.transformRow(row, i);
      const file = path.join(this.outputDir, `row${i + 1}.json`);
      fs.writeFileSync(file, JSON.stringify(json, null, 2));
      written.push(file);
    }
    return written;
  }
}
