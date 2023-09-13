import { Module } from '@nestjs/common';
import { UsersApiService } from './services/users.api.service';
import { UsersController } from './users.controller';
import { NewUserMemphisService } from './services/memphis/new-user.memphis.service';
import { UpdateUserMemphisService } from './services/memphis/update-user.memphis.service';
import { MemphisDevModule } from 'src/memphis-dev/memphis-dev.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [MemphisDevModule, ScheduleModule.forRoot()],
  controllers: [UsersController],
  providers: [UsersApiService, NewUserMemphisService, UpdateUserMemphisService],
})
export class UsersModule {}
