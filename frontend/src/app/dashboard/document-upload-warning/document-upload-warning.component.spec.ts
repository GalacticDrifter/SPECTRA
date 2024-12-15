import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentUploadWarningComponent } from './document-upload-warning.component';

describe('DocumentUploadWarningComponent', () => {
  let component: DocumentUploadWarningComponent;
  let fixture: ComponentFixture<DocumentUploadWarningComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentUploadWarningComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DocumentUploadWarningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
