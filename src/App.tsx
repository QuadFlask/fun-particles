import React, {Component} from 'react';
import './App.css';

class GravityParticles extends Component {
    canvas: HTMLCanvasElement | null = null;
    ctx: CanvasRenderingContext2D | null = null;
    particles: Particle[] = [];
    frames: number = 0;
    state = {
        particleCount: 0
    };

    canvasRef = (canvas: HTMLCanvasElement) => {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.ctx!.fillStyle = 'black';
        this.ctx!.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        this.ctx!.globalCompositeOperation = 'lighter';
        setInterval(() => {
            this.frames++;
            // this.ctx!.fillStyle = 'rgba(0,0,0,0.2)';
            // this.ctx!.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
            stackBlurCanvasRGBA(canvas, 0, 0, canvas.clientWidth, canvas.clientHeight, 1);

            this.ctx!.strokeStyle = 'white';
            this.ctx!.lineWidth = 1.5;

            this.particles.forEach(p => {
                this.ctx!.beginPath();
                this.ctx!.strokeStyle = p.color;
                this.ctx!.moveTo(p.x, p.y);
                this.ctx!.lineTo(p.ox, p.oy);
                this.ctx!.stroke();
                p.update();
            });

            if (this.frames % 60 === 0) {
                this.particles = this.particles.filter(p => !p.isOutOfBox);
                this.setState({
                    particleCount: this.particles.length
                });
            }
        }, 1000 / 60);
    };

    handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        //@ts-ignore
        const x = e.clientX - e.target.offsetLeft;
        //@ts-ignore
        const y = e.clientY - e.target.offsetTop;
        for (let i = 0; i < 100; i++)
            this.particles.push(Particle.random(this.canvas!.clientWidth, this.canvas!.clientHeight,
                0, Math.random() * 5,
                0.1,
                x, y));
    };

    render() {
        return <div>
            <canvas ref={this.canvasRef} width={500} height={500} onClick={this.handleClick}/>
            <p>{this.state.particleCount}</p>
        </div>
    }
}

const ImageUrl = 'https://images.unsplash.com/photo-1564172875749-5b9b4e0972e0?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=500&q=80'; //https://images.unsplash.com/photo-1564259291542-ffdacda9ec1a?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=334&q=80';

class ImageParticles extends Component {
    canvas: HTMLCanvasElement | null = null;
    ctx: CanvasRenderingContext2D | null = null;
    particles: Particle[] = [];
    frames: number = 0;
    dpi = 1;
    width = 1000;
    height = 600;
    state = {
        particleCount: 0,
        lastFrame: 0,
        shrink: false,
    };

    canvasRef = async (canvas: HTMLCanvasElement) => {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.ctx!.fillStyle = 'black';
        this.ctx!.fillRect(0, 0, canvas.clientWidth / this.dpi, canvas.clientHeight / this.dpi);
        this.ctx!.strokeStyle = 'white';
        this.ctx!.lineWidth = 1.5;
        //this.ctx!.globalCompositeOperation = 'lighter';

        const render = () => {
            console.time("a");
            this.frames++;
            // this.ctx!.fillStyle = 'rgba(0,0,0,0.1)';
            // this.ctx!.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
            const ctxImageData = stackBlurCanvasRGBA(canvas, 0, 0, canvas.clientWidth / this.dpi, canvas.clientHeight / this.dpi, 1);
            // const ctxImageData = this.ctx!.getImageData(0, 0, canvas.clientWidth / this.dpi, canvas.clientHeight / this.dpi);

            const tick = this.frames - this.state.lastFrame;
            this.particles.forEach(p => {
                // this.ctx!.beginPath();
                // this.ctx!.strokeStyle = p.color;
                // this.ctx!.moveTo(p.x, p.y);
                // this.ctx!.lineTo(p.ox, p.oy);
                // this.ctx!.stroke();
                // this.ctx!.fillStyle = p.color;
                // this.ctx!.fillRect(p.x, p.y, 1, 1);
                if (0 <= p.x && p.x < ctxImageData.width && 0 <= p.y && p.y < ctxImageData.height) {
                    const idx = (Math.round(p.y) * ctxImageData.width + Math.round(p.x)) * 4;
                    ctxImageData.data[idx] = p.rgb[0];
                    ctxImageData.data[idx + 1] = p.rgb[1];
                    ctxImageData.data[idx + 2] = p.rgb[2];
                }
                p.update2(this.state.shrink, tick);
            });
            this.ctx!.putImageData(ctxImageData, 0, 0);
            console.timeEnd("a");
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);

        const gap = 3;
        const imageData = getPixels(await loadImage(ImageUrl));
        const cx = (canvas.clientWidth / this.dpi - imageData.width) / 2;
        const cy = (canvas.clientHeight / this.dpi - imageData.height) / 2;

        for (let x = 0; x < imageData.width; x += gap) {
            for (let y = 0; y < imageData.height; y += gap) {
                const r = imageData.data[(y * imageData.width + x) * 4];
                const g = imageData.data[(y * imageData.width + x) * 4 + 1];
                const b = imageData.data[(y * imageData.width + x) * 4 + 2];
                this.particles.push(Particle.random(canvas.clientWidth / this.dpi, canvas.clientHeight / this.dpi, 0, 0, 0, x + cx, y + cy, [r, g, b]));
            }
        }
    };

