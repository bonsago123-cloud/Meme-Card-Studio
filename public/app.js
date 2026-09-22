import { loadRemote, saveRemote } from './storage.mjs';
import { DEFAULT, PRESETS, dimensions, validateState, parseTemplates, fileKind, render } from './engine.mjs';

function uid() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const $ = (id) => document.getElementById(id);
const canvas = $('canvas');
const ctx = canvas.getContext('2d');
let state = { ...DEFAULT };
let image = null;
let templates = [];
let selected = null;
let revision = 0;
let serverRevision = 0;
let ready = false;
let busy = false;
let timer;
let scene = null;
let dragMode = 'text';
const pointer = { type: null, pointerId: null, start: null };

function notify(message, error = false) {
  $('message').textContent = message;
  $('message').className = error ? 'error' : '';
  $('message').style.display = 'block';
  clearTimeout(timer);
  timer = setTimeout(() => ($('message').style.display = 'none'), error ? 14000 : 4500);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function redraw() {
  scene = render(ctx, state, image);
  drawGuides();
  $('dimensions').textContent = dimensions(state.ratio).join(' × ') + ' px';
  $('layoutNote').textContent = scene.size < state.size ? `긴 문구가 잘리지 않도록 ${Math.round(scene.size * 100) / 100}px로 자동 조정했어요.` : '';
  $('charCount').textContent = state.text.length + ' / 2,000';
  for (const id of ['size', 'x', 'y']) $(id + 'Value').textContent = state[id] + (id === 'size' ? ' px' : ' %');
  $('rotationValue').textContent = `${state.rotation}°`;
  $('imageScaleValue').textContent = `${state.imageScale}%`;
  $('dragModeLabel').textContent = dragMode === 'image' ? '사진 자르기 모드' : '문구 이동 모드';
}

function drawGuides() {
  if (!scene) return;
  if (dragMode === 'image' && scene.imageBox) {
    const { x, y, width, height, handleX, handleY } = scene.imageBox;
    ctx.save();
    ctx.strokeStyle = '#7050df';
    ctx.setLineDash([18, 10]);
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, width, height);
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#7050df';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(handleX, handleY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (dragMode === 'text' && scene.textBox) {
    const { x, y, width, height } = scene.textBox;
    ctx.save();
    ctx.strokeStyle = '#ffffffcc';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.strokeRect(x - 18, y - 18, width + 36, height + 36);
    ctx.restore();
  }
}

function sync() {
  for (const id of ['text', 'size', 'color', 'background', 'x', 'y', 'align', 'fit', 'fontFamily']) $(id).value = state[id];
  $('shadow').checked = state.shadow;
  $('rotation').value = state.rotation;
  $('imageScale').value = state.imageScale;
  document.querySelectorAll('[data-ratio]').forEach((b) => b.classList.toggle('active', b.dataset.ratio === state.ratio));
  document.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('active', b.dataset.mode === dragMode));
  $('imageName').textContent = state.image ? '이미지 적용됨 · 원본 메타데이터 제거 완료' : '기본 아트워크 · 스튜디오에서 직접 제작';
  redraw();
}

function imageFrom(src) {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => (i.width * i.height > 40000000 ? reject(Error('이미지는 최대 4천만 화소까지 지원합니다.')) : resolve(i));
    i.onerror = () => reject(Error('이미지 내용을 읽을 수 없습니다. 손상된 파일인지 확인하세요.'));
    i.src = src;
  });
}

async function applyState(next) {
  const valid = validateState(next);
  const token = ++revision;
  const decoded = valid.image ? await imageFrom(valid.image) : null;
  if (token !== revision) return;
  state = valid;
  image = decoded;
  sync();
}

for (const id of ['text', 'size', 'color', 'background', 'x', 'y', 'align', 'fit', 'shadow', 'fontFamily']) {
  $(id).addEventListener('input', () => {
    revision++;
    state[id] = id === 'shadow' ? $(id).checked : ['size', 'x', 'y'].includes(id) ? Number($(id).value) : $(id).value;
    redraw();
  });
}
$('rotation').addEventListener('input', () => {
  revision++;
  state.rotation = Number($('rotation').value);
  redraw();
});
$('imageScale').addEventListener('input', () => {
  revision++;
  state.imageScale = Number($('imageScale').value);
  redraw();
});

