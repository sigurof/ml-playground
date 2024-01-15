import { RefObject, useEffect, useRef, useState } from "react";
import { Button, CircularProgress, MenuItem, Select, Slider, TextField, Typography } from "@mui/material";
import { SectionBox } from "../Common.tsx";
import styled from "styled-components";
import { styled as muiStyled } from "@mui/material/styles";
import { OverrideDialog } from "./OverrideDialog.tsx";
import { toast } from "react-toastify";
import { api, InputVsOutput, ServerEvent, serverEvents, SessionDto, Update } from "../../../api/api.ts";

function valuetext(value: number) {
    return `${value}°C`;
}

const GridContainer = styled.div<{ times: number }>`
    width: 400px;
    //max-height: 200px;
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: repeat(${(props) => props.times}, 1fr);
`;

const Grid = styled.div`
    margin: 8px;
    display: grid;
    grid-template-columns: 1fr 2fr;
    align-items: center;
`;

const NumberDisplay = muiStyled(Typography)({
    margin: "0 8px",
});

const FlexContainer = styled.div`
    display: flex;
    flex-direction: row;
    margin: 8px;
    align-items: center;
`;

const Label = muiStyled(Typography)({
    minWidth: "30%",
});

const Heading = styled.h2`
    //margin: 0;
`;

const HorizontalLine = styled.hr`
    border-top: 2px solid lightgray;
`;

const ButtonContainer = styled.div`
    display: flex;
    justify-content: right;
`;

// @ts-expect-error asdf
const ChangeButton = muiStyled(Button)(({ theme }: { theme: any }) => ({
    margin: "0.5rem",
    // width: "200px",
    // height: "100px",
    // fontSize: "1.2rem",
}));

// @ts-expect-error asdf
const LargeButton = muiStyled(Button)(({ theme }: { theme: any }) => ({
    margin: "0.5rem",
    width: "200px",
    height: "100px",
    fontSize: "1.2rem",
}));

const clientEvents = {
    continue: `no.sigurof.ml.server.web.websockets.ClientEvent.Continue`,
    newModel: `no.sigurof.ml.server.web.websockets.ClientEvent.NewModel`,
    setParameters: "no.sigurof.ml.server.web.websockets.ClientEvent.SetParameters",
};

type Model = {
    hiddenLayers: number[];
    sizeDataSet: number;
    sizeTestSet: number;
    learningRate: number;
};
type NewModel = {
    type?: string;
    sessionId: string;
    override: boolean;
    model: Model;
};

const createEvent = {
    continue(sessionId: string): string {
        return JSON.stringify({
            type: clientEvents.continue,
            sessionId,
        });
    },
    newModel(data: NewModel) {
        const payload: NewModel = {
            type: clientEvents.newModel,
            ...data,
        };
        return JSON.stringify(payload);
    },
    setParameters(learningRate: number) {
        return JSON.stringify({
            type: clientEvents.setParameters,
            learningRate,
        });
    },
};

function parseHiddenLayers(layers: string) {
    console.log(layers);
    return layers
        .split(",")
        .map((it) => it.trim())
        .filter((it) => it)
        .map((it) => parseInt(it));
}

