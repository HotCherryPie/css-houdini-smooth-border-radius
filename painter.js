class SmoothBorderRadiusWorklet {
  static get inputProperties() {
    return ['--border-radius-aspect', '--border-radius'];
  }

  // https://github.com/w3c/css-houdini-drafts/issues/219
  // static get inputArguments() {
  //   return ['*']; // precision
  // }

  static pointCache = {};
  static pathCache = {};

  static getPointsForRadius(r, aspect, precision) {
    const cacheKey = `${r}:${aspect}:${precision}`;

    if (!SmoothBorderRadiusWorklet.pointCache[cacheKey]) {
      const aspectI = 1 / aspect;
      const aspectR = r ** aspect;
      const out = Array(Math.floor((r + 1) * 2 * precision));
      const step = 1 / precision;

      for (let i = 0, y = 0, point = 0; y <= r; y += step, i++) {
        point = Math.abs(aspectR - Math.abs(r - i) ** aspect) ** aspectI;
        out[i] = ([i, point]); // out.push([i, point]);
        out[out.length - 1 - i] = ([r - point, r - i]); // out.push([r - point, r - i]);
      }

      SmoothBorderRadiusWorklet.pointCache[cacheKey] = out.sort(([a], [b]) => a - b);
    }

    return SmoothBorderRadiusWorklet.pointCache[cacheKey];
  }

  paint(ctx, geom, properties, [precision = 0.5]) {
    const hw = geom.width / 2;
    const hh = geom.height / 2;

    const aspect = Math.max(+properties.get('--border-radius-aspect')[0], 0.00000000001);
    const radius = Math.min(+properties.get('--border-radius')[0], hw, hh);

    // console.debug('request paint with:', hw, hh, radius);

    const cacheKey = `${aspect}:${radius}:${hw}:${hh}`;
    if (!SmoothBorderRadiusWorklet.pathCache[cacheKey]) {
      const dx = hw - radius;
      const dy = hh - radius;

      const path = new Path2D();
      SmoothBorderRadiusWorklet.pathCache[cacheKey] = path;

      const offsets = SmoothBorderRadiusWorklet
        .getPointsForRadius(radius, aspect, Number(precision));

      for (let i = 0; i < offsets.length * 2; i++) {
        const ni = i >= offsets.length;
        const [d1, d2] = offsets[ni ? i - offsets.length : i];
        const x = ni ? hw + dx + d2 : d1;
        const y = ni ? hh + hh - d1 : hh + dy + d2;
        if (i === 0) path.moveTo(x, y);
        else path.lineTo(x, y);
      }

      path.lineTo(hw + hw, hh - dy);
      path.lineTo(0, hh - dy);

      for (let i = 0; i < offsets.length * 2; i++) {
        const ni = i >= offsets.length;
        const [d1, d2] = offsets[ni ? i - offsets.length : i];
        const x = ni ? hw + dx + d2 : d1;
        const y = ni ? d1 : hh - dy - d2;
        if (i === 0) path.moveTo(x, y);
        else path.lineTo(x, y);
      }
    }

    ctx.fillStyle = 'black';
    ctx.fill(SmoothBorderRadiusWorklet.pathCache[cacheKey]);
  }
}

registerPaint('smooth-border-radius', SmoothBorderRadiusWorklet);
