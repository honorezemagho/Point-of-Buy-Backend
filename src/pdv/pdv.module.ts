import { Module } from '@nestjs/common';
import { PdvService } from './pdv.service';
import { PdvController } from './pdv.controller';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { NewPdvService } from './new-pdv.service';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB max file size
      },
    }),
  ],
  controllers: [PdvController],
  providers: [PdvService, NewPdvService],
})
export class PdvModule {}
