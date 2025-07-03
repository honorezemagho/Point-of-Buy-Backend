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

@ApiTags('PDV')
@Controller('pdv')
export class PdvController {
  constructor(private readonly pdvService: PdvService) {}

  @Post('upload')
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
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file format or missing file',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File & { buffer: Buffer },
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (file.mimetype !== 'text/csv') {
      throw new BadRequestException('Only CSV files are allowed');
    }

    try {
      const result = await this.pdvService.processCsv(file);
      return {
        success: true,
        message: result.message,
        processed: result.processed,
      };
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new BadRequestException(`Error processing CSV: ${errorMessage}`);
    }
  }
}
