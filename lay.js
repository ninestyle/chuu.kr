/*
    Version: 3.3.0 (V3 Refactored)
    Framework: User Configuration (Tier 3)
    Last Modified: 2025-11-24
    Author: Maxim
    Theme: CHUU - Pastel Dream
*/

const siteConfig = {
    // [Tier 1] Core Essentials
    language: 'ko',

    // [Tier 2] Canvas & Visuals
    canvas_effect: 'heartEffect',
    canvas_image_type: 'cover',
    canvas_image_path: './section/home/',
    canvas_image_count: 3,
    canvas_image_format: 'jpg',
    canvas_image_slide: 10,
    canvas_indicators: true,
    canvas_overlay: 'dotted',

    // [Tier 2] Actions (Header Icons)
    icon_buttons: [
        { name: 'Profile', icon: 'mail', url: '#profile' },
        { name: 'Search', icon: 'search', url: '#search' },
        { name: 'Request', icon: 'auto_awesome', url: '#demo' }
    ],
    
    // [Tier 1] API & Dev
    demo_mode: true // V3.3 Standard: Activates demo API mocking
};

// [Custom Effect] Heart Effect (Ported for V3)
const heartEffect = {
    canvas: null,
    ctx: null,
    animationFrameId: null,
    hearts: [],
    sparkles: [],
    mouse: { x: null, y: null, radius: 100 },
    width: 0,
    height: 0,
    heartBaseColors: [ [224, 187, 228], [255, 181, 197], [255, 244, 224], [201, 134, 150] ],
    numberOfHearts: 40,

    init: function(headerEl) {
        this.headerElement = headerEl;
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'ex-canvas__effect'; // Use Core class
        this.ctx = this.canvas.getContext('2d');
        this.headerElement.appendChild(this.canvas); // Append to ensure it's on top of background

        this.resize();
        this.createHearts();
        
        // Bind methods
        this.boundAnimate = this.animate.bind(this);
        this.boundOnMouseMove = this.onMouseMove.bind(this);
        this.boundOnMouseOut = this.onMouseOut.bind(this);
        this.boundOnResize = this.resize.bind(this);

        this.addListeners();
        this.animate();
    },

    resize: function() {
        if (!this.headerElement || !this.canvas) return;
        this.width = this.headerElement.clientWidth;
        this.height = this.headerElement.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    },

    addListeners: function() {
        this.headerElement.addEventListener('mousemove', this.boundOnMouseMove);
        this.headerElement.addEventListener('mouseout', this.boundOnMouseOut);
        window.addEventListener('resize', this.boundOnResize);
    },

    drawHeart: function(x, y, size, color, rotation) {
        if (!this.ctx) return;
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(rotation);
        this.ctx.translate(-x, -y);
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        const topCurveHeight = size * 0.3;
        this.ctx.moveTo(x, y + topCurveHeight);
        this.ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
        this.ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size + topCurveHeight) / 1.5, x, y + size);
        this.ctx.bezierCurveTo(x, y + (size + topCurveHeight) / 1.5, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
        this.ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
    },
    
    createHearts: function() {
        this.hearts = [];
        for (let i = 0; i < this.numberOfHearts; i++) {
            this.hearts.push(this.createHeart());
        }
    },

    createHeart: function() {
        let size = (Math.random() * 20) + 10;
        let x = Math.random() * this.width;
        let y = Math.random() * this.height;
        let directionX = (Math.random() * 0.6) - 0.3;
        let directionY = (Math.random() * 0.6) - 0.3;
        const baseColor = this.heartBaseColors[Math.floor(Math.random() * this.heartBaseColors.length)];
        const alpha = Math.random() * 0.5 + 0.3;
        let color = `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${alpha})`;
        let rotation = (Math.random() - 0.5) * 0.8;
        
        return {
            x, y, directionX, directionY, size, color, rotation,
            draw: (heart) => this.drawHeart(heart.x, heart.y, heart.size, heart.color, heart.rotation),
            update: (heart) => {
                if (heart.x > this.width + heart.size || heart.x < -heart.size) { heart.x = (heart.directionX > 0) ? -heart.size : this.width + heart.size; }
                if (heart.y > this.height + heart.size || heart.y < -heart.size) { heart.y = (heart.directionY > 0) ? -heart.size : this.height + heart.size; }
                
                if (this.mouse.x !== null) {
                    let dx = this.mouse.x - heart.x;
                    let dy = this.mouse.y - heart.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < this.mouse.radius + heart.size) { 
                        heart.x -= dx / 20; 
                        heart.y -= dy / 20; 
                    }
                }
                heart.x += heart.directionX; 
                heart.y += heart.directionY;
                heart.draw(heart);
            }
        };
    },
    
    animate: function() {
        if (!this.ctx) return;
        this.animationFrameId = requestAnimationFrame(this.boundAnimate);
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        this.hearts.forEach(heart => heart.update(heart));

        // Sparkles logic
        if (Math.random() > 0.9) {
            let x = Math.random() * this.width;
            let y = Math.random() * this.height;
            let size = Math.random() * 2 + 1;
            let opacity = Math.random() * 0.5 + 0.5;
            this.sparkles.push({
                x, y, size, opacity, life: 1, initialOpacity: opacity,
                draw: (s) => {
                    this.ctx.strokeStyle = `rgba(255, 255, 224, ${s.opacity})`;
                    this.ctx.lineWidth = s.size;
                    this.ctx.beginPath();
                    this.ctx.moveTo(s.x - s.size, s.y);
                    this.ctx.lineTo(s.x + s.size, s.y);
                    this.ctx.moveTo(s.x, s.y - s.size);
                    this.ctx.lineTo(s.x, s.y + s.size);
                    this.ctx.stroke();
                },
                update: (s) => {
                    s.life -= 0.03;
                    s.opacity = s.life > 0 ? s.life * s.initialOpacity : 0;
                    s.draw(s);
                }
            });
        }
        for (let i = this.sparkles.length - 1; i >= 0; i--) {
            this.sparkles[i].update(this.sparkles[i]);
            if (this.sparkles[i].life <= 0) { this.sparkles.splice(i, 1); }
        }
    },
    
    onMouseMove: function(event) {
        if (!this.headerElement) return;
        const rect = this.headerElement.getBoundingClientRect();
        this.mouse.x = event.clientX - rect.left;
        this.mouse.y = event.clientY - rect.top;
    },
    
    onMouseOut: function() { this.mouse.x = null; this.mouse.y = null; }
};

// [Active Controller Entry Point]
document.addEventListener('DOMContentLoaded', () => {
    if (typeof PE_V3 !== 'undefined') {
        // 1. Register Custom Effect
        PE_V3.registerEffect('heartEffect', heartEffect);
        
        // 2. Initialize App with Config
        PE_V3.init(siteConfig);
    } else {
        console.error("Page Express V3 (Tier 2) not loaded.");
    }
});