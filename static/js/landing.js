document.addEventListener('DOMContentLoaded', function() {
    // Theme toggle functionality
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    
    // Check for saved theme preference or prefer-color-scheme
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Apply the theme based on saved preference or system preference
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        body.classList.add('dark-theme');
    }
    
    // Toggle theme on click
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            body.classList.toggle('dark-theme');
            
            // Save preference to localStorage
            if (body.classList.contains('dark-theme')) {
                localStorage.setItem('theme', 'dark');
            } else {
                localStorage.setItem('theme', 'light');
            }
        });
    }
    
    // Check if user has premium access from server
    let hasPremium = false;
    
    // Fetch premium status from server if user is logged in
    function checkPremiumStatus() {
        fetch('/check_payment_status')
            .then(response => response.json())
            .then(data => {
                console.log('Premium status check:', data);
                hasPremium = data.hasPaid;
                updatePremiumUI();
            })
            .catch(error => {
                console.error('Error checking premium status:', error);
            });
    }
    
    // Call on page load
    document.addEventListener('DOMContentLoaded', function() {
        // Check premium status
        checkPremiumStatus();
    });
    
    // Update UI based on premium status
    function updatePremiumUI() {
        const premiumButtons = document.querySelectorAll('.premium-cta');
        const premiumFeatures = document.querySelectorAll('.premium-feature');
        
        if (hasPremium) {
            // Hide premium buttons and show unlocked features
            premiumButtons.forEach(button => {
                button.textContent = 'Premium Unlocked';
                button.classList.add('premium-unlocked');
                // Remove click event listeners if previously added
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
            });
            
            // Show premium features
            premiumFeatures.forEach(feature => {
                feature.classList.remove('premium-locked');
                const lockIcon = feature.querySelector('.lock-icon');
                if (lockIcon) lockIcon.remove();
            });
            
            // Update pricing section if it exists
            const pricingCard = document.querySelector('.pricing-card');
            if (pricingCard) {
                const pricingHeader = pricingCard.querySelector('.pricing-header');
                if (pricingHeader) {
                    pricingHeader.innerHTML = `
                        <div class="pricing-badge">Unlocked</div>
                        <h3>Premium Access</h3>
                        <div class="price">
                            <span class="amount">✓</span>
                        </div>
                        <p class="pricing-subtitle">Thank you for your support!</p>
                    `;
                }
                
                const pricingButton = pricingCard.querySelector('.primary-btn');
                if (pricingButton) {
                    pricingButton.textContent = 'Already Purchased';
                    pricingButton.classList.add('premium-unlocked');
                    pricingButton.style.pointerEvents = 'none';
                }
            }
        }
    }
    
    // Call the function to update UI based on premium status
    updatePremiumUI();
    
    // Rest of your existing code...
    
    // Header scroll effect
    const header = document.querySelector('header');
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
    
    // Optimize background animations based on viewport
    const heroSection = document.getElementById('hero');
    const heroBackground = document.querySelector('.hero-background');
    
    // Check if we should show animations based on device performance
    // A lightweight way to potentially disable animations on lower-end devices
    function checkForReducedMotion() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            // Disable animations for users who prefer reduced motion
            const style = document.createElement('style');
            style.innerHTML = `
                .gradient-bg, .floating-shape {
                    animation: none !important;
                    opacity: 0.2 !important;
                }
            `;
            document.head.appendChild(style);
        } else {
            // Add a subtle pulse animation to make shapes more noticeable
            const floatingShapes = document.querySelectorAll('.floating-shape');
            if (floatingShapes.length > 0) {
                floatingShapes.forEach(shape => {
                    // Add a slight opacity pulse to make the motion more noticeable
                    shape.style.animation = `${shape.style.animation}, pulseOpacity 8s infinite ease-in-out`;
                    
                    // Append pulse animation CSS
                    const style = document.createElement('style');
                    style.innerHTML = `
                        @keyframes pulseOpacity {
                            0%, 100% { opacity: 0.5; }
                            50% { opacity: 0.7; }
                        }
                    `;
                    document.head.appendChild(style);
                });
            }
        }
    }
    
    // Only run background animations when hero section is visible
    function optimizeBackgroundAnimations() {
        if (heroSection && heroBackground) {
            const rect = heroSection.getBoundingClientRect();
            const isVisible = (
                rect.top < window.innerHeight &&
                rect.bottom > 0
            );
            
            if (isVisible) {
                heroBackground.style.visibility = 'visible';
            } else {
                heroBackground.style.visibility = 'hidden';
            }
        }
    }
    
    checkForReducedMotion();
    window.addEventListener('scroll', optimizeBackgroundAnimations);
    optimizeBackgroundAnimations(); // Run once on load
    
    // Scroll-triggered animations using Intersection Observer
    const observerOptions = {
        root: null, // Use the viewport as the root
        rootMargin: '0px', // No margin
        threshold: 0.1 // Trigger when at least 10% of the target is visible
    };
    
    const animationObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Add visible class to start the animation
                entry.target.classList.add('visible');
                // Stop observing after animation is triggered
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe all elements with animate-element class
    document.querySelectorAll('.animate-element').forEach(element => {
        animationObserver.observe(element);
    });
    
    // Special handling for hero section to animate immediately if in view on load
    function animateHeroIfVisible() {
        const heroSection = document.getElementById('hero');
        if (heroSection) {
            const rect = heroSection.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
            
            if (isVisible) {
                // If hero is visible on page load, animate with sequential delays
                const animatedElements = heroSection.querySelectorAll('.animate-element');
                animatedElements.forEach((element, index) => {
                    setTimeout(() => {
                        element.classList.add('visible');
                    }, index * 200); // Sequential delay between elements
                });
            }
        }
    }
    
    // Run hero animation check on load
    animateHeroIfVisible();
    
    // Parallax effect for hero title
    const parallaxTitle = document.querySelector('.parallax-title');
    if (parallaxTitle) {
        window.addEventListener('scroll', function() {
            // Apply parallax effect only if we're in range to see the hero section
            if (window.scrollY <= window.innerHeight) {
                // Calculate the parallax offset - use a smaller factor for subtlety
                const offset = window.scrollY * 0.3;
                parallaxTitle.style.transform = `translateY(-${offset}px)`;
            }
        });
    }
    
    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            if (this.getAttribute('href') === '#') return;
            
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const headerHeight = header.offsetHeight;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Close mobile menu if open
                if (navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    hamburger.classList.remove('active');
                }
            }
        });
    });
    
    // Add animation to elements when they come into view
    const animateOnScroll = function() {
        const elements = document.querySelectorAll('.feature-card, .pricing-card, .testimonial, .section-header');
        
        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementPosition < windowHeight - 100) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    };
    
    // Set initial styles for animated elements
    document.querySelectorAll('.feature-card, .pricing-card, .testimonial, .section-header').forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    });
    
    // Run animation check on scroll
    window.addEventListener('scroll', animateOnScroll);
    
    // Run once on load
    animateOnScroll();
    
    // Handle testimonial slider
    let isDown = false;
    let startX;
    let scrollLeft;
    const slider = document.querySelector('.testimonials-slider');
    
    if (slider) {
        slider.addEventListener('mousedown', (e) => {
            isDown = true;
            slider.classList.add('active');
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        });
        
        slider.addEventListener('mouseleave', () => {
            isDown = false;
            slider.classList.remove('active');
        });
        
        slider.addEventListener('mouseup', () => {
            isDown = false;
            slider.classList.remove('active');
        });
        
        slider.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 2;
            slider.scrollLeft = scrollLeft - walk;
        });
    }

    // Button ripple effect
    function createRipple(event) {
        const button = event.currentTarget;
        
        // Remove any existing ripple
        const ripple = button.querySelector('.btn-ripple');
        if (ripple) {
            ripple.remove();
        }
        
        // Create new ripple element
        const circle = document.createElement('span');
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;
        
        // Get position relative to the button
        const rect = button.getBoundingClientRect();
        
        // Calculate position for the ripple
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - rect.left - radius}px`;
        circle.style.top = `${event.clientY - rect.top - radius}px`;
        
        // Add ripple class
        circle.classList.add('btn-ripple');
        
        // Add ripple to button
        button.appendChild(circle);
        
        // Remove ripple after animation completes
        setTimeout(() => {
            if (circle) {
                circle.remove();
            }
        }, 800);
    }
    
    // Add event listeners to CTA buttons
    const primaryCta = document.getElementById('cta-primary');
    const secondaryCta = document.getElementById('cta-secondary');
    
    if (primaryCta) {
        primaryCta.addEventListener('click', createRipple);
    }
    
    if (secondaryCta) {
        secondaryCta.addEventListener('click', createRipple);
    }

    // Also add ripple effect to other primary buttons on the page
    document.querySelectorAll('.primary-btn:not(#cta-primary)').forEach(button => {
        button.addEventListener('click', createRipple);
    });

    // Typing effect for tagline
    const taglineElement = document.getElementById('typing-tagline');
    const taglineText = "Your private AI journal, reimagined";
    let taglineIndex = 0;
    let typingDelay = 1500; // Initial delay before typing starts
    
    function typeTagline() {
        if (taglineIndex < taglineText.length) {
            taglineElement.textContent += taglineText.charAt(taglineIndex);
            taglineIndex++;
            
            // Randomize typing speed slightly for a more natural effect
            const randomSpeed = Math.random() * 40 + 60; // Between 60-100ms
            setTimeout(typeTagline, randomSpeed);
        } else {
            // Add a class when typing is complete
            taglineElement.parentElement.classList.add('typing-complete');
        }
    }
    
    // Start typing effect with a delay or when visible in viewport
    function initTaglineAnimation() {
        // Only start if the element exists
        if (taglineElement) {
            // Use Intersection Observer to check if tagline is visible
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // Start typing after a delay
                        setTimeout(typeTagline, typingDelay);
                        // Stop observing once started
                        observer.unobserve(taglineElement);
                    }
                });
            }, { threshold: 0.5 });
            
            observer.observe(taglineElement);
        }
    }
    
    // Initialize the tagline animation
    initTaglineAnimation();
    
    // Subtle hover animation for avatars
    const avatars = document.querySelectorAll('.avatar');
    if (avatars.length > 0) {
        avatars.forEach(avatar => {
            avatar.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-3px) scale(1.1)';
                this.style.zIndex = '1';
                this.style.boxShadow = '0 3px 8px rgba(0,0,0,0.15)';
            });
            
            avatar.addEventListener('mouseleave', function() {
                this.style.transform = '';
                this.style.zIndex = '';
                this.style.boxShadow = '';
            });
        });
    }

    // Floating CTA button visibility
    const floatingCta = document.getElementById('floating-cta');
    
    if (floatingCta) {
        // Hide button initially when at top of page
        function toggleFloatingCTA() {
            // Show button after scroll threshold (100px)
            if (window.scrollY > 500) {
                floatingCta.classList.add('visible');
            } else {
                floatingCta.classList.remove('visible');
            }
            
            // Hide the floating CTA when near the bottom to avoid overlapping footer
            const footerTop = document.querySelector('footer').getBoundingClientRect().top;
            const viewportHeight = window.innerHeight;
            
            if (footerTop - viewportHeight < 100) {
                floatingCta.style.opacity = '0';
            } else if (window.scrollY > 500) {
                floatingCta.style.opacity = '1';
            }
        }
        
        // Add click handler to scroll to top
        floatingCta.addEventListener('click', function(e) {
            // If you want the button to act as "Back to top" instead of CTA
            // Uncomment the next lines and comment the line after
            /*
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            */
            
            // If it's a CTA button, add ripple effect
            createRipple(e);
        });
        
        // Check visibility on scroll
        window.addEventListener('scroll', toggleFloatingCTA);
        
        // Initial check
        toggleFloatingCTA();
    }

    // Manage Testimonials Slider - Improved with accessibility
    const testimonialsSlider = document.querySelector('.testimonials-slider');
    const sliderDots = document.querySelector('.slider-dots');
    const prevButton = document.querySelector('.slider-arrow.prev');
    const nextButton = document.querySelector('.slider-arrow.next');
    
    if (testimonialsSlider && sliderDots) {
        const testimonials = testimonialsSlider.querySelectorAll('.testimonial');
        let currentIndex = 0;
        
        // Create dots based on number of testimonials with proper a11y
        testimonials.forEach((testimonial, index) => {
            const dot = document.createElement('button');
            dot.classList.add('slider-dot');
            dot.setAttribute('aria-label', `Go to testimonial ${index + 1}`);
            dot.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');
            
            if (index === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToSlide(index));
            sliderDots.appendChild(dot);
            
            // Add proper ARIA roles to testimonials
            testimonial.setAttribute('role', 'tabpanel');
            testimonial.setAttribute('id', `testimonial-${index}`);
            testimonial.setAttribute('aria-labelledby', `testimonial-tab-${index}`);
            testimonial.setAttribute('tabindex', index === 0 ? '0' : '-1');
        });
        
        // Add navigation functionality with keyboard support
        if (prevButton && nextButton) {
            prevButton.addEventListener('click', () => {
                currentIndex = (currentIndex - 1 + testimonials.length) % testimonials.length;
                updateSlider();
            });
            
            nextButton.addEventListener('click', () => {
                currentIndex = (currentIndex + 1) % testimonials.length;
                updateSlider();
            });
            
            // Add keyboard support
            testimonialsSlider.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') {
                    prevButton.click();
                    e.preventDefault();
                } else if (e.key === 'ArrowRight') {
                    nextButton.click();
                    e.preventDefault();
                }
            });
            
            // Add proper ARIA labels
            prevButton.setAttribute('aria-label', 'Previous testimonial');
            nextButton.setAttribute('aria-label', 'Next testimonial');
        }
        
        function goToSlide(index) {
            currentIndex = index;
            updateSlider();
            
            // Focus the active testimonial for screen readers
            testimonials[currentIndex].focus();
        }
        
        function updateSlider() {
            const slideWidth = testimonials[0].offsetWidth + 32; // width + margin
            testimonialsSlider.scrollLeft = currentIndex * slideWidth;
            
            // Update active state and accessibility attributes
            testimonials.forEach((testimonial, index) => {
                testimonial.setAttribute('tabindex', index === currentIndex ? '0' : '-1');
                testimonial.setAttribute('aria-hidden', index === currentIndex ? 'false' : 'true');
            });
            
            // Update active dot with proper ARIA state
            document.querySelectorAll('.slider-dot').forEach((dot, index) => {
                if (index === currentIndex) {
                    dot.classList.add('active');
                    dot.setAttribute('aria-pressed', 'true');
                } else {
                    dot.classList.remove('active');
                    dot.setAttribute('aria-pressed', 'false');
                }
            });
            
            // Update slider controls' disabled state for better UX
            // We're not disabling them since it's a circular carousel, but we could if needed
        }
        
        // Auto advance slides every 5 seconds with reduced motion preference check
        let slideInterval;
        
        function startSlideInterval() {
            // Check if user prefers reduced motion
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                slideInterval = setInterval(() => {
                    currentIndex = (currentIndex + 1) % testimonials.length;
                    updateSlider();
                }, 5000);
            }
        }
        
        // Pause auto-advance on hover, touch or focus
        testimonialsSlider.addEventListener('mouseenter', () => {
            clearInterval(slideInterval);
        });
        
        testimonialsSlider.addEventListener('mouseleave', () => {
            startSlideInterval();
        });
        
        // Also pause on focus for keyboard users
        testimonialsSlider.addEventListener('focusin', () => {
            clearInterval(slideInterval);
        });
        
        testimonialsSlider.addEventListener('focusout', (e) => {
            // Only restart if focus moves completely out of the slider component
            if (!testimonialsSlider.contains(e.relatedTarget)) {
                startSlideInterval();
            }
        });
        
        // Add swipe support for mobile
        let touchStartX = 0;
        let touchEndX = 0;
        
        testimonialsSlider.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        testimonialsSlider.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });
        
        function handleSwipe() {
            const swipeThreshold = 50;
            if (touchEndX < touchStartX - swipeThreshold) {
                // Swipe left - next slide
                nextButton.click();
            } else if (touchEndX > touchStartX + swipeThreshold) {
                // Swipe right - previous slide
                prevButton.click();
            }
        }
        
        // Initial setup
        updateSlider();
        startSlideInterval();
        
        // Initialize with proper ARIA role
        testimonialsSlider.setAttribute('role', 'region');
        testimonialsSlider.setAttribute('aria-label', 'Testimonials');
    }
    
    // Handle FAQ accordions
    const faqItems = document.querySelectorAll('.faq-item');
    
    if (faqItems.length > 0) {
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            
            question.addEventListener('click', () => {
                // Close all other open FAQs
                faqItems.forEach(otherItem => {
                    if (otherItem !== item && otherItem.classList.contains('active')) {
                        otherItem.classList.remove('active');
                    }
                });
                
                // Toggle current FAQ
                item.classList.toggle('active');
            });
        });
    }
    
    // Handle pricing toggle
    const paymentOptions = document.querySelectorAll('.payment-option');
    
    if (paymentOptions.length > 0) {
        paymentOptions.forEach(option => {
            option.addEventListener('click', function() {
                paymentOptions.forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');
                
                // You could update pricing here if needed
                // const period = this.getAttribute('data-period');
                // updatePriceDisplay(period);
            });
        });
    }

    // Update the payment buttons
    document.querySelectorAll('.primary-btn').forEach(button => {
        if (button.innerText.includes('Start Your Free Trial') || 
            button.innerText.includes('Start Journaling')) {
            
            // Mark as premium CTA
            button.classList.add('premium-cta');
            
            // If user has premium, update button text
            if (hasPremium) {
                button.innerText = 'Premium Unlocked';
                button.classList.add('premium-unlocked');
            } else {
                button.innerText = 'Buy Premium ($20)';
            }
        }
    });
});