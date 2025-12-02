'use client';

import { ReactP5Wrapper, Sketch } from '@p5-wrapper/react';

const sketch: Sketch = (p5) => {
  let dots: Dot[] = [];
  let beacon: any;
  const CIRCLE_W = 14;
  const ACTUAL_W = CIRCLE_W * 0.68;
  const MIN_W = 0;
  const CIRCLE_DIST = CIRCLE_W / 2;
  let COLS: number, ROWS: number, GREATER: number;

  class Dot {
    position: any;

    constructor(posX: number, posY: number) {
      this.position = p5.createVector(posX, posY);
    }

    render() {
      const w = this.calcWidth();
      p5.ellipse(this.position.x, this.position.y, w, w);
    }

    calcWidth() {
      // Use the global p5.dist() function for robustness
      let delta = p5.dist(beacon.x, beacon.y, this.position.x, this.position.y);

      delta *= p5.map(
        p5.noise(this.position.x, this.position.y, p5.frameCount),
        0,
        1,
        0.7,
        1.2
      );

      if (delta > GREATER / 2) {
        delta = GREATER / 2;
      }

      return p5.map(delta, 0, GREATER / 2, ACTUAL_W, MIN_W);
    }
  }
  
  const createDots = () => {
    dots = [];
    for (let ci = 0; ci < COLS; ++ci) {
      for (let ri = 0; ri < ROWS; ++ri) {
        const dot = new Dot(ci * CIRCLE_DIST, ri * CIRCLE_DIST);
        dots.push(dot);
      }
    }
  }

  p5.setup = () => {
    p5.createCanvas(p5.windowWidth, p5.windowHeight);
    p5.noStroke();

    COLS = p5.width / CIRCLE_DIST + 1;
    ROWS = p5.height / CIRCLE_DIST + 1;
    GREATER = Math.max(p5.width, p5.height);

    createDots();
  };

  p5.draw = () => {
    p5.background('#f9fafb');
    const touchX = (p5 as any).touchX || 0;
    const touchY = (p5 as any).touchY || 0;
    beacon = p5.createVector(p5.mouseX || touchX, p5.mouseY || touchY);

    p5.fill('#8bb7ff');
    dots.forEach((dot) => {
      dot.render();
    });
  };

  p5.windowResized = () => {
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
    COLS = p5.width / CIRCLE_DIST + 1;
    ROWS = p5.height / CIRCLE_DIST + 1;
    GREATER = Math.max(p5.width, p5.height);
    createDots();
  };
};

const DotBackground = () => {
  return <ReactP5Wrapper sketch={sketch} />;
};

export default DotBackground;
