document.addEventListener('click', (event) => {
    const isToggleBtn = event.target.closest('.toggle-actions-btn');
    const activeDropdown = isToggleBtn ? isToggleBtn.nextElementSibling : null;

    document.querySelectorAll('.actions-dropdown').forEach((dropdown) => {
        if (dropdown !== activeDropdown) {
            dropdown.classList.add('opacity-0', 'pointer-events-none', 'scale-95');
        }
    });

    if (activeDropdown) {
        event.stopPropagation();
        activeDropdown.classList.toggle('opacity-0');
        activeDropdown.classList.toggle('pointer-events-none');
        activeDropdown.classList.toggle('scale-95');
    }
});
