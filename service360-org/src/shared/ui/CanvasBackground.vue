<template>
  <canvas ref="canvas" class="background-canvas"></canvas>
</template>

<script>
export default {
  name: "CanvasBackground",
  mounted() {
    this.canvas = this.$refs.canvas;
    this.ctx = this.canvas.getContext("2d");
    this.resizeCanvas();
    this.createGrid();
    this.animate();

    window.addEventListener("resize", this.onResize);
  },
  beforeUnmount() {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener("resize", this.onResize);
  },
  methods: {
    resizeCanvas() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    },
    onResize() {
      this.resizeCanvas();
      this.createGrid();
    },
    createGrid() {
      const cols = 40;
      const rows = 20;
      const spacing = window.innerWidth / cols;

      this.grid = [];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          this.grid.push({
            x: x * spacing,
            y:
              window.innerHeight -
              y * spacing +
              Math.random() * 20,
            offset: Math.random() * 100,
          });
        }
      }

      this.cols = cols;
      this.rows = rows;
      this.spacing = spacing;
    },
    animate() {
      this.time = (this.time || 0) + 0.015;
      const ctx = this.ctx;
      const width = this.canvas.width;
      const height = this.canvas.height;

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(0, 0);

      const gradient = ctx.createRadialGradient(
        width / 2,
        height,
        0,
        width / 2,
        height,
        width / 1.2
      );
      gradient.addColorStop(0, "rgba(180, 200, 255, 0.2)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < this.grid.length; i++) {
        const p = this.grid[i];
        const wave = Math.sin(this.time + p.offset + p.x * 0.005) * 10;
        p.dy = p.y + wave;
      }

      ctx.strokeStyle = "rgba(100, 150, 255, 0.1)";
      ctx.lineWidth = 1;
      for (let y = 0; y < this.rows - 1; y++) {
        for (let x = 0; x < this.cols - 1; x++) {
          const i = y * this.cols + x;
          const p1 = this.grid[i];
          const p2 = this.grid[i + 1];
          const p3 = this.grid[i + this.cols];

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.dy);
          ctx.lineTo(p2.x, p2.dy);
          ctx.lineTo(p3.x, p3.dy);
          ctx.stroke();
        }
      }

      ctx.fillStyle = "rgba(100, 150, 255, 0.2)";
      for (let i = 0; i < this.grid.length; i++) {
        const p = this.grid[i];
        ctx.beginPath();
        ctx.arc(p.x, p.dy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      this.frameId = requestAnimationFrame(this.animate);
    },
  },
};
</script>

<style scoped>
.background-canvas {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 45vh; 
  z-index: 0;
  pointer-events: none;
  filter: blur(1px);
}
</style>