document.querySelectorAll('[data-ratio]').forEach((b) => (b.onclick = () => {
  revision++;
  state.ratio = b.dataset.ratio;
  sync();
}));
document.querySelectorAll('[data-mode]').forEach((b) => (b.onclick = () => {
  dragMode = b.dataset.mode;
  sync();
}));
$('centerText').onclick = () => {
  revision++;
  state.x = 50;
  state.y = 50;
  sync();
};
$('resetImageCrop').onclick = () => {
  revision++;
  state.imageScale = 100;
  state.imageX = 50;
  state.imageY = 50;
  redraw();
};

async function upload(file) {
  if (!file) return;
  try {
    if (!$('rights').checked) throw Error('먼저 이미지 사용 권한 확인란을 선택해주세요.');
    if (file.size > 10 * 1024 * 1024) throw Error('파일이 10MB를 넘습니다. 기존 작업을 유지했습니다.');
    fileKind(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
    const token = revision;
    const url = URL.createObjectURL(file);
    let decoded;
    try {
      decoded = await imageFrom(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    const clean = document.createElement('canvas');
    const scale = Math.min(1, 2400 / Math.max(decoded.width, decoded.height));
    clean.width = Math.round(decoded.width * scale);
    clean.height = Math.round(decoded.height * scale);
    clean.getContext('2d').drawImage(decoded, 0, 0, clean.width, clean.height);
    const png = clean.toDataURL('image/png');
    if (png.length > 14000000) throw Error('변환된 이미지가 너무 큽니다. 작은 이미지를 사용해주세요.');
    if (token !== revision) {
      notify('편집이 변경되어 이미지 불러오기를 취소했어요. 다시 선택해주세요.', true);
      return;
    }
    await applyState({ ...state, image: png, imageScale: 100, imageX: 50, imageY: 50 });
    dragMode = 'image';
    sync();
    notify('이미지를 불러왔어요. 미리보기에서 위치를 옮기거나 크기를 조절할 수 있습니다.');
  } catch (e) {
    notify(e.message, true);
  } finally {
    $('imageFile').value = '';
  }
}

$('imageFile').onchange = (e) => upload(e.target.files[0]);
for (const event of ['dragenter', 'dragover']) $('dropzone').addEventListener(event, (e) => {
  e.preventDefault();
  $('dropzone').style.background = '#f0e9ff';
});
$('dropzone').ondragleave = () => ($('dropzone').style.background = '');
$('dropzone').ondrop = (e) => {
  e.preventDefault();
  $('dropzone').style.background = '';
  upload(e.dataTransfer.files[0]);
};
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());
$('removeImage').onclick = () => {
  revision++;
  state.image = null;
  image = null;
  state.imageScale = 100;
  state.imageX = 50;
  state.imageY = 50;
  sync();
};

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
}

function pointInRect(p, rect) {
  return p.x >= rect.x && p.x <= rect.x + rect.width && p.y >= rect.y && p.y <= rect.y + rect.height;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function updateTextPosition(point) {
  state.x = Math.round(clamp((point.x / canvas.width) * 100, 5, 95));
  state.y = Math.round(clamp((point.y / canvas.height) * 100, 5, 95));
}

canvas.onpointerdown = (e) => {
  const p = canvasPoint(e);
  pointer.pointerId = e.pointerId;
  pointer.start = { p, state: structuredClone(state) };

  if (dragMode === 'image' && state.image && scene?.imageBox) {
    const handle = { x: scene.imageBox.handleX, y: scene.imageBox.handleY };
    if (distance(p, handle) <= 30) {
      pointer.type = 'image-scale';
    } else if (pointInRect(p, scene.imageBox)) {
      pointer.type = 'image-move';
    } else {
      pointer.type = null;
      return;
    }
  } else {
    pointer.type = 'text-move';
    updateTextPosition(p);
    redraw();
  }
  canvas.setPointerCapture(e.pointerId);
};

canvas.onpointermove = (e) => {
  if (!pointer.type || e.pointerId !== pointer.pointerId) return;
  const p = canvasPoint(e);
  revision++;
  if (pointer.type === 'text-move') {
    updateTextPosition(p);
  } else if (pointer.type === 'image-move') {
    const dx = p.x - pointer.start.p.x;
    const dy = p.y - pointer.start.p.y;
    state.imageX = Math.round(clamp(pointer.start.state.imageX + (dx / canvas.width) * 100, -50, 150));
    state.imageY = Math.round(clamp(pointer.start.state.imageY + (dy / canvas.height) * 100, -50, 150));
  } else if (pointer.type === 'image-scale' && scene?.imageBox) {
    const center = { x: scene.imageBox.centerX, y: scene.imageBox.centerY };
    const startDistance = Math.max(10, distance(pointer.start.p, center));
    const nextDistance = Math.max(10, distance(p, center));
    state.imageScale = Math.round(clamp(pointer.start.state.imageScale * (nextDistance / startDistance), 25, 400));
  }
  redraw();
};

function endPointer(e) {
  if (e?.pointerId && e.pointerId !== pointer.pointerId) return;
  pointer.type = null;
  pointer.pointerId = null;
}
canvas.onpointerup = endPointer;
canvas.onpointercancel = endPointer;
canvas.onwheel = (e) => {
  if (dragMode !== 'image' || !state.image) return;
  e.preventDefault();
  revision++;
  const delta = e.deltaY < 0 ? 8 : -8;
  state.imageScale = clamp(state.imageScale + delta, 25, 400);
  sync();
};

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 20000);
}

