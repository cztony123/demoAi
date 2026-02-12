<template>
    <div class="mobile-container">
        <div class="app-card">
            <h1 class="app-title">AI 魔法衣橱</h1>

            <div class="canvas-wrapper" :style="{ height: containerHeight + 'px' }">

                <input v-if="!imageUrl" type="file" accept="image/*" @change="handleImageUpload" class="file-input" />

                <img v-if="imageUrl" :src="imageUrl" ref="uploadedImage" class="preview-img" @load="onImageLoad" />

                <div v-if="!imageUrl" class="upload-placeholder">
                    <div class="plus-icon">+</div>
                    <p>点击上传模特照片</p>
                    <p class="sub-tip">上传后支持 1px 精细涂抹</p>
                </div>

                <canvas ref="drawingCanvas" class="drawing-canvas" @touchstart.prevent="startDrawing" @touchmove.prevent="draw" @touchend.prevent="endDrawing" @mousedown="startDrawing" @mousemove="draw" @mouseup="endDrawing" @mouseleave="endDrawing"></canvas>
            </div>

            <div class="control-panel">
                <div class="tool-box">
                    <div class="tool-header">
                        <span class="label">画笔粗细: <strong>{{ brushSize }}px</strong></span>
                        <button @click="clearCanvas" class="btn-clear">重新涂抹</button>
                    </div>
                    <input type="range" v-model.number="brushSize" min="1" max="80" class="slider" />
                </div>

                <div class="input-box">
                    <label class="label">新衣服描述 (Prompt)</label>
                    <textarea v-model="prompt" placeholder="例如：一件剪裁精致的白色真丝衬衫..." class="text-area"></textarea>
                </div>

                <button @click="onGenerate" :disabled="!imageUrl || !prompt" class="submit-btn">
                    开始魔法换装
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
    name: 'GeminiInpaintUI',
    data() {
        return {
            imageUrl: '',
            resultImageUrl: '',
            prompt: '',
            brushSize: 20, // 初始默认大小
            isDrawing: false,
            ctx: null,
            containerHeight: 320
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

        onImageLoad() {
            const img = this.$refs.uploadedImage;
            const canvas = this.$refs.drawingCanvas;
            this.containerHeight = img.clientHeight;

            this.$nextTick(() => {
                this.ctx = canvas.getContext('2d');
                canvas.width = img.clientWidth;
                canvas.height = img.clientHeight;

                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            });
        },

        getCoordinates(e) {
            const canvas = this.$refs.drawingCanvas;
            const rect = canvas.getBoundingClientRect();
            let clientX, clientY;
            if (e.touches && e.touches[0]) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            return { x: clientX - rect.left, y: clientY - rect.top };
        },

        startDrawing(e) {
            if (!this.imageUrl || !this.ctx) return;
            this.isDrawing = true;
            const pos = this.getCoordinates(e);
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
        },

        draw(e) {
            if (!this.isDrawing || !this.ctx) return;
            const pos = this.getCoordinates(e);
            this.ctx.lineWidth = this.brushSize;
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.stroke();
        },

        endDrawing() {
            if (this.isDrawing) {
                this.ctx.closePath();
                this.isDrawing = false;
            }
        },

        clearCanvas() {
            if (this.ctx) {
                this.ctx.clearRect(0, 0, this.$refs.drawingCanvas.width, this.$refs.drawingCanvas.height);
            }
        },

        // 获取纯黑白蒙版的 Base64
        async getMaskBase64() {
            const canvas = this.$refs.drawingCanvas;
            const img = this.$refs.uploadedImage;

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.naturalWidth;
            tempCanvas.height = img.naturalHeight;
            const tCtx = tempCanvas.getContext('2d');

            // AI 模型要求的标准：背景黑，涂抹区白
            tCtx.fillStyle = 'black';
            tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

            tCtx.lineCap = 'round';
            tCtx.lineJoin = 'round';
            tCtx.strokeStyle = 'white';

            // 按比例把当前涂抹层画到高清画布上
            const scale = img.naturalWidth / canvas.width;
            tCtx.scale(scale, scale);
            tCtx.drawImage(canvas, 0, 0);

            return tempCanvas.toDataURL('image/png');
        },

        // 提交逻辑
        async onGenerate() {
            const maskBase64 = await this.getMaskBase64();

            // 构建提交参数
            const params = {
                prompt: this.prompt,
                brush_size_px: this.brushSize,
                init_image: this.imageUrl, // 预览用链接
                mask_data: maskBase64.substring(0, 50) + "..." // 打印时截断防刷屏
            };

            console.log("%c🚀 准备提交给 Node.js 的参数：", "color: #3b82f6; font-size: 16px; font-weight: bold;");
            console.table(params);

            alert("提交成功！请打开浏览器开发者工具 (F12) 查看 Console 打印的参数。");
        }
    }
};
</script>

<style scoped>
.mobile-container {
    background-color: #0f172a;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    padding: 20px 0;
    box-sizing: border-box;
}

.app-card {
    width: 96%;
    max-width: 500px;
}

.app-title {
    color: #ffffff;
    font-size: 24px;
    font-weight: bold;
    text-align: center;
    margin-bottom: 20px;
    text-transform: uppercase;
    letter-spacing: 2px;
}

.canvas-wrapper {
    position: relative;
    width: 100%;
    background-color: #1e293b;
    border-radius: 20px;
    overflow: hidden;
    border: 1px solid #334155;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
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
    pointer-events: none;
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
    font-size: 64px;
    font-weight: 100;
    margin-bottom: 10px;
}

.control-panel {
    margin-top: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.tool-box,
.input-box {
    background-color: #1e293b;
    padding: 18px;
    border-radius: 16px;
    border: 1px solid #334155;
}

.tool-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.label {
    font-size: 14px;
    color: #94a3b8;
    font-weight: 500;
}
.btn-clear {
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.2);
    color: #f87171;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
}

.slider {
    width: 100%;
    height: 8px;
    background: #0f172a;
    border-radius: 4px;
    appearance: none;
    outline: none;
}

/* 滑块头美化 */
.slider::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    background: #3b82f6;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid #fff;
}

.text-area {
    width: 100%;
    box-sizing: border-box;
    background-color: #0f172a;
    border: 1px solid #334155;
    color: #fff;
    padding: 14px;
    border-radius: 12px;
    margin-top: 8px;
    min-height: 90px;
    font-size: 14px;
    line-height: 1.6;
}

.submit-btn {
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    color: white;
    padding: 18px;
    border-radius: 16px;
    border: none;
    font-size: 18px;
    font-weight: 800;
    box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.4);
    margin-top: 8px;
}

.submit-btn:disabled {
    opacity: 0.2;
    filter: grayscale(1);
}
.submit-btn:active {
    transform: scale(0.97);
}

.result-section {
    margin-top: 32px;
    padding-bottom: 40px;
}

.result-title {
    color: #60a5fa;
    margin-bottom: 12px;
    font-weight: 600;
    text-align: center;
}
.result-img {
    width: 100%;
    border-radius: 16px;
    border: 2px solid #3b82f6;
}
</style>