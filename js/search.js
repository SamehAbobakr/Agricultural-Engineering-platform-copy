function filterSubjects(query) {
    const cards = document.querySelectorAll(
        '#subjectsGridContainer .card'
    );

    cards.forEach(card => {
        const titleElement = card.querySelector('h3');

        if (!titleElement) return;

        const title = normalizeText(titleElement.textContent);

        if (title.includes(normalizeText(query))) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}
