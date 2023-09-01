import { Test, TestingModule } from '@nestjs/testing';
import { FilestackService } from './filestack.service';

describe('FilestackService', () => {
  let service: FilestackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FilestackService],
    }).compile();

    service = module.get<FilestackService>(FilestackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
