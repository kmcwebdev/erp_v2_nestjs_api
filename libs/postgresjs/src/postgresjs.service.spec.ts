import { Test, TestingModule } from '@nestjs/testing';
import { PostgresjsService } from './postgresjs.service';

describe('PostgresjsService', () => {
  let service: PostgresjsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostgresjsService],
    }).compile();

    service = module.get<PostgresjsService>(PostgresjsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
