import { useEffect, useRef } from "react";

export function ImageDisplay({ imageBitmap }: { imageBitmap: ImageBitmap }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (canvasRef.current && imageBitmap) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                return;
            }

            // Clear the canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw the image on the canvas
            ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
        }
    }, [imageBitmap]);

    return <canvas ref={canvasRef} width={200} height={200} />;
}

