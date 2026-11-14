function inspectHoverCoordinates(world, px, py) {
  let hoveredInfo = null;
  state.functions.forEach(fn => {
    if (!fn.visible || !fn.evaluator) return;
    const curveY = fn.evaluator(world.x);
    if (isNaN(curveY)) return;

    const { py: curvePxY } = worldToScreen(world.x, curveY);
    if (Math.abs(py - curvePxY) < 14) {
      const isRoot = Math.abs(curveY) < 0.05;
      const isYIntercept = Math.abs(world.x) < 0.05;
      hoveredInfo = `${fn.name}(${world.x.toFixed(2)}) = ${curveY.toFixed(3)}${isRoot ? ' [ROOT / X-INT]' : ''}${isYIntercept ? ' [Y-INTERCEPT]' : ''}`;
    }
  });

  if (hoveredInfo) {
    tooltip.style.display = 'block';
    tooltip.style.left = (px + 14) + 'px';
    tooltip.style.top = (py - 14) + 'px';
    tooltip.innerText = hoveredInfo;
    document.getElementById('analysis-box').innerText = hoveredInfo;
  } else {
    tooltip.style.display = 'none';
  }
}