$('download').onclick = async () => {
  try {
    await document.fonts.ready;
    redraw();
    const format = $('format').value;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/' + format, 0.94));
    if (!blob) throw Error('이미지를 저장하지 못했습니다. 다시 시도해주세요.');
    saveBlob(blob, `my-card-${state.ratio.replace(':', 'x')}.${format === 'jpeg' ? 'jpg' : 'png'}`);
    notify('이미지 내려받기를 시작했어요.');
  } catch (e) {
    notify(e.message, true);
  }
};

PRESETS.forEach((p) => {
  const b = document.createElement('button');
  b.className = 'preset';
  const art = document.createElement('span');
  art.className = 'preset-art';
  art.textContent = p.state.text;
  const desc = document.createElement('span');
  const strong = document.createElement('strong');
  strong.textContent = p.name;
  const small = document.createElement('small');
  small.textContent = p.description;
  desc.append(strong, small);
  b.append(art, desc);
  b.onclick = async () => {
    await applyState({ ...p.state });
    selected = null;
    $('templateName').value = '';
    list();
    notify(p.name + ' 템플릿을 불러왔어요.');
  };
  $('presets').append(b);
});

async function persist(next) {
  if (!ready) throw Error('보관함을 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
  if (busy) throw Error('저장 중입니다. 잠시 기다려주세요.');
  busy = true;
  try {
    const data = await saveRemote(next, serverRevision);
    serverRevision = data.revision;
    templates = next;
    list();
  } finally {
    busy = false;
  }
}

function list() {
  $('templateCount').textContent = templates.length;
  $('updateTemplate').disabled = !templates.some((t) => t.id === selected);
  $('savedTemplates').replaceChildren();
  if (!templates.length) {
    const el = document.createElement('div');
    el.className = 'empty';
    el.textContent = '마음에 드는 편집을 저장하면\n여기에서 다시 만날 수 있어요.';
    $('savedTemplates').append(el);
  }
  templates.forEach((t) => {
    const row = document.createElement('div');
    row.className = 'saved-item' + (selected === t.id ? ' selected' : '');
    const load = document.createElement('button');
    load.className = 'quiet';
    load.textContent = t.name;
    load.title = t.name;
    load.onclick = async () => {
      try {
        await applyState(t.state);
        selected = t.id;
        $('templateName').value = t.name;
        list();
        notify('템플릿을 불러왔어요.');
      } catch (e) {
        notify(e.message, true);
      }
    };
    const del = document.createElement('button');
    del.className = 'quiet';
    del.textContent = '삭제';
    del.setAttribute('aria-label', t.name + ' 삭제');
    del.onclick = async () => {
      if (del.dataset.confirm !== 'yes') {
        del.dataset.confirm = 'yes';
        del.textContent = '정말 삭제';
        del.setAttribute('aria-label', t.name + ' 정말 삭제');
        return;
      }
      try {
        await persist(templates.filter((x) => x.id !== t.id));
        if (selected === t.id) {
          selected = null;
          $('templateName').value = '';
          list();
        }
        notify('템플릿을 삭제했어요.');
      } catch (e) {
        notify(e.message, true);
      }
    };
    row.append(load, del);
    $('savedTemplates').append(row);
  });
}

async function saveTemplate(update = false) {
  try {
    const name = $('templateName').value.trim();
    if (!name) throw Error('템플릿 이름을 입력해주세요.');
    if (!update && templates.length >= 100) throw Error('템플릿은 최대 100개까지 저장할 수 있습니다.');
    const t = { id: update ? selected : uid(), name, state: structuredClone(state) };
    if (update && !templates.some((x) => x.id === selected)) throw Error('수정할 템플릿을 먼저 불러오세요.');
    await persist(update ? templates.map((x) => (x.id === selected ? t : x)) : [...templates, t]);
    selected = t.id;
    list();
    notify(update ? '템플릿을 수정했어요.' : '새 템플릿을 저장했어요.');
  } catch (e) {
    notify(e.message, true);
  }
}
$('saveTemplate').onclick = () => saveTemplate();
$('updateTemplate').onclick = () => saveTemplate(true);

$('exportJson').onclick = () => {
  saveBlob(new Blob([JSON.stringify({ version: 1, templates }, null, 2)], { type: 'application/json' }), 'my-card-templates.json');
  notify('템플릿 JSON을 내보냈어요.');
};
$('jsonFile').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 20 * 1024 * 1024) throw Error('JSON은 최대 20MB까지 가져올 수 있습니다.');
    const imported = parseTemplates(await file.text());
    if (templates.length + imported.length > 100) throw Error('가져온 뒤 템플릿이 100개를 넘습니다.');
    for (const t of imported) if (t.state.image) await imageFrom(t.state.image);
    await persist([...templates, ...imported.map((t) => ({ ...t, id: uid() }))]);
    notify(`${imported.length}개 템플릿을 가져왔어요. 기존 목록도 유지했습니다.`);
  } catch (e) {
    notify(e.message, true);
  } finally {
    e.target.value = '';
  }
};
$('helpButton').onclick = () => $('help').showModal();
$('closeHelp').onclick = () => $('help').close();

async function loadCollection() {
  try {
    const data = await loadRemote();
    templates = parseTemplates(JSON.stringify(data));
    serverRevision = data.revision;
    ready = true;
    $('saveTemplate').disabled = false;
    list();
  } catch (e) {
    notify(e.message || '보관함에 연결할 수 없습니다. 새로고침해주세요.', true);
  }
}
$('saveTemplate').disabled = true;
loadCollection();

sync();
list();
document.fonts.ready.then(redraw);

if (document.modelContext?.registerTool) {
  try {
    Promise.resolve(
      document.modelContext.registerTool({
        name: 'set_card_text',
        title: '카드 문구 변경',
        description: '현재 카드의 문구를 변경하고 미리보기에 반영합니다.',
        inputSchema: { type: 'object', properties: { text: { type: 'string', maxLength: 2000 } }, required: ['text'], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: async (input) => {
          if (!input || typeof input.text !== 'string' || input.text.length > 2000) throw Error('문구는 2,000자 이하의 문자열이어야 합니다.');
          revision++;
          state.text = input.text;
          sync();
          return { text: state.text, ratio: state.ratio };
        },
      })
    ).catch(() => {});
  } catch {}
}
