/*
    Version: Page Express 4.2.1 (Diet & Core Integration)
    Last Modified: 2025-12-09 14:40:00 (KST)
    File Name: page-v4.js
    Author: Maxim
    License: © 2025 Maxim. All Rights Reserved.
*/
const PE_V4 = (() => {
    'use strict';

    let core = null;
    let config = {}; 
    let currentLangData = {};

    const uiManager = {
        init() {
            this.injectIconButtons();
            this.setupHeaderParallax();
        },
        injectIconButtons() {
            const container = core.Util.$('.pe-header__content');
            if (!container || !config.icon_buttons || config.icon_buttons.length === 0) return;

            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'ce-button-group';
            
            config.icon_buttons.forEach(btn => {
                const el = document.createElement('a');
                el.className = 'ce-button-group__icon';
                el.href = btn.url;
                el.ariaLabel = btn.name;
                if (!btn.url.startsWith('#')) {
                    el.target = '_blank';
                    el.rel = 'noopener noreferrer';
                }
                el.innerHTML = `<span translate="no" class="material-symbols-outlined notranslate">${btn.icon}</span>`;
                buttonGroup.appendChild(el);
            });
            container.appendChild(buttonGroup);
        },
        setupHeaderParallax() {
            const content = core.Util.$('.js-parallax-content');
            const home = core.Util.$('.pe-header');
            if (!content || !home) return;

            const onMove = (e) => {
                const x = (e.touches ? e.touches[0].clientX : e.clientX);
                const y = (e.touches ? e.touches[0].clientY : e.clientY);
                content.style.transform = `translate(${(x - window.innerWidth/2)/50}px, ${(y - window.innerHeight/2)/50}px)`;
            };
            home.addEventListener('mousemove', onMove);
            home.addEventListener('touchmove', onMove, { passive: true });
            home.addEventListener('mouseout', () => content.style.transform = '');
            home.addEventListener('touchend', () => content.style.transform = '');
        }
    };

    const formHandler = {
        init() {
            this.bindForm('.pe-search-form', 'conn.search', 'searchCooldown', 30000, (res, statusEl) => {
                const html = res.found ? 
                    `<p>Search: <strong>${res.key}</strong></p><div>${res.value}</div>` : 
                    `<p>${res.message}</p>`;
                statusEl.innerHTML = html;
            });

            this.bindForm('.pe-contact-form', 'conn.contact', 'contactCooldown', 60000, (res, statusEl, form) => {
                statusEl.textContent = res.message;
                statusEl.style.color = 'var(--ex-color-success)'; 
                form.reset();
            });
        },

        bindForm(selector, apiPath, cooldownKey, cooldownTime, successCallback) {
            const form = core.Util.$(selector);
            if (!form) return;

            const button = form.querySelector('.pe-form__submit');
            const statusEl = form.querySelector('.pe-form__status');
            const cooldown = core.Util.createCooldown(cooldownKey, cooldownTime);
            
            let endpoint = '';
            if (config.API_HOST) {
                endpoint = `${config.API_HOST.replace(/\/$/, '')}/api/${apiPath}`;
            } else {
                endpoint = config.API_ENDPOINT || ''; 
            }

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                statusEl.style.display = 'block';
                statusEl.style.color = '';

                const isDemo = form.dataset.demoMode === 'true';
                if (!isDemo && cooldown.isActive()) {
                    statusEl.textContent = `Please wait ${cooldown.getRemaining()}s...`;
                    statusEl.style.color = 'var(--ex-color-warning)';
                    return;
                }

                try {
                    const formData = new FormData(form);
                    const payload = Object.fromEntries(formData.entries());
                    
                    const result = await core.API.post(endpoint, payload, button, {
                        demoMode: isDemo,
                        demoKey: apiPath === 'conn.search' ? 'ex_search_not_found_demo' : 'ex_contact_success_demo'
                    });

                    if (!isDemo) cooldown.start();
                    successCallback(result, statusEl, form);

                } catch (error) {
                    statusEl.textContent = error.message;
                    statusEl.style.color = 'var(--ex-color-error)';
                }
            });
        }
    };

    const contentRenderer = {
        render() {
            const lang = document.documentElement.lang;
            currentLangData = core.Data.get();
            if (!currentLangData) return;

            core.Util.$$('[data-lang]').forEach(el => {
                const key = el.dataset.lang;
                const text = core.Util.getText(key);
                if (el.classList.contains('render-as-html')) el.innerHTML = text;
                else el.textContent = text;
            });
            core.Util.$$('[data-lang-href]').forEach(el => el.href = core.Util.getText(el.dataset.langHref));
            core.Util.$$('[data-lang-placeholder]').forEach(el => el.placeholder = core.Util.getText(el.dataset.langPlaceholder));

            core.Util.$$('[data-content-type]').forEach(container => {
                const type = container.dataset.contentType;
                const prefix = container.dataset.prefix;
                let html = '';

                for (let i = 1; i < 50; i++) {
                    const idx = String(i).padStart(2, '0');
                    if (type === 'product') {
                        const label = currentLangData[`${prefix}_${idx}`];
                        const val = currentLangData[`${prefix}_${idx}_price`];
                        if (!label || !val) break;
                        html += `<div class="pe-product-list__item">
                                    <span class="pe-product-list__label">${label}</span>
                                    <span class="pe-product-list__value">${val}</span>
                                 </div>`;
                    } else if (type === 'faq') {
                        const q = currentLangData[`${prefix}_${idx}_q`];
                        const a = currentLangData[`${prefix}_${idx}_a`];
                        if (!q || !a) break;
                        html += `<div class="pe-faq-item">
                                    <div class="pe-faq-item__question">${q}</div>
                                    <div class="pe-faq-item__answer">${a}</div>
                                 </div>`;
                    }
                }
                container.innerHTML = html;
            });

            const switcher = core.Util.$('#lang-switcher');
            if (switcher) {
                switcher.querySelectorAll('button').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.langSet === lang);
                });
            }
        },

        setupInteractions() {
            const switcher = core.Util.$('#lang-switcher');
            if (switcher) {
                switcher.addEventListener('click', async (e) => {
                    const btn = e.target.closest('button[data-lang-set]');
                    if (btn) {
                        const newLang = btn.dataset.langSet;
                        localStorage.setItem('preferredLanguage', newLang);
                        const url = new URL(window.location);
                        url.searchParams.set('lang', newLang);
                        history.pushState({}, '', url);
                        
                        document.documentElement.lang = newLang;
                        await core.Data.load(newLang);
                        this.render();
                    }
                });
            }

            core.Util.$$('a[href^="#"]:not([data-lang-href])').forEach(anchor => {
                anchor.addEventListener('click', function(e) {
                    e.preventDefault();
                    const target = core.Util.$(this.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                        history.pushState(null, null, this.getAttribute('href'));
                    }
                });
            });

            core.Util.$$('.js-lightbox-trigger').forEach(el => {
                el.addEventListener('click', (e) => {
                    const img = e.currentTarget.querySelector('img');
                    if(img) core.UI.Lightbox.open(img.src);
                });
            });

            const toTop = core.Util.$('#to-top-btn');
            if (toTop) {
                window.addEventListener('scroll', () => {
                    toTop.classList.toggle('visible', window.scrollY > 300);
                });
            }
        },

        setupObservers() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, { rootMargin: '0px 0px -100px 0px' });
            core.Util.$$('.js-fade-in').forEach(el => observer.observe(el));

            const images = core.Util.$$('.pe-header .ex-canvas__image');
            if(images.length > 0) {
                window.addEventListener('scroll', () => {
                    if (window.scrollY < window.innerHeight) {
                        images.forEach(img => img.style.transform = `translateY(${window.scrollY * 0.5}px)`);
                    }
                });
            }
        }
    };

    const sliderManager = {
        init() {
            core.Util.$$('.js-content-slider').forEach(slider => {
                const wrapper = slider.querySelector('.pe-slider__wrapper');
                const prevBtn = slider.querySelector('.pe-slider--prev');
                const nextBtn = slider.querySelector('.pe-slider--next');
                const playPauseBtn = slider.querySelector('.pe-slider--play-pause');
                
                if (!wrapper) return;

                let autoPlayInterval = null;
                let isPlaying = false;

                const getScrollAmt = () => (wrapper.querySelector('.pe-slider__item')?.offsetWidth || 300) + 30;

                const updateButtons = () => {
                    if (!prevBtn || !nextBtn) return;
                    const tolerance = 10;
                    const maxScroll = wrapper.scrollWidth - wrapper.clientWidth;
                    
                    if (wrapper.scrollLeft <= tolerance) {
                        prevBtn.classList.add('disabled');
                    } else {
                        prevBtn.classList.remove('disabled');
                    }

                    if (wrapper.scrollLeft >= maxScroll - tolerance) {
                        nextBtn.classList.add('disabled');
                    } else {
                        nextBtn.classList.remove('disabled');
                    }
                };

                const scroll = (direction) => {
                    wrapper.scrollBy({ left: direction * getScrollAmt(), behavior: 'smooth' });
                };

                const startAutoPlay = () => {
                    if (isPlaying || !playPauseBtn) return;
                    isPlaying = true;
                    playPauseBtn.classList.add('is-playing');
                    playPauseBtn.querySelector('.material-symbols-outlined').textContent = 'pause';
                    
                    autoPlayInterval = setInterval(() => {
                        const maxScroll = wrapper.scrollWidth - wrapper.clientWidth;
                        if (wrapper.scrollLeft >= maxScroll - 10) {
                            wrapper.scrollTo({ left: 0, behavior: 'smooth' });
                        } else {
                            scroll(1);
                        }
                    }, 4000);
                };

                const stopAutoPlay = () => {
                    if (!isPlaying || !playPauseBtn) return;
                    isPlaying = false;
                    playPauseBtn.classList.remove('is-playing');
                    playPauseBtn.querySelector('.material-symbols-outlined').textContent = 'play_arrow';
                    clearInterval(autoPlayInterval);
                };

                const toggleAutoPlay = () => {
                    if (isPlaying) stopAutoPlay();
                    else startAutoPlay();
                };

                wrapper.addEventListener('scroll', updateButtons, { passive: true });
                if (prevBtn) prevBtn.addEventListener('click', () => { stopAutoPlay(); scroll(-1); });
                if (nextBtn) nextBtn.addEventListener('click', () => { stopAutoPlay(); scroll(1); });
                if (playPauseBtn) playPauseBtn.addEventListener('click', toggleAutoPlay);

                wrapper.addEventListener('touchstart', stopAutoPlay, { passive: true });
                wrapper.addEventListener('mouseenter', stopAutoPlay);
                
                updateButtons();
                startAutoPlay();
            });
        }
    };

    const init = async (siteConfig) => {
        if (typeof Express === 'undefined') return console.error('Express Core Missing');
        
        core = await Express.init(siteConfig);
        config = core.config;

        const header = core.Util.$('.pe-header');
        if (header) {
            core.Canvas.init(header, {
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
        formHandler.init();
        contentRenderer.render();
        contentRenderer.setupInteractions();
        contentRenderer.setupObservers();
        sliderManager.init();

        return {
            registerEffect: (name, effect) => {
                if (core.Effects) core.Effects[name] = { init: effect };
                else window[name] = effect;
            }
        };
    };

    return { init };
})();