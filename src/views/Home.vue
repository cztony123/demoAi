<template>
    <div class="mobile-container">
        <div class="app-card">
            <h1 class="app-title">AI 魔法衣橱</h1>

            <div class="canvas-wrapper" :style="{ height: containerHeight + 'px' }">
                <input type="file" accept="image/*" @change="handleImageUpload" class="file-input" />

                <img v-if="imageUrl" :src="imageUrl" ref="uploadedImage" class="preview-img" @load="onImageLoad" />

                <div v-else class="upload-placeholder">
                    <div class="plus-icon">+</div>
                    <p>点击上传模特照片</p>
                    <p class="sub-tip">图片将以 96% 宽度显示，支持长图</p>
                </div>

                <canvas ref="drawingCanvas" class="drawing-canvas" @mousedown="startDrawing" @mousemove="draw" @mouseup="endDrawing" @touchstart.prevent="startDrawing" @touchmove.prevent="draw" @touchend.prevent="endDrawing"></canvas>
            </div>

            <div class="control-panel">
                <button @click="isMagicSelecting = !isMagicSelecting" :class="['mode-btn', isMagicSelecting ? 'magic-active' : '']">
                    {{ isMagicSelecting ? '✨ 智能选择模式' : '🖐️ 手动涂抹模式' }}
                </button>

                <div class="setting-group">
                    <div class="setting-header">
                        <span>画笔粗细: {{ brushSize }}px</span>
                        <span @click="clearCanvas" class="clear-link">重置</span>
                    </div>
                    <input type="range" v-model.number="brushSize" min="5" max="60" class="range-input" />
                </div>

                <div class="setting-group">
                    <label class="input-label">新衣服描述</label>
                    <textarea v-model="prompt" placeholder="描述你想要换上的衣服..." class="prompt-input"></textarea>
                </div>

                <button @click="generateSwap" :disabled="!imageUrl || !prompt" class="generate-btn">
                    开始魔法换装
                </button>
            </div>

            <div v-if="resultImageUrl" class="result-box">
                <p class="result-tag">生成结果</p>
                <img :src="resultImageUrl" class="result-img" />
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'MobileSwapUI',
    data() {
        return {
            imageUrl: '',
            resultImageUrl: '',
            prompt: '',
            brushSize: 20,
            isMagicSelecting: false,
            isDrawing: false,
            ctx: null,
            containerHeight: 300 // 默认高度，图片加载后会动态变
        };
    },
    methods: {
        handleImageUpload(e) {
            const file = e.target.files[0];
            if (file) {
                this.imageUrl = URL.createObjectURL(file);
                this.resultImageUrl = '';
            }
        },

        // 核心优化：图片加载后，动态计算高度，让 Canvas 完美贴合
        onImageLoad() {
            const img = this.$refs.uploadedImage;
            const canvas = this.$refs.drawingCanvas;

            // 1. 设置容器高度为图片渲染后的实际高度
            this.containerHeight = img.clientHeight;

            // 2. 延迟一下确保 DOM 更新后初始化 Canvas
            this.$nextTick(() => {
                this.ctx = canvas.getContext('2d');
                canvas.width = img.clientWidth;
                canvas.height = img.clientHeight;

                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                this.ctx.lineWidth = this.brushSize;
            });
        },

        getPos(e) {
            const canvas = this.$refs.drawingCanvas;
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        },

        startDrawing(e) {
            if (!this.imageUrl) return;
            if (this.isMagicSelecting) {
                this.mockMagicSelect(this.getPos(e));
                return;
            }
            this.isDrawing = true;
            const pos = this.getPos(e);
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
        },

        draw(e) {
            if (!this.isDrawing) return;
            const pos = this.getPos(e);
            this.ctx.lineWidth = this.brushSize;
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.stroke();
        },

        endDrawing() {
            this.isDrawing = false;
            if (this.ctx) this.ctx.closePath();
        },

        clearCanvas() {
            if (this.ctx) {
                this.ctx.clearRect(0, 0, this.$refs.drawingCanvas.width, this.$refs.drawingCanvas.height);
            }
        },

        mockMagicSelect(pos) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, 60, 0, Math.PI * 2);
            this.ctx.fill();
        },

        generateSwap() {
            alert("数据已封装，准备发送至 Node.js 后端！");
        }
    }
};
</script>

<style scoped>
.mobile-container {
    background-color: #111827;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    padding: 16px 0; /* 左右不留白，靠 card 控制 */
    box-sizing: border-box;
}

.app-card {
    width: 96%; /* 宽度占 96% */
    display: flex;
    flex-direction: column;
}

.app-title {
    color: #ffffff;
    font-size: 22px;
    text-align: center;
    margin-bottom: 16px;
}

/* 核心优化：自适应高度的画布容器 */
.canvas-wrapper {
    position: relative;
    width: 100%;
    background-color: #1f2937;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #374151;
    /* 不再写死 height */
    transition: height 0.3s ease;
}

.file-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    z-index: 10;
}

.preview-img {
    display: block;
    width: 100%; /* 图片宽度撑满容器 */
    height: auto; /* 高度根据比例自适应 */
}

.drawing-canvas {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 5;
    touch-action: none; /* 极其重要：防止手机涂抹时页面乱滚 */
}

.upload-placeholder {
    height: 300px; /* 没图时的默认占位高度 */
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #9ca3af;
}

.plus-icon {
    font-size: 50px;
}
.sub-tip {
    font-size: 12px;
    margin-top: 8px;
    opacity: 0.6;
}

/* 其他 UI 保持不变 */
.control-panel {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.mode-btn {
    background-color: #374151;
    color: white;
    padding: 12px;
    border-radius: 10px;
    border: none;
}
.magic-active {
    background: linear-gradient(to right, #7c3aed, #4f46e5);
}
.setting-group {
    background-color: #1f2937;
    padding: 12px;
    border-radius: 10px;
}
.setting-header {
    display: flex;
    justify-content: space-between;
    color: #d1d5db;
    font-size: 14px;
    margin-bottom: 8px;
}
.clear-link {
    color: #f87171;
}
.range-input {
    width: 100%;
    appearance: none;
    background: #4b5563;
    height: 4px;
    border-radius: 2px;
}
.input-label {
    color: #9ca3af;
    font-size: 12px;
    margin-bottom: 4px;
    display: block;
}
.prompt-input {
    width: 100%;
    box-sizing: border-box;
    background: #111827;
    border: 1px solid #374151;
    color: white;
    padding: 10px;
    border-radius: 8px;
    font-size: 14px;
}
.generate-btn {
    background: #2563eb;
    color: white;
    padding: 14px;
    border-radius: 10px;
    border: none;
    font-weight: bold;
    font-size: 16px;
    margin-bottom: 40px;
}
</style>