    handleClick = () => {
        this.setState({
            lastFrame: this.frames,
            shrink: !this.state.shrink
        });
    };

    render() {
        return <div>
            <canvas ref={this.canvasRef}
                    onClick={this.handleClick}
                    width={this.width} height={this.height}
                    style={{width: this.width * this.dpi, height: this.height * this.dpi}}/>
        </div>
    }
}

function drawPixel(buf: ImageData, x: number, y: number, rgb: [number, number, number]) {
    const idx = (y * buf.width + x) * 4;
    buf.data[idx] = rgb[0];
    buf.data[idx + 1] = rgb[1];
    buf.data[idx + 2] = rgb[2];
    // for (let y = 0; y < buf.height; y++)
    //     for (let x = 0; x < buf.width; x++) {
    //         const idx = (y * buf.width + x) * 4;
    //
    //     }
}

async function loadImage(src: string) {
    return new Promise<HTMLImageElement>((res) => {
        const image = new Image();
        image.crossOrigin = "Anonymous";
        image.onload = function () {
            res(image);
        };
        image.src = src;
    });
}

function getPixels(image: HTMLImageElement) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, image.width, image.height);
}

export class App extends Component {
    render() {
        return <div className="App">
            {/*<GravityParticles/>*/}
            <ImageParticles/>
        </div>
    }
}

class Particle {
    w: number = 0;
    h: number = 0;
    ox: number = 0; // old
    oy: number = 0; // old
    sx: number = 0; // start
    sy: number = 0; // start
    tx: number = 0; // target
    ty: number = 0; // target
    x: number = 0;
    y: number = 0;
    vx: number = 0; // velocity
    vy: number = 0; // velocity
    ax: number = 0; // acc
    ay: number = 0; // acc
    d: number = 0;
    rgb: [number, number, number] = [0, 0, 0];
    color: string = 'white';

    static random(w: number, h: number, v: number = 1, a: number = 0, d: number = 0.1, x: number = -1, y: number = -1, rgb?: [number, number, number]) {
        const p = new Particle();
        p.x = x === -1 ? Math.random() * w : x;
        p.y = y === -1 ? Math.random() * h : y;
        p.ox = p.x;
        p.oy = p.y;
        p.sx = p.x;
        p.sy = p.y;
        const theta = Math.PI * 2 * Math.random();
        p.tx = Math.cos(theta) * (w + h);
        p.ty = Math.sin(theta) * (w + h);
        v *= Math.random();
        a *= Math.random();
        p.vx = Math.cos(theta) * v;
        p.vy = Math.sin(theta) * v;
        p.ax = Math.cos(theta) * a;
        p.ay = Math.sin(theta) * a;
        p.d = d;
        p.w = w;
        p.h = h;
        // p.color = color === undefined ? `hsla(${Math.random() * 360}, 100%, 50%, 1)` : p.color = color;
        if (rgb) p.rgb = rgb;
        p.color = rgb ? `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` : `hsla(${Math.random() * 360}, 100%, 50%, 1)`;

        return p;
    }

