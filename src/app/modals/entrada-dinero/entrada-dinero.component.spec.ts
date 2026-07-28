import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntradaDineroComponent } from './entrada-dinero.component';

describe('EntradaDineroComponent', () => {
  let component: EntradaDineroComponent;
  let fixture: ComponentFixture<EntradaDineroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EntradaDineroComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EntradaDineroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
