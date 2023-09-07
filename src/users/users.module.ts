import { Module } from '@nestjs/common';
import { UsersApiService } from './services/users.api.service';
import { UsersController } from './users.controller';
import { NewUserMemphisService } from './services/new-user.memphis.service';
import { UpdateUserMemphisService } from './services/update-user.memphis.service';
import { MemphisDevModule } from 'src/memphis-dev/memphis-dev.module';

@Module({
  imports: [MemphisDevModule],
  controllers: [UsersController],
  providers: [UsersApiService, NewUserMemphisService, UpdateUserMemphisService],
  exports: [NewUserMemphisService, UpdateUserMemphisService],
})
export class UsersModule {}
