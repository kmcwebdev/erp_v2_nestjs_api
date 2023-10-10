import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { MemphisDevModule } from 'src/memphis-dev/memphis-dev.module';
import { UsersApiService } from './services/users.api.service';
import { NewUserMemphisService } from './services/memphis/new-user.memphis.service';
import { UpdateUserMemphisService } from './services/memphis/update-user.memphis.service';
import { UsersController } from './users.controller';
import { UserUpdateCronService } from './services/cron/user-update.cron.service';

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
