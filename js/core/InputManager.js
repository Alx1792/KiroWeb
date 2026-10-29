const BLOCKED = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Enter','NumpadEnter']);

export class InputManager {
  constructor(target = window) {
    this.heldKeys = new Set();
    this.pressedKeys = new Set();
    this.onFirstInput = null;
    target.addEventListener('keydown', (event) => {
      if (!this.heldKeys.has(event.code)) this.pressedKeys.add(event.code);
      this.heldKeys.add(event.code);
      if (BLOCKED.has(event.code)) event.preventDefault();
      this.onFirstInput?.();
    });
    target.addEventListener('keyup', (event) => this.heldKeys.delete(event.code));
    target.addEventListener('blur', () => this.heldKeys.clear());
  }
  held(...codes) { return codes.some((code) => this.heldKeys.has(code)); }
  pressed(...codes) { return codes.some((code) => this.pressedKeys.has(code)); }
  axis(positive, negative) { return Number(this.held(positive)) - Number(this.held(negative)); }
  menu() {
    return {
      up: this.pressed('ArrowUp','KeyW'), down: this.pressed('ArrowDown','KeyS'),
      left: this.pressed('ArrowLeft','KeyA'), right: this.pressed('ArrowRight','KeyD'),
      ok: this.pressed('Enter','NumpadEnter','Space'), back: this.pressed('Escape','Backspace'),
    };
  }
  player(side, human2) {
    if (side === 0 && human2) return { x:this.axis('KeyD','KeyA'), z:this.axis('KeyS','KeyW'), special:this.pressed('Space') };
    if (side === 0) return { x:Number(this.held('KeyD','ArrowRight'))-Number(this.held('KeyA','ArrowLeft')), z:Number(this.held('KeyS','ArrowDown'))-Number(this.held('KeyW','ArrowUp')), special:this.pressed('Space','Enter','NumpadEnter') };
    return { x:this.axis('ArrowRight','ArrowLeft'), z:this.axis('ArrowDown','ArrowUp'), special:this.pressed('Enter','NumpadEnter','ShiftRight') };
  }
  clearPressed() { this.pressedKeys.clear(); }
}
