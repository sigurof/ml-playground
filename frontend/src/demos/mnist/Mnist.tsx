import styled from "styled-components";
import { MutableRefObject, useCallback, useEffect, useRef, useState } from "react";
import { CreateAndTrainModel } from "./create-model/CreateAndTrainModel.tsx";
import { NeuralNetwork } from "../../common/ml/neural-network.ts";
import { InputVsOutput, NeuralNetworkDto, Update } from "../../api/api.ts";
import { TestingGrounds } from "./testing-grounds/TestingGrounds.tsx";
import { CostGraph } from "./cost-graph/CostGraph.tsx";

const DemoBed = styled.div`
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    grid-gap: 1rem;
`;

type OnNeuralNetworkUpdate = (update: Update) => void;

export const Mnist = () => {
    const [testData, setTestData] = useState<InputVsOutput[]>([]);
    const [neuralNetworkDto, setNeuralNetworkDto] = useState<NeuralNetworkDto>();
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
            <CreateAndTrainModel onNeuralNetworkUpdate={onNeuralNetworkUpdateRef} />
            <div></div>
            <TestingGrounds
                onTestDataLoaded={async (inputsVsOutputs) => {
                    console.log(`Loaded test data with length ${inputsVsOutputs.length}`);
                    setTestData(inputsVsOutputs);
                }}
                neuralNetworkDto={neuralNetworkDto}
            />
            <CostGraph averageCorrectness={lines.averageCorrectness} cost={lines.cost} />
        </DemoBed>
    );
};
