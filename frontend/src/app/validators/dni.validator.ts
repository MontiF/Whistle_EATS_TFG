import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function dniValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;

        if (!value) {
            return null;
        }

        const validChars = 'TRWAGMYFPDXBNJZSQVHLCKE';
        const nifRexp = /^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKE]$/i;
        const nieRexp = /^[XYZ][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$/i;
        const str = value.toString().toUpperCase();

        if (!nifRexp.test(str) && !nieRexp.test(str)) {
            return { dniInvalidFormat: true };
        }

        const nie = str
            .replace(/^[X]/, '0')
            .replace(/^[Y]/, '1')
            .replace(/^[Z]/, '2');

        const letter = str.substr(-1);
        const charIndex = parseInt(nie.substr(0, 8)) % 23;

        if (validChars.charAt(charIndex) === letter) {
            return null;
        }

        return { dniInvalidLetter: true };
    };
}
