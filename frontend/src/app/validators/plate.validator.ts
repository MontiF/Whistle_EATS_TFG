import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function plateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        if (!value) return null;

        // Spanish plate: 4 digits followed by 3 consonants (no vowels)
        const valid = /^\d{4}[BCDFGHJKLMNPRSTVWXYZ]{3}$/i.test(value);
        return !valid ? { pattern: { requiredPattern: '1234BBB', actualValue: value } } : null;
    };
}
