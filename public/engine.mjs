export const FONT_OPTIONS = {
  studio: 'StudioKorean, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif',
  gothic: '"Malgun Gothic", "Apple SD Gothic Neo", sans-serif',
  serif: 'Georgia, "Times New Roman", "Noto Serif KR", serif',
  rounded: '"Trebuchet MS", "Arial Rounded MT Bold", "Malgun Gothic", sans-serif',
  mono: '"Courier New", "D2Coding", "Nanum Gothic Coding", monospace',
};

export const DEFAULT = {
  text: '오늘도,\n나의 속도로.',
  ratio: '1:1',
  size: 78,
  color: '#ffffff',
  background: '#e7a58c',
  x: 50,
  y: 50,
  align: 'center',
  shadow: true,
  fit: 'cover',
  image: null,
  art: 'peach',
  imageScale: 100,
  imageX: 50,
  imageY: 50,
  rotation: 0,
  fontFamily: 'studio',
};

export const PRESETS = [
  { name: '나의 속도로', description: '차분한 응원 · 1:1', state: { ...DEFAULT } },
  { name: '밤의 문장', description: '생각을 담는 순간 · 4:5', state: { ...DEFAULT, text: '깊어지는 밤,\n선명해지는 생각.', ratio: '4:5', background: '#36326b', art: 'night', size: 72 } },
  { name: '작은 시작', description: '싱그러운 한마디 · 9:16', state: { ...DEFAULT, text: '작은 시작이\n큰 변화를.', ratio: '9:16', background: '#e0eb9c', color: '#414b33', art: 'lime', shadow: false } },
];

export function dimensions(ratio) {
  return [1080, { '1:1': 1080, '4:5': 1350, '9:16': 1920 }[ratio]];
}

export function fontStack(key) {
  return FONT_OPTIONS[key] || FONT_OPTIONS.studio;
}

export function validateState(input) {
  const s = { ...DEFAULT, ...(input || {}) };
  if (
    !s ||
    typeof s !== 'object' ||
    typeof s.text !== 'string' ||
    s.text.length > 2000 ||
    !['1:1', '4:5', '9:16'].includes(s.ratio) ||
    !['left', 'center', 'right'].includes(s.align) ||
    !['cover', 'contain'].includes(s.fit) ||
    !['peach', 'night', 'lime', 'none'].includes(s.art) ||
    typeof s.shadow !== 'boolean' ||
    !Object.hasOwn(FONT_OPTIONS, s.fontFamily)
  ) {
    throw Error('필수 편집 항목이 없거나 올바르지 않습니다.');
  }
  for (const k of ['color', 'background']) {
    if (typeof s[k] !== 'string' || !/^#[0-9a-f]{6}$/i.test(s[k])) throw Error('색상 형식이 올바르지 않습니다.');
  }
  for (const [k, min, max] of [
    ['size', 18, 160],
    ['x', 5, 95],
    ['y', 5, 95],
    ['rotation', -180, 180],
    ['imageScale', 25, 400],
    ['imageX', -50, 150],
    ['imageY', -50, 150],
  ]) {
    if (typeof s[k] !== 'number' || !Number.isFinite(s[k]) || s[k] < min || s[k] > max) {
      throw Error('크기 또는 위치가 허용 범위를 벗어났습니다.');
    }
  }
  if (s.image !== null && (typeof s.image !== 'string' || s.image.length > 14000000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(s.image))) {
    throw Error('템플릿 이미지 형식이 올바르지 않습니다.');
  }
  return Object.fromEntries(Object.keys(DEFAULT).map((k) => [k, s[k]]));
}

export function parseTemplates(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw Error('JSON 문법이 손상되어 가져오지 않았습니다.');
  }
  if (!data || data.version !== 1 || !Array.isArray(data.templates) || data.templates.length > 100) {
    throw Error('필수 항목 version 또는 templates가 없거나 올바르지 않습니다.');
  }
  const ids = new Set();
  return data.templates.map((t) => {
    if (!t || typeof t.id !== 'string' || !t.id || ids.has(t.id) || typeof t.name !== 'string' || !t.name.trim() || t.name.length > 60) {
      throw Error('템플릿 ID 또는 이름이 없거나 중복되었습니다.');
    }
    ids.add(t.id);
    return { id: t.id, name: t.name, state: validateState(t.state) };
  });
}

export function fileKind(bytes) {
  if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10) return 'png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpeg';
  throw Error('PNG·JPEG만 지원합니다. 파일 내용이 다른 형식이거나 손상되었습니다.');
}

const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('ko', { granularity: 'grapheme' }) : null;
export function wrapText(ctx, text, width) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    const chars = segmenter ? Array.from(segmenter.segment(paragraph), (s) => s.segment) : Array.from(paragraph);
    for (const char of chars) {
      if (line && ctx.measureText(line + char).width > width) {
        lines.push(line);
        line = char;
      } else line += char;
    }
    lines.push(line);
  }
  return lines;
}

