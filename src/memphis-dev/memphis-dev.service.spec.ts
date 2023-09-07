import { Test, TestingModule } from '@nestjs/testing';
import { MemphisDevProducerService } from './memphis-dev-producer.service';

describe('MemphisDevService', () => {
  let service: MemphisDevProducerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MemphisDevProducerService],
    }).compile();

    service = module.get<MemphisDevProducerService>(MemphisDevProducerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
