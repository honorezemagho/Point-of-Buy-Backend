import { Module } from '@nestjs/common';
import { PdvService } from './pdv.service';
import { PdvController } from './pdv.controller';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB max file size
      },
    }),
  ],
  controllers: [PdvController],
  providers: [PdvService],
})
export class PdvModule {}
