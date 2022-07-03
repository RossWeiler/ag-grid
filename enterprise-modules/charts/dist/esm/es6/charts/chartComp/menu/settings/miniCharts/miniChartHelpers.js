import { BandScale, ClipRect, LinearScale, Path, Rect } from "ag-charts-community";
export function createColumnRects(params) {
    const { stacked, size, padding, xScalePadding, xScaleDomain, yScaleDomain } = params;
    const xScale = new BandScale();
    xScale.domain = xScaleDomain;
    xScale.range = [padding, size - padding];
    xScale.paddingInner = xScalePadding;
    xScale.paddingOuter = xScalePadding;
    const yScale = new LinearScale();
    yScale.domain = yScaleDomain;
    yScale.range = [size - padding, padding];
    const createBars = (series, xScale, yScale) => {
        return series.map((datum, i) => {
            const top = yScale.convert(datum);
            const rect = new Rect();
            rect.x = xScale.convert(i);
            rect.y = top;
            rect.width = xScale.bandwidth;
            rect.height = yScale.convert(0) - top;
            rect.strokeWidth = 1;
            rect.crisp = true;
            return rect;
        });
    };
    if (stacked) {
        return params.data.map((d) => createBars(d, xScale, yScale));
    }
    return createBars(params.data, xScale, yScale);
}
export function createLinePaths(root, data, size, padding) {
    const xScale = new LinearScale();
    xScale.domain = [0, 4];
    xScale.range = [padding, size - padding];
    const yScale = new LinearScale();
    yScale.domain = [0, 10];
    yScale.range = [size - padding, padding];
    const lines = data.map(series => {
        const line = new Path();
        line.strokeWidth = 3;
        line.lineCap = "round";
        line.fill = undefined;
        series.forEach((datum, i) => {
            line.path[i > 0 ? "lineTo" : "moveTo"](xScale.convert(i), yScale.convert(datum));
        });
        return line;
    });
    const clipRect = new ClipRect();
    clipRect.x = clipRect.y = padding;
    clipRect.width = clipRect.height = size - padding * 2;
    clipRect.append(lines);
    root.append(clipRect);
    return lines;
}
//# sourceMappingURL=miniChartHelpers.js.map