    update() {
        this.ox = this.x;
        this.oy = this.y;
        this.x += this.vx;
        this.y += this.vy;
        this.vx += this.ax;
        this.vy += this.ay;
    }

    update2(shrink: boolean, i: number, d: number = 1200.0) {
        this.ox = this.x;
        this.oy = this.y;
        const p = Math.max(0, Math.min(shrink ? 1 - i / d : i / d, 1));
        const dx = this.tx - this.sx;
        const dy = this.ty - this.sy;
        this.x = this.sx + dx * p * p;
        this.y = this.sy + dy * p * p;
    }

    get isOutOfBox() {
        return (this.x > this.w || this.x < 0) ||
            (this.y > this.h || this.y < 0);
    }
}

const mul_table = [
    512, 512, 456, 512, 328, 456, 335, 512, 405, 328, 271, 456, 388, 335, 292, 512,
    454, 405, 364, 328, 298, 271, 496, 456, 420, 388, 360, 335, 312, 292, 273, 512,
    482, 454, 428, 405, 383, 364, 345, 328, 312, 298, 284, 271, 259, 496, 475, 456,
    437, 420, 404, 388, 374, 360, 347, 335, 323, 312, 302, 292, 282, 273, 265, 512,
    497, 482, 468, 454, 441, 428, 417, 405, 394, 383, 373, 364, 354, 345, 337, 328,
    320, 312, 305, 298, 291, 284, 278, 271, 265, 259, 507, 496, 485, 475, 465, 456,
    446, 437, 428, 420, 412, 404, 396, 388, 381, 374, 367, 360, 354, 347, 341, 335,
    329, 323, 318, 312, 307, 302, 297, 292, 287, 282, 278, 273, 269, 265, 261, 512,
    505, 497, 489, 482, 475, 468, 461, 454, 447, 441, 435, 428, 422, 417, 411, 405,
    399, 394, 389, 383, 378, 373, 368, 364, 359, 354, 350, 345, 341, 337, 332, 328,
    324, 320, 316, 312, 309, 305, 301, 298, 294, 291, 287, 284, 281, 278, 274, 271,
    268, 265, 262, 259, 257, 507, 501, 496, 491, 485, 480, 475, 470, 465, 460, 456,
    451, 446, 442, 437, 433, 428, 424, 420, 416, 412, 408, 404, 400, 396, 392, 388,
    385, 381, 377, 374, 370, 367, 363, 360, 357, 354, 350, 347, 344, 341, 338, 335,
    332, 329, 326, 323, 320, 318, 315, 312, 310, 307, 304, 302, 299, 297, 294, 292,
    289, 287, 285, 282, 280, 278, 275, 273, 271, 269, 267, 265, 263, 261, 259];


const shg_table = [
    9, 11, 12, 13, 13, 14, 14, 15, 15, 15, 15, 16, 16, 16, 16, 17,
    17, 17, 17, 17, 17, 17, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19,
    19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 20, 20, 20,
    20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 21,
    21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21,
    21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22,
    22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22,
    22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 23,
    23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
    23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
    23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
    23, 23, 23, 23, 23, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
    24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
    24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
    24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
    24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24];


