


"use strict";

function gcd(a,b) {
    while(b>0) [a,b]=[b,a%b];
    return a;
}

class GearBox {
    constructor(n1, n2, pDist = 0.7) {
        this.toothWidth = 20;
        this.toothHeight = this.toothWidth * 0.4;
        this.toothFactor = this.toothWidth/(2*Math.PI);
        this.n1 = n1;
        this.r1 = n1 * this.toothFactor;
        this._setN2(n2);
        this.phi = 0;
        this.psiOffset = 0;
        this.c1 = [0,0];
        this.c2 = [0,0];
        this.makePens();
        this.update();
    }

    _setN2(n2) {
        this.n2 = n2;
        this.r2 = n2 * this.toothFactor;
        this.orbitCount = this.n2/gcd(this.n1,n2);
    }

    setN2(n2) {
        const { phi, n1, psiOffset } = this;
        let delta =  phi * (1 - n1/this.n2) - phi*(1 - n1/n2);
        this._setN2(n2);
        // note: use psiOffset instead of psiIntOffset
        // the idea is to stabilize the orientation of gear2 while changing n2 
        let angleUnit = 2*Math.PI/this.n2;
        this.psiOffset += delta;
        //this.psiRoundedOffset = angleUnit * Math.floor(0.5 + this.psiOffset / angleUnit);
        this.update();        
    }

    setPDist(pDist, penIndex = 0) {
        this.pens[penIndex].pDist = pDist;
        this.updatePens();
    }

    makePens() {
        this.pens = [Math.PI, Math.PI + 2*Math.PI/5].map(theta => ({
            theta, pDist : 0.5, localPt : {x:0, y:0}, localEndPt : {x:0, y:0}, pt : { }
        }))
    }

    updatePens() {
        let psiOffset = this.psiOffset;
        let psi = this.psi;
        let r2 = this.r2;
        let cx = this.c1[0], cy = this.c1[1];

        this.pens.forEach(pen => {
            let localTheta = psiOffset + pen.theta;
            let cs = Math.cos(localTheta), sn = Math.sin(localTheta), r = pen.pDist * r2;
            pen.localPt.x = cs * r;
            pen.localPt.y = sn * r;
            r = r2;
            pen.localEndPt.x = cs * r;
            pen.localEndPt.y = sn * r;
            let theta = psi + localTheta;
            r = pen.pDist * r2;
            pen.pt.x = cx + Math.cos(theta)*r;
            pen.pt.y = cy + Math.sin(theta)*r;
        });
    }

    update() {
        const { n1, n2, psiOffset, psiRoundedOffset, r1, r2, phi, psi, pDist } = this;
        this.psi = phi * (1 - n1/n2); //  * 2 * Math.PI / n2;
        this.c1[0] = Math.cos(phi) * (r1-r2);
        this.c1[1] = Math.sin(phi) * (r1-r2);
        
        //let r = r2 * pDist;
        //this.c2[0] = Math.cos(psi+Math.PI+psiOffset) * r;
        //this.c2[1] = Math.sin(psi+Math.PI+psiOffset) * r;
        this.updatePens();
    }
}

function getDist(a,b) { let dx = b.x-a.x, dy = b.y-a.y; return Math.sqrt(dx*dx+dy*dy); }

class Trail {
    constructor(gearBox, penIndex) {
        this.gearBox = gearBox;
        this.pen = gearBox.pens[penIndex];
        this.pts = [];
    }

    tick() {
        this.addPt();
        this.prune();
    }

    clear() {
        this.pts = [];
    }

    addPt() {
        let pt = { x:this.pen.pt.x, y:this.pen.pt.y, phi:this.gearBox.phi };
        const pts = this.pts;
        let n = pts.length;
        if(n == 0) { pts.push(pt); return; }
        if(getDist(pts[n-1], pt)<1) return;
        if(n == 1) {pts.push(pt); return; }
        if(getDist(pts[n-2], pt)<4) { pts[n-1] = pt; }
        pts.push(pt);
    }

    prune() {
        let phi = this.gearBox.phi;
        let maxAngle = Math.PI*2*this.gearBox.orbitCount*trailLength;
        const pts = this.pts;
        let i = 0;
        while(i+1<pts.length && phi-pts[i+1].phi > maxAngle) i++;
        if(i>0) pts.splice(0,i);
    }


}

let canvas, ctx;
const gearBox = new GearBox(120,70,0.7);

/*
const toothWidth = 20, toothHeight = 8;
let n1 = 120, n2 = 70;
let orbitCount = n1/gcd(n1,n2);
let pDist = 0.7;
*/
let trailLength = 0; // as a fraction of the orbitLength

/*
let r1, r2;
r1 = computeRadius(n1);
r2 = computeRadius(n2);

let phi=0, psi=0, psiOffset = 0; 
let c0, c1, c2, pt;
*/

let speed = 0*20;
let oldTime = performance.now();

