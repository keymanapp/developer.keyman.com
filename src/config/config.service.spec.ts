import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from './config.service';

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConfigService],
      exports: [ConfigService],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('non-existing environment file should throw', () => {
    process.env.NODE_ENV = 'foo';

    // tslint:disable-next-line: no-unused-expression
    expect(() => { new ConfigService(); })
      .toThrowError('Missing environment file "foo.env"');
  });
});
