import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkProductsFormComponent } from './work-products-form.component';

describe('WorkProductsFormComponent', () => {
  let component: WorkProductsFormComponent;
  let fixture: ComponentFixture<WorkProductsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkProductsFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(WorkProductsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
