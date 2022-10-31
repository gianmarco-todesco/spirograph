


"use strict";


let canvas, ctx;
const toothWidth = 20, toothHeight = 8;
let n1 = 120, n2 = 70;
let orbitCount = n1/gcd(n1,n2);
let pDist = 0.7;
let trailLength = 0;

let r1, r2;
r1 = computeRadius(n1);
r2 = computeRadius(n2);

let phi=0, psi=0, psiOffset = 0; 
let c0, c1, c2, pt;
let speed = 20;
let oldTime = performance.now();

let trailPts = [];
let trailMode = 0; // 0=niente coda, 1=coda, 2=traiettoria completa

document.addEventListener('DOMContentLoaded', ()=>{

    buildLayout();

    ctx = canvas.getContext('2d');
    
    updateFields();

    animate();

})

function addSlider(container, vmin, vmax, value, cb) {
    let sld = document.createElement('input');
    sld.setAttribute('type', 'range');
    sld.setAttribute('min', vmin);
    sld.setAttribute('max', vmax);
    sld.setAttribute('value', value);
    sld.addEventListener('input',(e)=>{ console.log(e); cb(parseInt(e.target.value))});
    container.appendChild(sld);
    container.appendChild(document.createElement('br'));
    return sld;
}

function addParagraph(container, text) {
    let p = document.createElement('p');
    p.innerHTML = text;
    container.appendChild(p);
    return p;
}

function buildLayout() {
    let style = document.createElement('style');
    style.innerHTML = styleContent;
    document.head.appendChild(style);
    let container = document.getElementById('container');
    canvas = document.createElement('canvas');
    container.appendChild(canvas);

    let sidePanel = document.createElement('div');
    container.appendChild(sidePanel);
    let infoPanel = document.createElement('div');
    sidePanel.appendChild(infoPanel);
    infoPanel.innerHTML = `
    <p>N<sub>1</sub> = <span id="n2-fld">2</span></p>
    <p>N<sub>2</sub> = <span id="n1-fld">2</span></p>
    <p>Rapporto</sub> =             
        <span class="fraction">
            <span id="num-fld" class="num">1</span>
            <span id="den-fld" class="den">2</span>
        </span>
    </p>
    `;
    let controlPanel = document.createElement('div');
    sidePanel.appendChild(controlPanel);
    addParagraph(controlPanel, "Numero denti ingranaggio interno");
    addSlider(controlPanel, 20,100,n2, (v)=> setN2(v))
    addParagraph(controlPanel, "Distanza dal centro della penna");
    addSlider(controlPanel, 1,100,Math.floor(0.5+pDist*100), (v)=> setPDist(v*0.01))
    addParagraph(controlPanel, "Velocità");
    addSlider(controlPanel, 0,100,speed, (v)=> {speed = v})
    addParagraph(controlPanel, "Lunghezza scia");
    addSlider(controlPanel, 0,100,trailLength, (v)=> setTrailLength(v))
}

function animate() {
    redraw();
    requestAnimationFrame(animate);
}

function gcd(a,b) {
    while(b>0) [a,b]=[b,a%b];
    return a;
}

function updateTrail() {
    trailMode = 2;
    trailPts = [];
    let oldPhi = phi;
    let startPhi = phi - Math.PI*2*orbitCount * trailLength / 100.0;
    phi = startPhi;
    updateGearPositions();
    trailPts.push(c2);
    const dphi = 0.1;
    phi += dphi;
    while(phi < oldPhi) {
        updateGearPositions();
        trailPts.push(c2);
        phi += dphi;
    }
    phi = oldPhi;
    updateGearPositions();
    trailPts.push(c2);
}

function setTrailLength(v) {
    trailLength = v;
    updateTrail();
    
}

function setN2(_n2) {
    trailPts = [];
    n2 = _n2;
    r1 = computeRadius(n1);
    r2 = computeRadius(n2);
    orbitCount = n1/gcd(n1,n2);
    let delta = psi - computePsi(phi);
    let angleUnit = 2*Math.PI/n2;
    psiOffset += Math.floor(0.5 + delta/angleUnit);
    update();
    if(trailMode==2) updateTrail();
    updateFields();
}

function setPDist(_pDist) {
    pDist = Math.min(1, Math.max(0.2, _pDist));
    if(trailMode == 2) updateTrail();
    else if(trailMode == 1) pts = [];
}

function computePsi(phi) 
{
    return phi - phi * n1/n2 + psiOffset * 2*Math.PI/n2;    
}

document.addEventListener('keydown', (e) => {
    console.log(e);
    if(e.key == "w") { setN2(n2+1); }
    else if(e.key == "q") { setN2(n2-1); }
    else if(e.key == "a") { setPDist(pDist - 0.1); }
    else if(e.key == "s") { setPDist(pDist + 0.1);  }
    else if(e.key == '1') { trailPts = []; trailMode = 0; }
    else if(e.key == '2') { trailPts = []; trailMode = 1; }
    else if(e.key == '3') { updateTrail(); trailMode = 2; }
    else if(e.key == '+') { speed ++; }
    else if(e.key == '-') { if(speed>0) speed --; }
});


function computeRadius(n) 
{
    return toothWidth*n/(2*Math.PI);
}

