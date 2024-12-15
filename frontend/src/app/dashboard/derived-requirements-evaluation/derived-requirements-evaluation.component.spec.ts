import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DerivedRequirementsEvaluationComponent } from './derived-requirements-evaluation.component';

describe('DerivedRequirementsEvaluationComponent', () => {
  let component: DerivedRequirementsEvaluationComponent;
  let fixture: ComponentFixture<DerivedRequirementsEvaluationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DerivedRequirementsEvaluationComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DerivedRequirementsEvaluationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
