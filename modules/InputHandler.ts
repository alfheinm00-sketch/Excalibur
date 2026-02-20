import { Vector2, Rect } from '../types';

export type InputType = 'BOX' | 'TAP' | 'NONE';

export interface InputResult {
  type: InputType;
  position?: Vector2; // Para TAP
  rect?: Rect;        // Para BOX
}

export class InputHandler {
  private startPos: Vector2 | null = null;
  private currentPos: Vector2 | null = null;
  private isDragging: boolean = false;
  
  // Umbral de píxeles para considerar un movimiento como "Arrastre"
  private dragThreshold: number = 10; 

  constructor(threshold: number = 10) {
    this.dragThreshold = threshold;
  }

  /**
   * Inicia la interacción (MouseDown / TouchStart)
   */
  public start(x: number, y: number) {
    this.startPos = { x, y };
    this.currentPos = { x, y };
    this.isDragging = true;
  }

  /**
   * Actualiza la posición del puntero (MouseMove / TouchMove)
   */
  public move(x: number, y: number) {
    if (this.isDragging) {
      this.currentPos = { x, y };
    }
  }

  /**
   * Finaliza la interacción y determina la intención del usuario.
   */
  public end(): InputResult {
    if (!this.isDragging || !this.startPos || !this.currentPos) {
      this.reset();
      return { type: 'NONE' };
    }

    const dx = this.currentPos.x - this.startPos.x;
    const dy = this.currentPos.y - this.startPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const result: InputResult = { type: 'NONE' };

    if (distance > this.dragThreshold) {
      // Es un arrastre -> Caja de Selección
      result.type = 'BOX';
      result.rect = this.getSelectionRect(); // Usamos el getter interno
    } else {
      // Es un movimiento mínimo -> Clic / Tap
      result.type = 'TAP';
      result.position = { ...this.startPos }; // Usamos startPos para ser precisos
    }

    this.reset();
    return result;
  }

  /**
   * Cancela la interacción actual sin emitir resultado.
   */
  public cancel() {
    this.reset();
  }

  private reset() {
    this.isDragging = false;
    this.startPos = null;
    this.currentPos = null;
  }

  /**
   * Obtiene el rectángulo de selección actual para dibujar.
   * Retorna undefined si no se está arrastrando o no hay distancia suficiente.
   */
  public getSelectionRect(): Rect | undefined {
    if (!this.isDragging || !this.startPos || !this.currentPos) return undefined;

    const x = Math.min(this.startPos.x, this.currentPos.x);
    const y = Math.min(this.startPos.y, this.currentPos.y);
    const width = Math.abs(this.currentPos.x - this.startPos.x);
    const height = Math.abs(this.currentPos.y - this.startPos.y);

    // Solo devolver rect si supera mínimamente el umbral visual
    if (width < 2 && height < 2) return undefined;

    return { x, y, width, height };
  }

  public isActive(): boolean {
    return this.isDragging;
  }

  // --- STATIC HELPERS ---

  /**
   * Normaliza las coordenadas del evento relativas al canvas.
   */
  public static getRelativePos(e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent, canvas: HTMLCanvasElement): Vector2 {
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    // Type Guard simple para diferenciar Mouse y Touch
    if ('touches' in e) {
      // TouchEvent
      if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    } else {
      // MouseEvent
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }
}