function stackBlurCanvasRGBA(canvas: HTMLCanvasElement, top_x: number, top_y: number, width: number, height: number, radius: number): ImageData {
    radius |= 0;

    var context = canvas.getContext("2d");
    var imageData = context!.getImageData(top_x, top_y, width, height);

    var pixels = imageData.data;

    var x, y, i, p, yp, yi, yw, r_sum, g_sum, b_sum, a_sum,
        r_out_sum, g_out_sum, b_out_sum, a_out_sum,
        r_in_sum, g_in_sum, b_in_sum, a_in_sum,
        pr, pg, pb, pa, rbs;

    var div = radius + radius + 1;
    var w4 = width << 2;
    var widthMinus1 = width - 1;
    var heightMinus1 = height - 1;
    var radiusPlus1 = radius + 1;
    var sumFactor = radiusPlus1 * (radiusPlus1 + 1) / 2;

    var stackStart = new BlurStack();
    var stack: BlurStack | null = stackStart;
    var stackEnd: BlurStack | null = null;
    for (i = 1; i < div; i++) {
        stack = stack.next = new BlurStack();
        if (i == radiusPlus1) stackEnd = stack;
    }
    stack.next = stackStart;
    var stackIn = null;
    var stackOut = null;

    yw = yi = 0;

    var mul_sum = mul_table[radius];
    var shg_sum = shg_table[radius];

    for (y = 0; y < height; y++) {
        r_in_sum = g_in_sum = b_in_sum = a_in_sum = r_sum = g_sum = b_sum = a_sum = 0;

        r_out_sum = radiusPlus1 * (pr = pixels[yi]);
        g_out_sum = radiusPlus1 * (pg = pixels[yi + 1]);
        b_out_sum = radiusPlus1 * (pb = pixels[yi + 2]);
        a_out_sum = radiusPlus1 * (pa = pixels[yi + 3]);

        r_sum += sumFactor * pr;
        g_sum += sumFactor * pg;
        b_sum += sumFactor * pb;
        a_sum += sumFactor * pa;

        stack = stackStart;

        for (i = 0; i < radiusPlus1; i++) {
            stack!.r = pr;
            stack!.g = pg;
            stack!.b = pb;
            stack!.a = pa;
            stack = stack!.next;
        }

        for (i = 1; i < radiusPlus1; i++) {
            p = yi + ((widthMinus1 < i ? widthMinus1 : i) << 2);
            r_sum += (stack!.r = (pr = pixels[p])) * (rbs = radiusPlus1 - i);
            g_sum += (stack!.g = (pg = pixels[p + 1])) * rbs;
            b_sum += (stack!.b = (pb = pixels[p + 2])) * rbs;
            a_sum += (stack!.a = (pa = pixels[p + 3])) * rbs;

            r_in_sum += pr;
            g_in_sum += pg;
            b_in_sum += pb;
            a_in_sum += pa;

            stack = stack!.next;
        }


        stackIn = stackStart;
        stackOut = stackEnd;
        for (x = 0; x < width; x++) {
            pixels[yi + 3] = pa = (a_sum * mul_sum) >> shg_sum;
            if (pa != 0) {
                pa = 255 / pa;
                pixels[yi] = ((r_sum * mul_sum) >> shg_sum) * pa;
                pixels[yi + 1] = ((g_sum * mul_sum) >> shg_sum) * pa;
                pixels[yi + 2] = ((b_sum * mul_sum) >> shg_sum) * pa;
            } else {
                pixels[yi] = pixels[yi + 1] = pixels[yi + 2] = 0;
            }

            r_sum -= r_out_sum;
            g_sum -= g_out_sum;
            b_sum -= b_out_sum;
            a_sum -= a_out_sum;

            r_out_sum -= stackIn!.r;
            g_out_sum -= stackIn!.g;
            b_out_sum -= stackIn!.b;
            a_out_sum -= stackIn!.a;

            p = (yw + ((p = x + radius + 1) < widthMinus1 ? p : widthMinus1)) << 2;

            r_in_sum += (stackIn!.r = pixels[p]);
            g_in_sum += (stackIn!.g = pixels[p + 1]);
            b_in_sum += (stackIn!.b = pixels[p + 2]);
            a_in_sum += (stackIn!.a = pixels[p + 3]);

            r_sum += r_in_sum;
            g_sum += g_in_sum;
            b_sum += b_in_sum;
            a_sum += a_in_sum;

            stackIn = stackIn!.next;

            r_out_sum += (pr = stackOut!.r);
            g_out_sum += (pg = stackOut!.g);
            b_out_sum += (pb = stackOut!.b);
            a_out_sum += (pa = stackOut!.a);

            r_in_sum -= pr;
            g_in_sum -= pg;
            b_in_sum -= pb;
            a_in_sum -= pa;

            stackOut = stackOut!.next;

            yi += 4;
        }
        yw += width;
    }


    for (x = 0; x < width; x++) {
        g_in_sum = b_in_sum = a_in_sum = r_in_sum = g_sum = b_sum = a_sum = r_sum = 0;

        yi = x << 2;
        r_out_sum = radiusPlus1 * (pr = pixels[yi]);
        g_out_sum = radiusPlus1 * (pg = pixels[yi + 1]);
        b_out_sum = radiusPlus1 * (pb = pixels[yi + 2]);
        a_out_sum = radiusPlus1 * (pa = pixels[yi + 3]);

        r_sum += sumFactor * pr;
        g_sum += sumFactor * pg;
        b_sum += sumFactor * pb;
        a_sum += sumFactor * pa;

        stack = stackStart;

        for (i = 0; i < radiusPlus1; i++) {
            stack!.r = pr;
            stack!.g = pg;
            stack!.b = pb;
            stack!.a = pa;
            stack = stack!.next;
        }

        yp = width;

        for (i = 1; i <= radius; i++) {
            yi = (yp + x) << 2;

            r_sum += (stack!.r = (pr = pixels[yi])) * (rbs = radiusPlus1 - i);
            g_sum += (stack!.g = (pg = pixels[yi + 1])) * rbs;
            b_sum += (stack!.b = (pb = pixels[yi + 2])) * rbs;
            a_sum += (stack!.a = (pa = pixels[yi + 3])) * rbs;

            r_in_sum += pr;
            g_in_sum += pg;
            b_in_sum += pb;
            a_in_sum += pa;

            stack = stack!.next;

            if (i < heightMinus1) {
                yp += width;
            }
        }

        yi = x;
        stackIn = stackStart;
        stackOut = stackEnd;
        for (y = 0; y < height; y++) {
            p = yi << 2;
            pixels[p + 3] = pa = (a_sum * mul_sum) >> shg_sum;
            if (pa > 0) {
                pa = 255 / pa;
                pixels[p] = ((r_sum * mul_sum) >> shg_sum) * pa;
                pixels[p + 1] = ((g_sum * mul_sum) >> shg_sum) * pa;
                pixels[p + 2] = ((b_sum * mul_sum) >> shg_sum) * pa;
            } else {
                pixels[p] = pixels[p + 1] = pixels[p + 2] = 0;
            }

            r_sum -= r_out_sum;
            g_sum -= g_out_sum;
            b_sum -= b_out_sum;
            a_sum -= a_out_sum;

            r_out_sum -= stackIn!.r;
            g_out_sum -= stackIn!.g;
            b_out_sum -= stackIn!.b;
            a_out_sum -= stackIn!.a;

            p = (x + (((p = y + radiusPlus1) < heightMinus1 ? p : heightMinus1) * width)) << 2;

            r_sum += (r_in_sum += (stackIn!.r = pixels[p]));
            g_sum += (g_in_sum += (stackIn!.g = pixels[p + 1]));
            b_sum += (b_in_sum += (stackIn!.b = pixels[p + 2]));
            a_sum += (a_in_sum += (stackIn!.a = pixels[p + 3]));

            stackIn = stackIn!.next;

            r_out_sum += (pr = stackOut!.r);
            g_out_sum += (pg = stackOut!.g);
            b_out_sum += (pb = stackOut!.b);
            a_out_sum += (pa = stackOut!.a);

            r_in_sum -= pr;
            g_in_sum -= pg;
            b_in_sum -= pb;
            a_in_sum -= pa;

            stackOut = stackOut!.next;

            yi += width;
        }
    }

    // context!.putImageData(imageData, top_x, top_y);
    return imageData;
}

class BlurStack {
    r: number = 0;
    g: number = 0;
    b: number = 0;
    a: number = 0;
    next: BlurStack | null = null;
}

export default App;
