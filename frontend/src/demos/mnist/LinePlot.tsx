// @ts-nocheck asdf
import { useEffect, useRef } from "react";
import * as d3 from "d3";

export default function LinePlot({
    data,
    data2,
    width = 640,
    height = 400,
    marginTop = 20,
    marginRight = 20,
    marginBottom = 30,
    marginLeft = 40,
}: {
    data: number[];
    data2: number[];
    width?: number;
    height?: number;
    marginTop?: number;
    marginRight?: number;
    marginBottom?: number;
    marginLeft?: number;
}) {
    const gx = useRef<string>();
    const gy = useRef<string>();

    const x = d3.scaleLinear([0, data.length - 1], [marginLeft, width - marginRight]);
    const domain: number[] = d3.extent([0, 1]) as number[];
    const y = d3.scaleLinear(domain, [height - marginBottom, marginTop]);
    const line = d3.line((_, i) => x(i), y);
    useEffect(() => void d3.select(gx.current).call(d3.axisBottom(x)), [gx, x]);
    useEffect(() => void d3.select(gy.current).call(d3.axisLeft(y)), [gy, y]);
    return (
            <svg width={width} height={height}>
                <g ref={gx} transform={`translate(0,${height - marginBottom})`} />
                <g ref={gy} transform={`translate(${marginLeft},0)`} />
                <path fill="none" stroke="currentColor" strokeWidth="1.5" d={line(data)} />
                <path fill="none" stroke="currentColor" strokeWidth="1.5" d={line(data2)} />
                <g fill="white" stroke="currentColor" strokeWidth="1.5">
                    {data.map((d, i) => (
                            <circle key={i} cx={x(i)} cy={y(d)} r="2.5" />
                    ))}
                </g>
                <g fill="white" stroke="currentColor" strokeWidth="1.5">
                    {data2.map((d, i) => (
                            <circle key={i} cx={x(i)} cy={y(d)} r="2.5" />
                    ))}
                </g>
            </svg>
    );
}
