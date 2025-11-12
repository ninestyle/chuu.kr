/*
    Version: 1.19.0
    Last Modified: 2025-08-05
    Author: Maxim
    Contact: https://www.maxim.pe.kr
    License: © 2025 Maxim. All Rights Reserved.
*/
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('heart-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const mouse = {
        x: null,
        y: null,
        radius: 100
    };

    // --- 색상 정의 ---
    const heartBaseColors = [
        [224, 187, 228], // Pastel Lavender
        [255, 181, 197], // Sweet Pink
        [255, 244, 224], // Soft Cream
        [201, 134, 150]  // Dusty Rose
    ];

    // --- 객체 배열 ---
    let hearts = [];
    let sparkles = [];
    const numberOfHearts = 40;

    // --- 하트 그리기 함수 ---
    function drawHeart(x, y, size, color, rotation) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.translate(-x, -y);

        ctx.fillStyle = color;
        ctx.beginPath();
        const topCurveHeight = size * 0.3;
        ctx.moveTo(x, y + topCurveHeight);
        ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
        ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size + topCurveHeight) / 1.5, x, y + size);
        ctx.bezierCurveTo(x, y + (size + topCurveHeight) / 1.5, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
        ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    // --- 하트 클래스 ---
    class Heart {
        constructor(x, y, directionX, directionY, size, color, rotation) {
            this.x = x;
            this.y = y;
            this.directionX = directionX;
            this.directionY = directionY;
            this.size = size;
            this.color = color;
            this.rotation = rotation;
        }

        draw() {
            drawHeart(this.x, this.y, this.size, this.color, this.rotation);
        }

        update() {
            if (this.x > width + this.size || this.x < -this.size) {
                this.x = (this.directionX > 0) ? -this.size : width + this.size;
            }
            if (this.y > height + this.size || this.y < -this.size) {
                this.y = (this.directionY > 0) ? -this.size : height + this.size;
            }
            
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < mouse.radius + this.size) {
                this.x -= dx / 20;
                this.y -= dy / 20;
            }

            this.x += this.directionX;
            this.y += this.directionY;
            this.draw();
        }
    }

    // --- 별가루 클래스 ---
    class Sparkle {
        constructor(x, y, size, opacity) {
            this.x = x;
            this.y = y;
            this.size = size;
            this.life = 1;
            this.initialOpacity = opacity;
            this.opacity = opacity;
        }

        draw() {
            ctx.strokeStyle = `rgba(255, 255, 224, ${this.opacity})`;
            ctx.lineWidth = this.size;
            ctx.beginPath();
            ctx.moveTo(this.x - this.size, this.y);
            ctx.lineTo(this.x + this.size, this.y);
            ctx.moveTo(this.x, this.y - this.size);
            ctx.lineTo(this.x, this.y + this.size);
            ctx.stroke();
        }

        update() {
            this.life -= 0.03;
            this.opacity = this.life > 0 ? this.life * this.initialOpacity : 0;
            this.draw();
        }
    }

    // --- 초기화 함수 ---
    function init() {
        hearts = [];
        for (let i = 0; i < numberOfHearts; i++) {
            let size = (Math.random() * 20) + 10;
            let x = Math.random() * width;
            let y = Math.random() * height;
            let directionX = (Math.random() * 0.6) - 0.3;
            let directionY = (Math.random() * 0.6) - 0.3;
            
            const baseColor = heartBaseColors[Math.floor(Math.random() * heartBaseColors.length)];
            const alpha = Math.random() * 0.5 + 0.3;
            let color = `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${alpha})`;
            
            let rotation = (Math.random() - 0.5) * 0.8;

            hearts.push(new Heart(x, y, directionX, directionY, size, color, rotation));
        }
    }

    // --- 애니메이션 루프 ---
    function animate() {
        requestAnimationFrame(animate);
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < hearts.length; i++) {
            hearts[i].update();
        }

        if (Math.random() > 0.9) {
            let x = Math.random() * width;
            let y = Math.random() * height;
            let size = Math.random() * 2 + 1;
            let opacity = Math.random() * 0.5 + 0.5;
            sparkles.push(new Sparkle(x, y, size, opacity));
        }

        for (let i = sparkles.length - 1; i >= 0; i--) {
            sparkles[i].update();
            if (sparkles[i].life <= 0) {
                sparkles.splice(i, 1);
            }
        }
    }
    
    // --- 이벤트 리스너 ---
    window.addEventListener('mousemove', (event) => {
        mouse.x = event.x;
        mouse.y = event.y;
    });

    window.addEventListener('mouseout', () => {
        mouse.x = null;
        mouse.y = null;
    });

    window.addEventListener('resize', () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        init();
    });

    // --- 시작 ---
    init();
    animate();
});
