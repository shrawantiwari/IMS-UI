import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { OAuthService } from '../../../core/auth/oauth.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly formBuilder = new FormBuilder();
  private readonly authService = inject(AuthService);
  private readonly oauthService = inject(OAuthService);

  readonly hidePassword = signal(true);
  readonly isSubmitting = signal(false);
  readonly loginError = signal('');

  readonly loginForm = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false],
  });

  togglePasswordVisibility(): void {
    this.hidePassword.update((value) => !value);
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isSubmitting()) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.loginError.set('');

    const { username, password } = this.loginForm.getRawValue();

    this.authService.login(username, password).subscribe({
      next: async (response) => {
        console.log('Login successful:', response);

        try {
          await this.oauthService.startAuthorization();
        } catch (error) {
          console.error('Unable to start OAuth authorization:', error);

          this.loginError.set(
            'Unable to start secure authentication. Please try again.',
          );

          this.isSubmitting.set(false);
        }
      },
      error: (error) => {
        console.error('Login failed:', error);

        const message = error.error?.message ?? 'Unable to sign in. Please try again.';

        this.loginError.set(message);
        this.isSubmitting.set(false);
      },
    });
  }
}
