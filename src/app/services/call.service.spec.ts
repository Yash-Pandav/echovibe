import { TestBed } from '@angular/core/testing';

import { CallService } from './call.service';

describe('Call', () => {
  let service: CallService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CallService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
