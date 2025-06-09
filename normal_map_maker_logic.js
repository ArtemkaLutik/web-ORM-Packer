// Normal Map Maker – core logic
// Expects THREE.js already loaded via CDN


import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.156.0/build/three.module.js';

(() => {
    // DOM refs
    const fileInput   = document.getElementById('texture-input');
    const strengthInp = document.getElementById('strength');
    const blurInp     = document.getElementById('blur');
    const sharpenInp  = document.getElementById('sharpen');
    const invertYInp  = document.getElementById('invertY');
    const downloadBtn = document.getElementById('download-btn');
    const hiddenCanvas = document.createElement('canvas');
    const hiddenCtx    = hiddenCanvas.getContext('2d');
  
    // THREE preview setup
    const previewDiv = document.getElementById('three-preview');
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(512, 512);
    previewDiv.appendChild(renderer.domElement);
  
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10);
    camera.position.z = 2;
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const point = new THREE.PointLight(0xffffff, 1);
    point.position.set(2, 2, 2);
    scene.add(point);
  
    const geometry = new THREE.SphereGeometry(0.8, 64, 64);
    const defaultTex = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial({
      color: 0x888888,
      normalMap: defaultTex,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
  
    // simple orbit-like spin
    let autoRotate = true;
    function animate() {
      requestAnimationFrame(animate);
      if (autoRotate) mesh.rotation.y += 0.005;
      renderer.render(scene, camera);
    }
    animate();
  
    // =============== Image › NormalMap pipeline ===============
  
    function processImage(img) {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      hiddenCanvas.width = w;
      hiddenCanvas.height = h;
  
      // draw grayscale
      hiddenCtx.drawImage(img, 0, 0);
      const data = hiddenCtx.getImageData(0, 0, w, h);
      const px = data.data;
  
      // grayscale conversion + levels
      const black = 0;
      const white = 255;
      const gamma = 1;
      for (let i = 0; i < px.length; i += 4) {
        const r = px[i];
        const g = px[i+1];
        const b = px[i+2];
        // luminance
        let l = 0.2126*r + 0.7152*g + 0.0722*b;
        // levels (simple linear for now)
        l = (l - black) / (white - black);
        l = Math.max(0, Math.min(1, l));
        // gamma
        l = Math.pow(l, gamma);
        const v = l * 255;
        px[i] = px[i+1] = px[i+2] = v;
      }
  
      hiddenCtx.putImageData(data,0,0);
  
      // optional blur – crude stackbox blur, small radius
      const blurRadius = parseInt(blurInp.value, 10);
      if (blurRadius > 0) {
        stackBoxBlur(hiddenCtx, w, h, blurRadius);
      }
  
      // generate normals
      const heightData = hiddenCtx.getImageData(0,0,w,h).data;
      const normalData = hiddenCtx.createImageData(w, h);
      const dst = normalData.data;
      const strength = parseFloat(strengthInp.value);
  
      const getHeight = (x,y) => heightData[4*( (y*h) + x )] / 255;
  
      for (let y=1; y<h-1; y++){
        for (let x=1; x<w-1; x++){
          const sx = getHeight(x+1,y) - getHeight(x-1,y);
          const sy = getHeight(x,y+1) - getHeight(x,y-1);
          let nx = -sx * strength;
          let ny = (invertYInp.checked ? sy : -sy) * strength;
          let nz = 1.0;
          // normalize
          const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
          nx = (nx/len)*0.5 + 0.5;
          ny = (ny/len)*0.5 + 0.5;
          nz = (nz/len)*0.5 + 0.5;
          const idx = 4*(y*w + x);
          dst[idx]   = nx*255;
          dst[idx+1] = ny*255;
          dst[idx+2] = nz*255;
          dst[idx+3] = 255;
        }
      }
      hiddenCtx.putImageData(normalData,0,0);
  
      // sharpen (unsharp mask)
      const sharpAmt = parseInt(sharpenInp.value,10);
      if (sharpAmt>0){
        unsharpMask(hiddenCtx,w,h,sharpAmt/100);
      }
  
      // apply to THREE
      const tex = new THREE.CanvasTexture(hiddenCanvas);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      material.normalMap = tex;
      material.needsUpdate = true;
    }
  
    // =============== Helpers ===============
  
    function stackBoxBlur(ctx,w,h,r){
      // naive 2‑pass box blur (quick and dirty)
      const imgData = ctx.getImageData(0,0,w,h);
      const data = imgData.data;
      const tmp = new Uint8ClampedArray(data);
      // horizontal
      for (let y=0;y<h;y++){
        for (let x=0;x<w;x++){
          let acc=0;
          for(let k=-r;k<=r;k++){
            const ix = Math.min(w-1, Math.max(0,x+k));
            acc += tmp[4*(y*w+ix)];
          }
          const idx = 4*(y*w+x);
          const val = acc/(2*r+1);
          data[idx]=data[idx+1]=data[idx+2]=val;
        }
      }
      // vertical
      tmp.set(data);
      for (let y=0;y<h;y++){
        for (let x=0;x<w;x++){
          let acc=0;
          for(let k=-r;k<=r;k++){
            const iy = Math.min(h-1, Math.max(0,y+k));
            acc += tmp[4*(iy*w+x)];
          }
          const idx = 4*(y*w+x);
          const val = acc/(2*r+1);
          data[idx]=data[idx+1]=data[idx+2]=val;
        }
      }
      ctx.putImageData(imgData,0,0);
    }
  
    function unsharpMask(ctx,w,h,amount){
      const blurred = ctx.getImageData(0,0,w,h);
      stackBoxBlur({getImageData:()=>blurred, putImageData:()=>{},},w,h,2);
      const orig = ctx.getImageData(0,0,w,h);
      const d = orig.data;
      const b = blurred.data;
      for(let i=0;i<d.length;i+=4){
        const diff = d[i]-b[i];
        const val = d[i] + diff*amount;
        d[i]=d[i+1]=d[i+2]=Math.max(0,Math.min(255,val));
      }
      ctx.putImageData(orig,0,0);
    }
  
    // =============== Events ===============
  
    fileInput.addEventListener('change', e=>{
      if (!e.target.files.length) return;
      const file = e.target.files[0];
      const img = new Image();
      img.onload = ()=>processImage(img);
      img.src = URL.createObjectURL(file);
    });
  
    [strengthInp, blurInp, sharpenInp, invertYInp].forEach(el=>{
      el.addEventListener('input', ()=>{
        if(hiddenCanvas.width) processImage(new Image(hiddenCanvas.toDataURL()));
      });
    });
  
    downloadBtn.addEventListener('click', ()=>{
      const link = document.createElement('a');
      link.download = 'normal_map.png';
      hiddenCanvas.toBlob(blob=>{
        link.href = URL.createObjectURL(blob);
        link.click();
      });
    });
  })();
  