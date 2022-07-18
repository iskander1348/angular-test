import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrepareListComponent } from './prepare-list.component';

describe('PrepareListComponent', () => {
  let component: PrepareListComponent;
  let fixture: ComponentFixture<PrepareListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrepareListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrepareListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
