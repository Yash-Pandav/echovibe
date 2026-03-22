import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CallScreenComponent } from './call-screen.component';

describe('CallScreen', () => {
  let component: CallScreenComponent;
  let fixture: ComponentFixture<CallScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CallScreenComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CallScreenComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
