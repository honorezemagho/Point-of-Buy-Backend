import { Injectable, Logger } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import * as csv from 'fast-csv';
import * as XLSX from 'xlsx';
import { CreatePdvDto } from './dto/create-pdv.dto';
import { db } from '../firebase.config';
import { Firestore, WriteBatch } from 'firebase-admin/firestore';

@Injectable()
export class PdvService {
  private readonly logger = new Logger(PdvService.name);
  private readonly collection = 'pdvs';
  private readonly BATCH_SIZE = 500;
  private readonly db: Firestore = db;

  private readonly numericFields = [
    'LATITUDE',
    'LONGITUDE',
    'DATE',
    'TELEPHONE_DU_REPONDANT',
    'TELEPHONE_ENTREPRISE',
    'PROJET_POWER_ID',
  ];

  private validatePdvData(row: Record<string, unknown>): CreatePdvDto | null {
    try {
      Object.keys(row).forEach((key) => {
        if (row[key] === '') row[key] = null;
      });
      return plainToInstance(CreatePdvDto, row, {
        enableImplicitConversion: true,
      });
    } catch (error) {
      this.logger.error(
        `Error parsing PDV data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  private async validatePdv(pdv: CreatePdvDto): Promise<boolean> {
    const errors = await validate(pdv);
    if (errors.length > 0) {
      const errorDetails = errors.map((e) => ({
        property: e.property,
        constraints: e.constraints,
      }));
      this.logger.warn(
        `Validation failed for PDV: ${pdv.UNIQUE_ID}\nErrors: ${JSON.stringify(errorDetails)}`,
      );
      return false;
    }
    return true;
  }

  private isValidFirestoreId(id: string): boolean {
    return (
      typeof id === 'string' &&
      id.length > 0 &&
      !/^__.*__$/.test(id) &&
      !/[\s~!@#$%^&*()=+[\]{}|;:'",<>/?]/.test(id) &&
      id !== '.' &&
      id !== '..' &&
      new TextEncoder().encode(id).length <= 1500
    );
  }

  private preparePdvData(pdv: CreatePdvDto): Record<string, unknown> {
    const pdvData = { ...pdv } as Record<string, unknown>;
    for (const field of this.numericFields) {
      const value = pdvData[field];
      if (value === undefined || value === '') {
        pdvData[field] = null;
      } else {
        const numValue = Number(value);
        pdvData[field] = isNaN(numValue) ? value : numValue;
      }
    }
    return pdvData;
  }

  private async processBatch(batch: WriteBatch): Promise<void> {
    try {
      await batch.commit();
      this.logger.debug('Batch committed successfully.');
    } catch (error) {
      this.logger.error(
        'Error committing batch to Firestore',
        error instanceof Error ? error.stack : undefined,
      );
      throw new Error(
        `Failed to commit batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async processRecords(
    records: Array<Record<string, unknown>>,
  ): Promise<{ message: string; processed: number; errors: number }> {
    let processedCount = 0;
    let errorCount = 0;
    const processedIds = new Set<string>();
    let currentBatch = this.db.batch();
    let currentBatchSize = 0;
    const collectionRef = this.db.collection(this.collection);

    this.logger.log(`Starting to process ${records.length} records.`);

    for (const row of records) {
      try {
        const pdv = this.validatePdvData(row);
        if (!pdv || !pdv.UNIQUE_ID || !this.isValidFirestoreId(pdv.UNIQUE_ID)) {
          this.logger.warn(
            `Skipping invalid UNIQUE_ID: ${JSON.stringify(pdv?.UNIQUE_ID)}`,
          );
          errorCount++;
          continue;
        }

        if (processedIds.has(pdv.UNIQUE_ID)) {
          this.logger.warn(`Skipping duplicate UNIQUE_ID: ${pdv.UNIQUE_ID}`);
          errorCount++;
          continue;
        }

        const isValid = await this.validatePdv(pdv);
        if (!isValid) {
          errorCount++;
          continue;
        }

        const pdvData = this.preparePdvData(pdv);
        const docRef = collectionRef.doc(pdv.UNIQUE_ID);
        currentBatch.set(docRef, pdvData, { merge: true });

        processedIds.add(pdv.UNIQUE_ID);
        currentBatchSize++;
        processedCount++;

        if (currentBatchSize >= this.BATCH_SIZE) {
          this.logger.debug(
            `Committing batch at ${processedCount} processed items.`,
          );
          await this.processBatch(currentBatch);
          currentBatch = this.db.batch();
          currentBatchSize = 0;
        }
      } catch (error) {
        this.logger.error(
          `Error processing row: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        errorCount++;
      }
    }

    if (currentBatchSize > 0) {
      this.logger.debug('Committing final batch.');
      await this.processBatch(currentBatch);
    }

    this.logger.log(
      `Finished processing. Total: ${records.length}, Processed: ${processedCount}, Errors: ${errorCount}`,
    );

    return {
      message: `Processed ${processedCount} records with ${errorCount} errors.`,
      processed: processedCount,
      errors: errorCount,
    };
  }

  async processExcel(file: {
    buffer: Buffer;
  }): Promise<{ message: string; processed: number; errors: number }> {
    if (!file?.buffer || file.buffer.length === 0)
      throw new Error('No Excel file provided or file is empty.');

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      raw: false,
      defval: '',
    });

    this.logger.log(`Processing ${rows.length} records from Excel`);
    return this.processRecords(rows);
  }

  async processCsv(file: {
    buffer: Buffer;
  }): Promise<{ message: string; processed: number; errors: number }> {
    if (!file?.buffer || file.buffer.length === 0)
      throw new Error('No CSV file provided or file is empty.');

    const csvString = file.buffer.toString('utf-8').replace(/\r\n/g, '\n');

    const records: Record<string, unknown>[] = [];

    await new Promise<void>((resolve, reject) => {
      csv
        .parseString(csvString, { headers: true, trim: true })
        .on('data', (row) => records.push(row))
        .on('end', resolve)
        .on('error', (error) => {
          this.logger.error(`CSV parsing error: ${error.message}`);
          reject(new Error(`CSV parsing failed: ${error.message}`));
        });
    });

    this.logger.log(`Processing ${records.length} records from CSV`);
    return this.processRecords(records);
  }
}
