import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

// —————————
// DOM SHORTCUTS
// —————————
const $ = id => document.getElementById(id);

const dropZone      = $("drop-texture");
const fileInput     = $("file-input");
const blurEl        = $("blur-slider");
const strengthEl    = $("strength-slider");
const invertEl      = $("invert-toggle");
const blackPointEl  = $("black-point-slider");
const midPointEl    = $("mid-point-slider");
const whitePointEl  = $("white-point-slider");
const blurValEl     = $("blur-value");
const strValEl      = $("strength-value");
const blackPointVal = $("black-point-value");
const midPointVal   = $("mid-point-value");
const whitePointVal = $("white-point-value");
const dlBtn         = $("download-btn");
const previewDiv    = $("preview-3d");

// —————————
// THREE.JS SETUP
// —————————
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(256, 256, false);
previewDiv.appendChild(renderer.domElement);

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 10);
camera.position.set(0, 0, 4);
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
keyLight.position.set(2, 2, 3);
scene.add(keyLight);

const geometry = new THREE.SphereGeometry(0.6, 32, 16);
const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
const sphere   = new THREE.Mesh(geometry, material);
scene.add(sphere);

function animate() {
  requestAnimationFrame(animate);
  sphere.rotation.y += 0.01;
  renderer.render(scene, camera);
}
animate();

// —————————
// PARAMS WITH DEFAULTS
// —————————
const params = {
  blur:        parseFloat(blurEl.value),
  strength:    parseFloat(strengthEl.value),
  invertY:     invertEl.checked,
  blackPoint:  parseFloat(blackPointEl.value),
  midPoint:    parseFloat(midPointEl.value),
  whitePoint:  parseFloat(whitePointEl.value),
};

// —————————
// WIRE UP YOUR SLIDERS
// —————————
// Blur / Strength / InvertY:
[blurEl, strengthEl, invertEl].forEach(el => {
  el.addEventListener("input", () => {
    params.blur     = parseFloat(blurEl.value);
    params.strength = parseFloat(strengthEl.value);
    params.invertY  = invertEl.checked;

    blurValEl.textContent = params.blur.toFixed(1);
    strValEl.textContent  = params.strength.toFixed(2);
    schedulePreview();
  });
});

// Black / Mid / White:
[blackPointEl, midPointEl, whitePointEl].forEach(el => {
  el.addEventListener("input", () => {
    params.blackPoint = parseFloat(blackPointEl.value);
    params.midPoint   = parseFloat(midPointEl.value);
    params.whitePoint = parseFloat(whitePointEl.value);

    blackPointVal.textContent = params.blackPoint.toFixed(2);
    midPointVal.textContent   = params.midPoint.toFixed(2);
    whitePointVal.textContent = params.whitePoint.toFixed(2);
    schedulePreview();
  });
});

// —————————
// FILE HANDLING (DRAG & CLICK)
// —————————
let sourceImage = null, fullW = 0, fullH = 0;

dropZone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", e => {
  if (!e.target.files.length) return;
  handleFile(e.target.files[0]);
});

["dragover","dragenter"].forEach(evt => 
  dropZone.addEventListener(evt, ev => {
    ev.preventDefault();
    dropZone.classList.add("DragHover");
  })
);

["dragleave","drop"].forEach(evt =>
  dropZone.addEventListener(evt, ev => {
    ev.preventDefault();
    dropZone.classList.remove("DragHover");
  })
);

dropZone.addEventListener("drop", e => {
  if (!e.dataTransfer.files.length) return;
  handleFile(e.dataTransfer.files[0]);
});

function handleFile(file) {
  const img = new Image();
  img.onload = () => {
    sourceImage = img;
    fullW = img.naturalWidth;
    fullH = img.naturalHeight;
    dlBtn.disabled = false;
    schedulePreview();
  };
  img.src = URL.createObjectURL(file);
}

// —————————
// PREVIEW SCHEDULING
// —————————
let previewReq = false, running = false;
function schedulePreview() {
  if (!sourceImage) return;
  previewReq = true;
  if (!running) requestAnimationFrame(doPreview);
}
function doPreview() {
  if (!previewReq) { running = false; return; }
  previewReq = false; running = true;

  const cvs = generateNormalCanvas(sourceImage, 256, 256);
  const tex = new THREE.CanvasTexture(cvs);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  material.normalMap = tex;
  material.needsUpdate = true;

  running = false;
}

// —————————
// CORE: NORMAL MAP GENERATOR
// —————————
function generateNormalCanvas(img, w, h) {
  const c   = document.createElement("canvas");
  c.width   = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });

  // Blur (negative) or sharpen (positive)
  const bv = params.blur;
  let sharpenAmt = 0;
  if (bv < 0) {
    ctx.filter = `blur(${Math.abs(bv)}px)`;
  } else {
    ctx.filter = "none";
    sharpenAmt = bv;
  }
  ctx.drawImage(img, 0, 0, w, h);
  ctx.filter = "none";

  // Read pixels & build grayscale with B/W/M levels
  const im   = ctx.getImageData(0, 0, w, h);
  const data = im.data;
  const gray = new Float32Array(w * h);

  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    // standard luminance
    const lum = (data[i] * 0.2126 +
                 data[i+1] * 0.7152 +
                 data[i+2] * 0.0722) / 255;

    // 1) normalize between black & white
    let v = (lum - params.blackPoint) /
            (params.whitePoint - params.blackPoint);

    // 2) clamp
    v = Math.min(Math.max(v, 0), 1);

    // 3) mid-point (gamma)
    v = Math.pow(v, 1 / params.midPoint);

    gray[j] = v;
  }

  // Sobel → normal
  const out     = ctx.createImageData(w, h);
  const od      = out.data;
  const baseStr = params.strength * 0.5;
  const invY    = params.invertY ? -1 : 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(x-1, 0),   x2 = Math.min(x+1, w-1);
      const y0 = Math.max(y-1, 0),   y2 = Math.min(y+1, h-1);

      const tl = gray[y0*w + x0], tc = gray[y0*w + x], tr = gray[y0*w + x2];
      const cl = gray[y*w  + x0],       cr = gray[y*w  + x2];
      const bl = gray[y2*w + x0], bc = gray[y2*w + x], br = gray[y2*w + x2];

      const dx = (tr + 2*cr + br) - (tl + 2*cl + bl);
      const dy = (bl + 2*bc + br) - (tl + 2*tc + tr);

      let nx = dx * baseStr * (1 + sharpenAmt);
      let ny = dy * baseStr * (1 + sharpenAmt) * invY;
      let nz = 1;

      // normalize
      const len = Math.hypot(nx, ny, nz) || 1;
      nx = nx/len * 0.5 + 0.5;
      ny = ny/len * 0.5 + 0.5;
      nz = nz/len * 0.5 + 0.5;

      const idx = 4 * (y*w + x);
      od[idx]   = nx * 255;
      od[idx+1] = ny * 255;
      od[idx+2] = nz * 255;
      od[idx+3] = 255;
    }
  }

  ctx.putImageData(out, 0, 0);
  return c;
}

// —————————
// DOWNLOAD FULL RESOLUTION
// —————————
dlBtn.addEventListener("click", () => {
  if (!sourceImage) return;
  const cvs = generateNormalCanvas(sourceImage, fullW, fullH);
  cvs.toBlob(blob => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "normal_map.png";
    a.click();
  });
});
