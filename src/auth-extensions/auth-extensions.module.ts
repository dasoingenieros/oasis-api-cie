import { Module } from '@nestjs/common';
import { AuthExtensionsController } from './auth-extensions.controller';

@Module({
  controllers: [AuthExtensionsController],
})
export class AuthExtensionsModule {}
