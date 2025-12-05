/*
    Express Core Engine (Tier 1)
    - Passive Mode, API Interface, UI Utilities
    Version: 3.3.0
    Last Modified: 2025-11-24
    Author: Maxim
    License: © 2025 Maxim. All Rights Reserved.
*/
const Express = (() => {
    'use strict';

    let config = {};
    let langData = {};
    let isInitialized = false;
    let currentLang = 'en';

    const FALLBACK_MSGS = {
        ex_error_network: "Network Error. Please check your connection.",
        ex_error_unknown: "An unknown error occurred.",
        ex_error_captcha: "Security verification failed. Please refresh.",
        ex_error_api: "Server request failed.",
        ex_btn_confirm: "OK",
        ex_btn_cancel: "Cancel",
        ex_btn_close: "Close"
    };

    // [Tier 1] Common Utilities
    const Util = {
        $(selector, parent = document) { return parent.querySelector(selector); },
        $$(selector, parent = document) { return parent.querySelectorAll(selector); },

        getDomainInfo() {
            const hostname = window.location.hostname;
            const pathname = window.location.pathname;
            let domainInfo;

            if (hostname === 'localhost' || hostname === '127.0.0.1' || !hostname.includes('.')) {
                domainInfo = { full: hostname, apex: 'localhost', sub: '', tld: 'local', brand: 'localhost', path: '' };
            } else {
                const parts = hostname.split('.');
                const tld = parts[parts.length - 1];
                const brand = parts.length > 2 ? parts[parts.length - 2] : parts[0];
                const sub = parts.length > 2 ? parts.slice(0, -2).join('.') : '';
                const apex = `${brand}.${tld}`;
                const cleanedPath = pathname.replace(/index\.html$/, '').replace(/\/$/, '').replace(/^\//, '');
                domainInfo = { full: hostname, apex: apex, sub: sub, tld: tld, brand: brand, path: cleanedPath };
            }
            
            return {
                domain: domainInfo.full,
                domain_apex: domainInfo.apex,
                domain_sub: domainInfo.sub,
                domain_brand: domainInfo.brand.toUpperCase(),
                domain_tld: domainInfo.tld,
                domain_path: domainInfo.path,
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
            const val = langData[key];
            return val ? this.processText(val) : (FALLBACK_MSGS[key] || key);
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
                    const unlockTime = Date.now() + duration;
                    localStorage.setItem(key, unlockTime);
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

    const UI = {
        init() {
            this.injectStyles();
            this.initDemoLinks();
        },

        injectStyles() {
            // Tier 1 CSS should be loaded via <link> in HTML for performance, 
            // but this is a fallback for dynamic imports if needed.
            // In V3.3 Standard, we expect CSS to be loaded by Tier 2 or HTML.
        },

        initDemoLinks() {
            document.addEventListener('click', (e) => {
                const link = e.target.closest('.js-demo-link');
                if (link) {
                    e.preventDefault();
                    const href = link.getAttribute('href');
                    const warningMsg = Util.getText('ex_demo_link_warning');
                    const title = Util.getText('ex_demo_title') || 'Notice';

                    this.Modal.show(title, warningMsg, { type: 'confirm' }).then((confirm) => {
                        if (confirm && href && href !== '#' && !href.startsWith('javascript:')) {
                            window.open(href, '_blank');
                        }
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
                    btnElement.dataset.isLoading = 'true';
                } else {
                    let overlay = document.getElementById('ex-global-loader');
                    if (!overlay) {
                        overlay = document.createElement('div');
                        overlay.id = 'ex-global-loader';
                        overlay.className = 'ex-overlay ex-flex-center';
                        overlay.innerHTML = `<div class="ex-loader" style="width: 40px; height: 40px; border-color: rgba(255,255,255,0.2); border-top-color: #FFF;"></div>`;
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
                    delete btnElement.dataset.isLoading;
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
                    const id = 'ex-modal-' + Date.now();
                    const overlay = document.createElement('div');
                    overlay.className = 'ex-overlay';
                    overlay.id = id;

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
                    // Close on overlay click
                    overlay.addEventListener('click', (e) => {
                        if (e.target === overlay && options.type !== 'confirm') close(false);
                    });
                });
            }
        },

        Lightbox: {
            init() {
                document.addEventListener('click', (e) => {
                    const trigger = e.target.closest('.js-lightbox-trigger');
                    if (trigger) {
                        const img = trigger.querySelector('img');
                        if (img) this.open(img.src);
                    }
                });
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
                // Support both boolean and string types for overlay
                const overlayType = (options.overlay === true) ? 'dotted' : options.overlay;
                overlay.className = `ex-canvas__overlay ex-canvas__overlay--${overlayType}`;
                canvasLayer.appendChild(overlay);
            }

            const hasImage = options.image_count > 0 && options.image_path;
            const slideDuration = parseInt(options.image_slide, 10) || 0;
            const type = options.image_type || 'none';

            if (type !== 'none' && hasImage) {
                if (slideDuration > 0 && options.image_count > 1) {
                    this.initSlideshow(canvasLayer, options);
                } else {
                    this.initStaticImage(canvasLayer, options);
                }
            }

            // Effects Support (External & Internal)
            if (options.effect) {
                const effectCanvas = document.createElement('canvas');
                effectCanvas.className = 'ex-canvas__effect';
                canvasLayer.appendChild(effectCanvas);
                
                // 1. Check if effect is registered in Express.Effects
                if (Express.Effects && Express.Effects[options.effect]) {
                    Express.Effects[options.effect].init(container); // Pass container or header
                } 
                // 2. Check global window object (Legacy/User extensions)
                else if (typeof window[options.effect] === 'function') {
                    window[options.effect](effectCanvas);
                }
                // 3. Object-based global effect (like heartEffect)
                else if (window[options.effect] && typeof window[options.effect].init === 'function') {
                    window[options.effect].init(container);
                }
            }
        },

        initStaticImage(layer, options) {
            const imgNum = Math.floor(Math.random() * options.image_count) + 1;
            const imgSrc = this.getImageSrc(imgNum, options);
            
            const img = document.createElement('img');
            img.className = 'ex-canvas__image is-active';
            img.src = imgSrc;
            img.alt = "";
            layer.appendChild(img);
        },

        initSlideshow(layer, options) {
            const slideWrapper = document.createElement('div');
            slideWrapper.className = 'ex-canvas__slider';
            // Create buffer slots
            const slides = [document.createElement('img'), document.createElement('img')];
            slides.forEach(img => {
                img.className = 'ex-canvas__slide';
                slideWrapper.appendChild(img);
            });
            layer.appendChild(slideWrapper);

            const order = Util.createShuffleList(options.image_count);
            let idx = 0;

            const run = (isFirst = false) => {
                const imgNum = order[idx];
                const imgSrc = this.getImageSrc(imgNum, options);
                
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
        },

        getImageSrc(num, options) {
            const fmt = options.image_format || 'webp';
            // Ensure path ends with slash
            const path = options.image_path.endsWith('/') ? options.image_path : options.image_path + '/';
            return `${path}${num}.${fmt}`;
        }
    };

    const Data = {
        async load(userLang) {
            currentLang = userLang;
            // Use CDN path for production, relative for dev/local
            const coreUrl = 'https://cdn.dam.so/_inc/express/express-v3.json';
            const userUrl = './lang.json';

            try {
                // Parallel fetch
                const [coreRes, userRes] = await Promise.all([
                    fetch(coreUrl).catch(() => null),
                    fetch(userUrl).catch(() => null)
                ]);

                const coreJson = coreRes && coreRes.ok ? await coreRes.json() : {};
                const userJson = userRes && userRes.ok ? await userRes.json() : {};

                // Hierarchy: User Lang > User Default > Core Lang > Core Default
                const coreDefault = coreJson['_default'] || {};
                const coreLang = coreJson[currentLang] || coreJson['en'] || {};
                const userLangData = userJson[currentLang] || userJson['en'] || {};
                const userDefault = userJson['_default'] || {};

                langData = { ...coreDefault, ...coreLang, ...userDefault, ...userLangData };
                return langData;

            } catch (e) {
                console.warn('Express Data Load Warning:', e);
                // Even on error, we should allow operation with fallback
                langData = FALLBACK_MSGS;
                return langData;
            }
        },
        get() {
            return langData;
        }
    };

    const Security = {
        widgetId: null,
        
        init(siteKey) {
            if (!siteKey) return;
            // Define global callback if not exists
            window.onloadTurnstileCallback = () => this.render(siteKey);
            
            if (typeof turnstile !== 'undefined') {
                this.render(siteKey);
            } else {
                // If script not loaded yet, wait for onload callback
            }
        },

        render(siteKey) {
            if (this.widgetId) return;
            let container = document.getElementById('turnstile-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'turnstile-container';
                document.body.appendChild(container);
            }

            try {
                this.widgetId = turnstile.render('#turnstile-container', {
                    sitekey: siteKey,
                    size: 'invisible'
                });
            } catch (e) {
                console.warn('Turnstile render deferred:', e);
            }
        },

        async getToken() {
            // Check if configured
            if (!config.TURNSTILE_SITE_KEY) return null;

            // Wait for Turnstile load
            let retries = 0;
            while (typeof turnstile === 'undefined' && retries < 20) {
                await new Promise(r => setTimeout(r, 100));
                retries++;
            }
            
            // Re-attempt render if needed
            if (!this.widgetId && typeof turnstile !== 'undefined') {
                this.render(config.TURNSTILE_SITE_KEY);
                await new Promise(r => setTimeout(r, 200));
            }

            if (!this.widgetId) {
                console.error('Turnstile widget failed to initialize.');
                return null; // Fail open or closed depending on policy? Usually fail closed if key exists.
            }
            
            return new Promise((resolve, reject) => {
                try {
                    turnstile.execute(this.widgetId, {
                        callback: (token) => resolve(token),
                        'error-callback': () => {
                            reject(new Error(Util.getText('ex_error_captcha')));
                        }
                    });
                } catch (e) {
                    reject(e);
                }
            });
        },

        reset() {
            if (this.widgetId && typeof turnstile !== 'undefined') {
                try { turnstile.reset(this.widgetId); } catch(e) {}
            }
        }
    };

    const API = {
        async post(endpoint, body, btnElement = null, options = {}) {
            if (btnElement) UI.Loader.show(btnElement);
            
            // Demo Mode Handler
            if (options.demoMode || config.demo_mode) {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        if (btnElement) UI.Loader.hide(btnElement);
                        const demoMsg = Util.getText(options.demoKey || 'ex_success_desc');
                        resolve({ success: true, message: demoMsg, found: false }); 
                    }, 1200);
                });
            }

            try {
                // Security Check
                const token = await Security.getToken();
                if (config.TURNSTILE_SITE_KEY && !token) {
                    throw new Error(Util.getText('ex_error_captcha'));
                }
                if (token) body['cf-turnstile-response'] = token;

                // Path Injection
                const currentPath = window.location.href.substring(0, window.location.href.lastIndexOf('/')) + '/';
                body['__assets_path'] = currentPath;

                // Determine Endpoint (Host vs Local)
                const targetUrl = config.API_HOST ? `${config.API_HOST}${endpoint}` : endpoint;

                const response = await fetch(targetUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                const result = await response.json();
                
                if (!result.success) {
                    throw new Error(result.message || Util.getText('ex_error_api'));
                }
                
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

    // [Tier 1 Lifecycle] Ready (Passive Init)
    const ready = async (siteConfig) => {
        if (isInitialized) return getExports();
        config = siteConfig || {};
        
        UI.init();
        
        // Language detection & Load
        const urlParams = new URLSearchParams(window.location.search);
        let lang = urlParams.get('lang');

        if (lang) {
            localStorage.setItem('preferredLanguage', lang);
            // Clean URL
            const newUrl = window.location.pathname + window.location.hash;
            if(history.pushState) history.pushState({ path: newUrl }, '', newUrl);
        } else {
            lang = localStorage.getItem('preferredLanguage') || config.language || document.documentElement.lang || 'en';
        }

        document.documentElement.lang = lang;
        await Data.load(lang);
        
        // Turnstile Script Injection (if needed)
        if (config.TURNSTILE_SITE_KEY) {
            if (!document.querySelector('script[src*="turnstile/v0/api.js"]')) {
                const script = document.createElement('script');
                script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback';
                script.async = true;
                script.defer = true;
                document.head.appendChild(script);
            }
            Security.init(config.TURNSTILE_SITE_KEY);
        }

        UI.Lightbox.init();
        isInitialized = true;
        
        return getExports();
    };

    const getExports = () => ({
        config,
        Util,
        UI,
        API,
        Data,
        Canvas,
        Security,
        Effects: {} // Registry for custom effects
    });

    return {
        ready, // Public Entry Point
        ...getExports() // Expose statics for convenience if needed
    };
})();