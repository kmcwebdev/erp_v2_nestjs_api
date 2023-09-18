import { Module } from '@nestjs/common';
import { UsersApiService } from './services/users.api.service';
import { UsersController } from './users.controller';
import { NewUserMemphisService } from './services/memphis/new-user.memphis.service';
import { UpdateUserMemphisService } from './services/memphis/update-user.memphis.service';
import { MemphisDevModule } from 'src/memphis-dev/memphis-dev.module';
import { ScheduleModule } from '@nestjs/schedule';
import { UserUpdateCronService } from './services/cron/user-update.cron.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule, MemphisDevModule, ScheduleModule.forRoot()],
  controllers: [UsersController],
  providers: [
    UsersApiService,
    NewUserMemphisService,
    UpdateUserMemphisService,
    UserUpdateCronService,
  ],
  exports: [UsersApiService],
})
export class UsersModule {}
