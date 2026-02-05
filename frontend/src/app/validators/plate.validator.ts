import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Validador para matrículas de vehículos españolas (formato 0000BBB)
export function plateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        if (!value) return null;


        const valid = /^\d{4}[BCDFGHJKLMNPRSTVWXYZ]{3}$/i.test(value);
        return !valid ? { pattern: { requiredPattern: '1234BBB', actualValue: value } } : null;
    };
}
