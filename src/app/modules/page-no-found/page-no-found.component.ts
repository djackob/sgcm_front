import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../../core/services/session.service';

@Component({
  selector: 'app-page-no-found',
  standalone: true,
  imports: [],
  templateUrl: './page-no-found.component.html',
  styleUrl: './page-no-found.component.scss'
})
export class PageNoFoundComponent implements OnInit, OnDestroy {
  siglas_usuario = '';
  nombre_usuario = '';
  menu_activo = false;

  constructor(
    private router: Router,
    private SessionService: SessionService
  ) {
  }

  ngOnDestroy(): void {
    document.getElementsByTagName('body')[0].classList.remove('tema-01');
  }

  ngOnInit(): void {
    document.getElementsByTagName('body')[0].classList.add('tema-01');
  }
}
