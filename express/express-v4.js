/*
    Version: Express 4.7.0 (Fix: File Validation Visuals)
    Last Modified: 2025-12-09 15:55:00 (KST)
    File Name: express-v4.js
    Author: Maxim
    License: © 2025 Maxim. All Rights Reserved.
*/
const Express = (() => {
    'use strict';

    let config = {};
    let langData = {};
    let isInitialized = false;

    const FALLBACK_MSGS = {
        ex_error_network: "Network Error",
        ex_error_unknown: "Unknown Error",
        ex_error_required: "Please fill in all required fields.",
        ex_btn_confirm: "OK",
        ex_btn_cancel: "Cancel"
    };

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

        // [Centralized Error Class Management for Inputs]
        checkRequired(formElement) {
            let isValid = true;
            const requiredElements = formElement.querySelectorAll('[required]');
            
            requiredElements.forEach(el => {
                let isFilled = false;
                
                if (el.type === 'checkbox' || el.type === 'radio') {
                    isFilled = el.checked;
                } else if (el.tagName === 'SELECT') {
                    isFilled = el.value && el.value.trim() !== '';
                } else {
                    isFilled = el.value && el.value.trim() !== '';
                }

                if (!isFilled) {
                    isValid = false;
                    el.classList.add('has-error');
                    
                    const eventType = (el.type === 'checkbox' || el.type === 'radio' || el.tagName === 'SELECT') ? 'change' : 'input';
                    el.addEventListener(eventType, function removeError() {
                        if (
                            (this.type === 'checkbox' && this.checked) || 
                            (this.type !== 'checkbox' && this.value.trim() !== '')
                        ) {
                            this.classList.remove('has-error');
                            this.removeEventListener(eventType, removeError);
                        }
                    });
                }
            });

            if (!isValid) {
                UI.Toast.show(this.getText('ex_error_required'), 'error');
            }

            return isValid;
        },
        
        // [New] Universal Error Class Toggle for Containers (e.g., File Wrapper)
        toggleErrorClass(element, shouldShowError) {
            if (!element) return;
            if (shouldShowError) {
                element.classList.add('has-error');
            } else {
                element.classList.remove('has-error');
            }
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
        },

        sanitize(input) {
            if (typeof input !== 'string') return input;
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;',
                "/": '&#x2F;'
            };
            const reg = /[&<>"'/]/ig;
            return input.replace(reg, (match) => (map[match]));
        },

        cleanData(data) {
            if (data instanceof FormData) {
                const cleanFD = new FormData();
                for (const [key, value] of data.entries()) {
                    if (typeof value === 'string') {
                        cleanFD.append(key, this.sanitize(value));
                    } else {
                        cleanFD.append(key, value);
                    }
                }
                return cleanFD;
            } else if (typeof data === 'object' && data !== null) {
                const cleanObj = {};
                for (const key in data) {
                    if (typeof data[key] === 'string') {
                        cleanObj[key] = this.sanitize(data[key]);
                    } else {
                        cleanObj[key] = data[key];
                    }
                }
                return cleanObj;
            }
            return data;
        }
    };

    const Validation = {
        LIMITS: {
            INPUT: 100,
            TEXTAREA: 5000
        },

        init() {
            const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea');
            inputs.forEach(el => this.applyLimits(el));
        },

        applyLimits(el) {
            const isTextarea = el.tagName === 'TEXTAREA';
            const max = isTextarea ? this.LIMITS.TEXTAREA : this.LIMITS.INPUT;

            const currentMax = parseInt(el.getAttribute('maxlength'));
            if (!currentMax || currentMax > max) {
                el.setAttribute('maxlength', max);
            }

            if (isTextarea) {
                this.injectCounter(el, max);
            }
        },

        injectCounter(textarea, max) {
            if (textarea.nextElementSibling && textarea.nextElementSibling.classList.contains('ex-counter')) return;

            const counter = document.createElement('div');
            counter.className = 'ex-counter';
            counter.innerText = `0 / ${max}`;
            
            textarea.parentNode.insertBefore(counter, textarea.nextSibling);

            textarea.addEventListener('input', () => {
                const len = textarea.value.length;
                counter.innerText = `${len} / ${max}`;
                
                if (len >= max) {
                    counter.classList.add('is-limit');
                    counter.classList.remove('is-warning');
                } else if (len >= max * 0.9) {
                    counter.classList.add('is-warning');
                    counter.classList.remove('is-limit');
                } else {
                    counter.classList.remove('is-warning', 'is-limit');
                }
            });
        }
    };

    const UI = {
        init() {
            this.initDemoLinks();
            this.checkResolution();
            this.enforceAutocompleteOff();
            window.addEventListener('resize', () => this.checkResolution());
        },
        
        enforceAutocompleteOff() {
            const inputs = document.querySelectorAll('input:not([autocomplete])');
            inputs.forEach(input => {
                input.setAttribute('autocomplete', 'off');
            });
        },

        checkResolution() {
            const minW = 300, minH = 400;
            const isSmall = window.innerWidth < minW || window.innerHeight < minH;
            let warning = document.getElementById('fullscreen-warning');

            if (isSmall) {
                if (!warning) {
                    warning = document.createElement('div');
                    warning.id = 'fullscreen-warning';
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

        apply() {
            Util.$$('[data-lang]').forEach(el => {
                const key = el.dataset.lang;
                const text = Util.getText(key);
                if (text && text !== key) el.innerText = text;
            });

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

            if (options.image_count > 0 && options.image_path && options.image_type !== 'none') {
                if (options.image_slide > 0 && options.image_count > 1) {
                    this.initSlideshow(canvasLayer, options);
                } else {
                    this.initStaticImage(canvasLayer, options);
                }
            }

            const effectName = options.effect;
            if (effectName) {
                const effectCanvas = document.createElement('canvas');
                effectCanvas.className = 'ex-canvas__effect';
                canvasLayer.appendChild(effectCanvas);
                
                if (Express.Effects && Express.Effects[effectName]) {
                    Express.Effects[effectName].init(canvasLayer);
                } 
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
            const slideWrapper = document.createElement('div');
            slideWrapper.className = 'ex-canvas__slider';
            const slides = [document.createElement('img'), document.createElement('img')];
            slides.forEach(img => {
                img.className = 'ex-canvas__slide';
                slideWrapper.appendChild(img);
            });
            layer.appendChild(slideWrapper);
        
            const indicatorWrapper = document.createElement('div');
            indicatorWrapper.className = 'ex-canvas__indicators';
            const indicators = [];
            
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

    const API = {
        async post(endpoint, body, btnElement = null, options = {}) {
            if (btnElement && btnElement.disabled) return;

            if (btnElement) UI.Loader.show(btnElement);

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
                if (config.TURNSTILE_SITE_KEY) {
                    const token = await Security.getToken();
                    if (!token) throw new Error(Util.getText('ex_error_captcha'));
                    if (body instanceof FormData) {
                        body.append('cf-turnstile-response', token);
                    } else {
                        body['cf-turnstile-response'] = token;
                    }
                }

                const currentPath = window.location.href.substring(0, window.location.href.lastIndexOf('/')) + '/';
                if (body instanceof FormData) {
                    body.append('__assets_path', currentPath);
                } else {
                    body['__assets_path'] = currentPath;
                }

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
                    body: body instanceof FormData ? body : JSON.stringify(body)
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

    const init = async (siteConfig) => {
        if (isInitialized) return;
        config = siteConfig || {};
        
        UI.init();
        
        Validation.init();
        
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

    return { init, UI, Util, API, Data, Canvas, Effects: {} };
})();