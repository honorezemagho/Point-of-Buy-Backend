import { Injectable, Logger } from '@nestjs/common';
import { db } from '../firebase.config';
import * as csv from 'fast-csv';
import { Readable } from 'stream';
import { CreatePdvDto } from './dto/create-pdv.dto';
import { Firestore, WriteBatch } from 'firebase-admin/firestore';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class PdvService {
  private readonly logger = new Logger(PdvService.name);
  private readonly collection = 'pdv';
  private readonly BATCH_SIZE = 500;
  private readonly db: Firestore;

  constructor() {
    this.db = db;
  }

  private validatePdvData(row: Record<string, any>): CreatePdvDto | null {
    try {
      // Convert string numbers to actual numbers
      const numericFields = [
        'PROJET_POWER_ID', 'LATITUDE', 'LONGITUDE', 
        'STAR_TIME_OK', 'END_TIME_OK'
      ];
      
      const processedData: Record<string, any> = { ...row };
      
      // Convert numeric fields
      for (const field of numericFields) {
        if (field in processedData && processedData[field] !== '') {
          processedData[field] = Number(processedData[field]);
        }
      }

      // Create DTO instance and validate
      const pdv = plainToInstance(CreatePdvDto, processedData, {
        enableImplicitConversion: true,
      });
      
      return pdv;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error parsing PDV data: ${errorMessage}`, errorStack);
      return null;
    }
  }

  private async validatePdv(pdv: CreatePdvDto): Promise<boolean> {
    try {
      const errors = await validate(pdv);
      if (errors.length > 0) {
        const errorMessage = `Validation failed for PDV: ${JSON.stringify(pdv, null, 2)}\n` +
          `Errors: ${JSON.stringify(errors.map(e => ({
            property: e.property,
            constraints: e.constraints,
            value: e.value,
          })), null, 2)}`;
        this.logger.warn(errorMessage);
        return false;
      }
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      this.logger.error(`Error validating PDV: ${errorMessage}`);
      return false;
    }
  }

  private async processBatch(batch: WriteBatch): Promise<void> {
    try {
      await batch.commit();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Error committing batch to Firestore', errorStack);
      throw new Error(`Failed to commit batch: ${errorMessage}`);
    }
  }

  async processCsv(
    file: Express.Multer.File,
  ): Promise<{ message: string; processed: number; errors: number }> {
    if (!file?.buffer) {
      throw new Error('No file provided or file is empty');
    }

    let processedCount = 0;
    let errorCount = 0;
    let batch = this.db.batch();
    const collectionRef = this.db.collection(this.collection);
    const csvContent = file.buffer.toString('utf-8');

    try {
      await new Promise<void>((resolve, reject) => {
        const stream = Readable.from(csvContent);
        let batchPromises: Promise<void>[] = [];

        const processRow = async (row: Record<string, any>) => {
          try {
            const pdv = this.validatePdvData(row);
            if (!pdv) {
              errorCount++;
              return;
            }

            const isValid = await this.validatePdv(pdv);
            if (!isValid) {
              errorCount++;
              return;
            }

            // Use UNIQUE_ID as the document ID
            const docRef = collectionRef.doc(pdv.UNIQUE_ID);
            batch.set(docRef, pdv);
            processedCount++;

            // Commit batch when reaching batch size
            if (processedCount % this.BATCH_SIZE === 0) {
              const currentBatch = batch;
              batch = this.db.batch();
              batchPromises.push(this.processBatch(currentBatch));
              this.logger.log(`Processed ${processedCount} records...`);
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error processing row: ${JSON.stringify(row, null, 2)}. Error: ${errorMessage}`);
            errorCount++;
          }
        };

        const csvStream = csv.parse({ 
          headers: true,
          trim: true,
          strictColumnHandling: true,
        });

        csvStream
          .on('error', (error) => {
            const errorMessage = error instanceof Error ? error.message : 'Unknown CSV error';
            this.logger.error('CSV parsing error', { error: errorMessage });
            reject(new Error(`CSV parsing failed: ${errorMessage}`));
          })
          .on('data', (row) => {
            // Queue row processing but don't await here
            processRow(row).catch((error) => {
              this.logger.error('Error in row processing', { error });
              errorCount++;
            });
          })
          .on('end', async () => {
            try {
              // Wait for all batch operations to complete
              await Promise.allSettled(batchPromises);
              
              // Commit any remaining operations in the last batch
              if (processedCount % this.BATCH_SIZE !== 0) {
                await this.processBatch(batch);
              }
              
              resolve();
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              this.logger.error('Error in CSV processing completion', { error: errorMessage });
              reject(new Error(`CSV processing failed: ${errorMessage}`));
            }
          });

        // Start the stream
        stream.pipe(csvStream);
      });

      this.logger.log(`Successfully processed ${processedCount} PDV records with ${errorCount} errors`);
      return { 
        message: 'CSV processing completed', 
        processed: processedCount, 
        errors: errorCount,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error processing CSV', { error: errorMessage });
      throw new Error(`Failed to process CSV: ${errorMessage}`);
    }
  }
}
