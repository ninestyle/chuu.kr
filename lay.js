/*
    Version: 3.2.0 (Standardized)
    Framework: User Configuration (Tier 3)
    Last Modified: 2025-12-05
    Theme: CHUU - Pastel Dream
*/

const siteConfig = {
    // [기본 설정]
    language: 'ko',

    // [Tier 1 Config] Demo Mode 활성화 (자동 Mocking & 데모 섹션 주입)
    demo_mode: true, 
    
    // [Tier 1 Config] API & Security (Demo 모드에서는 Mock 처리됨)
    TURNSTILE_SITE_KEY: '0x4AAAAAAABcdefg1234567', // Replace with real key
    API_ENDPOINT: './upload.php',

    // [Tier 2 Config] Canvas Header
    canvas_effect: 'heartEffect', // Custom Effect Name
    canvas_image_type: 'cover',
    canvas_image_path: './section/home/',
    canvas_image_count: 3,
    canvas_image_format: 'jpg',
    canvas_image_slide: 10,
    canvas_overlay: 'dotted',

    // [Tier 1 Config] Floating Action Buttons (Auto-Injected)
    icon_buttons: [
        { name: 'Profile', icon: 'mail', url: '#profile' },
        { name: 'Search', icon: 'search', url: '#search' },
        { name: 'Request', icon: 'auto_awesome', url: '#demo' } // Points to auto-injected demo section
    ]
};

// [커스텀 이펙트] Heart Effect (V3.2 Engine Compatible)
// 엔진은 window[effectName](canvas) 형태로 호출하므로 전역 함수로 등록합니다.
window.heartEffect = function(canvas) {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const headerElement = canvas.parentElement; // pe-header
    let width = headerElement.clientWidth;
    let height = headerElement.clientHeight;
    
    canvas.width = width;
    canvas.height = height;

    let hearts = [];
    let sparkles = [];
    let mouse = { x: null, y: null, radius: 100 };
    let animationFrameId = null;

    const heartBaseColors = [ [224, 187, 228], [255, 181, 197], [255, 244, 224], [201, 134, 150] ];
    const numberOfHearts = 40;

    // --- Helpers ---
    function drawHeartShape(x, y, size, color, rotation) {
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

    function createHearts() {
        hearts = [];
        for (let i = 0; i < numberOfHearts; i++) {
            let size = (Math.random() * 20) + 10;
            let x = Math.random() * width;
            let y = Math.random() * height;
            let directionX = (Math.random() * 0.6) - 0.3;
            let directionY = (Math.random() * 0.6) - 0.3;
            const baseColor = heartBaseColors[Math.floor(Math.random() * heartBaseColors.length)];
            const alpha = Math.random() * 0.5 + 0.3;
            
            hearts.push({
                x, y, directionX, directionY, size,
                color: `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${alpha})`,
                rotation: (Math.random() - 0.5) * 0.8,
                update: function() {
                    // Boundary wrap
                    if (this.x > width + this.size) this.x = -this.size;
                    else if (this.x < -this.size) this.x = width + this.size;
                    if (this.y > height + this.size) this.y = -this.size;
                    else if (this.y < -this.size) this.y = height + this.size;

                    // Mouse interaction
                    if (mouse.x !== null) {
                        let dx = mouse.x - this.x;
                        let dy = mouse.y - this.y;
                        let distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < mouse.radius + this.size) { 
                            this.x -= dx / 20; 
                            this.y -= dy / 20; 
                        }
                    }
                    
                    this.x += this.directionX; 
                    this.y += this.directionY;
                    drawHeartShape(this.x, this.y, this.size, this.color, this.rotation);
                }
            });
        }
    }

    // --- Events ---
    function onMouseMove(e) {
        const rect = headerElement.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    }
    
    function onMouseOut() {
        mouse.x = null;
        mouse.y = null;
    }

    function onResize() {
        width = headerElement.clientWidth;
        height = headerElement.clientHeight;
        canvas.width = width;
        canvas.height = height;
        createHearts();
    }

    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        ctx.clearRect(0, 0, width, height);
        
        hearts.forEach(h => h.update());

        // Sparkles Logic (Simplified for stability)
        if (Math.random() > 0.9) {
            sparkles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2 + 1,
                life: 1,
                update: function() {
                    this.life -= 0.03;
                    if (this.life > 0) {
                        ctx.fillStyle = `rgba(255, 255, 224, ${this.life})`;
                        ctx.fillRect(this.x, this.y, this.size, this.size);
                    }
                }
            });
        }
        
        for (let i = sparkles.length - 1; i >= 0; i--) {
            sparkles[i].update();
            if (sparkles[i].life <= 0) sparkles.splice(i, 1);
        }
    }

    // --- Init ---
    headerElement.addEventListener('mousemove', onMouseMove);
    headerElement.addEventListener('mouseout', onMouseOut);
    window.addEventListener('resize', onResize);
    
    createHearts();
    animate();
};

// [V3.2 Init] Tier 1 & 2 Engine Load
document.addEventListener('DOMContentLoaded', () => {
    if (typeof PE_V3 !== 'undefined') {
        PE_V3.init(siteConfig);
    } else {
        console.error("Express V3 Engine not found.");
    }
});