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

  private validatePdvData(row: Record<string, unknown>): CreatePdvDto | null {
    try {
      // Convert string numbers to actual numbers
      const numericFields = [
        'PROJET_POWER_ID',
        'LATITUDE',
        'LONGITUDE',
        'STAR_TIME_OK',
        'END_TIME_OK',
      ] as const;

      // Create a new object with proper typing
      const processedData = { ...row } as Record<string, unknown>;

      // Convert numeric fields
      for (const field of numericFields) {
        const value = processedData[field];
        if (value !== undefined && value !== null && value !== '') {
          processedData[field] = Number(value);
        }
      }

      // Create DTO instance and validate
      const pdv = plainToInstance(CreatePdvDto, processedData, {
        enableImplicitConversion: true,
      });

      return pdv;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error parsing PDV data: ${errorMessage}`, errorStack);
      return null;
    }
  }

  private async validatePdv(pdv: CreatePdvDto): Promise<boolean> {
    try {
      const errors = await validate(pdv);
      if (errors.length > 0) {
        const errorDetails = errors.map((e) => ({
          property: e.property,
          constraints: e.constraints,
          value: e.value as unknown,
        }));

        const errorMessage = [
          'Validation failed for PDV:',
          JSON.stringify(pdv, null, 2),
          'Errors:',
          JSON.stringify(errorDetails, null, 2),
        ].join('\n');

        this.logger.warn(errorMessage);
        return false;
      }
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown validation error';
      this.logger.error(`Error validating PDV: ${errorMessage}`);
      return false;
    }
  }

  private async processBatch(batch: WriteBatch): Promise<void> {
    try {
      // Check if batch has any operations before committing
      const batchRef = batch as unknown as {
        _mutations: unknown[];
      };
      if (batchRef._mutations?.length > 0) {
        await batch.commit();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Error committing batch to Firestore', errorStack);
      throw new Error(`Failed to commit batch: ${errorMessage}`);
    }
  }

  private async processRow(row: Record<string, unknown>): Promise<boolean> {
    try {
      const pdv = this.validatePdvData(row);
      if (!pdv) {
        return false;
      }
      return this.validatePdv(pdv);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error processing row', {
        error: errorMessage,
        row: JSON.stringify(row, null, 2),
      });
      return false;
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
    const collectionRef = this.db.collection(this.collection);
    const csvContent = file.buffer.toString('utf-8');
    const batchPromises: Promise<void>[] = [];

    try {
      await new Promise<void>((resolve, reject) => {
        const stream = Readable.from(csvContent);
        let currentBatchSize = 0;
        let currentBatch = this.db.batch();
        let isProcessing = false;

        const processBatch = this.processBatch.bind(this);

        const processRow = async (row: Record<string, unknown>) => {
          try {
            const isValid = await this.processRow(row);
            if (!isValid) {
              errorCount++;
              return;
            }

            const pdv = this.validatePdvData(row);
            if (pdv) {
              const docRef = collectionRef.doc(pdv.UNIQUE_ID);
              currentBatch.set(docRef, pdv);
              processedCount++;
              currentBatchSize++;

              // Commit batch when reaching batch size
              if (currentBatchSize >= this.BATCH_SIZE) {
                const batchToProcess = currentBatch;
                currentBatch = this.db.batch();
                currentBatchSize = 0;

                const batchPromise = processBatch(batchToProcess);
                batchPromises.push(batchPromise);
                await batchPromise; // Wait for this batch to complete before continuing
              }
            }
          } catch (error) {
            errorCount++;
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            this.logger.error('Error processing row', {
              error: errorMessage,
              row: JSON.stringify(row, null, 2),
            });
          }
        };

        const processEnd = async (): Promise<void> => {
          if (isProcessing) return;
          isProcessing = true;

          try {
            // Process any remaining items in the current batch
            if (currentBatchSize > 0) {
              await processBatch(currentBatch);
            }

            // Wait for all batch operations to complete
            await Promise.all(batchPromises);

            const successRate =
              processedCount > 0
                ? Math.round(
                    ((processedCount - errorCount) / processedCount) * 100,
                  )
                : 0;

            this.logger.log(
              `Successfully processed ${processedCount} PDV records ` +
                `with ${errorCount} errors (${successRate}% success)`,
            );

            resolve();
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            this.logger.error('Error in CSV processing completion', {
              error: errorMessage,
            });
            reject(new Error(`CSV processing failed: ${errorMessage}`));
          }
        };

        csv
          .parse({ headers: true, delimiter: ';' })
          .on('error', (error: unknown) => {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            this.logger.error('CSV parsing error', { error: errorMessage });
            reject(new Error(`CSV parsing failed: ${errorMessage}`));
          })
          .on('data', (row: Record<string, unknown>) => {
            // Queue row processing but don't await here
            processRow(row).catch(() => {
              // Errors are already handled in processRow
            });
          })
          .on('end', () => {
            // Handle end event
            processEnd().catch(reject);
          });

        // Start the stream
        stream.pipe(csv.parse({ headers: true, delimiter: ';' }));
      });

      return {
        message: 'CSV processing completed',
        processed: processedCount,
        errors: errorCount,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Error processing CSV', { error: errorMessage });
      throw new Error(`Failed to process CSV: ${errorMessage}`);
    }
  }
}
