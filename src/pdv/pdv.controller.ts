import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PdvService } from './pdv.service';
import { Express } from 'express';
import {
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiTags,
} from '@nestjs/swagger';
import { NewPdvService } from './new-pdv.service';

@ApiTags('PDV')
@Controller('pdv')
export class PdvController {
  constructor(
    private readonly pdvService: PdvService,
    private readonly newPdvService: NewPdvService,
  ) {}

  @Post('upload/csv')
  @ApiOperation({ summary: 'Upload a CSV file with PDV data' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV file containing PDV data',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The file has been successfully processed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'CSV processed successfully' },
        processed: { type: 'number', example: 100 },
        errors: { type: 'number', example: 0 },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file type or format',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    if (!file.mimetype.includes('csv') && !file.originalname.endsWith('.csv')) {
      throw new BadRequestException(
        'Invalid file type. Please upload a CSV file',
      );
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { message, ...result } = await this.pdvService.processCsv({
        buffer: file.buffer,
      });

      return {
        success: true,
        message: 'CSV processed successfully',
        ...result,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorOptions = error instanceof Error ? { cause: error } : {};
      throw new BadRequestException(
        `Error processing CSV: ${errorMessage}`,
        errorOptions,
      );
    }
  }

  @Post('upload/excel')
  @ApiOperation({ summary: 'Upload an Excel file with PDV data' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel file (.xlsx, .xls) containing PDV data',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The file has been successfully processed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Excel file processed successfully',
        },
        processed: { type: 'number', example: 100 },
        errors: { type: 'number', example: 0 },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file type or format',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const validMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];
    const validExtensions = ['.xlsx', '.xls'];
    const isValidMimeType = validMimeTypes.includes(file.mimetype);
    const isValidExtension = validExtensions.some((ext) =>
      file.originalname.toLowerCase().endsWith(ext),
    );

    if (!isValidMimeType && !isValidExtension) {
      throw new BadRequestException(
        'Invalid file type. Please upload an Excel file (.xlsx, .xls)',
      );
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { message, ...result } = await this.pdvService.processExcel({
        buffer: file.buffer,
      });

      return {
        success: true,
        message: 'Excel file processed successfully',
        ...result,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorOptions = error instanceof Error ? { cause: error } : {};
      throw new BadRequestException(
        `Error processing Excel file: ${errorMessage}`,
        errorOptions,
      );
    }
  }

  @Post('upload/excel/data')
  @ApiOperation({ summary: 'Upload an Excel file with new PDV data' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel file (.xlsx, .xls) containing PDV data',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The file has been successfully processed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Excel file processed successfully',
        },
        processed: { type: 'number', example: 100 },
        errors: { type: 'number', example: 0 },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file type or format',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadExcelNewData(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const validMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];
    const validExtensions = ['.xlsx', '.xls'];
    const isValidMimeType = validMimeTypes.includes(file.mimetype);
    const isValidExtension = validExtensions.some((ext) =>
      file.originalname.toLowerCase().endsWith(ext),
    );

    if (!isValidMimeType && !isValidExtension) {
      throw new BadRequestException(
        'Invalid file type. Please upload an Excel file (.xlsx, .xls)',
      );
    }

    try {
      const result = await this.newPdvService.processAndSaveToFirestore(
        file.buffer,
      );

      return {
        success: true,
        message: 'Excel file processed successfully',
        processed: result,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorOptions = error instanceof Error ? { cause: error } : {};
      throw new BadRequestException(
        `Error processing Excel file: ${errorMessage}`,
        errorOptions,
      );
    }
  }
}
