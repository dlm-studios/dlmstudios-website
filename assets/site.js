/* =====================================================================
   DLM Studios — pixel-space behaviour
   - renders the Earth and the MyOlive moon as real projected pixel
     spheres on a <canvas> (low-res, CSS-upscaled -> chunky pixels)
   - builds the star field: coloured dots, plus-stars, sparkles, comets
   - fades the Earth in as you scroll (home page)
   - fade-up reveal for easels
   ===================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* =====================================================================
     Pixel Earth + Moon  (ported from the Claude Design "Pixel Earth and Moon"
     prototype): procedural lat/lon land mask -> fbm-textured surface + clouds,
     dithered terminator lighting, in-canvas blue halo, rose moon.
     ===================================================================== */
  var SEED = 7;

  function h3(x, y, z) {
    var n = x * 374761393 + y * 668265263 + z * 1442695040 + SEED * 2654435761;
    n = (n ^ (n >>> 13)) >>> 0;
    n = Math.imul(n, 1274126177) >>> 0;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  }
  function vn3(x, y, z) {
    var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    var xf = x - xi, yf = y - yi, zf = z - zi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    function c(a, b2, cc) { return h3(xi + a, yi + b2, zi + cc); }
    var x00 = c(0,0,0) + (c(1,0,0) - c(0,0,0)) * u;
    var x10 = c(0,1,0) + (c(1,1,0) - c(0,1,0)) * u;
    var x01 = c(0,0,1) + (c(1,0,1) - c(0,0,1)) * u;
    var x11 = c(0,1,1) + (c(1,1,1) - c(0,1,1)) * u;
    var y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
    return y0 + (y1 - y0) * w;
  }
  function fbm(x, y, z, oct) {
    var a = 0.5, f = 1, sSum = 0, nSum = 0, i;
    for (i = 0; i < oct; i++) { sSum += a * vn3(x * f, y * f, z * f); nSum += a; a *= 0.5; f *= 2.07; }
    return sSum / nSum;
  }

  var LAND_W = 384, LAND_H = 192, LAND = null;
  var TEX_W = 384, TEX_H = 192, SURF = null, CLOUDS = null, LIGHTS = null;
  var MOON_W = 320, MOON_H = 160, MOONTEX = null;

  function buildLand() {
    var P = {
      na: [[-168,65],[-160,71],[-140,70],[-125,70],[-110,68],[-95,70],[-85,73],[-75,68],[-60,58],[-55,50],[-65,45],[-70,42],[-75,35],[-81,25],[-97,26],[-105,20],[-115,30],[-125,40],[-130,52],[-145,60],[-162,58]],
      ca: [[-97,18],[-92,15],[-83,9],[-77,8],[-82,15],[-88,21],[-95,20]],
      sa: [[-81,8],[-75,10],[-60,11],[-50,5],[-35,-5],[-38,-15],[-48,-25],[-58,-35],[-62,-42],[-66,-55],[-72,-52],[-73,-40],[-71,-30],[-70,-18],[-80,-5],[-81,2]],
      gr: [[-45,83],[-20,78],[-22,70],[-42,60],[-55,68],[-58,75]],
      is: [[-24,65],[-14,66],[-14,63],[-22,63]],
      af: [[-17,15],[-10,28],[0,35],[10,37],[20,32],[33,31],[35,22],[43,12],[51,12],[42,0],[40,-15],[35,-25],[25,-34],[18,-34],[12,-18],[9,-2],[4,5],[-8,4],[-14,9]],
      eu: [[-10,36],[0,44],[3,43],[12,45],[19,40],[24,41],[28,36],[36,36],[36,30],[43,38],[48,30],[56,26],[62,25],[68,24],[72,19],[80,13],[80,20],[87,22],[92,21],[99,10],[104,10],[107,17],[110,21],[117,23],[122,30],[122,40],[127,39],[130,43],[135,48],[142,53],[160,60],[170,66],[179,66],[179,72],[140,74],[110,77],[75,74],[60,70],[40,68],[30,70],[28,60],[22,60],[12,55],[8,57],[4,52],[-2,49],[-5,43],[-9,38]],
      uk: [[-5,50],[-2,53],[-3,58],[-6,57],[-6,53]],
      jp: [[130,32],[136,35],[141,40],[145,44],[141,37],[137,34]],
      md: [[44,-16],[50,-15],[50,-25],[45,-25]],
      au: [[114,-22],[113,-26],[116,-35],[129,-32],[138,-35],[146,-39],[150,-37],[153,-28],[146,-19],[142,-11],[135,-12],[130,-11],[125,-14],[118,-18]],
      ng: [[131,-1],[141,-3],[150,-6],[143,-9],[134,-8]],
      nz: [[172,-41],[174,-37],[178,-38],[175,-42],[170,-46],[167,-46]],
      su: [[95,5],[100,1],[106,-6],[103,-5],[97,2]],
      bo: [[109,2],[117,5],[119,-1],[114,-4],[110,-2]],
      ja: [[105,-7],[114,-7],[115,-9],[106,-9]],
      ph: [[120,18],[124,12],[126,7],[122,6],[119,11]]
    };
    var keys = Object.keys(P), polys = [], k, pts, aa;
    for (k = 0; k < keys.length; k++) {
      pts = P[keys[k]];
      var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (aa = 0; aa < pts.length; aa++) {
        if (pts[aa][0] < x0) x0 = pts[aa][0];
        if (pts[aa][0] > x1) x1 = pts[aa][0];
        if (pts[aa][1] < y0) y0 = pts[aa][1];
        if (pts[aa][1] > y1) y1 = pts[aa][1];
      }
      polys.push({ pts: pts, x0: x0, x1: x1, y0: y0, y1: y1 });
    }
    var W = LAND_W, H = LAND_H, m = new Uint8Array(W * H), i, j, pk;
    for (j = 0; j < H; j++) {
      var lat = 90 - (j + 0.5) / H * 180;
      for (i = 0; i < W; i++) {
        var lon = (i + 0.5) / W * 360 - 180;
        var inside = lat < -68;
        if (!inside) {
          for (pk = 0; pk < polys.length; pk++) {
            var poly = polys[pk];
            if (lon < poly.x0 || lon > poly.x1 || lat < poly.y0 || lat > poly.y1) continue;
            var pp = poly.pts, c = false, bx;
            for (aa = 0, bx = pp.length - 1; aa < pp.length; bx = aa++) {
              var xa = pp[aa][0], ya = pp[aa][1], xb = pp[bx][0], yb = pp[bx][1];
              if ((ya > lat) !== (yb > lat) && lon < (xb - xa) * (lat - ya) / (yb - ya) + xa) c = !c;
            }
            if (c) { inside = true; break; }
          }
        }
        m[j * W + i] = inside ? 1 : 0;
      }
    }
    LAND = m;
  }

  function landAt(lon, lat) {
    var i = Math.floor((lon + 180) / 360 * LAND_W);
    var j = Math.floor((90 - lat) / 180 * LAND_H);
    i = ((i % LAND_W) + LAND_W) % LAND_W;
    if (j < 0) j = 0; else if (j > LAND_H - 1) j = LAND_H - 1;
    return LAND[j * LAND_W + i];
  }

  function buildEarthTex() {
    var W = TEX_W, H = TEX_H;
    var surf = new Uint8ClampedArray(W * H * 4);
    var clouds = new Uint8ClampedArray(W * H);
    var lights = new Uint8Array(W * H);
    var D2R = Math.PI / 180, i, j;
    for (j = 0; j < H; j++) {
      var lat = 90 - (j + 0.5) / H * 180;
      var cl = Math.cos(lat * D2R), sl = Math.sin(lat * D2R);
      for (i = 0; i < W; i++) {
        var lon = (i + 0.5) / W * 360 - 180;
        var clon = Math.cos(lon * D2R), slon = Math.sin(lon * D2R);
        var sx = cl * clon, sy = sl, sz = cl * slon;
        var wn = fbm(sx * 9, sy * 9, sz * 9, 4) - 0.5;
        var wn2 = fbm(sx * 9 + 40, sy * 9, sz * 9, 4) - 0.5;
        var lonW = lon + wn * 9, latW = Math.max(-89, Math.min(89, lat + wn2 * 7));
        var isLand = landAt(lonW, latW);
        var detail = fbm(sx * 26, sy * 26, sz * 26, 5);
        var r, g, b;
        if (isLand) {
          var dryness = Math.exp(-Math.pow((Math.abs(lat) - 24) / 13, 2)) * 0.85 + (detail - 0.5) * 0.9;
          var alt = fbm(sx * 14 + 7, sy * 14, sz * 14, 5);
          if (Math.abs(lat) > 72 || lat < -62) { r = 226; g = 236; b = 248; }
          else if (Math.abs(lat) > 60) { r = 128; g = 142; b = 128; }
          else if (dryness > 0.45) { r = 172 + alt * 46; g = 136 + alt * 34; b = 78 + alt * 26; }
          else if (alt > 0.63) { r = 118 + alt * 40; g = 104 + alt * 34; b = 74; }
          else { r = 34 + alt * 52; g = 92 + alt * 62; b = 38 + alt * 30; }
          if (alt > 0.78 && Math.abs(lat) > 28) { r = 210; g = 222; b = 236; }
          if (detail > 0.62 && Math.abs(lat) < 62 && h3(i, j, 3) > 0.985) lights[j * W + i] = 1;
        } else {
          var depth = fbm(sx * 5, sy * 5 + 3, sz * 5, 4);
          var shelf = (landAt(lonW + 2.5, latW) || landAt(lonW - 2.5, latW) || landAt(lonW, latW + 2.5) || landAt(lonW, latW - 2.5)) ? 1 : 0;
          r = 10 + depth * 18; g = 38 + depth * 46; b = 116 + depth * 66;
          if (shelf) { r += 22; g += 44; b += 54; }
          if (Math.abs(lat) > 74) { r = 214; g = 228; b = 246; }
        }
        var shd = 0.9 + detail * 0.2;
        var o = (j * W + i) * 4;
        surf[o] = r * shd; surf[o + 1] = g * shd; surf[o + 2] = b * shd; surf[o + 3] = 255;
        var qx = fbm(sx * 3.2, sy * 3.2, sz * 3.2, 3) - 0.5;
        var qy = fbm(sx * 3.2 + 19, sy * 3.2, sz * 3.2, 3) - 0.5;
        var swirl = fbm(sx * 7 + qx * 4, sy * 7 + qy * 4, sz * 7 + qx * 3, 6);
        var band = 0.52 + 0.3 * Math.cos(lat * D2R * 3.1) * 0.6 + (Math.abs(lat) > 66 ? 0.14 : 0);
        var cc = (swirl - band) * 4.6;
        cc = cc < 0 ? 0 : cc > 1 ? 1 : cc;
        clouds[j * W + i] = cc * 255;
      }
    }
    SURF = surf; CLOUDS = clouds; LIGHTS = lights;
  }

  function buildMoonTex() {
    var W = MOON_W, H = MOON_H, t = new Uint8ClampedArray(W * H), D2R = Math.PI / 180, k;
    var craters = [];
    for (k = 0; k < 46; k++) {
      var cu = h3(k, 11, 5), cv = h3(k, 23, 9), cs = h3(k, 31, 13);
      craters.push({ lon: cu * 360 - 180, lat: Math.asin(cv * 2 - 1) / Math.PI * 180, r: 2 + cs * cs * 13 });
    }
    var i, j;
    for (j = 0; j < H; j++) {
      var lat = 90 - (j + 0.5) / H * 180;
      var cl = Math.cos(lat * D2R), sl = Math.sin(lat * D2R);
      for (i = 0; i < W; i++) {
        var lon = (i + 0.5) / W * 360 - 180;
        var sx = cl * Math.cos(lon * D2R), sy = sl, sz = cl * Math.sin(lon * D2R);
        var mare = fbm(sx * 2.4, sy * 2.4, sz * 2.4, 4);
        var vv = 0.78 - (mare < 0.44 ? 0.3 : 0) * (1 - mare);
        vv += (fbm(sx * 22, sy * 22, sz * 22, 5) - 0.5) * 0.16;
        for (k = 0; k < craters.length; k++) {
          var c = craters[k];
          var dLon = (((lon - c.lon + 540) % 360) - 180) * Math.cos(lat * D2R);
          var dd = Math.hypot(dLon, lat - c.lat);
          if (dd < c.r * 1.18) {
            var kk = dd / c.r;
            if (kk < 0.82) vv -= 0.2 * (1 - kk);
            else vv += 0.16 * (1 - Math.abs(kk - 0.95) / 0.25);
            if (kk < 0.5) vv += 0.06;
          }
        }
        t[j * W + i] = (vv < 0 ? 0 : vv > 1 ? 1 : vv) * 255;
      }
    }
    MOONTEX = t;
  }

  /* ---- shared ordered dither ---- */
  var BAY4 = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  var DLEV = 7, DSTEP = 255 / (DLEV - 1);
  function dq(v, bb) {
    var x = Math.round((v + (bb - 0.5) * DSTEP * 0.85) / DSTEP) * DSTEP;
    return x < 0 ? 0 : x > 255 ? 255 : x;
  }

  function renderEarth(ctx, S, t) {
    if (!SURF) return;
    var R = S * 0.38, PI = Math.PI;
    var img = ctx.createImageData(S, S), d = img.data;
    var rot = t * 0.000052, crot = rot * 1.22 + 0.7;
    var tilt = -23.4 * PI / 180, ctil = Math.cos(tilt), stil = Math.sin(tilt);
    var Lx = 0.62, Ly = 0.30, Lz = 0.72;
    var cx = S * 0.5, cy = S * 0.5, px, py;
    for (py = 0; py < S; py++) {
      for (px = 0; px < S; px++) {
        var o = (py * S + px) * 4;
        var bb = BAY4[(py & 3) * 4 + (px & 3)] / 16;
        var nx = (px + 0.5 - cx) / R, ny = (py + 0.5 - cy) / R;
        var d2 = nx * nx + ny * ny;
        var r, g, bl;
        if (d2 <= 1) {
          var z = Math.sqrt(1 - d2);
          var vx = nx, vy = -ny, vz = z;
          var yr = vy * ctil - vz * stil, zr = vy * stil + vz * ctil;
          var lat = Math.asin(yr < -1 ? -1 : yr > 1 ? 1 : yr);
          var lon = Math.atan2(vx, zr);
          var u = (lon + rot) / (2 * PI) + 0.5; u -= Math.floor(u);
          var vpos = 0.5 - lat / PI;
          var ti = Math.min(TEX_W - 1, Math.floor(u * TEX_W));
          var tj = Math.min(TEX_H - 1, Math.max(0, Math.floor(vpos * TEX_H)));
          var so = (tj * TEX_W + ti) * 4;
          r = SURF[so]; g = SURF[so + 1]; bl = SURF[so + 2];
          var cu = (lon + crot) / (2 * PI) + 0.5;
          var cui = Math.min(TEX_W - 1, Math.floor((cu - Math.floor(cu)) * TEX_W));
          var ca = CLOUDS[tj * TEX_W + cui] / 255;
          if (ca > 0) { r += (238 - r) * ca; g += (245 - g) * ca; bl += (255 - bl) * ca; }
          var li = nx * Lx + (-ny) * Ly + z * Lz;
          li = (li + 0.14) / 0.42; li = li < 0 ? 0 : li > 1 ? 1 : li;
          li = li * li * (3 - 2 * li);
          var lum = 0.055 + li * 1.06;
          r *= lum; g *= lum; bl *= lum * (1 + (1 - li) * 0.5);
          if (li < 0.12 && LIGHTS[tj * TEX_W + ti]) { r += 120; g += 96; bl += 40; }
          var rim = Math.pow(d2, 7);
          var rl = 0.35 + li * 0.65;
          r += rim * 70 * rl; g += rim * 120 * rl; bl += rim * 235 * rl;
        } else {
          var dd2 = Math.sqrt(d2);
          var glow = Math.exp(-(dd2 - 1) * 7.5);
          var sideL = (nx * Lx + (-ny) * Ly) / dd2;
          var gl = glow * (0.5 + 0.5 * Math.max(0, sideL));
          r = gl * 34; g = gl * 78; bl = gl * 215;
        }
        d[o] = dq(r, bb); d[o + 1] = dq(g, bb); d[o + 2] = dq(bl, bb); d[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function renderMoon(ctx, S, t) {
    if (!MOONTEX) return;
    var R = S * 0.36, PI = Math.PI;
    var img = ctx.createImageData(S, S), d = img.data;
    var rot = t * 0.000012;
    var Lx = 0.66, Ly = 0.26, Lz = 0.70;
    var cx = S * 0.5, cy = S * 0.5, px, py;
    for (py = 0; py < S; py++) {
      for (px = 0; px < S; px++) {
        var o = (py * S + px) * 4;
        var bb = BAY4[(py & 3) * 4 + (px & 3)] / 16;
        var nx = (px + 0.5 - cx) / R, ny = (py + 0.5 - cy) / R;
        var d2 = nx * nx + ny * ny;
        var r, g, bl;
        if (d2 <= 1) {
          var z = Math.sqrt(1 - d2);
          var yv = -ny;
          var lat = Math.asin(yv < -1 ? -1 : yv > 1 ? 1 : yv);
          var lon = Math.atan2(nx, z);
          var u = (lon + rot) / (2 * PI) + 0.5; u -= Math.floor(u);
          var ti = Math.min(MOON_W - 1, Math.floor(u * MOON_W));
          var tj = Math.min(MOON_H - 1, Math.max(0, Math.floor((0.5 - lat / PI) * MOON_H)));
          var a = MOONTEX[tj * MOON_W + ti] / 255;
          r = 92 + a * 168; g = 44 + a * 150; bl = 66 + a * 148;
          var li = nx * Lx + (-ny) * Ly + z * Lz;
          li = (li + 0.22) / 0.5; li = li < 0 ? 0 : li > 1 ? 1 : li;
          li = li * li * (3 - 2 * li);
          var lum = 0.1 + li * 1.0;
          r *= lum; g *= lum * 0.98; bl *= lum;
        } else {
          var dd2 = Math.sqrt(d2);
          var glow = Math.exp(-(dd2 - 1) * 9.5);
          r = glow * 150; g = glow * 46; bl = glow * 96;
        }
        d[o] = dq(r, bb); d[o + 1] = dq(g, bb); d[o + 2] = dq(bl, bb); d[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function mountCanvas(host, pixelPx) {
    var c = document.createElement("canvas");
    var moon = host.classList.contains("moon__body");
    c.className = moon ? "moon__canvas" : "globe__canvas";
    var w = host.getBoundingClientRect().width || (moon ? 110 : 520);
    var res = Math.round(w / pixelPx);
    if (res < 48) res = 48;
    if (res > 340) res = 340;
    c.width = c.height = res;
    host.innerHTML = "";
    host.appendChild(c);
    return c;
  }

  function spawnBody(canvas, kind) {
    var ctx = canvas.getContext("2d");
    var S = canvas.width;
    var fn = kind === "moon" ? renderMoon : renderEarth;
    if (reduceMotion) {
      var once = function () { if ((kind === "moon" ? MOONTEX : SURF)) fn(ctx, S, 9000); else setTimeout(once, 120); };
      once(); return;
    }
    var last = 0;
    function loop(now) {
      requestAnimationFrame(loop);
      if (now - last < 62) return;   /* ~16 fps, deliberate */
      last = now;
      try { fn(ctx, S, now); } catch (e) {}
    }
    requestAnimationFrame(loop);
  }

  function buildGlobe() {
    var globes = document.querySelectorAll(".globe");
    var moons = document.querySelectorAll(".moon__body");
    if (!globes.length && !moons.length) return;
    /* defer the heavy fbm texture build so first paint isn't blocked */
    setTimeout(function () {
      buildLand();
      buildEarthTex();
      buildMoonTex();
      globes.forEach(function (g) { spawnBody(mountCanvas(g, 3), "earth"); });
      moons.forEach(function (m) { spawnBody(mountCanvas(m, 2), "moon"); });
    }, 40);
  }

  /* ================================================================
     Star field
     ================================================================ */
  var STAR_COLOURS = {
    white:  "#dce8ff",
    cyan:   "#93e0ff",
    blue:   "#7aa2ff",
    purple: "#b98cff",
    red:    "#ff7d7d",
    gold:   "#ffc06a"
  };

  function rand(n) { return Math.floor(Math.random() * n); }
  function pick(arr) { return arr[rand(arr.length)]; }

  function addPlus(host, cols) {
    var ps = document.createElement("span");
    ps.className = "star-plus";
    var psz = 5 + rand(8);
    ps.style.width = ps.style.height = psz + "px";
    ps.style.left = (Math.random() * 100).toFixed(2) + "vw";
    ps.style.top = (Math.random() * 100).toFixed(2) + "vh";
    ps.style.color = STAR_COLOURS[pick(cols)];
    ps.style.animationDelay = (Math.random() * -4).toFixed(2) + "s";
    ps.style.animationDuration = (2 + Math.random() * 2.8).toFixed(2) + "s";
    host.appendChild(ps);
  }

  function addSparkle(host, cols, min, span) {
    var sp = document.createElement("span");
    sp.className = "sparkle";
    sp.innerHTML = "<b></b>";
    var ssz = min + rand(span);
    sp.style.width = sp.style.height = ssz + "px";
    sp.style.left = (Math.random() * 100).toFixed(2) + "vw";
    sp.style.top = (Math.random() * 100).toFixed(2) + "vh";
    sp.style.color = STAR_COLOURS[pick(cols)];
    sp.style.animationDelay = (Math.random() * -6).toFixed(2) + "s";
    sp.style.animationDuration = (2.6 + Math.random() * 3).toFixed(2) + "s";
    host.appendChild(sp);
  }

  function makeStars() {
    var host = document.querySelector(".stars");
    if (!host) return;

    var W = 2600, H = 2600;

    var layers = [
      { n: 280, colour: "white",  cls: "sm tw3" },   /* faint sparkly dust */
      { n: 180, colour: "white",  cls: "" },
      { n: 90,  colour: "white",  cls: "tw" },
      { n: 70,  colour: "cyan",   cls: "lg tw2" },
      { n: 54,  colour: "blue",   cls: "lg tw3" },
      { n: 44,  colour: "purple", cls: "tw" },
      { n: 30,  colour: "red",    cls: "sm" },
      { n: 24,  colour: "gold",   cls: "xl tw2" },
      { n: 20,  colour: "cyan",   cls: "xl" }
    ];

    layers.forEach(function (spec) {
      var col = STAR_COLOURS[spec.colour];
      var shadows = [];
      for (var i = 0; i < spec.n; i++) {
        shadows.push(rand(W) + "px " + rand(H) + "px 0 0 " + col);
      }
      var el = document.createElement("i");
      if (spec.cls) el.className = spec.cls;
      el.style.boxShadow = shadows.join(",");
      if (/tw/.test(spec.cls)) el.style.animationDelay = (Math.random() * -6) + "s";
      host.appendChild(el);

      var clone = el.cloneNode(false);
      clone.style.boxShadow = shadows
        .map(function (s) {
          var q = s.split(" ");
          return q[0] + " " + (parseInt(q[1], 10) + H) + "px 0 0 " + col;
        })
        .join(",");
      host.appendChild(clone);
    });

    var plusCols = ["white", "cyan", "purple", "blue"];
    var sparkCols = ["cyan", "white", "gold", "blue", "purple"];

    for (var pi = 0; pi < 34; pi++) addPlus(host, plusCols);
    for (var si2 = 0; si2 < 17; si2++) addSparkle(host, sparkCols, 14, 16);

    /* a few big sparkles + plus-stars that pass IN FRONT of the globe */
    var front = document.createElement("div");
    front.className = "stars-front";
    document.body.appendChild(front);
    for (var fp = 0; fp < 14; fp++) addPlus(front, plusCols);
    for (var fs = 0; fs < 8; fs++) addSparkle(front, sparkCols, 18, 20);

    if (!reduceMotion) {
      ["", "b"].forEach(function (variant, idx) {
        var sh = document.createElement("span");
        sh.className = "shooter" + (variant ? " " + variant : "");
        sh.style.left = (8 + idx * 46 + rand(14)) + "vw";
        sh.style.top = (6 + idx * 20 + rand(16)) + "vh";
        host.appendChild(sh);
      });
    }
  }

  /* ================================================================
     Earth fade-in on scroll (home only)
     ================================================================ */
  function bindGlobe() {
    var layer = document.querySelector(".globe-layer");
    if (!layer) return;
    var globe = layer.querySelector(".globe");

    if (reduceMotion) { layer.style.opacity = 0.92; return; }

    var ticking = false;
    function update() {
      ticking = false;
      var vh = window.innerHeight || 1;
      var pr = Math.min(1, Math.max(0, window.scrollY / (vh * 0.62)));
      layer.style.opacity = pr.toFixed(3);
      if (globe) {
        var scale = 0.9 + pr * 0.14;
        globe.style.transform = "scale(" + scale.toFixed(3) + ")";
      }
    }
    function onScroll() {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ================================================================
     Fade-up reveal
     ================================================================ */
  function bindReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.2, rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ================================================================
     GPS boot sequence — the WELCOME line powers on inside its frame
     ================================================================ */
  function bootHero() {
    var welcome = document.querySelector(".welcome");
    if (!welcome) return;
    var status = document.getElementById("gpsStatus");

    if (reduceMotion) {
      if (status) status.textContent = "SIGNAL LOCKED";
      welcome.classList.add("is-on");
      return;
    }

    var lines = ["BOOTING…", "CALIBRATING…", "SIGNAL LOCKED"];
    var i = 0;
    function step() {
      if (status) status.textContent = lines[i];
      i++;
      if (i < lines.length) {
        setTimeout(step, 320);
      } else {
        setTimeout(function () { welcome.classList.add("is-on"); }, 260);
      }
    }
    step();
  }

  function init() {
    buildGlobe();
    makeStars();
    bindGlobe();
    bindReveal();
    bootHero();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
