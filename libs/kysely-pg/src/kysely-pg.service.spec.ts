import { Test, TestingModule } from '@nestjs/testing';
import { KyselyPgService } from './kysely-pg.service';

describe('KyselyPgService', () => {
  let service: KyselyPgService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KyselyPgService],
    }).compile();

    service = module.get<KyselyPgService>(KyselyPgService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
