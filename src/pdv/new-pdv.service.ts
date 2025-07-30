/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
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
    const advertisingMaterials = [
      'Frigo brandé',
      'Table publicitaire',
      'Set de tables brandés',
      'Tenue de travail brandés',
      'Signalétique extérieure',
      'Affiches publicitaires',
      'Chevalier brandé',
      'Sous verres brandés',
      'Sous tasses brandés',
    ];

    const advertisingMaterialPresent = this.collectMaterials(
      raw,
      'Elements de publicité présent',
      advertisingMaterials,
    );
    const advertisingMaterialWished = this.collectMaterials(
      raw,
      'Elements de publicité souhaités',
      advertisingMaterials,
    );

    const menusProposes = this.collectMenus(raw);

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
      notation_hotel: raw['Q1_hotel_ok'] || null,
      notation_restaurant: raw['Q1_restaurant_ok'] || null,
      nombre_restaurant:
        raw['Combien de restaurant dispose votre établissement ?'] || null,
      nombre_chaise: raw['Nombre de chaise'] || null,
      service_offert: raw['Service offert'] || null,
      livraison_disponible: raw['Livraison disponible ?'] || null,
      products: this.extractProducts(raw),
      products_additionals: this.extractProductAdditionals(raw),
      advertising_material_present: advertisingMaterialPresent,
      advertising_material_wished: advertisingMaterialWished,
      menus_proposes: menusProposes,
    };
  }

  private collectMaterials(
    raw: any,
    baseField: string,
    materials: string[],
  ): string[] {
    const collectedMaterials: string[] = [];
    for (let i = 1; i <= 11; i++) {
      const field = `${baseField}${i === 1 ? '' : i}`;
      if (raw[field]) {
        materials.forEach((material) => {
          if (raw[field].includes(material)) {
            collectedMaterials.push(material);
          }
        });
      }
    }
    return collectedMaterials;
  }

  private collectMenus(raw: any): string[] {
    const menus: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const field = `Menu proposé${i === 1 ? '' : i}`;
      if (raw[field]) {
        menus.push(raw[field] as string);
      }
    }
    return menus;
  }

  private extractProducts(raw: any): string[] {
    const productFields = [
      ...Array.from(
        { length: 11 },
        (_, i) => `Eau minerale disponible${i === 0 ? '' : i + 1}`,
      ),
      ...Array.from(
        { length: 21 },
        (_, i) => `Boissons gazeuses présentes${i === 0 ? '' : i + 1}`,
      ),
      ...Array.from(
        { length: 12 },
        (_, i) => `Boissons energisantes présentes${i === 0 ? '' : i + 1}`,
      ),
      ...Array.from(
        { length: 10 },
        (_, i) => `Marques produits laitiers présents${i === 0 ? '' : i + 1}`,
      ),
      ...Array.from(
        { length: 10 },
        (_, i) => `Marques culinaires présentes${i === 0 ? '' : i + 1}`,
      ),
      ...Array.from(
        { length: 20 },
        (_, i) =>
          `marques de pates alimentaires consommées${i === 1 ? '' : i + 1}`,
      ),
      ...Array.from(
        { length: 25 },
        (_, i) =>
          `Marques de boissons alcoolisées présentes${i === 0 ? '' : i + 1}`,
      ),
    ];

    return productFields.map((field) => raw[field]).filter(Boolean);
  }

  private extractProductAdditionals(
    raw: any,
  ): { category: string; approv: string }[] {
    const productAdditionals = [
      {
        category: 'EAU_MINERALE',
        approv: raw['Approvisionnement en eau au cours du dernier mois'],
        // source: raw['Source appro EAU'],
        // freq: raw['Frequence appro livraison directe EAU'],
      },
      {
        category: 'BOISSONS_GAZEUSES',
        approv: raw['Appro Boissons gazeuses au cours du mois'],
        // source: raw["Lieu d'appro boissons gazeuses2"],
        // freq: raw['Frequence appro boissons gazeuses3'],
      },
      {
        category: 'BOISSONS_ENERGISANTES',
        approv: raw['Boissons energisantes disponibles ?'],
        // source: raw['Appro Boissons energisantes'],
        // freq: raw['Frequence appro Boissons energisantes3'],
      },
      {
        category: 'PRODUITS_LAITIERS',
        approv: raw['Appro en Produits laitiers au cours du dernier mois ?'],
        // source: raw['Lieu appro produits laitiers'],
        // freq: raw['Freq appro livraison directe produits laitiers'],
      },
      {
        category: 'PRODUITS_CULINAIRES',
        approv: raw['Produits culinaires'],
        // source: raw["Lieu d'appro produits culinaires"],
        // freq: raw['Freq appro culinaire livraison directe'],
      },
      {
        category: 'PATES_ALIMENTAIRE',
        approv: raw['Pates alimentaires?'],
        // source: raw['Appro pates alimentaires'],
        // freq: raw['Freq appro livraison directe pate alimentaire'],
      },
      // {
      //   category: 'HUILE_DE_CUISON',
      //   source: raw['Approvisionnement principal boissons alcoolisées'],
      //   freq: raw['Lieu appro huiles de cuisson'],
      //   approv: raw['Huiles de cuisson?'],
      // },
      {
        category: 'BOISSONS_ALCOOLISEES',
        approv: raw['Boissons alcoolisées ?'],
        // source: raw['Approvisionnement principal boissons alcoolisées'],
        // freq: raw['Freq appro grossistes'],
      },
    ];

    return productAdditionals.filter((o) => o.approv);
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
