<template>
    <div class="mobile-container">
        <div class="app-card">
            <h1 class="app-title">AI 魔法衣橱</h1>

            <div class="canvas-wrapper" :style="{ height: containerHeight + 'px' }">
                <input v-if="!imageUrl" type="file" accept="image/*" @change="handleImageUpload" class="file-input" />
                <img v-if="imageUrl" :src="imageUrl" ref="uploadedImage" class="preview-img" @load="onImageLoad" />
                <button v-if="imageUrl && !isProcessing" @click="resetAll" class="reset-photo-btn">✕</button>

                <div v-if="!imageUrl" class="upload-placeholder">
                    <div class="plus-icon">+</div>
                    <p>点击上传模特照片</p>
                    <p class="sub-tip">上传后在衣服位置进行涂抹</p>
                </div>

                <canvas ref="drawingCanvas" class="drawing-canvas" @mousedown="startDrawing" @mousemove="draw" @mouseup="endDrawing" @mouseleave="endDrawing" @touchstart.prevent="startDrawing" @touchmove.prevent="draw" @touchend.prevent="endDrawing">
                </canvas>
            </div>

            <div class="control-panel">
                <div class="tool-box">
                    <div class="tool-header">
                        <span class="label">画笔粗细: <strong>{{ brushSize }}px</strong></span>
                        <button @click="clearCanvas" class="btn-clear">重新涂抹</button>
                    </div>
                    <input type="range" v-model.number="brushSize" min="5" max="80" class="slider" />

                    <div style="margin-top:15px">
                        <span class="label">生成步数 (Steps): <strong>{{ steps }}</strong></span>
                        <input type="range" v-model.number="steps" min="10" max="100" step="1" class="slider" />
                    </div>
                    <div style="margin-top:15px">
                        <span class="label">重绘强度 (Strength): <strong>{{ strength }}</strong></span>
                        <input type="range" v-model.number="strength" min="0.1" max="1.0" step="0.05" class="slider" />
                    </div>
                    <div style="margin-top:15px">
                        <span class="label">听话程度 (Guidance): <strong>{{ guidanceScale }}</strong></span>
                        <input type="range" v-model.number="guidanceScale" min="1" max="15" step="0.5" class="slider" />
                    </div>
                </div>

                <div class="input-box">
                    <label class="label">新衣服描述 (Prompt)</label>
                    <textarea v-model="prompt" placeholder="例如：一条红色的丝绸连衣裙..." class="text-area"></textarea>
                </div>

                <div v-if="isProcessing" class="progress-section" style="margin-bottom: 10px;">
                    <div class="progress-container">
                        <div class="progress-bar" :style="{ width: progress + '%' }"></div>
                        <span class="progress-text">魔法进度: {{ progress }}%</span>
                    </div>
                </div>

                <button @click="handleStartMagic" :disabled="!imageUrl || !prompt || isProcessing" class="submit-btn">
                    {{ isProcessing ? 'AI 正在缝制...' : '开始魔法换装' }}
                </button>
            </div>

            <div v-if="resultImageUrl" class="result-section">
                <p class="result-title">✨ 换装完成</p>
                <img :src="resultImageUrl" class="result-img" />
            </div>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            imageUrl: '', resultImageUrl: '', prompt: '', brushSize: 30,
            isDrawing: false, isProcessing: false, ctx: null, containerHeight: 320,
            // 进度变量
            progress: 0,
            // 滑块变量
            steps: 30, strength: 0.85, guidanceScale: 7.5
        };
    },
    methods: {
        handleImageUpload(e) {
            const file = e.target.files[0];
            if (file) { this.imageUrl = URL.createObjectURL(file); this.resultImageUrl = ''; this.clearCanvas(); }
        },
        resetAll() { this.imageUrl = ''; this.resultImageUrl = ''; this.prompt = ''; this.clearCanvas(); this.containerHeight = 320; this.progress = 0; },
        onImageLoad() {
            const img = this.$refs.uploadedImage;
            const canvas = this.$refs.drawingCanvas;
            this.containerHeight = img.clientHeight;
            this.$nextTick(() => {
                this.ctx = canvas.getContext('2d');
                canvas.width = img.clientWidth; canvas.height = img.clientHeight;
                this.ctx.lineCap = 'round'; this.ctx.lineJoin = 'round';
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            });
        },
        getCoordinates(e) {
            const rect = this.$refs.drawingCanvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: clientX - rect.left, y: clientY - rect.top };
        },
        startDrawing(e) { if (!this.imageUrl) return; this.isDrawing = true; const pos = this.getCoordinates(e); this.ctx.beginPath(); this.ctx.moveTo(pos.x, pos.y); },
        draw(e) { if (!this.isDrawing) return; const pos = this.getCoordinates(e); this.ctx.lineWidth = this.brushSize; this.ctx.lineTo(pos.x, pos.y); this.ctx.stroke(); },
        endDrawing() { this.isDrawing = false; },
        clearCanvas() { if (this.ctx) this.ctx.clearRect(0, 0, this.$refs.drawingCanvas.width, this.$refs.drawingCanvas.height); },

        handleStartMagic() {
            this.isProcessing = true;
            this.progress = 0;

            // 【核心：定时轮询后端进度】
            const progressTimer = setInterval(() => {
                fetch(`http://127.0.0.1:5000/api/progress?t=${Date.now()}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.progress > this.progress) {
                            this.progress = data.progress;
                        }
                    })
                    .catch(err => console.error("轮询失败", err));
            }, 600); // 每 0.6 秒问一次

            const img = this.$refs.uploadedImage;
            const canvas512 = document.createElement('canvas');
            canvas512.width = 512; canvas512.height = 512;
            canvas512.getContext('2d').drawImage(img, 0, 0, 512, 512);

            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = 512; maskCanvas.height = 512;
            const mCtx = maskCanvas.getContext('2d');
            mCtx.fillStyle = 'black'; mCtx.fillRect(0, 0, 512, 512);
            mCtx.strokeStyle = 'white'; mCtx.lineCap = 'round';
            const scale = 512 / this.$refs.drawingCanvas.width;
            mCtx.scale(scale, scale);
            mCtx.drawImage(this.$refs.drawingCanvas, 0, 0);

            fetch('http://127.0.0.1:5000/api/inpaint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: canvas512.toDataURL('image/png'),
                    mask: maskCanvas.toDataURL('image/png'),
                    prompt: this.prompt,
                    steps: this.steps,
                    strength: this.strength,
                    guidance: this.guidanceScale
                })
            })
                .then(res => res.json())
                .then(data => {
                    clearInterval(progressTimer); // 停掉轮询
                    this.progress = 100;
                    this.isProcessing = false;
                    if (data.status === 'success') { this.resultImageUrl = data.image; }
                })
                .catch(err => {
                    clearInterval(progressTimer);
                    this.isProcessing = false;
                    alert('连接后端失败');
                });
        }
    }
};
</script>

<style scoped>
/* 保持你的原始样式，仅补充进度条部分 */
.mobile-container {
    background-color: #0f172a;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    padding: 20px 10px;
    box-sizing: border-box;
    font-family: sans-serif;
}
.app-card {
    width: 100%;
    max-width: 500px;
}
.app-title {
    color: #ffffff;
    font-size: 24px;
    text-align: center;
    margin-bottom: 20px;
}
.canvas-wrapper {
    position: relative;
    width: 100%;
    background-color: #1e293b;
    border-radius: 16px;
    overflow: hidden;
    border: 2px solid #334155;
}
.reset-photo-btn {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 60;
    background: rgba(239, 68, 68, 0.9);
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    cursor: pointer;
}
.file-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    z-index: 50;
    cursor: pointer;
}
.preview-img {
    display: block;
    width: 100%;
    height: auto;
}
.drawing-canvas {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 40;
    touch-action: none;
}
.upload-placeholder {
    height: 320px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
}
.plus-icon {
    font-size: 50px;
}
.control-panel {
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    gap: 15px;
}
.tool-box,
.input-box {
    background-color: #1e293b;
    padding: 15px;
    border-radius: 12px;
    border: 1px solid #334155;
}
.label {
    font-size: 14px;
    color: #94a3b8;
}
.btn-clear {
    background: rgba(248, 113, 113, 0.1);
    color: #f87171;
    border: none;
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 12px;
    cursor: pointer;
}
.slider {
    width: 100%;
    height: 6px;
    background: #0f172a;
    border-radius: 3px;
    appearance: none;
}
.slider::-webkit-slider-thumb {
    appearance: none;
    width: 18px;
    height: 18px;
    background: #3b82f6;
    border-radius: 50%;
    border: 2px solid #fff;
}
.text-area {
    width: 100%;
    box-sizing: border-box;
    background-color: #0f172a;
    border: 1px solid #334155;
    color: #fff;
    padding: 12px;
    border-radius: 8px;
    min-height: 80px;
    resize: none;
}
.submit-btn {
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
    padding: 16px;
    border-radius: 12px;
    border: none;
    font-weight: bold;
    width: 100%;
    cursor: pointer;
}

/* 进度条样式 */
.progress-container {
    width: 100%;
    height: 18px;
    background: #0f172a;
    border-radius: 9px;
    position: relative;
    overflow: hidden;
    border: 1px solid #334155;
}
.progress-bar {
    height: 100%;
    background: #3b82f6;
    transition: width 0.3s ease;
}
.progress-text {
    position: absolute;
    width: 100%;
    text-align: center;
    top: 50%;
    transform: translateY(-50%);
    font-size: 10px;
    color: #fff;
    font-weight: bold;
}

.result-img {
    width: 100%;
    border-radius: 12px;
    border: 2px solid #3b82f6;
    margin-top: 10px;
}
.result-title {
    color: #60a5fa;
    text-align: center;
    margin-top: 10px;
    font-weight: bold;
}
</style>