function circlePath(x,y,r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arc(x,y,r,0,2*Math.PI);
}


function createGearOutline(n) {
    const phi_i = 2*Math.PI/n;
    const d = 0.1;
    const ts = [0, d,0.5,0.5+d];
    const gearPts = [];
    const rmid = toothWidth * n / (Math.PI*2);
    const r1 = rmid - toothHeight/2, 
          r2 = rmid + toothHeight/2;
    const rr = [r1,r2,r2,r1];
    for(let i=0; i<n; i++) {
        for(let j=0; j<4; j++) {
            const phi = phi_i * (i + ts[j]);
            const r = rr[j];
            gearPts.push([Math.cos(phi) * r, Math.sin(phi) * r]);            
        }
    }
    return gearPts;
}

function drawTeeth(pts) {
    ctx.beginPath();
    let last = pts.length-1;
    ctx.moveTo(pts[last][0], pts[last][1]);
    pts.forEach(([x,y])=>ctx.lineTo(x,y));
    ctx.fill();
    ctx.stroke();    
}

function drawOutGear() {
    let pts = createGearOutline(n1);
    ctx.fillStyle = "#ccc";
    ctx.strokeStyle = "black";
    drawTeeth(pts);

    let r = toothWidth * n1 / (Math.PI*2) + toothHeight*1.1;
    circlePath(0,0,r);
    ctx.strokeStyle = "#888";
    ctx.stroke();
}

function drawInGear() {
    let pts = createGearOutline(n2);
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    drawTeeth(pts);
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(-r2-5,0);
    ctx.strokeStyle = "#aaa";
    ctx.stroke();
    
    let r = r2 - toothHeight * 1.1;
    circlePath(0,0,r);
    ctx.strokeStyle = "#888";
    ctx.stroke();

    circlePath(0,0,5);
    ctx.fillStyle = "#ddd";
    ctx.fill();
    ctx.strokeStyle = "black";
    ctx.stroke();
    circlePath(0,0,9);
    ctx.stroke();

    let m = 5;
    for(let i=0; i<m; i++) {
        let theta = 2*Math.PI*i/m;
        let rr = r2*0.6;
        let x = Math.cos(theta)*rr;
        let y = Math.sin(theta)*rr;
        circlePath(x,y,r2/4);
        ctx.fillStyle = "#ccc";
        ctx.strokeStyle = "black";
        ctx.fill();
        ctx.stroke();
        circlePath(x,y,r2/4+5);
        ctx.stroke();
    }

    let x = -r2 * pDist;
    circlePath(x,0,3);
    ctx.fillStyle = "red";
    ctx.fill();
    ctx.stroke();

}

function tick() {
    let time = performance.now();
    let dt = (time-oldTime);
    oldTime = time;

    phi += speed * dt * 0.00005;
}

function updateGearPositions() {

    psi = computePsi(phi);
    c1 = [Math.cos(phi) * (r1-r2) + c0[0], 
        Math.sin(phi) * (r1-r2) + c0[1]];
    c2 = [
        Math.cos(psi+Math.PI) * r2 * pDist + c1[0], 
        Math.sin(psi+Math.PI) * r2 * pDist + c1[1]
    ];
    /*
    if(trailMode==1) {
        trailPts.push(c2);
        const maxPtsCount = 10000;
        if(trailPts.length>maxPtsCount)
            trailPts.splice(0, trailPts.length-maxPtsCount)    
    }
    */
}

function redraw() {

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    ctx.clearRect(0,0,canvas.width, canvas.height);
    c0 = [canvas.width/2, canvas.height/2];

    tick();
    updateGearPositions();
     

    ctx.save();
    ctx.translate(c0[0],c0[1]);
    drawOutGear();
    ctx.restore();



    // draw inner gear
    ctx.save();    
    ctx.translate(c1[0],c1[1]);
    ctx.rotate(psi);
    drawInGear();
    ctx.restore();


    // draw trail.
    if(trailPts.length>2) {
        ctx.beginPath();
        ctx.moveTo(trailPts[0][0], trailPts[0][1]);
        trailPts.slice(1).forEach(([x,y])=>ctx.lineTo(x,y));
        ctx.lineWidth = 3;
        ctx.strokeStyle = "red";
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.globalAlpha = 1;        
    }


    // update(performance.now()*0.001);
}


function updateFields() {
    /*
    document.getElementById('n1-fld').innerHTML = n1;
    document.getElementById('n2-fld').innerHTML = n2;
    let g = gcd(n1,n2);
    document.getElementById('num-fld').innerHTML = n2/g;
    document.getElementById('den-fld').innerHTML = n1/g;
    */
    
}


const styleContent = `
html, body {
    overflow: hidden;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    font-family: 'Lato', sans-serif;
}
canvas {
    width:900px;
    height:900px;
}
#container {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
}
h1 {
    font-size:50px;
}
#info p {
    font-size:30px;
    font-weight:bold;
}
#info td { padding:10px;}
.fraction {
    display:inline-flex;
    flex-direction:column;
    vertical-align:middle;
    text-align: right;
}
.num {}
.den { border-top:3px solid; }
.slider-container {
    font-size:20px;
}
`;
