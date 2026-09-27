import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';

import { AuthStore } from '../../auth/auth.store';
import { TokenService } from '../../auth/token.service';
import { Component, inject, output } from '@angular/core';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-header',
  imports: [MatButtonModule, MatIconModule, MatMenuModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly authStore = inject(AuthStore);
  private readonly tokenService = inject(TokenService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly menuToggle = output<void>();
  readonly user = this.authStore.user;

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.authStore.clearAuthentication();
        this.tokenService.clearAuthentication();
        this.router.navigate(['/login']);
      },
      error: () => {
        // Even if the backend logout fails,
        // clear the local authentication state.
        this.authStore.clearAuthentication();
        this.tokenService.clearAuthentication();
        this.router.navigate(['/login']);
      },
    });
  }
  toggleMenu(): void {
    this.menuToggle.emit();
  }
}
