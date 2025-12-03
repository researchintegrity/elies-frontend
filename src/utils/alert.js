import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

// Default configuration matching the app's theme
const defaultOptions = {
    background: 'var(--color-bg-card, #ffffff)',
    color: 'var(--color-text-light, #333333)',
    confirmButtonColor: 'var(--color-primary-accent, #007bff)',
    cancelButtonColor: '#ff6b6b',
    customClass: {
        popup: 'swal2-custom-popup',
        title: 'swal2-custom-title',
        content: 'swal2-custom-content',
        confirmButton: 'swal2-custom-confirm',
        cancelButton: 'swal2-custom-cancel'
    },
    buttonsStyling: true // Use SweetAlert2 styling but with our colors
};

/**
 * Show a success/info/error alert
 * @param {string} title - The title of the alert
 * @param {string} text - The text content
 * @param {'success'|'error'|'warning'|'info'|'question'} icon - The icon type
 */
export const showAlert = (title, text, icon = 'info') => {
    return MySwal.fire({
        ...defaultOptions,
        title,
        text,
        icon
    });
};

/**
 * Show a confirmation dialog
 * @param {string} title - The title
 * @param {string} text - The text content
 * @param {string} confirmText - Text for the confirm button
 * @param {string} cancelText - Text for the cancel button
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false otherwise
 */
export const showConfirm = async (title, text, confirmText = 'Sim, confirmar', cancelText = 'Cancelar') => {
    const result = await MySwal.fire({
        ...defaultOptions,
        title,
        text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        reverseButtons: true
    });
    return result.isConfirmed;
};

/**
 * Show a toast notification
 * @param {string} title - The message
 * @param {'success'|'error'|'warning'|'info'} icon - The icon type
 */
export const showToast = (title, icon = 'success') => {
    const Toast = MySwal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', MySwal.stopTimer);
            toast.addEventListener('mouseleave', MySwal.resumeTimer);
        },
        ...defaultOptions,
        background: 'var(--color-bg-card, #ffffff)', // Ensure toast matches theme
    });

    return Toast.fire({
        icon,
        title
    });
};

export default MySwal;
