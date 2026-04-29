export function toggleLibrary() {
    const overlay = document.getElementById('pageTransitionOverlay');
    if (overlay) {
        overlay.classList.add('active');
        setTimeout(() => { window.location.href = 'library.html'; }, 300);
    } else {
        window.location.href = 'library.html';
    }
}
