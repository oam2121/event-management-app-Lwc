import { LightningElement } from 'lwc';

export default class LandingPage extends LightningElement {
    connectedCallback() {
        window.addEventListener('scroll', this.handleScroll);
    }

    disconnectedCallback() {
        window.removeEventListener('scroll', this.handleScroll);
    }

    handleScroll() {
        const elements = document.querySelectorAll('.fade-in');
        const windowHeight = window.innerHeight;
        elements.forEach((el) => {
            const positionFromTop = el.getBoundingClientRect().top;
            if (positionFromTop - windowHeight <= -100) {
                el.classList.add('fade-in-visible');
            }
        });
    }

    animateCard(event) {
        const card = event.currentTarget;
        card.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
        card.style.transform = 'scale(1.05)';
        card.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)';
    }

    resetAnimation(event) {
        const card = event.currentTarget;
        card.style.transform = 'scale(1)';
        card.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
    }

    smoothScrollToSection(event) {
        event.preventDefault();
        const targetId = event.target.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop,
                behavior: 'smooth'
            });
        }
    }


    handleScroll() {
        const elements = document.querySelectorAll('.slide-in, .scale-up');
        const windowHeight = window.innerHeight;

        elements.forEach((el) => {
            const positionFromTop = el.getBoundingClientRect().top;
            if (positionFromTop - windowHeight <= -100) {
                el.classList.add('slide-in-visible');
                el.classList.add('scale-up-visible');
            }
        });
    }
    
}
