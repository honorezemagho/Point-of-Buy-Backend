import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PdvModule } from './pdv/pdv.module';

@Module({
  imports: [PdvModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
