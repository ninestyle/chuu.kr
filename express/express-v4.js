/*
    Tier 1: Express Core Engine
    Version: 4.0.0 (Migration Build)
    Role: Facility (Infrastructure, API, UI, Canvas Core)
    Last Modified: 2025-12-07
    License: © 2025 Maxim. All Rights Reserved.
*/

const Express = (() => {
    'use strict';

    let config = {};
    let langData = {};
    let isInitialized = false;
    
    // [System Defaults]
    const FALLBACK_MSGS = {
        ex_error_network: "Network Error",
        ex_error_unknown: "Unknown Error",
        ex_btn_confirm: "OK",
        ex_btn_cancel: "Cancel"
    };

    // -------------------------------------------------------------------------
    // 1. Utilities (Facility Tools)
    // -------------------------------------------------------------------------
    const Util = {
        // DOM Selector
        $(selector, parent = document) { return parent.querySelector(selector); },
        $$(selector, parent = document) { return parent.querySelectorAll(selector); },

        // Domain & Environment Info
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
                // Remove index.html and trailing slashes for clean path
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

        // Text Processing (Variable Injection)
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

        // Cooldown Factory (Spam Prevention)
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

        // Array Shuffler
        createShuffleList(count) {
            const list = Array.from({ length: count }, (_, i) => i + 1);
            for (let i = list.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [list[i], list[j]] = [list[j], list[i]];
            }
            return list;
        }
    };

    // -------------------------------------------------------------------------
    // 2. UI Components (Visual Ingredients)
    // -------------------------------------------------------------------------
    const UI = {
        init() {
            this.initDemoLinks();
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
                    if (options.type === 'confirm' || options.type === 'yesno') {
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
                        if (action) close(action === 'confirm' || action === 'close');
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
                overlay.innerHTML = `<div class="ex-lightbox__content"><img src="${src}"><span class="ex-lightbox__close">&times;</span></div>`;
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

    // -------------------------------------------------------------------------
    // 3. Canvas Engine (Visual Core)
    // -------------------------------------------------------------------------
    const Canvas = {
        init(container, options = {}) {
            if (!container) return;
            
            // Layer Setup
            let canvasLayer = container.querySelector('.ex-canvas');
            if (!canvasLayer) {
                canvasLayer = document.createElement('div');
                canvasLayer.className = 'ex-canvas';
                container.prepend(canvasLayer);
            } else {
                canvasLayer.innerHTML = '';
            }

            // 1. Overlay Pattern
            if (options.overlay) {
                const overlay = document.createElement('div');
                // Support both boolean true (dotted) and specific string
                const overlayType = options.overlay === true ? 'dotted' : options.overlay;
                if (overlayType && overlayType !== 'none') {
                    overlay.className = `ex-canvas__overlay ex-canvas__overlay--${overlayType}`;
                    canvasLayer.appendChild(overlay);
                }
            }

            // 2. Background Media (Image/Slider)
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

            // 3. Effect Engine
            const effectName = options.effect;
            if (effectName && effectName !== 'none') {
                const effectCanvas = document.createElement('canvas');
                effectCanvas.className = 'ex-canvas__effect';
                canvasLayer.appendChild(effectCanvas);
                
                // Priority: Window Global (Tier 3) -> Express.Effects (Tier 1 Registry) -> Internal
                if (typeof window[effectName] === 'function') {
                    window[effectName](effectCanvas); // Legacy function style
                } else if (typeof window[effectName] === 'object' && window[effectName].init) {
                     window[effectName].init(canvasLayer); // Tier 3 Object style
                } else if (Express.Effects && Express.Effects[effectName]) {
                     Express.Effects[effectName].init(canvasLayer); // Tier 1 Registry
                } else if (effectName === 'particle') {
                     this.Effects.particle(effectCanvas); // Internal Default
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
        },

        // Internal Effects
        Effects: {
            particle(canvas) {
                const ctx = canvas.getContext('2d');
                let width, height, particles = [];

                const resize = () => {
                    width = canvas.width = canvas.parentElement.clientWidth;
                    height = canvas.height = canvas.parentElement.clientHeight;
                };

                class Particle {
                    constructor() {
                        this.reset();
                    }
                    reset() {
                        this.x = Math.random() * width;
                        this.y = Math.random() * height;
                        this.size = Math.random() * 2;
                        this.speedX = (Math.random() - 0.5) * 0.5;
                        this.speedY = (Math.random() - 0.5) * 0.5;
                        this.opacity = Math.random() * 0.5;
                        this.fade = Math.random() > 0.5 ? 0.005 : -0.005;
                    }
                    update() {
                        this.x += this.speedX;
                        this.y += this.speedY;
                        this.opacity += this.fade;

                        if (this.opacity <= 0 || this.opacity >= 0.5) this.fade = -this.fade;
                        if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) this.reset();
                    }
                    draw() {
                        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                const initParticles = () => {
                    particles = [];
                    for (let i = 0; i < 50; i++) particles.push(new Particle());
                };

                const animate = () => {
                    ctx.clearRect(0, 0, width, height);
                    particles.forEach(p => { p.update(); p.draw(); });
                    requestAnimationFrame(animate);
                };

                window.addEventListener('resize', resize);
                resize();
                initParticles();
                animate();
            }
        }
    };

    // -------------------------------------------------------------------------
    // 4. Data & Logic (i18n, API, Security)
    // -------------------------------------------------------------------------
    const Data = {
        async load(userLang) {
            // [V4 Protocol] 1. URL -> 2. Storage -> 3. Navigator -> 4. Config Default
            
            // Core Data (System) + User Data (Tier 3)
            const coreUrl = './express/express-v4.json';
            const userUrl = './lang.json';

            try {
                const [coreRes, userRes] = await Promise.all([
                    fetch(coreUrl).catch(() => null),
                    fetch(userUrl).catch(() => null)
                ]);

                const coreJson = coreRes && coreRes.ok ? await coreRes.json() : {};
                const userJson = userRes && userRes.ok ? await userRes.json() : {};

                // Merge: Core Default -> Core Lang -> User Default -> User Lang
                const coreDefault = coreJson['_default'] || {};
                const coreLang = coreJson[userLang] || coreJson['en'] || {};
                const userLangData = userJson[userLang] || userJson['en'] || {};
                const userDefault = userJson['_default'] || {};

                langData = { ...coreDefault, ...coreLang, ...userDefault, ...userLangData };
                
                return langData;

            } catch (e) {
                console.error('Express Data Load Error:', e);
                langData = FALLBACK_MSGS;
                return langData;
            }
        },
        get() { return langData; }
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
            // Ensure container exists
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
                console.warn('Turnstile render failed (script might be loading):', e);
            }
        },

        async getToken() {
            // Wait for Turnstile ready
            let retries = 0;
            while (typeof turnstile === 'undefined' && retries < 30) {
                await new Promise(r => setTimeout(r, 100));
                retries++;
            }
            
            if (!this.widgetId && typeof turnstile !== 'undefined' && config.TURNSTILE_SITE_KEY) {
                this.render(config.TURNSTILE_SITE_KEY);
                await new Promise(r => setTimeout(r, 500));
            }

            if (!this.widgetId) {
                // If not configured, return null (skip)
                if (!config.TURNSTILE_SITE_KEY) return null;
                console.error('Turnstile widget failed to initialize.');
                return null; 
            }
            
            return new Promise((resolve, reject) => {
                try {
                    turnstile.execute(this.widgetId, {
                        callback: (token) => resolve(token),
                        'error-callback': () => reject(new Error(Util.getText('ex_error_captcha')))
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
        // V4: Type A (Worker) or Type B (Custom) or Demo
        async post(endpointKey, body, btnElement = null, options = {}) {
            if (btnElement) UI.Loader.show(btnElement);
            
            // 1. Demo Mode Check
            if (options.demoMode || config.demo_mode) {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        if (btnElement) UI.Loader.hide(btnElement);
                        const demoMsg = Util.getText(options.demoKey || 'ex_success_demo');
                        resolve({ success: true, message: demoMsg, found: false }); 
                    }, 1000);
                });
            }

            try {
                // 2. Security Check (Turnstile)
                const token = await Security.getToken();
                if (config.TURNSTILE_SITE_KEY && !token) {
                    throw new Error(Util.getText('ex_error_captcha'));
                }
                if (token) body['cf-turnstile-response'] = token;

                // 3. Resolve Endpoint
                let url;
                if (config.API_HOST) {
                    // Type A: Cloudflare Workers Standard
                    url = `${config.API_HOST.replace(/\/$/, '')}/api/${endpointKey}`;
                } else if (config.API_ENDPOINT) {
                    // Type B: Custom Backend (Direct)
                    url = config.API_ENDPOINT;
                    body['__action'] = endpointKey; // Tell backend what to do
                } else {
                    throw new Error("Configuration Error: API_HOST or API_ENDPOINT missing.");
                }

                // Append Context
                body['__assets_path'] = window.location.href.substring(0, window.location.href.lastIndexOf('/')) + '/';

                const response = await fetch(url, {
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

    // -------------------------------------------------------------------------
    // 5. Initialization
    // -------------------------------------------------------------------------
    const init = async (siteConfig) => {
        if (isInitialized) return;
        config = siteConfig || {};
        
        UI.init();
        
        // Language Logic
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
        
        // Security Init
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
            Effects: {} // Registry for Tier 3 effects
        };
    };

    return {
        init,
        UI,
        Util,
        API,
        Data,
        Canvas,
        Effects: {}
    };
})();