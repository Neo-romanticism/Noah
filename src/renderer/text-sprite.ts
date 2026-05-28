import * as THREE from 'three';

export interface TextSpriteOptions {
  fontSize?: number;
  color?: string;
  bgColor?: string;
  padding?: number;
  scale?: number;
  fontFamily?: string;
  bold?: boolean;
  dropShadow?: boolean;
  outlineColor?: string;
  outlineWidth?: number;
}

const DEFAULT_OPTS: Required<TextSpriteOptions> = {
  fontSize: 48,
  color: '#ffffff',
  bgColor: 'transparent',
  padding: 16,
  scale: 1.0,
  fontFamily: '"Consolas", "Courier New", monospace',
  bold: true,
  dropShadow: true,
  outlineColor: 'transparent',
  outlineWidth: 2,
};

export function createTextSprite(
  text: string,
  options?: TextSpriteOptions,
): THREE.Sprite {
  const opts = { ...DEFAULT_OPTS, ...options };

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallback = new THREE.Sprite(
      new THREE.SpriteMaterial({ color: 0xff0000, transparent: true }),
    );
    fallback.scale.set(0.5, 0.5, 1);
    return fallback;
  }

  ctx.font = `${opts.bold ? 'bold ' : ''}${opts.fontSize}px ${opts.fontFamily}`;
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width + opts.padding * 2;
  const textHeight = opts.fontSize * 1.5 + opts.padding * 2;

  canvas.width = Math.ceil(textWidth);
  canvas.height = Math.ceil(textHeight);

  if (opts.bgColor !== 'transparent') {
    ctx.fillStyle = opts.bgColor;
    ctx.fillRect(0, 0, textWidth, textHeight);
  }

  ctx.font = `${opts.bold ? 'bold ' : ''}${opts.fontSize}px ${opts.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (opts.dropShadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
  }

  ctx.fillStyle = opts.color;
  ctx.fillText(text, textWidth / 2, textHeight / 2);

  if (opts.outlineColor !== 'transparent') {
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = opts.outlineColor;
    ctx.lineWidth = opts.outlineWidth;
    ctx.strokeText(text, textWidth / 2, textHeight / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const sprite = new THREE.Sprite(material);
  const aspect = textWidth / textHeight;
  sprite.scale.set(opts.scale * aspect, opts.scale, 1);

  return sprite;
}

export function updateSpriteTexture(
  sprite: THREE.Sprite,
  text: string,
  options?: TextSpriteOptions,
): void {
  const spriteMat = sprite.material as THREE.SpriteMaterial;
  const oldMap = spriteMat.map;
  const newSprite = createTextSprite(text, options);
  spriteMat.map = (newSprite.material as THREE.SpriteMaterial).map;
  spriteMat.needsUpdate = true;
  oldMap?.dispose();
}