export const CreateAndTrainModel = ({
    onNeuralNetworkUpdate,
    onTestDataLoaded,
}: {
    onTestDataLoaded: (testData: InputVsOutput[]) => void;
    onNeuralNetworkUpdate: RefObject<(update: Update) => void>;
}) => {
    const [layers, setLayers] = useState<string>("");
    const [numTest, setNumTest] = useState<number>(1000);
    const [learningRate, setLearningRate] = useState<number>(1.0);
    const [numTraining, setNumTraining] = useState<number>(4000);
    const [running, setRunning] = useState(false);
    const [askToOverride, setAskToOverride] = useState(false);
    const webSocket = useRef<WebSocket | null>();
    const [sessionIdSelect, setSessionIdSelect] = useState<string>("New");
    const [sessionId, setSessionId] = useState<string>("");
    const [sessions, setSessions] = useState<SessionDto[]>([]);
    const [awaitingResponse, setAwaitingResponse] = useState(false);
    useEffect(() => {
        api.getSessions().then((res) => setSessions(res));
    }, []);

    useEffect(() => {
        const webs = webSocket.current;
        return () => {
            webs?.close();
        };
    }, []);

    const closeModal = () => setAskToOverride(false);

    const closeWebsocket = () => webSocket.current?.close();
    return (
        <>
            <OverrideDialog
                open={askToOverride}
                onCancel={() => {
                    closeModal();
                    closeWebsocket();
                    setRunning(false);
                }}
                onContinue={() => {
                    closeModal();
                    webSocket.current?.send(createEvent.continue(sessionId));
                }}
                onOverride={() => {
                    closeModal();
                    const hiddenLayers = parseHiddenLayers(layers);
                    console.log(hiddenLayers);
                    webSocket.current?.send(
                        createEvent.newModel({
                            sessionId,
                            model: {
                                hiddenLayers,
                                sizeDataSet: numTraining,
                                sizeTestSet: numTest,
                                learningRate,
                            },
                            override: true,
                        }),
                    );
                }}
            />
            <SectionBox>
                <Heading>Settings</Heading>
                <GridContainer times={4}>
                    <Grid>
                        <Select
                            value={sessionIdSelect}
                            onChange={(event, _) => {
                                const value = event.target.value as string;
                                setSessionIdSelect(value);
                                if (value !== "New") {
                                    setSessionId(value);
                                } else {
                                    setSessionId("");
                                }
                            }}
                        >
                            <MenuItem value={"New"}>New</MenuItem>
                            {sessions.map((it) => (
                                <MenuItem key={`session-${it.id}`} value={it.id}>
                                    {it.id}
                                </MenuItem>
                            ))}
                        </Select>
                        {sessionIdSelect === "New" && (
                            <TextField
                                onChange={(e) => {
                                    setSessionId(e.target.value);
                                }}
                                value={sessionId}
                            />
                        )}
                    </Grid>
                    <FlexContainer>
                        <TextField
                            style={{
                                gridColumnStart: 1,
                                gridColumnEnd: 3,
                            }}
                            value={layers}
                            onChange={(e) => {
                                setLayers(e.target.value);
                            }}
                            fullWidth
                            id="standard-basic"
                            label="Hidden Layer Dimensions"
                        />
                    </FlexContainer>
                    <FlexContainer>
                        <Label id="continuous-slider" gutterBottom>
                            Training Data
                        </Label>
                        <Slider
                            max={60000}
                            min={1000}
                            step={1000}
                            value={numTraining}
                            onChange={(_, v) => {
                                setNumTraining(v as number);
                            }}
                            aria-label="Always visible"
                            getAriaValueText={valuetext}
                            valueLabelDisplay="auto"
                        />
                    </FlexContainer>
                    <FlexContainer>
                        <Label id="continuous-slider" gutterBottom>
                            Test data
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
                            getAriaValueText={valuetext}
                            valueLabelDisplay="auto"
                        />
                    </FlexContainer>
                </GridContainer>
                <HorizontalLine />
                <Heading>Controls</Heading>
                <GridContainer times={2}>
                    <FlexContainer>
                        <Label>Learning Rate</Label>
                        <Slider
                            style={{
                                minWidth: "40%",
                            }}
                            max={Math.log(50)}
                            min={Math.log(0.1)}
                            step={(Math.log(50) - Math.log(0.1)) / 100}
                            value={Math.log(learningRate)}
                            onChange={(_, v) => {
                                setLearningRate(Math.exp(v as number));
                            }}
                            aria-label="Always visible"
                            getAriaValueText={valuetext}
                            valueLabelDisplay="off"
                        />
                        <NumberDisplay>{learningRate.toFixed(2)}</NumberDisplay>
                    </FlexContainer>
                    <ChangeButton
                        color="info"
                        variant="contained"
                        onClick={() => {
                            webSocket?.current?.send(createEvent.setParameters(learningRate));
                        }}
                    >
                        Reapply
                    </ChangeButton>
                </GridContainer>
                <HorizontalLine />
                <ButtonContainer>
                    <LargeButton
                        onClick={async () => {
                            const testData = await api.getTestData(numTest); //.then((testData) => onTestDataLoaded(testData));
                            onTestDataLoaded(testData);
                            if (running) {
                                webSocket.current?.close();
                                setRunning(false);
                            } else {
                                setAwaitingResponse(true);
                                const socket = new WebSocket("ws://localhost:8080/ml/network");
                                socket.addEventListener("open", () => {
                                    console.log("opened");
                                    socket.send(
                                        createEvent.newModel({
                                            sessionId,
                                            model: {
                                                hiddenLayers: parseHiddenLayers(layers),
                                                sizeDataSet: numTraining,
                                                sizeTestSet: numTest,
                                                learningRate,
                                            },
                                            override: false,
                                        }),
                                    );
                                });
                                socket.addEventListener("message", (event) => {
                                    const data: ServerEvent = JSON.parse(event.data);
                                    if (data.type === serverEvents.askSetModel) {
                                        console.log("Are you fine with overriding the data?");
                                        setAskToOverride(true);
                                        setAwaitingResponse(false);
                                    }
                                    if (data.type === serverEvents.update) {
                                        setAwaitingResponse(false);
                                        setRunning(true);
                                        onNeuralNetworkUpdate.current?.(data);
                                    }
                                    if (data.type === serverEvents.clientError) {
                                        console.log("Client error: ", data.message);
                                        toast.error(data.message);
                                        setAwaitingResponse(false);
                                        setRunning(false);
                                        webSocket.current?.close();
                                    }
                                });
                                webSocket.current = socket;
                            }
                        }}
                        color={running ? "error" : "success"}
                        variant="contained"
                    >
                        {awaitingResponse && <CircularProgress size={24} />}
                        {running ? "Stop" : "Start"}
                    </LargeButton>
                </ButtonContainer>
            </SectionBox>
        </>
    );
};
