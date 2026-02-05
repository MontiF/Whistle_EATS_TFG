import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Validador para el código CIF.
export function cifValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        if (!value) return null;

        const str = value.toString().toUpperCase();

        if (!/^[ABCDEFGJNUVW][0-9]{7}[0-9A-J]$/.test(str)) {
            return { cifInvalidFormat: true };
        }

        const letter = str.charAt(0);
        const digits = str.substr(1, 7);
        const controlChar = str.substr(8, 1);

        let sum = 0;
        for (let i = 0; i < digits.length; i++) {
            let digit = parseInt(digits[i]);
            if (i % 2 === 0) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
        }

        const controlDigit = (10 - (sum % 10)) % 10;
        const controlLetter = 'JABCDEFGHI'.charAt(controlDigit);


        if (/^[ABE]/.test(letter)) {
            if (controlChar == controlDigit.toString()) return null;
        }

        else if (/^[NW]/.test(letter)) {
            if (controlChar == controlLetter) return null;
        }

        else {
            if (controlChar == controlDigit.toString() || controlChar == controlLetter) return null;
        }

        return { cifInvalidChecksum: true };
    };
}
