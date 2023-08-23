import { Test, TestingModule } from '@nestjs/testing';
import { MemphisCdcService } from './memphis-cdc.service';

describe('MemphisCdcService', () => {
  let service: MemphisCdcService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MemphisCdcService],
    }).compile();

    service = module.get<MemphisCdcService>(MemphisCdcService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
