// utils/animations.ts

declare var gsap: any;

export function animatePageContainer(containerSelector: string) {
    const container = document.querySelector(containerSelector);
    if (container && typeof gsap !== 'undefined') {
        gsap.fromTo(container, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' });
    }
}

export function animateListItems(listItemSelector: string) {
    const items = document.querySelectorAll(listItemSelector);
    if (items.length > 0 && typeof gsap !== 'undefined') {
        gsap.fromTo(items, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, delay: 0.2 });
    }
}

export function animateButtons(buttonSelector: string) {
    const buttons = document.querySelectorAll(buttonSelector);
    buttons.forEach(btn => {
        if (typeof gsap !== 'undefined') {
            btn.addEventListener('mouseenter', () => {
                gsap.to(btn, { scale: 1.02, duration: 0.15, ease: 'power1.out' });
            });
            btn.addEventListener('mouseleave', () => {
                gsap.to(btn, { scale: 1, duration: 0.15, ease: 'power1.out' });
            });
        }
    });
}
