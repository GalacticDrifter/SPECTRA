import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestResponseFormComponent } from './request-response-form.component';

describe('RequestResponseFormComponent', () => {
  let component: RequestResponseFormComponent;
  let fixture: ComponentFixture<RequestResponseFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestResponseFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RequestResponseFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