let trail = new Trail(gearBox,0);
//let trailPts = [];
//let trailMode = 0; // 0=niente coda, 1=coda, 2=traiettoria completa


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
    sld.addEventListener('input',(e)=>{ cb(parseInt(e.target.value))});
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
    addSlider(controlPanel, 35,100,gearBox.n2, v => { gearBox.setN2(v); trail.clear(); updateFields(); } )
    addParagraph(controlPanel, "Distanza dal centro della penna");
    addSlider(controlPanel, 1,100,Math.floor(0.5+gearBox.pDist*100), v=> gearBox.setPDist(v*0.01))
    addParagraph(controlPanel, "Velocità");
    addSlider(controlPanel, 0,100,speed, (v)=> {speed=v; return false;})
    addParagraph(controlPanel, "Lunghezza scia");
    addSlider(controlPanel, 0,100,trailLength*100, (v)=> setTrailLength(v*0.01))

    // see https://stackoverflow.com/questions/69490604/html-input-range-type-becomes-un-usable-by-drag-action-if-highlighted-in-chrome
    document.querySelectorAll('input[type="range"]').forEach((input) => { 
        input.addEventListener('mousedown',  () => window.getSelection().removeAllRanges());
    });
}

function animate() {
    redraw();
    requestAnimationFrame(animate);
}

/*
function updateTrail() {
    trailMode = 2;
    trailPts = [];
    let oldPhi = gearBox.phi;
    let startPhi = gearBox.phi - Math.PI*2*gearBox.orbitCount * trailLength / 100.0;
    gearBox.phi = startPhi;
    gearBox.update();
    trailPts.push(gearBox.c2);
    const dphi = 0.1;
    gearBox.phi += dphi;
    while(gearBox.phi < oldPhi) {
        gearBox.update();
        trailPts.push(gearBox.c2);
        gearBox.phi += dphi;
    }
    gearBox.phi = oldPhi;
    gearBox.update();
    trailPts.push(gearBox.c2);
}
*/

function setTrailLength(v) {
    trailLength = v;
    // updateTrail();
    
}

/*
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
*/

document.addEventListener('keydown', (e) => {
    console.log(e);
    /*
    if(e.key == "w") { setN2(n2+1); }
    else if(e.key == "q") { setN2(n2-1); }
    else if(e.key == "a") { setPDist(pDist - 0.1); }
    else if(e.key == "s") { setPDist(pDist + 0.1);  }
    else if(e.key == '1') { trailPts = []; trailMode = 0; }
    else if(e.key == '2') { trailPts = []; trailMode = 1; }
    else if(e.key == '3') { updateTrail(); trailMode = 2; }
    else if(e.key == '+') { speed ++; }
    else if(e.key == '-') { if(speed>0) speed --; }
    */
});

/*
function computeRadius(n) 
{
    return toothWidth*n/(2*Math.PI);
}
*/

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
    const rmid = gearBox.toothWidth * n / (Math.PI*2);
    const r1 = rmid - gearBox.toothHeight/2, 
          r2 = rmid + gearBox.toothHeight/2;
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
    let pts = createGearOutline(gearBox.n1);
    ctx.fillStyle = "#ccc";
    ctx.strokeStyle = "black";
    drawTeeth(pts);

    let r = gearBox.r1 + gearBox.toothHeight*1.1;
    circlePath(0,0,r);
    ctx.strokeStyle = "#888";
    ctx.stroke();
}

function drawInGear() {
    const { r2,n2, pDist, toothHeight } = gearBox;
    let pts = createGearOutline(n2);
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    drawTeeth(pts);

    let r = r2 - toothHeight * 1.1;

    // draw radial lines for each pen
    ctx.beginPath();
    gearBox.pens.forEach(pen=>{
        ctx.moveTo(0,0);
        ctx.lineTo(pen.localEndPt.x, pen.localEndPt.y);    
    })        
    ctx.strokeStyle = "#aaa";
    ctx.stroke();
    
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
        let theta = 2*Math.PI*i/m + gearBox.psiOffset;
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

    // draw pens
    gearBox.pens.forEach(pen=>{
        circlePath(pen.localPt.x,pen.localPt.y,3);
        ctx.fillStyle = "red";
        ctx.fill();
        ctx.stroke();
    });
}

function tick() {
    let time = performance.now();
    let dt = (time-oldTime);
    oldTime = time;

    gearBox.phi += speed * dt * 0.00005;
    gearBox.update();
    trail.tick();
}

/*
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
    * /
}
*/

function redraw() {

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);

    tick();
    gearBox.update();
     

    drawOutGear();



    // draw inner gear
    ctx.save();    
    ctx.translate(gearBox.c1[0], gearBox.c1[1]);
    ctx.rotate(gearBox.psi);
    drawInGear();
    ctx.restore();


    // draw trail.
    if(trail.pts.length>2) {
        ctx.beginPath();
        ctx.moveTo(trail.pts[0].x, trail.pts[0].y);
        trail.pts.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));
        ctx.lineWidth = 3;
        ctx.strokeStyle = "red";
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.globalAlpha = 1;        
    }

    ctx.restore();
    // update(performance.now()*0.001);
}


function updateFields() {
    document.getElementById('n1-fld').innerHTML = gearBox.n1;
    document.getElementById('n2-fld').innerHTML = gearBox.n2;
    let g = gcd(gearBox.n1,gearBox.n2);
    document.getElementById('num-fld').innerHTML = gearBox.n2/g;
    document.getElementById('den-fld').innerHTML = gearBox.n1/g;    
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

input[type=range] {
    width:220px;
}
`;
