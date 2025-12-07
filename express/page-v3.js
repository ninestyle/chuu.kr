/*
    Page Express V3 (Tier 2 Framework)
    Integrated with Express Core (Tier 1)
    Author: Maxim
    Version: 3.1.0 (Core Integration Update)
    Last Modified: 2025-11-23
    License: © 2025 Maxim. All Rights Reserved.
*/
const PE_V3 = (() => {
    'use strict';

    let core = null;
    let config = {}; 
    let currentLangData = {}; 
    const effects = {};

    // [Tier 2] UI Manager (Header Buttons & Content)
    const uiManager = {
        init() {
            this.injectIconButtons();
        },
        injectIconButtons() {
            const container = core.Util.$('.pe-header__content');
            if (!container || !config.icon_buttons || config.icon_buttons.length === 0) {
                return;
            }

            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'ce-button-group';
            
            const btnClass = 'ce-button-group__icon';
            const fragment = document.createDocumentFragment();
            
            config.icon_buttons.forEach(btn => {
                let el;
                const innerHTML = `<span translate="no" class="material-symbols-outlined notranslate">${btn.icon}</span>`;
                
                if (btn.url.startsWith('#')) {
                    el = document.createElement('a');
                    el.href = btn.url;
                    el.className = btnClass;
                    el.ariaLabel = btn.name;
                    el.innerHTML = innerHTML;
                } else {
                    el = document.createElement('a');
                    el.href = btn.url;
                    el.className = btnClass;
                    el.target = '_blank';
                    el.rel = 'noopener noreferrer';
                    el.ariaLabel = btn.name;
                    el.innerHTML = innerHTML;
                }
                fragment.appendChild(el);
            });
            buttonGroup.appendChild(fragment);
            container.appendChild(buttonGroup);
        }
    };

    // [Tier 2] Form Handling (Delegates to Core API)
    const forms = {
        init() {
            this.initSearchForm();
            this.initContactForm();
        },
        getApiUrl(endpoint) {
            const baseUrl = config.API_BASE_PATH ? config.API_BASE_PATH.replace(/\/$/, '') : '/api';
            return `${baseUrl}/${endpoint}`;
        },

        initSearchForm() {
            const form = core.Util.$('.pe-search-form');
            if (!form) return;
            
            const button = form.querySelector('.pe-form__submit');
            const statusEl = form.querySelector('.pe-form__status');
            
            // Use Core Util for Cooldown
            const cooldown = core.Util.createCooldown('searchCooldown', 30000);

            // [V3] Use API Base Path
            form.action = this.getApiUrl('conn.search');
            
            const searchOnSuccess = (result) => {
                const html = result.found ? 
                    `<p>Search: <strong>${result.key}</strong></p><div>${result.value}</div>` : 
                    `<p>${result.message}</p>`;
                statusEl.innerHTML = html;
                statusEl.style.display = 'block';
                statusEl.style.color = '';
            };
            
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                // Check Cooldown (Skip if demo)
                const isDemo = form.dataset.demoMode === 'true';
                if (!isDemo && cooldown.isActive()) {
                    const remaining = cooldown.getRemaining();
                    statusEl.textContent = `You can search again in ${remaining} seconds.`;
                    statusEl.style.color = '#F59E0B';
                    statusEl.style.display = 'block';
                    return;
                }

                try {
                    const result = await core.API.post(
                        form.action, 
                        { key: new FormData(form).get('key') }, 
                        button,
                        { 
                            demoMode: isDemo,
                            demoKey: 'ex_search_not_found_demo' 
                        }
                    );
                    
                    if (!isDemo) cooldown.start();
                    searchOnSuccess(result);

                } catch (error) {
                    statusEl.textContent = error.message;
                    statusEl.style.color = 'red';
                    statusEl.style.display = 'block';
                }
            });
        },

        initContactForm() {
            const form = core.Util.$('.pe-contact-form');
            if (!form) return;
            
            const button = form.querySelector('.pe-form__submit');
            const statusEl = form.querySelector('.pe-form__status');
            
            // Use Core Util for Cooldown
            const cooldown = core.Util.createCooldown('contactCooldown', 60000);

            form.action = this.getApiUrl('conn.contact');

            const contactOnSuccess = (result) => {
                statusEl.textContent = result.message;
                statusEl.style.color = 'yellowgreen';
                statusEl.style.display = 'block';
                form.reset();
                const charCounter = form.querySelector('.pe-form__char-counter');
                if(charCounter) charCounter.textContent = '0/1024';
            };

            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const isDemo = form.dataset.demoMode === 'true';
                if (!isDemo && cooldown.isActive()) { 
                    const remaining = cooldown.getRemaining();
                    statusEl.textContent = `You can send another message in ${remaining} seconds.`;
                    statusEl.style.color = '#F59E0B';
                    statusEl.style.display = 'block';
                    return; 
                }

                try {
                    const payload = { 
                        email: new FormData(form).get('email'), 
                        message: new FormData(form).get('message') 
                    };
                    
                    const result = await core.API.post(
                        form.action, 
                        payload, 
                        button,
                        { 
                            demoMode: isDemo,
                            demoKey: 'ex_contact_success_demo'
                        }
                    );

                    if (!isDemo) cooldown.start();
                    contactOnSuccess(result);
                    
                } catch (error) {
                    statusEl.textContent = error.message;
                    statusEl.style.color = 'red';
                    statusEl.style.display = 'block';
                }
            });

            const textarea = form.querySelector('.pe-form__textarea[name="message"]');
            const charCounter = form.querySelector('.pe-form__char-counter');
            if (textarea && charCounter) {
                textarea.addEventListener('input', () => { charCounter.textContent = `${textarea.value.length}/1024`; });
            }
        }
    };

    const renderUI = (lang) => {
        currentLangData = core.Data.get(); 
        if (!currentLangData) return;

        core.Util.$$('[data-lang], [data-lang-href], [data-lang-placeholder]').forEach(el => {
            const key = el.getAttribute('data-lang');
            if (key) {
                const text = core.Util.getText(key);
                if (el.classList.contains('render-as-html')) el.innerHTML = text;
                else el.textContent = text;
            }
            
            const hrefKey = el.getAttribute('data-lang-href');
            if (hrefKey) el.setAttribute('href', core.Util.getText(hrefKey));
            
            const placeholderKey = el.getAttribute('data-lang-placeholder');
            if (placeholderKey) el.setAttribute('placeholder', core.Util.getText(placeholderKey));
        });
        
        core.Util.$$('title[data-lang], meta[data-lang]').forEach(el => {
            const key = el.getAttribute('data-lang');
            if (key) {
                const text = core.Util.getText(key);
                if(el.tagName === 'TITLE') el.textContent = text;
                else el.setAttribute('content', text);
            }
        });

        // document.documentElement.lang is handled by Core in V3.1
        renderDynamicContent();
        setupAdvertisements();

        const langSwitcher = core.Util.$('#lang-switcher');
        if (langSwitcher) {
            langSwitcher.querySelectorAll('button').forEach(button => {
                button.classList.toggle('active', button.getAttribute('data-lang-set') === lang);
            });
        }
    };

    const renderDynamicContent = () => {
        const containers = core.Util.$$('[data-content-type]');
        if (!currentLangData) return;
        
        containers.forEach(container => {
            const contentType = container.dataset.contentType;
            const prefix = container.dataset.prefix;
            container.innerHTML = '';
            let htmlContent = '';

            for (let i = 1; i < 50; i++) { 
                const itemIndex = String(i).padStart(2, '0');
                let itemHTML = '';
                const labelKey = `${prefix}_${itemIndex}`;
                const label = currentLangData[labelKey];

                if (label === undefined) {
                    const qKeyCheck = `${labelKey}_q`;
                    if (contentType === 'faq' && currentLangData[qKeyCheck] !== undefined) {
                    } else if (i > 1) { 
                        break;
                    } else {
                        continue;
                    }
                }

                switch (contentType) {
                    case 'product':
                        const value = currentLangData[`${labelKey}_price`];
                        const modifier = currentLangData[`${labelKey}_modifier`] || '';
                        
                        if (label && value) {
                            const modifierClass = modifier ? ` pe-product-list__item--${modifier}` : '';
                            itemHTML = `<div class="pe-product-list__item${modifierClass}">
                                            <span class="pe-product-list__label">${label}</span>
                                            <span class="pe-product-list__value">${value}</span>
                                        </div>`;
                        }
                        break;
                    case 'faq':
                        const q = currentLangData[`${labelKey}_q`];
                        const a = currentLangData[`${labelKey}_a`];
                        if (q && a) {
                            itemHTML = `<div class="pe-faq-item">
                                            <div class="pe-faq-item__question">${q}</div>
                                            <div class="pe-faq-item__answer">${a}</div>
                                        </div>`;
                        }
                        break;
                    case 'affiliate-benefits':
                         if (label) itemHTML = `<li>${label}</li>`;
                        break;
                }
                if (itemHTML) htmlContent += itemHTML;
            }
            if (htmlContent) {
                if (contentType === 'affiliate-benefits') container.innerHTML = `<ul class="pe-benefit-list">${htmlContent}</ul>`;
                else container.innerHTML = htmlContent;
            }
        });
    };
    
    const setupAdvertisements = () => {
        const adUnit = core.Util.$('ins.adsbygoogle');
        if (!adUnit) return;
        const adClient = currentLangData['ad_client_id'];
        const adSlot = currentLangData['ad_slot_id'];
        if (adClient && adSlot) {
            adUnit.setAttribute('data-ad-client', adClient);
            adUnit.setAttribute('data-ad-slot', adSlot);
            try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
        }
    };
    
    // [Updated] initializeDemoLinkHandling is now mostly handled by Core
    // We keep this only if there are specific Page Express link requirements not covered by Core
    const initializeDemoLinkHandling = () => {
         // Core UI.initDemoLinks() handles .js-demo-link
         // This function is kept empty for backward compatibility hook or extra logic
    };

    const setupSmoothScroll = () => {
        core.Util.$$('a[href^="#"]:not([data-lang-href])').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const targetElement = core.Util.$(targetId);
                if(targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                    if (history.pushState && targetId === '#home') history.pushState(null, null, ' ');
                    else if (history.pushState) history.pushState(null, null, targetId);
                }
            });
        });
    };

    const setupFadeInSectionObserver = () => {
        const sections = core.Util.$$('.js-fade-in');
        if (sections.length === 0) return;
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -150px 0px' });
        sections.forEach(section => { observer.observe(section); });
    };

    const setupToTopButton = () => {
        const toTopBtn = core.Util.$('#to-top-btn');
        if (!toTopBtn) return;
        window.addEventListener('scroll', () => {
            const isVisible = window.scrollY > 300;
            toTopBtn.classList.toggle('visible', isVisible);
            toTopBtn.classList.toggle('hidden', !isVisible);
        }, { passive: true });
    };

    const setupLightbox = () => {
        // Core Lightbox.init() handles basics, but this binds specific pe- structure triggers
        const lightboxTriggers = core.Util.$$('.js-lightbox-trigger');
        lightboxTriggers.forEach(item => {
            item.addEventListener('click', (e) => {
                const img = e.currentTarget.querySelector('img');
                if(img) core.UI.Lightbox.open(img.src);
            });
        });
    };

    const setupVideoBackgrounds = () => {
        core.Util.$$('.pe-section-video-bg .background-video').forEach(video => {
            video.play().catch(error => console.warn("Video autoplay was prevented:", error));
        });
    };

    const setupContentSliders = () => {
        core.Util.$$('.js-content-slider').forEach(slider => {
            const wrapper = slider.querySelector('.pe-slider__wrapper');
            const prevBtn = slider.querySelector('.pe-slider--prev');
            const nextBtn = slider.querySelector('.pe-slider--next');
            const playPauseBtn = slider.querySelector('.pe-slider--play-pause');
            if (!wrapper) return;

            const scrollAmount = wrapper.querySelector('.pe-slider__item')?.offsetWidth + 30 || 330;
            let autoPlayInterval = null;
            let isPlaying = false;

            const updateNavButtons = () => {
                if (!prevBtn || !nextBtn) return;
                const isAtStart = wrapper.scrollLeft < 10;
                const isAtEnd = Math.abs(wrapper.scrollWidth - wrapper.clientWidth - wrapper.scrollLeft) < 10;
                prevBtn.classList.toggle('disabled', isAtStart);
                nextBtn.classList.toggle('disabled', isAtEnd);
            };

            const autoScroll = () => {
                if (Math.abs(wrapper.scrollWidth - wrapper.clientWidth - wrapper.scrollLeft) < 10) {
                    wrapper.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    wrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                }
            };

            const startAutoPlay = () => {
                if (!playPauseBtn || isPlaying) return;
                clearInterval(autoPlayInterval);
                autoPlayInterval = setInterval(autoScroll, 3000);
                isPlaying = true;
                playPauseBtn.querySelector('.material-symbols-outlined').textContent = 'pause';
            };

            const stopAutoPlay = () => {
                if (!playPauseBtn || !isPlaying) return;
                clearInterval(autoPlayInterval);
                isPlaying = false;
                playPauseBtn.querySelector('.material-symbols-outlined').textContent = 'play_arrow';
            };

            if (prevBtn) prevBtn.addEventListener('click', () => { stopAutoPlay(); wrapper.scrollBy({ left: -scrollAmount, behavior: 'smooth' }); });
            if (nextBtn) nextBtn.addEventListener('click', () => { stopAutoPlay(); wrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' }); });
            
            if (playPauseBtn) {
                playPauseBtn.addEventListener('click', () => {
                    if (isPlaying) stopAutoPlay();
                    else startAutoPlay();
                });
                slider.addEventListener('mouseenter', stopAutoPlay);
                slider.addEventListener('mouseleave', startAutoPlay);
                startAutoPlay(); 
            }

            wrapper.addEventListener('scroll', updateNavButtons, { passive: true });
            wrapper.addEventListener('focusin', stopAutoPlay);
            wrapper.addEventListener('focusout', startAutoPlay);

            updateNavButtons();
        });
    };

    const setupContentParallax = () => {
        const content = core.Util.$('.js-parallax-content');
        if (!content) return;
        const homeSection = core.Util.$('.pe-header');
        if (!homeSection) return;
        const onMove = (e) => {
            const x = (e.touches ? e.touches[0].clientX : e.clientX);
            const y = (e.touches ? e.touches[0].clientY : e.clientY);
            const moveX = (x - window.innerWidth / 2) / 50;
            const moveY = (y - window.innerHeight / 2) / 50;
            content.style.transform = `translate(${moveX}px, ${moveY}px)`;
        };
        const onLeave = () => content.style.transform = '';
        homeSection.addEventListener('mousemove', onMove);
        homeSection.addEventListener('mouseout', onLeave);
        homeSection.addEventListener('touchstart', onMove, { passive: true });
        homeSection.addEventListener('touchmove', onMove, { passive: true });
        homeSection.addEventListener('touchend', onLeave);
    };

    // [Updated] setupImageParallax now targets .ex-canvas__image
    const setupImageParallax = () => {
        const slideImages = core.Util.$$('.pe-header .ex-canvas__image, .pe-header .ex-canvas__slide');
        if (slideImages.length === 0) return;
        window.addEventListener('scroll', () => {
            if (window.scrollY < window.innerHeight) {
                slideImages.forEach(img => img.style.transform = `translateY(${window.scrollY * 0.5}px)`);
            }
        }, { passive: true });
    };

    const initApp = async (siteConfig) => {
        if (typeof Express === 'undefined') {
            console.error('Express Core (express-v3.js) is missing.');
            return;
        }
        
        core = await Express.init(siteConfig);
        config = core.config;
        currentLangData = core.Data.get();

        const langSwitcher = core.Util.$('#lang-switcher');
        
        // Language load and render logic is now partly in Core, but we need to re-render UI
        const currentLang = localStorage.getItem('preferredLanguage') || config.language || 'en';
        renderUI(currentLang);

        if (langSwitcher) {
            langSwitcher.addEventListener('click', async (e) => {
                const button = e.target.closest('button[data-lang-set]');
                if (button) {
                    const selectedLang = button.getAttribute('data-lang-set');
                    localStorage.setItem('preferredLanguage', selectedLang);
                    
                    await core.Data.load(selectedLang);
                    renderUI(selectedLang);
                    
                    const currentUrl = new URL(window.location);
                    currentUrl.searchParams.set('lang', selectedLang);
                    history.pushState({lang: selectedLang}, '', currentUrl.toString());
                }
            });
        }

        // [New] Use Core Canvas instead of internal canvasManager
        const headerElement = core.Util.$('.pe-header');
        if (headerElement) {
            core.Canvas.init(headerElement, {
                overlay: config.canvas_overlay,
                image_type: config.canvas_image_type,
                image_count: config.canvas_image_count,
                image_path: config.canvas_image_path,
                image_slide: config.canvas_image_slide,
                image_format: config.canvas_image_format,
                effect: config.canvas_effect
            });
        }

        uiManager.init();
        forms.init();
        
        initializeDemoLinkHandling();
        setupSmoothScroll();
        setupFadeInSectionObserver();
        setupToTopButton();
        setupLightbox();
        setupVideoBackgrounds();
        setupContentSliders();
        setupContentParallax();
        setupImageParallax();
    };

    return {
        init: initApp,
        registerEffect: (name, effect) => {
            // Register to Core if needed, or keep local mapping. 
            // Core's Canvas.init handles window[effectName] lookups automatically.
            if(core && core.Effects) {
                core.Effects[name] = { init: effect };
            } else {
                 // Fallback if accessed before init, though registerEffect usually called after script load
                 // We can assign it to window for Core to find
                 window[name] = effect;
            }
        }
    };
})();