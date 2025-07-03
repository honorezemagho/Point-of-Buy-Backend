import { Injectable, Logger } from '@nestjs/common';
import { db } from '../firebase.config';
import * as csv from 'fast-csv';
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
      // Create a plain object from the row
      const processedData = { ...row } as Record<string, unknown>;

      // Handle empty strings and convert to null
      Object.keys(processedData).forEach((key) => {
        if (processedData[key] === '') {
          processedData[key] = null;
        }
      });

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

  /**
   * Validates if a string is a valid Firestore document ID
   * @param id The ID to validate
   * @returns boolean indicating if the ID is valid
   */
  private isValidFirestoreId(id: string): boolean {
    // Firestore document IDs must:
    // - Be non-empty strings
    // - Not contain any forward slashes (/)
    // - Not match __.*__ (reserved for system use)
    // - Not be a single dot (.) or double dots (..)
    // - Not exceed 1,500 bytes when UTF-8 encoded
    if (typeof id !== 'string' || id.length === 0) {
      return false;
    }

    // Check for invalid patterns
    if (
      /^__.*__$/.test(id) || // System reserved
      /[\s~!@#$%^&*()=+[\]{}|;:'",<>/?]/.test(id) || // Invalid characters
      id === '.' ||
      id === '..' // Relative paths
    ) {
      return false;
    }

    // Check size limit (1500 bytes in UTF-8)
    return new TextEncoder().encode(id).length <= 1500;
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

  /**
   * Process a CSV file from buffer
   * @param file - The uploaded file object containing the buffer
   * @returns Object containing processing results
   */
  async processCsv(file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  }): Promise<{ message: string; processed: number; errors: number }> {
    // 1. Check if file exists and has content
    if (!file?.buffer || file.buffer.length === 0) {
      throw new Error('No file provided or file is empty');
    }

    let processedCount = 0;
    let errorCount = 0;
    const processedIds = new Set<string>();
    const collectionRef = this.db.collection(this.collection);
    const csvString = file.buffer.toString('utf-8').replace(/\r\n/g, '\n');
    let currentBatch = this.db.batch();
    let currentBatchSize = 0;

    try {
      // Split into lines and process
      const lines = csvString.split('\n').map((line) => line.trim());

      // Skip the first line (header) and any empty lines
      const dataLines = lines
        .slice(1) // Skip header row
        .filter((line) => line.length > 0);

      // Process each line to extract the actual CSV data
      const normalizedCsv = dataLines
        .map((line) => {
          // Extract the actual CSV data from each line
          const match = line.match(/".*"/);
          return match ? match[0].replace(/"/g, '') : line;
        })
        .join('\n');

      // Add the header row with the exact field names we want
      const headerRow =
        'PROJET_POWER_ID,UNIQUE_ID,REGION,VILLE,ARRONDISSEMENT,QUARTIER,QUARTIER_AUTRES,ENQUETEUR,SUPERVISEUR,TYPE_PDV,TYPE_QUESTIONNAIRE,ZONE_D_ENQUETE,S1,S3,S4,Q1,Q2,Q3,NOM_ENTREPRISE,NOM_DU_REPONDANT,TELEPHONE_DU_REPONDANT,TELEPHONE_ENTREPRISE,DATE,ADRESSE_PHYSIQUE,LATITUDE,LONGITUDE,STAR_TIME_OK,END_TIME_OK,fiche_Questionnaire';
      const finalCsv = `${headerRow}\n${normalizedCsv}`;

      await new Promise<void>((resolve, reject) => {
        // Process CSV rows with proper configuration
        const csvParser = csv.parseString(finalCsv, {
          headers: true,
          delimiter: ',',
          ignoreEmpty: true,
          trim: true,
          skipLines: 0,
          quote: '"',
          escape: '"',
        });

        // Counter for processed records
        // let processedRows = 0;
        // const MAX_RECORDS = 10;

        // Process a single row of data
        const processRow = (row: Record<string, unknown>) => {
          // Stop processing after MAX_RECORDS
          // if (processedRows >= MAX_RECORDS) {
          //   return;
          // }
          try {
            const pdv = this.validatePdvData(row);
            if (!pdv) {
              errorCount++;
              return;
            }

            // Convert DTO to plain object and handle numeric fields
            const pdvData = { ...pdv } as Record<string, unknown>;

            // Convert numeric fields, making PROJET_POWER_ID optional
            const numericFields = [
              { field: 'LATITUDE', required: false },
              { field: 'LONGITUDE', required: false },
              { field: 'STAR_TIME_OK', required: false },
              { field: 'END_TIME_OK', required: false },
              { field: 'DATE', required: false },
              { field: 'TELEPHONE_DU_REPONDANT', required: false },
              { field: 'TELEPHONE_ENTREPRISE', required: false },
              { field: 'PROJET_POWER_ID', required: false },
            ];

            numericFields.forEach(({ field, required }) => {
              const value = pdvData[field];
              if (value === undefined || value === '') {
                if (required) {
                  throw new Error(`Missing required numeric field: ${field}`);
                }
                // Set to null for optional fields
                pdvData[field] = null;
              } else {
                const numValue = Number(value);
                if (isNaN(numValue)) {
                  if (required) {
                    throw new Error(
                      `Invalid number format for field: ${field}`,
                    );
                  }
                  // For optional fields, keep the original value if conversion fails
                  pdvData[field] = value;
                } else {
                  pdvData[field] = numValue;
                }
              }
            });

            // Ensure UNIQUE_ID is present and valid for Firestore
            if (!pdv.UNIQUE_ID || !this.isValidFirestoreId(pdv.UNIQUE_ID)) {
              this.logger.warn(
                `Skipping row with invalid UNIQUE_ID: ${JSON.stringify(
                  pdv.UNIQUE_ID,
                )}. ID must be a non-empty string and valid for Firestore.`,
              );
              errorCount++;
              return;
            }

            // Check for duplicate UNIQUE_ID in the current batch
            if (processedIds.has(pdv.UNIQUE_ID)) {
              this.logger.warn(
                `Skipping duplicate UNIQUE_ID: ${pdv.UNIQUE_ID}`,
              );
              errorCount++;
              return;
            }

            // Add to batch using UNIQUE_ID as document ID
            const docRef = collectionRef.doc(pdv.UNIQUE_ID);
            currentBatch.set(docRef, pdvData, { merge: true });
            processedIds.add(pdv.UNIQUE_ID);
            currentBatchSize++;
            processedCount++;
            // processedRows++;

            // // Stop processing after MAX_RECORDS
            // if (processedRows >= MAX_RECORDS) {
            //   this.logger.log(`Processed maximum of ${MAX_RECORDS} records`);
            // }

            // Commit batch if size limit reached
            if (currentBatchSize >= this.BATCH_SIZE) {
              const batchToCommit = currentBatch;
              currentBatch = this.db.batch();
              currentBatchSize = 0;

              // Execute batch commit asynchronously
              batchToCommit.commit().catch((batchError: unknown) => {
                const batchErrorMessage =
                  batchError instanceof Error
                    ? batchError.message
                    : 'Unknown error';
                this.logger.error('Batch commit error', {
                  error: batchErrorMessage,
                });
              });
            }
          } catch (rowError) {
            errorCount++;
            const rowErrorMessage =
              rowError instanceof Error ? rowError.message : 'Unknown error';
            this.logger.error('Error processing row', {
              error: rowErrorMessage,
              row: JSON.stringify(row, null, 2),
            });
          }
        };

        // Handle end of file processing
        const handleEnd = () => {
          const commitFinalBatch = async () => {
            try {
              if (currentBatchSize > 0) {
                await currentBatch.commit();
              }
              this.logger.log(
                `Successfully processed ${processedCount} PDV records with ${errorCount} errors`,
              );
              resolve();
            } catch (finalError) {
              const finalErrorMessage =
                finalError instanceof Error
                  ? finalError.message
                  : 'Unknown error';
              this.logger.error('Final batch commit error', {
                error: finalErrorMessage,
              });
              reject(
                new Error(`Failed to commit final batch: ${finalErrorMessage}`),
              );
            }
          };

          // Start the final batch commit
          commitFinalBatch().catch(() => {
            // Error is already handled in commitFinalBatch
          });
        };

        // Handle CSV parsing errors
        const handleError = (parseError: Error) => {
          this.logger.error('CSV parsing error', {
            error: parseError.message,
          });
          reject(new Error(`CSV parsing failed: ${parseError.message}`));
        };

        // Set up event listeners
        csvParser
          .on('data', processRow)
          .on('end', handleEnd)
          .on('error', handleError);
      });

      return {
        message: `Successfully processed ${processedCount} PDV records with ${errorCount} errors`,
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
