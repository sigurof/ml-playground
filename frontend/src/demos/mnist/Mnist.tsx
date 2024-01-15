import styled from "styled-components";
import { MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import LinePlot from "./LinePlot.tsx";
import { SectionBox } from "./Common.tsx";
import { CreateAndTrainModel } from "./create-model/CreateAndTrainModel.tsx";
import { NeuralNetwork } from "../../common/ml/neural-network.ts";
import { InputVsOutput, NeuralNetworkDto, Update } from "../../api/api.ts";
import { indexOfMax } from "../../common/algorithms/algorithms.ts";

const DemoBed = styled.div`
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    grid-gap: 1rem;
`;

const CostGraph = ({ cost, averageCorrectness }: { cost: number[]; averageCorrectness: number[] }) => {
    console.log("cost", cost);
    return (
        <SectionBox>
            <h2>Network Performance</h2>
            <div>
                <LinePlot data2={averageCorrectness} data={cost} />
            </div>
        </SectionBox>
    );
};

const TestingGrounds = ({
    images,
    testingData,
    neuralNetworkDto,
}: {
    testingData: InputVsOutput[];
    neuralNetworkDto?: NeuralNetworkDto;
    images: ImageBitmap[];
}) => {
    const [index, setIndex] = useState(0);
    const expectedValue = useMemo(() => {
        if (!neuralNetworkDto) return undefined;
        const activations = new NeuralNetwork(neuralNetworkDto).evaluateActivations(testingData[index].input);
        const finalActivation = activations[activations.length - 1];
        const indexOfResult = indexOfMax(finalActivation);
        return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9][indexOfResult];
    }, [neuralNetworkDto, index]);
    return (
        <SectionBox>
            <h2>Testing Grounds</h2>
            {images.length > 0 && <ImageDisplay imageBitmap={images[index]} />}
            <button
                onClick={() => {
                    setIndex((index - 1) % images.length);
                }}
            >
                Next
            </button>
            <button
                onClick={() => {
                    setIndex((index + 1) % images.length);
                }}
            >
                Next
            </button>
            <h2>Expected value: {expectedValue}</h2>
        </SectionBox>
    );
};

function ImageDisplay({ imageBitmap }: { imageBitmap: ImageBitmap }) {
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

    return <canvas ref={canvasRef} width={280} height={280} />;
}

// new NeuralNetwork().evaluateCost([])

type OnNeuralNetworkUpdate = (update: Update) => void;

function fillImageData(data: number[]): ImageData {
    const width = 28;
    const height = 28;
    const imageData = new ImageData(width, height);

    for (let i = 0; i < data.length; i++) {
        // Assuming the grayscale value is in the range 0-255
        const grayScale = data[i];

        // Each pixel requires 4 slots in the ImageData array (R, G, B, A)
        imageData.data[i * 4] = grayScale * 255; // R
        imageData.data[i * 4 + 1] = grayScale * 255; // G
        imageData.data[i * 4 + 2] = grayScale * 255; // B
        imageData.data[i * 4 + 3] = 255; // A (fully opaque)
    }

    return imageData;
}

async function createBitmaps(inputsVsOutputs: InputVsOutput[]) {
    // const numbers = inputsVsOutputs[0].input;
    const images = inputsVsOutputs.map(({ input }: InputVsOutput) => {
        return createImageBitmap(fillImageData(input));
    });
    return Promise.all(images);
}

export const Mnist = () => {
    // const [cost, setCost] = useState<number[]>([]);
    const [testData, setTestData] = useState<InputVsOutput[]>([]);
    const [neuralNetworkDto, setNeuralNetworkDto] = useState<NeuralNetworkDto>();
    const [images, setImages] = useState<ImageBitmap[]>([]);
    const [lines, setLines] = useState<Record<string, number[]>>({
        cost: [],
        averageCorrectness: [],
    });
    const onNeuralNetworkUpdate: OnNeuralNetworkUpdate = useCallback(
        (update: Update) => {
            setNeuralNetworkDto(update.neuralNetwork);
            const evaluationVariables =
                testData.length > 0
                    ? new NeuralNetwork(update.neuralNetwork).evaluateAccuracy(testData)
                    : {
                          cost: 0,
                          averageCorrectness: 0,
                      };

            setLines({
                cost: [...lines.cost, evaluationVariables.cost],
                averageCorrectness: [...lines.averageCorrectness, evaluationVariables.averageCorrectness],
            });
        },
        [lines],
    );
    const onNeuralNetworkUpdateRef: MutableRefObject<OnNeuralNetworkUpdate> = useRef(onNeuralNetworkUpdate);

    useEffect(() => {
        onNeuralNetworkUpdateRef.current = onNeuralNetworkUpdate;
    }, [onNeuralNetworkUpdate]);
    return (
        <DemoBed>
            <CreateAndTrainModel
                onTestDataLoaded={async (inputsVsOutputs) => {
                    console.log(`Loaded test data with length ${inputsVsOutputs.length}`);
                    setTestData(inputsVsOutputs);
                    setImages(await createBitmaps(inputsVsOutputs));
                }}
                onNeuralNetworkUpdate={onNeuralNetworkUpdateRef}
            />
            <CostGraph averageCorrectness={lines.averageCorrectness} cost={lines.cost} />
            <TestingGrounds testingData={testData} neuralNetworkDto={neuralNetworkDto} images={images} />
            <div></div>
        </DemoBed>
    );
};
