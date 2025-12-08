/*
    Express Core Engine V4
    Version: 4.1.1 (Patch: Slide Indicators & Binding Fix)
    Tier 1 Infrastructure
    Last Modified: 2025-12-08
    Author: Maxim
    License: © 2025 Maxim. All Rights Reserved.
*/
const Express = (() => {
    'use strict';

    let config = {};
    let langData = {};
    let isInitialized = false;

    // [Default Messages]
    const FALLBACK_MSGS = {
        ex_error_network: "Network Error",
        ex_error_unknown: "Unknown Error",
        ex_btn_confirm: "OK",
        ex_btn_cancel: "Cancel"
    };

    // [Utility Module]
    const Util = {
        $(selector, parent = document) { return parent.querySelector(selector); },
        $$(selector, parent = document) { return parent.querySelectorAll(selector); },

        getDomainInfo() {
            const hostname = window.location.hostname;
            const parts = hostname.split('.');
            let brand = 'LOCALHOST';
            
            if (hostname !== 'localhost' && !hostname.includes('127.0.0.1') && parts.length >= 2) {
                brand = parts.length > 2 ? parts[parts.length - 2] : parts[0];
            }

            return {
                domain: hostname,
                domain_brand: brand.toUpperCase(),
                year: new Date().getFullYear()
            };
        },

        processText(str) {
            if (!str || typeof str !== 'string') return str;
            const vars = this.getDomainInfo();
            return str.replace(/\${(.*?)}/g, (match, key) => {
                const trimmedKey = key.trim();
                return vars[trimmedKey] !== undefined ? vars[trimmedKey] : match;
            });
        },

        getText(key) {
            return langData[key] ? this.processText(langData[key]) : (FALLBACK_MSGS[key] || key);
        },

        createCooldown(key, duration = 30000) {
            return {
                isActive() {
                    const stored = localStorage.getItem(key);
                    return stored && parseInt(stored) > Date.now();
                },
                getRemaining() {
                    const stored = localStorage.getItem(key);
                    if (!stored) return 0;
                    return Math.max(0, Math.ceil((parseInt(stored) - Date.now()) / 1000));
                },
                start() {
                    localStorage.setItem(key, Date.now() + duration);
                }
            };
        },

        createShuffleList(count) {
            const list = Array.from({ length: count }, (_, i) => i + 1);
            for (let i = list.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [list[i], list[j]] = [list[j], list[i]];
            }
            return list;
        }
    };

    // [UI Module]
    const UI = {
        init() {
            this.initDemoLinks();
            this.checkResolution();
            window.addEventListener('resize', () => this.checkResolution());
        },

        // [Feature] Minimum Resolution Warning
        checkResolution() {
            const minW = 300, minH = 400;
            const isSmall = window.innerWidth < minW || window.innerHeight < minH;
            let warning = document.getElementById('fullscreen-warning');

            if (isSmall) {
                if (!warning) {
                    warning = document.createElement('div');
                    warning.id = 'fullscreen-warning';
                    // User provided structure
                    warning.innerHTML = `
                        <div class="warning-content">
                            <span translate="no" class="material-symbols-outlined notranslate">smartphone</span>
                            <p>For the best experience, please use a larger screen.</p>
                            <div class="size-info">
                                <span>Width: <strong>&gt; 300px</strong></span>
                                <span>Height: <strong>&gt; 400px</strong></span>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(warning);
                }
                warning.classList.remove('ex-hidden');
            } else {
                if (warning) warning.classList.add('ex-hidden');
            }
        },

        initDemoLinks() {
            document.addEventListener('click', (e) => {
                if (e.target.closest('.js-demo-link')) {
                    e.preventDefault();
                    const link = e.target.closest('.js-demo-link');
                    const href = link.getAttribute('href');
                    
                    this.Modal.show(
                        Util.getText('ex_demo_title') || 'Notice',
                        Util.getText('ex_demo_link_warning'),
                        { type: 'confirm' }
                    ).then((confirm) => {
                        if (confirm && href && href !== '#') window.open(href, '_blank');
                    });
                }
            });
        },

        Loader: {
            show(btnElement = null) {
                if (btnElement) {
                    const textSpan = btnElement.querySelector('span:not(.ex-loader)');
                    if (!btnElement.querySelector('.ex-loader')) {
                        const loader = document.createElement('span');
                        loader.className = 'ex-loader';
                        btnElement.appendChild(loader);
                    }
                    if (textSpan) textSpan.classList.add('ex-hidden');
                    btnElement.disabled = true;
                } else {
                    let overlay = document.getElementById('ex-global-loader');
                    if (!overlay) {
                        overlay = document.createElement('div');
                        overlay.id = 'ex-global-loader';
                        overlay.className = 'ex-overlay ex-flex-center';
                        overlay.innerHTML = `<div class="ex-loader" style="width: 40px; height: 40px;"></div>`;
                        document.body.appendChild(overlay);
                    }
                    setTimeout(() => overlay.classList.add('active'), 10);
                }
            },
            hide(btnElement = null) {
                if (btnElement) {
                    const loader = btnElement.querySelector('.ex-loader');
                    const textSpan = btnElement.querySelector('span:not(.ex-loader)');
                    if (loader) loader.remove();
                    if (textSpan) textSpan.classList.remove('ex-hidden');
                    btnElement.disabled = false;
                } else {
                    const overlay = document.getElementById('ex-global-loader');
                    if (overlay) {
                        overlay.classList.remove('active');
                        setTimeout(() => overlay.remove(), 300);
                    }
                }
            }
        },

        Toast: {
            show(message, type = 'info') {
                let container = document.querySelector('.ex-toast-container');
                if (!container) {
                    container = document.createElement('div');
                    container.className = 'ex-toast-container';
                    document.body.appendChild(container);
                }
                const toast = document.createElement('div');
                toast.className = `ex-toast ex-toast--${type}`;
                toast.textContent = Util.processText(message);
                container.appendChild(toast);
                requestAnimationFrame(() => toast.classList.add('active'));
                setTimeout(() => {
                    toast.classList.remove('active');
                    setTimeout(() => toast.remove(), 300);
                }, 3000);
            }
        },

        Modal: {
            show(title, content, options = {}) {
                return new Promise((resolve) => {
                    const overlay = document.createElement('div');
                    overlay.className = 'ex-overlay';
                    const modal = document.createElement('div');
                    modal.className = 'ex-modal';
                    
                    const titleHtml = title ? `<h3 class="ex-modal__title">${Util.processText(title)}</h3>` : '';
                    const contentHtml = `<div class="ex-modal__content">${Util.processText(content)}</div>`;
                    let buttonsHtml = '';
                    
                    if (options.type === 'confirm') {
                        buttonsHtml = `
                            <div class="ex-modal__actions">
                                <button class="ex-btn ex-btn--secondary" data-action="cancel">${Util.getText('ex_btn_cancel')}</button>
                                <button class="ex-btn ex-btn--primary" data-action="confirm">${Util.getText('ex_btn_confirm')}</button>
                            </div>`;
                    } else {
                         buttonsHtml = `
                            <div class="ex-modal__actions">
                                <button class="ex-btn ex-btn--primary" data-action="close">${Util.getText('ex_btn_close')}</button>
                            </div>`;
                    }

                    modal.innerHTML = titleHtml + contentHtml + buttonsHtml;
                    document.body.appendChild(overlay);
                    document.body.appendChild(modal);

                    requestAnimationFrame(() => {
                        overlay.classList.add('active');
                        modal.classList.add('active');
                    });

                    const close = (result) => {
                        overlay.classList.remove('active');
                        modal.classList.remove('active');
                        setTimeout(() => {
                            overlay.remove();
                            modal.remove();
                            resolve(result);
                        }, 300);
                    };

                    modal.addEventListener('click', (e) => {
                        const action = e.target.dataset.action;
                        if (action) close(action === 'confirm');
                    });
                });
            }
        },

        Lightbox: {
            init() {
                // Tier 2 or 3 triggers UI.Lightbox.open() explicitly
            },
            open(src) {
                const overlay = document.createElement('div');
                overlay.className = 'ex-lightbox';
                overlay.innerHTML = `<img src="${src}"><span class="ex-lightbox__close">&times;</span>`;
                document.body.appendChild(overlay);
                requestAnimationFrame(() => overlay.classList.add('active'));
                const close = () => {
                    overlay.classList.remove('active');
                    setTimeout(() => overlay.remove(), 300);
                };
                overlay.querySelector('.ex-lightbox__close').addEventListener('click', close);
                overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
            }
        }
    };

    // [Data Module]
    const Data = {
        async load(userLang) {
            const coreUrl = './express/express-v4.json';
            const userUrl = './lang.json';

            try {
                const [coreRes, userRes] = await Promise.all([
                    fetch(coreUrl).catch(() => null),
                    fetch(userUrl).catch(() => null)
                ]);

                const coreJson = coreRes && coreRes.ok ? await coreRes.json() : {};
                const userJson = userRes && userRes.ok ? await userRes.json() : {};

                const coreDefault = coreJson['_default'] || {};
                const coreLang = coreJson[userLang] || coreJson['en'] || {};
                const userLangData = userJson[userLang] || userJson['en'] || {};
                const userDefault = userJson['_default'] || {};

                langData = { ...coreDefault, ...coreLang, ...userDefault, ...userLangData };
                
                // [Fix] Apply Binding automatically after load
                this.apply();
                
                return langData;
            } catch (e) {
                console.error('Express Data Load Error:', e);
                langData = FALLBACK_MSGS;
                this.apply(); 
                return langData;
            }
        },
        
        get() { return langData; },

        // [New] Bind Data to DOM (V4 Standard)
        apply() {
            // 1. Text Content Binding (data-lang="key")
            Util.$$('[data-lang]').forEach(el => {
                const key = el.dataset.lang;
                const text = Util.getText(key);
                if (text && text !== key) el.innerText = text;
            });

            // 2. Attribute Binding (Explicit: Placeholder, etc)
            // Fix: Directly check attribute value to ensure correct binding
            const bindAttrs = ['placeholder', 'title', 'alt', 'aria-label', 'href', 'content'];
            bindAttrs.forEach(attr => {
                const selector = `[data-lang-${attr}]`;
                Util.$$(selector).forEach(el => {
                    const key = el.getAttribute(`data-lang-${attr}`);
                    if (key) {
                        const text = Util.getText(key);
                        if (text && text !== key) {
                            el.setAttribute(attr, text);
                        }
                    }
                });
            });
        }
    };

    // [Canvas Module]
    const Canvas = {
        init(container, options = {}) {
            if (!container) return;
            
            let canvasLayer = container.querySelector('.ex-canvas');
            if (!canvasLayer) {
                canvasLayer = document.createElement('div');
                canvasLayer.className = 'ex-canvas';
                container.prepend(canvasLayer);
            } else {
                canvasLayer.innerHTML = '';
            }

            if (options.overlay) {
                const overlay = document.createElement('div');
                overlay.className = `ex-canvas__overlay ex-canvas__overlay--${options.overlay === true ? 'dotted' : options.overlay}`;
                canvasLayer.appendChild(overlay);
            }

            // Image Handler
            if (options.image_count > 0 && options.image_path && options.image_type !== 'none') {
                if (options.image_slide > 0 && options.image_count > 1) {
                    this.initSlideshow(canvasLayer, options);
                } else {
                    this.initStaticImage(canvasLayer, options);
                }
            }

            // Effect Handler (Built-in or Custom)
            const effectName = options.effect;
            if (effectName) {
                const effectCanvas = document.createElement('canvas');
                effectCanvas.className = 'ex-canvas__effect';
                canvasLayer.appendChild(effectCanvas);
                
                // 1. Check if registered in Express.Effects
                if (Express.Effects && Express.Effects[effectName]) {
                    Express.Effects[effectName].init(canvasLayer);
                } 
                // 2. Check global window (Legacy/Simple support)
                else if (typeof window[effectName] === 'object' && window[effectName].init) {
                    window[effectName].init(canvasLayer);
                }
            }
        },

        initStaticImage(layer, options) {
            const imgNum = Math.floor(Math.random() * options.image_count) + 1;
            const img = document.createElement('img');
            img.className = 'ex-canvas__image is-active';
            img.src = `${options.image_path}${imgNum}.${options.image_format || 'jpg'}`;
            layer.appendChild(img);
        },

        initSlideshow(layer, options) {
            // 1. Setup Slides
            const slideWrapper = document.createElement('div');
            slideWrapper.className = 'ex-canvas__slider';
            const slides = [document.createElement('img'), document.createElement('img')];
            slides.forEach(img => {
                img.className = 'ex-canvas__slide';
                slideWrapper.appendChild(img);
            });
            layer.appendChild(slideWrapper);
        
            // 2. Setup Indicators (New Feature)
            const indicatorWrapper = document.createElement('div');
            indicatorWrapper.className = 'ex-canvas__indicators';
            const indicators = [];
            
            // Generate dots equal to image count (Max 10 to prevent overflow)
            const dotCount = Math.min(options.image_count, 10);
            for(let i=0; i < dotCount; i++) {
                const dot = document.createElement('span');
                dot.className = 'ex-canvas__indicator';
                indicatorWrapper.appendChild(dot);
                indicators.push(dot);
            }
            layer.appendChild(indicatorWrapper);
        
            const order = Util.createShuffleList(options.image_count);
            let idx = 0;
            
            const updateIndicators = (currentIdx) => {
                indicators.forEach((dot, i) => {
                    if (i === currentIdx) dot.classList.add('is-active');
                    else dot.classList.remove('is-active');
                });
            };

            const run = (isFirst) => {
                // Map the shuffled index back to indicator index (0 ~ dotCount-1)
                const indicatorIdx = idx % dotCount;
                updateIndicators(indicatorIdx);

                const imgNum = order[idx];
                const imgSrc = `${options.image_path}${imgNum}.${options.image_format || 'jpg'}`;
                const active = slides.find(s => s.classList.contains('is-active'));
                const next = slides.find(s => !s.classList.contains('is-active')) || slides[0];
        
                if (isFirst) {
                    next.src = imgSrc;
                    next.classList.add('is-active');
                } else {
                    next.src = imgSrc;
                    next.onload = () => {
                        if (active) active.classList.remove('is-active');
                        next.classList.add('is-active');
                    };
                }
                idx = (idx + 1) % order.length;
            };
            
            run(true);
            setInterval(() => run(false), options.image_slide * 1000);
        }
    };

    // [Security Module]
    const Security = {
        widgetId: null,
        init(siteKey) {
            if (!siteKey) return;
            window.onloadTurnstileCallback = () => this.render(siteKey);
            // If API already loaded
            if (typeof turnstile !== 'undefined') this.render(siteKey);
        },
        render(siteKey) {
            if (this.widgetId) return;
            const container = document.createElement('div');
            container.id = 'turnstile-container';
            document.body.appendChild(container);
            try {
                this.widgetId = turnstile.render('#turnstile-container', { sitekey: siteKey, size: 'invisible' });
            } catch (e) { console.warn('Turnstile render failed:', e); }
        },
        async getToken() {
            if (!this.widgetId) return null;
            return new Promise((resolve, reject) => {
                try {
                    turnstile.execute(this.widgetId, {
                        callback: (token) => resolve(token),
                        'error-callback': () => reject(new Error(Util.getText('ex_error_captcha')))
                    });
                } catch (e) { reject(e); }
            });
        },
        reset() {
            if (this.widgetId && typeof turnstile !== 'undefined') {
                try { turnstile.reset(this.widgetId); } catch(e) {}
            }
        }
    };

    // [API Module]
    const API = {
        async post(endpoint, body, btnElement = null, options = {}) {
            if (btnElement) UI.Loader.show(btnElement);

            // Mock Response for Demo Mode
            if (config.demo_mode || options.demoMode) {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        if (btnElement) UI.Loader.hide(btnElement);
                        resolve({ 
                            success: true, 
                            message: Util.getText(options.demoKey || 'ex_contact_success_demo'), 
                            found: false 
                        }); 
                    }, 1500);
                });
            }

            try {
                // Turnstile Token Injection
                if (config.TURNSTILE_SITE_KEY) {
                    const token = await Security.getToken();
                    if (!token) throw new Error(Util.getText('ex_error_captcha'));
                    body['cf-turnstile-response'] = token;
                }

                // V4 Path Injection
                const currentPath = window.location.href.substring(0, window.location.href.lastIndexOf('/')) + '/';
                body['__assets_path'] = currentPath;

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                const result = await response.json();
                if (!result.success) throw new Error(result.message || Util.getText('ex_error_api'));
                return result;

            } catch (error) {
                UI.Toast.show(error.message, 'error');
                Security.reset();
                throw error;
            } finally {
                if (btnElement) UI.Loader.hide(btnElement);
            }
        }
    };

    // [Initialization]
    const init = async (siteConfig) => {
        if (isInitialized) return;
        config = siteConfig || {};
        
        UI.init();
        
        // Language Logic (Priority: URL > LocalStorage > Browser > Config)
        const urlParams = new URLSearchParams(window.location.search);
        let lang = urlParams.get('lang');

        if (lang) {
            localStorage.setItem('preferredLanguage', lang);
            const newUrl = window.location.pathname + window.location.hash;
            if(history.pushState) history.pushState({ path: newUrl }, '', newUrl);
        } else {
            lang = localStorage.getItem('preferredLanguage') || config.language || document.documentElement.lang || 'en';
        }

        document.documentElement.lang = lang;
        await Data.load(lang);
        
        // Security Init
        if (config.TURNSTILE_SITE_KEY) {
            const script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback';
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
            Security.init(config.TURNSTILE_SITE_KEY);
        }

        isInitialized = true;
        
        return {
            config,
            Util,
            UI,
            API,
            Data,
            Canvas,
            Security,
            Effects: {} // Registry for Tier 3 effects
        };
    };

    return { init, UI, Util, API, Data, Canvas, Effects: {} };
})();