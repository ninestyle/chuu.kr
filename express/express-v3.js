/*
    Express Core Engine
    Author: Maxim
    Version: 3.1.4 (Turnstile Style Refactor)
    Last Modified: 2025-11-24
    License: © 2025 Maxim. All Rights Reserved.
*/
const Express = (() => {
    'use strict';

    let config = {};
    let langData = {};
    let isInitialized = false;
    let currentLang = 'en';

    const FALLBACK_MSGS = {
        ex_error_network: "Network Error",
        ex_error_unknown: "Unknown Error",
        ex_btn_confirm: "OK",
        ex_btn_cancel: "Cancel"
    };

    // [Tier 1] Common Utilities
    const Util = {
        // DOM Selector Wrapper
        $(selector, parent = document) {
            return parent.querySelector(selector);
        },
        $$(selector, parent = document) {
            return parent.querySelectorAll(selector);
        },

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
            return langData[key] ? this.processText(langData[key]) : (FALLBACK_MSGS[key] || key);
        },

        // [New] Cooldown Manager (Spam Prevention)
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

        // [New] Slider Logic (Logic Only)
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
            if (!document.getElementById('ex-core-css')) {
                const link = document.createElement('link');
                link.id = 'ex-core-css';
                link.rel = 'stylesheet';
                link.href = 'https://cdn.9style.com/_inc/express/express-v3.css';
                document.head.appendChild(link);
            }
        },

        initDemoLinks() {
            document.addEventListener('click', (e) => {
                if (e.target.closest('.js-demo-link')) {
                    e.preventDefault();
                    const link = e.target.closest('.js-demo-link');
                    const href = link.getAttribute('href');
                    
                    const warningMsg = Util.getText('ex_demo_link_warning');
                    const title = Util.getText('ex_demo_title') || 'Notice';

                    this.Modal.show(
                        title,
                        warningMsg,
                        { type: 'confirm' }
                    ).then((confirm) => {
                        if (confirm && href && href !== '#') {
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
                    // Create loader only if not exists
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
                overlay.className = `ex-canvas__overlay ex-canvas__overlay--${options.overlay === true ? 'dotted' : options.overlay}`;
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

            if (options.effect && typeof window[options.effect] === 'function') {
                const effectCanvas = document.createElement('canvas');
                effectCanvas.className = 'ex-canvas__effect';
                canvasLayer.appendChild(effectCanvas);
                window[options.effect](effectCanvas);
            } else if (options.effect && Express.Effects && Express.Effects[options.effect]) {
                 const effectCanvas = document.createElement('canvas');
                 effectCanvas.className = 'ex-canvas__effect';
                 canvasLayer.appendChild(effectCanvas);
                 Express.Effects[options.effect].init(canvasLayer);
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
            return `${options.image_path}${num}.${fmt}`;
        }
    };

    const Data = {
        async load(userLang) {
            currentLang = userLang;
            const coreUrl = 'https://cdn.9style.com/_inc/express/express-v3.json';
            const userUrl = './lang.json';

            try {
                const [coreRes, userRes] = await Promise.all([
                    fetch(coreUrl).catch(() => null),
                    fetch(userUrl).catch(() => null)
                ]);

                const coreJson = coreRes && coreRes.ok ? await coreRes.json() : {};
                const userJson = userRes && userRes.ok ? await userRes.json() : {};

                const coreDefault = coreJson['_default'] || {};
                const coreLang = coreJson[currentLang] || coreJson['en'] || {};
                const userLangData = userJson[currentLang] || userJson['en'] || {};
                const userDefault = userJson['_default'] || {};

                langData = { ...coreDefault, ...coreLang, ...userDefault, ...userLangData };
                
                return langData;

            } catch (e) {
                console.error('Express Data Load Error:', e);
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
            window.onloadTurnstileCallback = () => this.render(siteKey);
            if (typeof turnstile !== 'undefined') this.render(siteKey);
        },

        render(siteKey) {
            if (this.widgetId) return;
            const container = document.createElement('div');
            container.id = 'turnstile-container';
            document.body.appendChild(container);

            try {
                this.widgetId = turnstile.render('#turnstile-container', {
                    sitekey: siteKey,
                    size: 'invisible'
                });
            } catch (e) {
                console.warn('Turnstile render failed:', e);
            }
        },

        async getToken() {
            // 1. Wait for Turnstile API to load (Max 3s)
            let retries = 0;
            while (typeof turnstile === 'undefined' && retries < 30) {
                await new Promise(r => setTimeout(r, 100));
                retries++;
            }
            
            // 2. Wait for Widget to initialize/render (Max 3s)
            retries = 0;
            while (!this.widgetId && retries < 30) {
                await new Promise(r => setTimeout(r, 100));
                retries++;
            }

            if (!this.widgetId && typeof turnstile !== 'undefined') {
                // Try render again if missing
                console.warn('Turnstile widget not found, attempting re-render...');
                this.render(config.TURNSTILE_SITE_KEY);
                await new Promise(r => setTimeout(r, 500)); // Wait a bit
            }

            if (!this.widgetId) {
                console.error('Turnstile widget failed to initialize.');
                return null; 
            }
            
            return new Promise((resolve, reject) => {
                try {
                    turnstile.execute(this.widgetId, {
                        callback: (token) => resolve(token),
                        'error-callback': () => {
                            console.error('Turnstile execution error');
                            reject(new Error(Util.getText('ex_error_captcha')));
                        }
                    });
                } catch (e) {
                    console.error('Turnstile execution exception:', e);
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
            
            if (options.demoMode) {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        if (btnElement) UI.Loader.hide(btnElement);
                        const demoMsg = Util.getText(options.demoKey || 'ex_contact_success_demo');
                        resolve({ success: true, message: demoMsg, found: false }); 
                    }, 1500);
                });
            }

            try {
                const token = await Security.getToken();
                if (config.TURNSTILE_SITE_KEY && !token) {
                    throw new Error(Util.getText('ex_error_captcha'));
                }

                if (token) body['cf-turnstile-response'] = token;

                const currentPath = window.location.href.substring(0, window.location.href.lastIndexOf('/')) + '/';
                body['__assets_path'] = currentPath;

                const response = await fetch(endpoint, {
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

    const init = async (siteConfig) => {
        if (isInitialized) return;
        config = siteConfig || {};
        
        UI.init();
        
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
        
        if (config.TURNSTILE_SITE_KEY) {
            const script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback';
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
            Security.init(config.TURNSTILE_SITE_KEY);
        }

        UI.Lightbox.init();
        isInitialized = true;
        
        return {
            config,
            Util,
            UI,
            API,
            Data,
            Canvas,
            Security,
            Effects: {}
        };
    };

    return {
        init,
        UI,
        Util,
        API,
        Data,
        Canvas
    };
})();