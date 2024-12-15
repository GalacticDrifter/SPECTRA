import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SummaryEvaluationsComponent } from './summary-evaluations.component';

describe('SummaryEvaluationsComponent', () => {
  let component: SummaryEvaluationsComponent;
  let fixture: ComponentFixture<SummaryEvaluationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SummaryEvaluationsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SummaryEvaluationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
