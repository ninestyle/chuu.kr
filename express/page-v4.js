A/*
    Tier 2: Page Express Framework (Space)
    Version: 4.0.1 (Hotfix: Global Scope & Failsafe)
    Role: Interaction, Navigation, Hydration
    Last Modified: 2025-12-07
    License: © 2025 Maxim. All Rights Reserved.
*/

(function() {
    'use strict';

    let core = null;
    let config = {};
    
    // -------------------------------------------------------------------------
    // 1. UI Manager
    // -------------------------------------------------------------------------
    const UIManager = {
        init() {
            this.setupNav();
            this.injectIconButtons();
        },

        setupNav() {
            const nav = document.querySelector('.pe-nav');
            window.addEventListener('scroll', () => {
                if (window.scrollY > 50) nav.classList.add('is-scrolled');
                else nav.classList.remove('is-scrolled');
            }, { passive: true });

            const langSwitcher = document.getElementById('lang-switcher');
            if (langSwitcher) {
                langSwitcher.addEventListener('click', async (e) => {
                    const btn = e.target.closest('button[data-lang-set]');
                    if (btn) {
                        const lang = btn.dataset.langSet;
                        await core.Data.load(lang);
                        langSwitcher.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.langSet === lang));
                        this.renderLanguage();
                        document.documentElement.lang = lang;
                    }
                });
            }
        },

        renderLanguage() {
            const data = core.Data.get();
            if (!data) return;

            core.Util.$$('[data-lang]').forEach(el => {
                const key = el.dataset.lang;
                if (data[key]) {
                    if (el.classList.contains('render-as-html')) el.innerHTML = core.Util.processText(data[key]);
                    else el.textContent = core.Util.processText(data[key]);
                }
            });

            core.Util.$$('[data-lang-href]').forEach(el => {
                el.href = core.Util.getText(el.dataset.langHref);
            });
            core.Util.$$('[data-lang-placeholder]').forEach(el => {
                el.placeholder = core.Util.getText(el.dataset.langPlaceholder);
            });
        },

        injectIconButtons() {
            const container = core.Util.$('.pe-header__content');
            if (!container || !config.icon_buttons || config.icon_buttons.length === 0) return;

            let buttonGroup = container.querySelector('.ce-button-group');
            if (!buttonGroup) {
                buttonGroup = document.createElement('div');
                buttonGroup.className = 'ce-button-group';
                container.appendChild(buttonGroup);
            } else {
                buttonGroup.innerHTML = '';
            }

            config.icon_buttons.forEach(btn => {
                const el = document.createElement('a');
                el.href = btn.url;
                el.className = 'ce-button-group__icon';
                el.innerHTML = `<span translate="no" class="material-symbols-outlined notranslate">${btn.icon}</span>`;
                
                if (btn.url.startsWith('http')) {
                    el.target = '_blank';
                    el.rel = 'noopener noreferrer';
                }
                buttonGroup.appendChild(el);
            });
        }
    };

    // -------------------------------------------------------------------------
    // 2. Interaction
    // -------------------------------------------------------------------------
    const Interaction = {
        init() {
            this.setupSmoothScroll();
            this.setupFadeIn();
            this.setupToTop();
            this.setupContentSliders();
        },

        setupSmoothScroll() {
            core.Util.$$('a[href^="#"]:not([href="#"])').forEach(anchor => {
                anchor.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = anchor.getAttribute('href');
                    const target = core.Util.$(targetId);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                        history.pushState(null, null, targetId);
                    }
                });
            });
        },

        setupFadeIn() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, { rootMargin: '0px 0px -100px 0px' });

            core.Util.$$('.js-fade-in').forEach(el => observer.observe(el));
        },

        setupToTop() {
            const btn = core.Util.$('#to-top-btn');
            if (!btn) return;
            window.addEventListener('scroll', () => {
                btn.classList.toggle('visible', window.scrollY > 300);
            }, { passive: true });
        },

        setupContentSliders() {
            core.Util.$$('.js-content-slider').forEach(slider => {
                const wrapper = slider.querySelector('.pe-slider__wrapper');
                const prevBtn = slider.querySelector('.pe-slider--prev');
                const nextBtn = slider.querySelector('.pe-slider--next');
                if (!wrapper) return;

                const scrollAmount = wrapper.querySelector('.pe-slider__item')?.offsetWidth + 20 || 320;

                if (prevBtn) prevBtn.addEventListener('click', () => wrapper.scrollBy({ left: -scrollAmount, behavior: 'smooth' }));
                if (nextBtn) nextBtn.addEventListener('click', () => wrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' }));
            });
        }
    };

    // -------------------------------------------------------------------------
    // 3. Hydration
    // -------------------------------------------------------------------------
    const Hydration = {
        init() {
            this.hydrateForms();
            this.renderDynamicContent();
        },

        hydrateForms() {
            core.Util.$$('.pe-form').forEach(form => {
                const isDemo = form.dataset.demoMode === 'true' || config.demo_mode;
                const statusEl = form.querySelector('.pe-form__status');
                const btn = form.querySelector('.pe-form__submit');

                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    let isValid = true;
                    form.querySelectorAll('[required]').forEach(input => {
                        if (!input.value.trim()) { isValid = false; input.focus(); }
                    });
                    if (!isValid) return;

                    let endpoint = 'conn.contact';
                    if (form.classList.contains('pe-search-form')) endpoint = 'conn.search';
                    
                    const formData = new FormData(form);
                    const payload = Object.fromEntries(formData.entries());

                    try {
                        const result = await core.API.post(endpoint, payload, btn, {
                            demoMode: isDemo,
                            demoKey: endpoint === 'conn.search' ? 'ex_search_not_found_demo' : 'ex_success_demo'
                        });

                        if (statusEl) {
                            statusEl.style.display = 'block';
                            statusEl.innerHTML = result.found ? `<strong>${result.key}</strong>: ${result.value}` : result.message;
                            statusEl.style.color = result.success ? 'var(--ex-color-success)' : 'var(--ex-color-error)';
                        }
                        if (result.success && !result.found) form.reset();

                    } catch (err) {
                        if (statusEl) {
                            statusEl.style.display = 'block';
                            statusEl.textContent = err.message;
                            statusEl.style.color = 'var(--ex-color-error)';
                        }
                    }
                });

                const textarea = form.querySelector('textarea');
                const counter = form.querySelector('.pe-form__char-counter');
                if (textarea && counter) {
                    textarea.addEventListener('input', () => {
                        counter.textContent = `${textarea.value.length}/${textarea.maxLength}`;
                    });
                }
            });
        },

        renderDynamicContent() {
            const containers = core.Util.$$('[data-content-type]');
            const data = core.Data.get();
            if (!containers.length || !data) return;

            containers.forEach(container => {
                const type = container.dataset.contentType;
                const prefix = container.dataset.prefix;
                let html = '';

                for (let i = 1; i <= 50; i++) {
                    const idx = String(i).padStart(2, '0');
                    const labelKey = `${prefix}_${idx}`;
                    let exists = false;
                    if (type === 'faq') exists = !!data[`${prefix}_${idx}_q`];
                    else exists = !!data[labelKey];

                    if (!exists) {
                        if (i > 1) break;
                        continue;
                    }

                    if (type === 'faq') {
                        const q = core.Util.getText(`${prefix}_${idx}_q`);
                        const a = core.Util.getText(`${prefix}_${idx}_a`);
                        html += `<div class="pe-faq-item"><div class="pe-faq-item__question">${q}</div><div class="pe-faq-item__answer">${a}</div></div>`;
                    } else if (type === 'product') {
                        const label = core.Util.getText(labelKey);
                        const value = core.Util.getText(`${prefix}_${idx}_price`);
                        const mod = core.Util.getText(`${prefix}_${idx}_modifier`);
                        const modClass = mod ? ` pe-product-list__item--${mod}` : '';
                        html += `<div class="pe-product-list__item${modClass}"><span class="pe-product-list__label">${label}</span><span class="pe-product-list__value">${value}</span></div>`;
                    }
                }
                if (html) container.innerHTML = html;
            });
        }
    };

    // -------------------------------------------------------------------------
    // 4. Initialization (With Failsafe)
    // -------------------------------------------------------------------------
    const init = async (siteConfig) => {
        try {
            if (typeof window.Express === 'undefined') {
                throw new Error('Express Core (Tier 1) is missing or failed to load.');
            }

            // Initialize Core
            core = await window.Express.init(siteConfig);
            config = core.config;

            // Run Modules
            UIManager.renderLanguage();
            UIManager.init();
            Interaction.init();
            Hydration.init();

            // Canvas Init
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

        } catch (e) {
            console.error('[Page Express] Initialization Failed:', e);
            // [FAILSAFE] Emergency Reveal
            // If JS fails, force content to be visible so site is not blank
            document.querySelectorAll('.js-fade-in').forEach(el => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            });
        }
    };

    // [Fix] Explicitly assign to window
    window.PE_V4 = { init };

})();