export function layoutText(ctx, s, w, h) {
  const margin = 54;
  const width = w - margin * 2;
  let size = s.size;
  let lines;
  const family = fontStack(s.fontFamily);
  do {
    ctx.font = `700 ${size}px ${family}`;
    lines = wrapText(ctx, s.text, width);
    if (lines.length * size * 1.35 <= h - margin * 2 || size <= 1) break;
    size--;
  } while (size > 0);
  if (lines.length * size * 1.35 > h - margin * 2) {
    size = (h - margin * 2) / (lines.length * 1.35);
    ctx.font = `700 ${size}px ${family}`;
    lines = wrapText(ctx, s.text, width);
  }
  const lineHeight = size * 1.35;
  const height = lines.length * lineHeight;
  const maxWidth = Math.min(width, Math.max(0, ...lines.map((x) => ctx.measureText(x).width)));
  let anchor = (s.x / 100) * w;
  const left = s.align === 'left' ? anchor : s.align === 'right' ? anchor - maxWidth : anchor - maxWidth / 2;
  const safeLeft = Math.max(margin, Math.min(w - margin - maxWidth, left));
  anchor = s.align === 'left' ? safeLeft : s.align === 'right' ? safeLeft + maxWidth : safeLeft + maxWidth / 2;
  const top = Math.max(margin, Math.min(h - margin - height, (s.y / 100) * h - height / 2));
  const boxLeft = s.align === 'left' ? anchor : s.align === 'right' ? anchor - maxWidth : anchor - maxWidth / 2;
  return { size, lines, lineHeight, height, anchor, top, maxWidth, left: boxLeft };
}

export function render(ctx, s, img) {
  const [w, h] = dimensions(s.ratio);
  if (ctx.canvas.width !== w) ctx.canvas.width = w;
  if (ctx.canvas.height !== h) ctx.canvas.height = h;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = s.background;
  ctx.fillRect(0, 0, w, h);

  let imageBox = null;
  if (img) {
    const baseScale = s.fit === 'cover' ? Math.max(w / img.width, h / img.height) : Math.min(w / img.width, h / img.height);
    const scale = baseScale * (s.imageScale / 100);
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;
    const centerX = (s.imageX / 100) * w;
    const centerY = (s.imageY / 100) * h;
    const drawX = centerX - drawWidth / 2;
    const drawY = centerY - drawHeight / 2;
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    imageBox = {
      x: drawX,
      y: drawY,
      width: drawWidth,
      height: drawHeight,
      centerX,
      centerY,
      handleX: drawX + drawWidth,
      handleY: drawY + drawHeight,
    };
  } else if (s.art !== 'none') {
    drawArtwork(ctx, s.art, w, h);
  }

  const layout = layoutText(ctx, s, w, h);
  const textCenterY = layout.top + layout.height / 2;
  ctx.save();
  ctx.fillStyle = s.color;
  ctx.textAlign = s.align;
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${layout.size}px ${fontStack(s.fontFamily)}`;
  if (s.shadow) {
    ctx.shadowColor = '#21153055';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
  }
  ctx.translate(layout.anchor, textCenterY);
  ctx.rotate((s.rotation * Math.PI) / 180);
  layout.lines.forEach((line, i) => {
    const y = layout.top + (i + 0.5) * layout.lineHeight - textCenterY;
    ctx.fillText(line, 0, y);
  });
  ctx.restore();

  return {
    ...layout,
    textBox: { x: layout.left, y: layout.top, width: layout.maxWidth, height: layout.height, centerX: layout.anchor, centerY: textCenterY },
    imageBox,
  };
}

export function drawArtwork(c, art, w, h) {
  c.save();
  const palettes = { peach: ['#f4c5ac', '#d48276', '#efd4b5'], night: ['#66608e', '#252147', '#9990b8'], lime: ['#b6cc7e', '#8ba774', '#f0edbc'] };
  const p = palettes[art];
  c.fillStyle = p[0];
  c.beginPath();
  c.arc(w * 0.13, h * 0.1, w * 0.43, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = p[1];
  c.beginPath();
  c.ellipse(w * 0.98, h * 0.95, w * 0.65, h * 0.38, -0.3, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = p[2];
  c.lineWidth = 3;
  c.beginPath();
  c.ellipse(w * 0.67, h * 0.14, w * 0.33, h * 0.25, 0.4, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = p[2];
  c.beginPath();
  c.arc(w * 0.84, h * 0.23, 11, 0, Math.PI * 2);
  c.fill();
  c.font = '15px sans-serif';
  c.fillStyle = art === 'lime' ? '#414b3388' : '#ffffff99';
  c.textAlign = 'center';
  c.fillText('A LITTLE NOTE TO MYSELF', w / 2, h - 65);
  c.restore();
}
