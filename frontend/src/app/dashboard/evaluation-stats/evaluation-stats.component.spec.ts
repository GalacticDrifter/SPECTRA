import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluationStatsComponent } from './evaluation-stats.component';

describe('EvaluationStatsComponent', () => {
  let component: EvaluationStatsComponent;
  let fixture: ComponentFixture<EvaluationStatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvaluationStatsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EvaluationStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
