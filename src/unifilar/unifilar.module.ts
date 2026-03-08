import { Module } from '@nestjs/common';
import { UnifilarService } from './unifilar.service';
import { UnifilarController } from './unifilar.controller';

@Module({
  controllers: [UnifilarController],
  providers: [UnifilarService],
  exports: [UnifilarService],
})
export class UnifilarModule {}
