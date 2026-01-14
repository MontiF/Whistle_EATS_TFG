import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function plateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        if (!value) return null;

        // Matrícula española: 4 dígitos seguidos de 3 consonantes (sin vocales)
        const valid = /^\d{4}[BCDFGHJKLMNPRSTVWXYZ]{3}$/i.test(value);
        return !valid ? { pattern: { requiredPattern: '1234BBB', actualValue: value } } : null;
    };
}
