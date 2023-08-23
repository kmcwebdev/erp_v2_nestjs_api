import { Test, TestingModule } from '@nestjs/testing';
import { UsersApiService } from './services/users.api.service';

describe('UsersService', () => {
  let service: UsersApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersApiService],
    }).compile();

    service = module.get<UsersApiService>(UsersApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
