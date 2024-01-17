import { api, InputVsOutput, NeuralNetworkDto } from "../../../api/api.ts";
import { useEffect, useMemo, useState } from "react";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import { NeuralNetwork } from "../../../common/ml/neural-network.ts";
import { indexOfMax } from "../../../common/algorithms/algorithms.ts";
import { HorizontalLine, SectionBox } from "../Common.tsx";
import { ImageDisplay } from "./ImageDisplay.tsx";
import { Alert, Button, ButtonGroup, CircularProgress, Skeleton, Slider, SvgIcon, Typography } from "@mui/material";
import styled from "styled-components";
import { useQuery } from "@tanstack/react-query";
import { styled as muiStyled } from "@mui/material/styles";

const ForwardsBackwards = styled.div`
    margin-top: 1rem;
    display: flex;
    align-items: center;
`;

const ArrowButton = muiStyled(Button)({
    width: "50px",
});

const MyButtonGroup = muiStyled(ButtonGroup)({
    marginTop: "1rem",
});

const SpinnerWrapper = styled.div`
    min-width: 50px;
    width: fit-content;
    margin: 0 2rem;
`;

const TestContainer = styled.div`
    height: 60px;
    max-width: 400px;
    display: flex;
    align-items: center;
`;

// function that calls api.getTestData at most once every 2 seconds

const Label = styled.label`
    min-width: 20%;
`;

const ImageBed = styled.div`
    margin: 0.5rem;
`;

// const NetworkOutputSection = styled.div`
//display: grid;
//grid-template-columns: 60% 40%;
//grid-gap: 1rem;
// `;

const ImageModeAndDisplay = styled.div`
    //display: flex;
    //justify-content: center;
    //flex-direction: column;
`;

const NetworkOutputLeftSection = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
`;

const NetworkOutputRightSection = styled.div``;

// }

const WrongOutput = styled.div``;

function useThrottle<T>(value: T, limit: number) {
    const [throttledValue, setThrottledValue] = useState(value);
    const [lastCall, setLastCall] = useState(Date.now());

    useEffect(() => {
        const handler = setTimeout(
            () => {
                if (Date.now() - lastCall >= limit) {
                    setThrottledValue(value);
                    setLastCall(Date.now());
                }
            },
            limit - (Date.now() - lastCall),
        );

        return () => {
            clearTimeout(handler);
        };
    }, [value, limit, lastCall]);

    return throttledValue;
}

function mnistArrayToImage(data: number[]): Promise<ImageBitmap> {
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

    return createImageBitmap(imageData);
}

const createBitmaps = (inputsVsOutputs: InputVsOutput[]) =>
    Promise.all(inputsVsOutputs.map(({ input }: InputVsOutput) => mnistArrayToImage(input)));

export const TestingGrounds = ({
    // testingData,
    onTestDataLoaded,
    neuralNetworkDto,
}: {
    // testingData: InputVsOutput[];
    onTestDataLoaded: (inputsVsOutputs: InputVsOutput[]) => void;
    neuralNetworkDto?: NeuralNetworkDto;
}) => {
    const [digitMode, setDigitMode] = useState<"draw" | "digits">("draw");
    const [numTest, setNumTest] = useState<number>(1000);
    const throttledInput = useThrottle(numTest, 2000); // Throttle limit of 2000ms

    const [images, setImages] = useState<ImageBitmap[]>([]);
    const {
        isPending,
        isLoading,
        error,
        data: imageData,
    } = useQuery({
        queryKey: ["testingData", throttledInput],
        queryFn: () => api.getTestData(throttledInput),
        enabled: !!throttledInput,
        initialData: [],
    });
    useEffect(() => {
        createBitmaps(imageData).then((data) => setImages(data));
        onTestDataLoaded(imageData);
    }, [imageData]);

    const [index, setIndex] = useState(0);
    const stuff = useMemo(() => {
        if (!neuralNetworkDto) return undefined;
        const activations = new NeuralNetwork(neuralNetworkDto).evaluateActivations(imageData[index].input);
        const finalActivation = activations[activations.length - 1];
        const indexOfResult = indexOfMax(finalActivation);
        const outputValue = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9][indexOfResult];
        return {
            outputValue,
            activations: finalActivation,
        };
    }, [neuralNetworkDto, index]);

    const label = useMemo(() => {
        if (images.length === 0) return undefined;
        return indexOfMax(imageData[index].output);
    }, [images, index]);
    const activation = stuff?.activations;
    const outputValue = stuff?.outputValue;
    // const label = stuff?.label;

    console.log(`label: ${label}, outputValue: ${outputValue}`)
    return (
        <SectionBox>
            <h2>Testing Grounds</h2>
            <HorizontalLine />
            <TestContainer>
                <Label>
                    <Typography>Test data</Typography>
                </Label>
                <Slider
                    max={10000}
                    min={100}
                    step={100}
                    value={numTest}
                    onChange={(_, v) => {
                        setNumTest(v as number);
                    }}
                    aria-label="Always visible"
                    valueLabelDisplay="auto"
                />
                <SpinnerWrapper>
                    {isLoading && (
                        <div>
                            <CircularProgress />
                        </div>
                    )}
                </SpinnerWrapper>
            </TestContainer>
            <HorizontalLine />
            <NetworkOutputLeftSection>
                <MyButtonGroup orientation="horizontal">
                    <Button
                        variant={digitMode === "draw" ? "contained" : "outlined"}
                        onClick={() => {
                            setDigitMode("draw");
                        }}
                    >
                        Draw Yourself
                    </Button>
                    <Button
                        variant={digitMode === "digits" ? "contained" : "outlined"}
                        onClick={() => {
                            setDigitMode("digits");
                        }}
                    >
                        Display Digits
                    </Button>
                </MyButtonGroup>
                <ForwardsBackwards>
                    <ArrowButton
                        onClick={() => {
                            setIndex((index - 1) % images.length);
                        }}
                    >
                        <SvgIcon>
                            <KeyboardArrowLeftIcon />
                        </SvgIcon>
                    </ArrowButton>
                    <div>{`${index + 1} / ${images.length}`}</div>
                    <ArrowButton
                        onClick={() => {
                            setIndex((index + 1) % images.length);
                        }}
                    >
                        <SvgIcon>
                            <KeyboardArrowRightIcon />
                        </SvgIcon>
                    </ArrowButton>
                </ForwardsBackwards>
                <Typography>Label: {`${label}`}</Typography>

                <ImageBed>
                    {images.length > 0 && <ImageDisplay imageBitmap={images[index]} />}
                    {images.length === 0 && <Skeleton variant="rectangular" width={200} height={200} />}
                </ImageBed>
                {label === outputValue && (
                        <Alert variant="filled" severity="success">
                            Output {`${outputValue}`}
                        </Alert>
                )}
                {label !== outputValue && (
                        <Alert variant="filled" severity="error">
                            Output {`${outputValue}`}
                        </Alert>
                )}
            </NetworkOutputLeftSection>
            <NetworkOutputRightSection></NetworkOutputRightSection>;
        </SectionBox>
    );
};
