import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function passwordStrengthValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        if (!value) return null;

        const hasUpperCase = /[A-Z]/.test(value);
        const hasLowerCase = /[a-z]/.test(value);
        const hasNumeric = /[0-9]/.test(value);
        const minLength = value.length >= 8;

        const passwordValid = hasUpperCase && hasLowerCase && hasNumeric && minLength;

        return !passwordValid ? { passwordStrength: true } : null;
    };
}

export function passwordMatchValidator(passwordControlName: string, confirmPasswordControlName: string): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
        const password = formGroup.get(passwordControlName);
        const confirmPassword = formGroup.get(confirmPasswordControlName);

        if (!password || !confirmPassword) return null;

        if (confirmPassword.errors && !confirmPassword.errors['passwordMismatch']) {
            return null;
        }

        if (password.value !== confirmPassword.value) {
            confirmPassword.setErrors({ passwordMismatch: true });
            return { passwordMismatch: true };
        } else {
            confirmPassword.setErrors(null);
            return null;
        }
    };
}
