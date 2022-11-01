"use strict";

function gcd(a,b) {
    while(b>0) [a,b]=[b,a%b];
    return a;
}

function getDist(a,b) { 
    let dx = b.x-a.x, dy = b.y-a.y; 
    return Math.sqrt(dx*dx+dy*dy); ù
}


// ----------------------------------------------------------------------------

class GearBox {
    constructor(n1, n2, pDist = 0.7) {
        this.toothWidth = 17;
        this.toothHeight = this.toothWidth * 0.4;
        this.toothFactor = this.toothWidth/(2*Math.PI);
        this.n1 = n1;
        this.r1 = n1 * this.toothFactor;
        this._setN2(n2);
        this.phi = 0;
        this.psiOffset = 0;
        this.c1 = {x:0, y:0};
        this.makePens();
        this.update();
    }

    _setN2(n2) {
        this.n2 = n2;
        this.r2 = n2 * this.toothFactor;
        this.orbitCount = this.n2/gcd(this.n1,n2);
    }

    setN2(n2) {
        const { phi, n1 } = this;
        let delta =  phi * (1 - n1/this.n2) - phi*(1 - n1/n2);
        this._setN2(n2);
        this.psiOffset += delta;
        this.update();        
    }

    setPDist(pDist, penIndex = 0) {
        this.pens[penIndex].pDist = pDist;
        this.updatePens();
    }

    setPhi(phi) {
        this.phi = phi;
        this.update();
    }

    makePens() {
        this.pens = [Math.PI].map(theta => ({
            theta, pDist : 0.5, localPt : {x:0, y:0}, localEndPt : {x:0, y:0}, pt : { }
        }))
    }

    updatePens() {
        let psiOffset = this.psiOffset;
        let psi = this.psi;
        let r2 = this.r2;
        let cx = this.c1.x, cy = this.c1.y;

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
        this.c1.x = Math.cos(phi) * (r1-r2);
        this.c1.y = Math.sin(phi) * (r1-r2);
        
        this.updatePens();
    }
}

// ----------------------------------------------------------------------------

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

    recompute() {
        const { pts, gearBox, pen } = this;
        let oldPhi = gearBox.phi;
        pts.forEach(p => {
            gearBox.setPhi(p.phi);
            p.x = pen.pt.x;
            p.y = pen.pt.y;            
        });
        gearBox.setPhi(oldPhi);
    }

    prune() {
        let phi = this.gearBox.phi;
        let maxAngle = Math.PI*2*this.gearBox.orbitCount*trailLength;
        const pts = this.pts;
        let i = 0;
        while(i+1<pts.length && phi-pts[i+1].phi >= maxAngle) i++;
        if(i>0) {
            // i+1>=pts.length || assert phi-pts[i+1].phi < maxAngle
            // assert phi-maxAngle > pts[i].phi 
            if(i+1<pts.length) {
                let pt = pts[i];
                pt.phi = phi - maxAngle;
                let oldPhi = gearBox.phi;
                gearBox.setPhi(pt.phi);
                pt.x = this.pen.pt.x;
                pt.y = this.pen.pt.y;
                gearBox.setPhi(oldPhi);                                
            }
            
            pts.splice(0,i);
        }
    }
}


// ----------------------------------------------------------------------------

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

// ----------------------------------------------------------------------------

let canvas, ctx;
const gearBox = new GearBox(120,70,0.7);
let trailLength = 1.0; // as a fraction of the orbitLength

let speed = 20;
let oldTime = performance.now();

let trail = new Trail(gearBox,0);

// ----------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', ()=>{
    buildLayout();
    ctx = canvas.getContext('2d');    
    updateFields();
    animate();
})



function animate() {
    let time = performance.now();
    let dt = (time-oldTime);
    oldTime = time;
    gearBox.phi += speed * dt * 0.00005;
    gearBox.update();
    trail.tick();
    redraw();
    requestAnimationFrame(animate);
}


// ----------------------------------------------------------------------------

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

function drawTrail(trail) {
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
}

function redraw() {

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);     

    // draw outer gear
    drawOutGear();

    // draw inner gear
    ctx.save();    
    ctx.translate(gearBox.c1.x, gearBox.c1.y);
    ctx.rotate(gearBox.psi);
    drawInGear();
    ctx.restore();


    // draw trail.
    drawTrail(trail);

    ctx.restore();
}

// ----------------------------------------------------------------------------

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
    infoPanel.classList.add("info-panel");
    sidePanel.appendChild(infoPanel);
    infoPanel.innerHTML = `
    <p>N<sub>interno</sub> = <span id="n2-fld">2</span></p>
    <p>N<sub>esterno</sub> = <span id="n1-fld">2</span></p>
    <p>Rapporto</sub> =             
        <span class="fraction">
            <span id="num-fld" class="num">1</span>
            <span id="den-fld" class="den">2</span>
        </span>
    </p>
    `;
    let controlPanel = document.createElement('div');
    sidePanel.appendChild(controlPanel);
    controlPanel.classList.add("control-panel");
    addParagraph(controlPanel, "Numero denti ingranaggio interno");
    addSlider(controlPanel, 35,100,gearBox.n2, v => { 
        gearBox.setN2(v); 
        trail.recompute(); 
        updateFields(); 
    } )
    addParagraph(controlPanel, "Distanza dal centro della penna");
    addSlider(controlPanel, 1,100,Math.floor(0.5+gearBox.pDist*100), v=> {
        gearBox.setPDist(v*0.01);
        trail.recompute();
    });

    addParagraph(controlPanel, "Velocità");
    addSlider(controlPanel, 0,100,speed, (v)=> speed=v)

    addParagraph(controlPanel, "Max. lunghezza scia");
    addSlider(controlPanel, 0,100,trailLength*100, (v)=> trailLength = v*0.01 )

    // see https://stackoverflow.com/questions/69490604/html-input-range-type-becomes-un-usable-by-drag-action-if-highlighted-in-chrome
    document.querySelectorAll('input[type="range"]').forEach((input) => { 
        input.addEventListener('mousedown',  () => window.getSelection().removeAllRanges());
    });
}

function updateFields() {
    document.getElementById('n1-fld').innerHTML = gearBox.n1;
    document.getElementById('n2-fld').innerHTML = gearBox.n2;
    let g = gcd(gearBox.n1,gearBox.n2);
    document.getElementById('num-fld').innerHTML = gearBox.n2/g;
    document.getElementById('den-fld').innerHTML = gearBox.n1/g;    
}


const styleContent = `
#container {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: flex-start;
}
canvas {
    width:750px;
    height:750px;
    margin-right:30px;
}
.info-panel {
    font-size:30px;
    font-weight:bold;
    margin-bottom: 2em;

}
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
.control-panel p {
    margin-top:1em;
    margin-bottom:0;
}
input[type=range] {
    width:220px;
}
`;
