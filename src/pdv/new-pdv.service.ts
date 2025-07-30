/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as XLSX from 'xlsx';
import { Firestore } from 'firebase-admin/firestore';
import { db } from '../firebase.config';
import { NewCreatePdvDto } from './dto/new-create-pdv.dto';

interface RawPdvRow {
  [key: string]: any;
}

@Injectable()
export class NewPdvService {
  private readonly logger = new Logger(NewPdvService.name);
  private readonly collection = 'pdvs_data';
  private readonly db: Firestore = db;

  // Firestore allows max 500 operations per batch; stay under limit
  private readonly BATCH_SIZE = 450;

  // Known advertising materials
  private readonly ADVERTISING_MATERIALS = [
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

  constructor() {}

  /**
   * Processes the Excel buffer and saves data to Firestore
   * Uses batching and robust error handling for large datasets
   */
  async processAndSaveToFirestore(buffer: Buffer): Promise<{
    success: boolean;
    message: string;
    details?: { errors: Array<{ index: number; error: string }> };
  }> {
    let rows: RawPdvRow[];

    // Parse Excel
    try {
      const wb = XLSX.read(buffer, { type: 'buffer', cellText: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Excel parsing failed';
      this.logger.error('Failed to parse Excel file:', message);
      return {
        success: false,
        message: 'Failed to parse Excel file',
        details: { errors: [{ index: -1, error: message }] },
      };
    }

    this.logger.log(`Starting processing of ${rows.length} records`);

    const errors: { index: number; error: string }[] = [];

    // Process in batches
    for (let i = 0; i < rows.length; i += this.BATCH_SIZE) {
      const batch = this.db.batch();
      let writeCount = 0; // ✅ Manually track writes (instead of _getWriteCount)

      const batchRows = rows.slice(i, i + this.BATCH_SIZE);
      const promises = batchRows.map(async (row, localIndex) => {
        const globalIndex = i + localIndex;

        try {
          // Transform row
          const data = this.transformRow(row, globalIndex);

          // Validate DTO
          const dto = plainToInstance(NewCreatePdvDto, data, {
            enableImplicitConversion: true,
          });
          const validationErrors = await validate(dto, {
            skipMissingProperties: true,
          });

          if (validationErrors.length > 0) {
            const errMsg = validationErrors
              .map((e) => Object.values(e.constraints || {}).join(', '))
              .join('; ');
            throw new Error(`Validation failed: ${errMsg}`);
          }

          // Ensure valid document ID
          const docId = String(data.identifiant_enquete);
          if (!docId || docId === 'null' || docId === 'undefined') {
            throw new Error('Invalid or missing document ID');
          }

          const docRef = this.db.collection(this.collection).doc(docId);
          batch.set(docRef, data, { merge: true });
          writeCount++;
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          errors.push({ index: globalIndex, error: message });
        }
      });

      // Wait for all transformations and validations in this batch
      await Promise.all(promises);

      // Commit batch only if there are writes
      if (writeCount > 0) {
        try {
          await batch.commit();
          this.logger.debug(
            `Committed batch: ${i / this.BATCH_SIZE + 1}, writes: ${writeCount}`,
          );
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : 'Batch commit failed';
          // Attribute failure to all items in batch (best effort)
          batchRows.forEach((_, localIndex) => {
            const globalIndex = i + localIndex;
            errors.push({
              index: globalIndex,
              error: `Batch commit failed: ${message}`,
            });
          });
        }
      }
    }

    const successCount = rows.length - errors.length;
    const success = errors.length === 0;

    this.logger.log(
      `Processing completed: ${successCount} success, ${errors.length} errors`,
    );
    return {
      success,
      message: `Processed ${rows.length} records: ${successCount} succeeded${errors.length ? `, ${errors.length} failed` : ''}`,
      details: errors.length ? { errors } : undefined,
    };
  }

  /**
   * Transforms a raw Excel row into structured data
   */
  private transformRow(raw: RawPdvRow, idx: number): any {
    return {
      identifiant_enquete: this.generateOrderedId(idx + 1),
      region: this.safeString(raw.REGION),
      ville: this.safeString(raw.VILLE),
      arrondissement: this.safeString(raw.ARRONDISSEMENT),
      quartier_final: this.safeString(raw['QUARTIER FINALE']),
      type_pdv_ok: this.safeString(raw['TYPE_PDV_OK']),
      zone_enquete: this.safeString(raw['ZONE_D_ENQUETE']),
      nom_entreprise: this.safeString(raw['NOM_ENTREPRISE']),
      chiffre_affaires: this.safeString(raw["Chiffre d'affaires"]),
      raison_sociale: this.safeString(raw['Raison sociale']),
      creation: this.safeString(raw['Creation']),
      adresse_physique: this.safeString(raw['ADRESSE_PHYSIQUE']),
      nationalite_proprietaire: this.safeString(
        raw['Nationalité du propriétaire'],
      ),
      latitude: this.safeFloat(raw['LATITUDE']),
      longitude: this.safeFloat(raw['LONGITUDE']),
      repondant: this.safeString(raw['Repondant']),
      nom_repondant: this.safeString(raw['NOM_DU_REPONDANT']),
      tel_repondant: this.cleanPhone(raw['TELEPHONE_DU_REPONDANT']),
      enseigne_visible: raw['Enseigne visible'] === 'Oui',
      partenariat_publicitaire: raw['Partenariat publicitaire'] === 'Oui',
      classement: this.safeString(raw['Classement']),
      nombre_chambre: this.safeNumber(raw['Nombre de chambre']),
      prix_chambre_std: this.safeFloat(raw['Prix standard chambre']),
      notation_hotel: this.safeString(raw['Q1_hotel_ok']),
      notation_restaurant: this.safeString(raw['Q1_restaurant_ok']),
      nombre_restaurant: this.safeNumber(
        raw['Combien de restaurant dispose votre établissement ?'],
      ),
      nombre_chaise: this.safeNumber(raw['Nombre de chaise']),
      service_offert: this.safeString(raw['Service offert']),
      livraison_disponible: this.safeString(raw['Livraison disponible ?']),
      products: this.extractProducts(raw),
      products_additionals: this.extractProductAdditionals(raw),
      advertising_material_present: this.collectMaterials(
        raw,
        'Elements de publicité présent',
      ),
      advertising_material_wished: this.collectMaterials(
        raw,
        'Elements de publicité souhaités',
      ),
      menus_proposes: this.collectMenus(raw),
    };
  }

  /**
   * Extract advertising materials from "Elements de publicité présent", "présent2", etc.
   */
  private collectMaterials(raw: RawPdvRow, baseField: string): string[] {
    const result: string[] = [];
    for (let i = 1; i <= 11; i++) {
      const field = `${baseField}${i === 1 ? '' : i}`;
      const value = raw[field];
      if (typeof value === 'string') {
        this.ADVERTISING_MATERIALS.forEach((material) => {
          if (value.includes(material) && !result.includes(material)) {
            result.push(material);
          }
        });
      }
    }
    return result;
  }

  /**
   * Extract menus (Menu proposé, Menu proposé2, ...)
   */
  private collectMenus(raw: RawPdvRow): string[] {
    const menus: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const field = `Menu proposé${i === 1 ? '' : i}`;
      const value = raw[field];
      if (value) menus.push(String(value).trim());
    }
    return menus;
  }

  /**
   * Extract all product fields
   */
  private extractProducts(raw: RawPdvRow): string[] {
    const prefixes = [
      { prefix: 'Eau minerale disponible', count: 11 },
      { prefix: 'Boissons gazeuses présentes', count: 21 },
      { prefix: 'Boissons energisantes présentes', count: 12 },
      { prefix: 'Marques produits laitiers présents', count: 10 },
      { prefix: 'Marques culinaires présentes', count: 10 },
      { prefix: 'marques de pates alimentaires consommées', count: 20 },
      { prefix: 'Marques de boissons alcoolisées présentes', count: 25 },
    ];

    const values: string[] = [];
    for (const { prefix, count } of prefixes) {
      for (let i = 1; i <= count; i++) {
        const field = `${prefix}${i === 1 ? '' : i}`;
        const value = raw[field];
        if (value) values.push(String(value).trim());
      }
    }
    return values;
  }

  /**
   * Extract product availability/additional info
   */
  private extractProductAdditionals(
    raw: RawPdvRow,
  ): { category: string; approv: string }[] {
    const mappings = [
      {
        category: 'EAU_MINERALE',
        field: 'Approvisionnement en eau au cours du dernier mois',
      },
      {
        category: 'BOISSONS_GAZEUSES',
        field: 'Appro Boissons gazeuses au cours du mois',
      },
      {
        category: 'BOISSONS_ENERGISANTES',
        field: 'Boissons energisantes disponibles ?',
      },
      {
        category: 'PRODUITS_LAITIERS',
        field: 'Appro en Produits laitiers au cours du dernier mois ?',
      },
      { category: 'PRODUITS_CULINAIRES', field: 'Produits culinaires' },
      { category: 'PATES_ALIMENTAIRE', field: 'Pates alimentaires?' },
      { category: 'BOISSONS_ALCOOLISEES', field: 'Boissons alcoolisées ?' },
    ];

    return mappings
      .map(({ category, field }) => {
        const approv = raw[field];
        return approv ? { category, approv: String(approv).trim() } : null;
      })
      .filter(
        (item): item is { category: string; approv: string } => item !== null,
      );
  }

  /**
   * Generate 5-digit padded ID
   */
  private generateOrderedId(index: number): string {
    return index.toString().padStart(5, '0');
  }

  /**
   * Clean phone number (remove trailing ".0")
   */
  private cleanPhone(str: any): string | null {
    if (typeof str !== 'string') return null;
    return str.replace(/\.0$/, '').trim() || null;
  }

  /**
   * Safely convert to string
   */
  private safeString(val: any): string | null {
    return val == null || val === '' ? null : String(val).trim();
  }

  /**
   * Safely convert to number
   */
  private safeNumber(val: any): number | null {
    const n = Number(val);
    return isNaN(n) || val == null ? null : n;
  }

  /**
   * Safely convert to float
   */
  private safeFloat(val: any): number | null {
    return this.safeNumber(val);
  }
}
