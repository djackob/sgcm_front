import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionCmnComponent } from './gestion-cmn.component';

describe('GestionCmnComponent', () => {
  let component: GestionCmnComponent;
  let fixture: ComponentFixture<GestionCmnComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionCmnComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionCmnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
