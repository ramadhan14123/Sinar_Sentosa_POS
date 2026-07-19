// ESC/POS command builder — generates byte sequences for thermal printers
// Reference: https://escpos.readthedocs.io/

const LF = 0x0a;
const ESC = 0x1b;
const GS = 0x1d;

export class EscPosEncoder {
  private buffer: number[] = [];

  init(): this {
    this.buffer = [];
    // Initialize printer
    this.buffer.push(ESC, 0x40);
    return this;
  }

  lineFeed(n = 1): this {
    for (let i = 0; i < n; i++) this.buffer.push(LF);
    return this;
  }

  text(txt: string): this {
    for (const ch of txt) {
      this.buffer.push(ch.charCodeAt(0));
    }
    return this;
  }

  textLine(txt: string): this {
    return this.text(txt).lineFeed();
  }

  bold(enable: boolean): this {
    this.buffer.push(ESC, 0x45, enable ? 1 : 0);
    return this;
  }

  fontSize(w: number, h: number): this {
    this.buffer.push(GS, 0x21, ((h - 1) << 4) | (w - 1));
    return this;
  }

  align(align: "left" | "center" | "right"): this {
    const map = { left: 0x00, center: 0x01, right: 0x02 };
    this.buffer.push(ESC, 0x61, map[align]);
    return this;
  }

  cut(): this {
    this.buffer.push(GS, 0x56, 0x00);
    return this;
  }

  beep(): this {
    this.buffer.push(ESC, 0x42, 3, 3);
    return this;
  }

  row(left: string, right: string): this {
    const maxLen = 32;
    const dots = maxLen - left.length - right.length;
    if (dots > 0) {
      this.text(left);
      for (let i = 0; i < dots; i++) this.buffer.push(0x2e);
      this.textLine(right);
    } else {
      this.text(left);
      this.lineFeed();
      this.text(right.padStart(maxLen));
      this.lineFeed();
    }
    return this;
  }

  hr(): this {
    this.textLine("=".repeat(32));
    return this;
  }

  build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}
