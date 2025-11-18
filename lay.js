/*
    Version: 2.2.1
    Last Modified: 2025-11-18
    Author: Maxim
    License: © 2025 Maxim. All Rights Reserved.
*/

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
    boundAnimate: null,
    boundOnMouseMove: null,
    boundOnMouseOut: null,
    boundOnResize: null,

    init: function(headerEl) {
        this.headerElement = headerEl;
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'ce-bg-canvas';
        this.ctx = this.canvas.getContext('2d');
        this.headerElement.prepend(this.canvas);

        this.width = this.headerElement.clientWidth;
        this.height = this.headerElement.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.boundAnimate = this.animate.bind(this);
        this.boundOnMouseMove = this.onMouseMove.bind(this);
        this.boundOnMouseOut = this.onMouseOut.bind(this);
        this.boundOnResize = this.onResize.bind(this);
        
        this.createHearts();
        this.addListeners();
        this.animate();
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
            let size = (Math.random() * 20) + 10;
            let x = Math.random() * this.width;
            let y = Math.random() * this.height;
            let directionX = (Math.random() * 0.6) - 0.3;
            let directionY = (Math.random() * 0.6) - 0.3;
            const baseColor = this.heartBaseColors[Math.floor(Math.random() * this.heartBaseColors.length)];
            const alpha = Math.random() * 0.5 + 0.3;
            let color = `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${alpha})`;
            let rotation = (Math.random() - 0.5) * 0.8;
            
            this.hearts.push({
                x, y, directionX, directionY, size, color, rotation,
                draw: () => {
                    this.drawHeart(this.x, this.y, this.size, this.color, this.rotation);
                },
                update: () => {
                    if (this.x > this.width + this.size || this.x < -this.size) { this.x = (this.directionX > 0) ? -this.size : this.width + this.size; }
                    if (this.y > this.height + this.size || this.y < -this.size) { this.y = (this.directionY > 0) ? -this.size : this.height + this.size; }
                    
                    if (this.mouse.x !== null) {
                        let dx = this.mouse.x - this.x;
                        let dy = this.mouse.y - this.y;
                        let distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < this.mouse.radius + this.size) { 
                            this.x -= dx / 20; 
                            this.y -= dy / 20; 
                        }
                    }
                    
                    this.x += this.directionX; 
                    this.y += this.directionY;
                    this.draw();
                }
            });
        }
    },
    
    animate: function() {
        if (!this.ctx) return;
        this.animationFrameId = requestAnimationFrame(this.boundAnimate);
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        this.hearts.forEach(heart => heart.update.call(heart));

        if (Math.random() > 0.9) {
            let x = Math.random() * this.width;
            let y = Math.random() * this.height;
            let size = Math.random() * 2 + 1;
            let opacity = Math.random() * 0.5 + 0.5;
            this.sparkles.push({
                x, y, size, opacity, life: 1,
                initialOpacity: opacity,
                draw: () => {
                    if (!this.ctx) return;
                    this.ctx.strokeStyle = `rgba(255, 255, 224, ${this.opacity})`;
                    this.ctx.lineWidth = this.size;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.x - this.size, this.y);
                    this.ctx.lineTo(this.x + this.size, this.y);
                    this.ctx.moveTo(this.x, this.y - this.size);
                    this.ctx.lineTo(this.x, this.y + this.size);
                    this.ctx.stroke();
                },
                update: () => {
                    this.life -= 0.03;
                    this.opacity = this.life > 0 ? this.life * this.initialOpacity : 0;
                    this.draw();
                }
            });
        }

        for (let i = this.sparkles.length - 1; i >= 0; i--) {
            this.sparkles[i].update.call(this.sparkles[i]);
            if (this.sparkles[i].life <= 0) { this.sparkles.splice(i, 1); }
        }
    },
    
    onMouseMove: function(event) {
        if (!this.headerElement) return;
        const rect = this.headerElement.getBoundingClientRect();
        this.mouse.x = event.clientX - rect.left;
        this.mouse.y = event.clientY - rect.top;
    },
    
    onMouseOut: function() {
        this.mouse.x = null;
        this.mouse.y = null;
    },

    onResize: function() {
        if (!this.headerElement || !this.canvas) return;
        this.width = this.headerElement.clientWidth;
        this.height = this.headerElement.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.createHearts();
    },

    destroy: function() {
        cancelAnimationFrame(this.animationFrameId);
        this.headerElement.removeEventListener('mousemove', this.boundOnMouseMove);
        this.headerElement.removeEventListener('mouseout', this.boundOnMouseOut);
        window.removeEventListener('resize', this.boundOnResize);
        if (this.canvas) this.canvas.remove();
        this.hearts = [];
        this.sparkles = [];
    }
};

const siteConfig = {
    canvas_effect: 'heartEffect',
    canvas_image_type: 'cover',
    canvas_image_count: 3,
    canvas_image_path: './section/home/',
    canvas_image_format: 'jpg',
    canvas_indicators: true,
    canvas_overlay: 'dotted',

    icon_buttons: [
        { name: 'Profile', icon: 'mail', url: '#profile' },
        { name: 'Request', icon: 'auto_awesome', url: '#request' }
    ],

    TURNSTILE_SITE_KEY: '0x4AAAAAAACBUaQ2J0vXkPSAt'
};

document.addEventListener('DOMContentLoaded', () => {
    PE_V2.registerEffect('heartEffect', heartEffect);
    PE_V2.init(siteConfig);
});