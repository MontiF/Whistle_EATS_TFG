import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function phoneValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        if (!value) return null;

        const valid = /^\+34\d{9}$/.test(value);
        return !valid ? { pattern: { requiredPattern: '^+34xxxxxxxxx', actualValue: value } } : null;
    };
}
