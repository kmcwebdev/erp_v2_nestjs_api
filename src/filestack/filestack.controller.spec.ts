import { Test, TestingModule } from '@nestjs/testing';
import { FilestackController } from './filestack.controller';
import { FilestackService } from './filestack.service';

describe('FilestackController', () => {
  let controller: FilestackController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilestackController],
      providers: [FilestackService],
    }).compile();

    controller = module.get<FilestackController>(FilestackController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
