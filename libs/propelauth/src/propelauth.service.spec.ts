import { Test, TestingModule } from '@nestjs/testing';
import { PropelauthService } from './propelauth.service';

describe('PropelauthService', () => {
  let service: PropelauthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PropelauthService],
    }).compile();

    service = module.get<PropelauthService>(PropelauthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
