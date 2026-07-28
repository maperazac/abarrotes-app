import { TestBed } from '@angular/core/testing';

import { EntradasDineroService } from './entradas-dinero.service';

describe('EntradasDineroService', () => {
  let service: EntradasDineroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EntradasDineroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
