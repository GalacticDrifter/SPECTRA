import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LaborComponent } from './labor.component';

describe('LaborComponent', () => {
  let component: LaborComponent;
  let fixture: ComponentFixture<LaborComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LaborComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LaborComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
