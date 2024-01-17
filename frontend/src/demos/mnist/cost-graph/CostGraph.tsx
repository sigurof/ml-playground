import { SectionBox } from "../Common.tsx";
import LinePlot from "./LinePlot.tsx";

export const CostGraph = ({ cost, averageCorrectness }: { cost: number[]; averageCorrectness: number[] }) => {
    console.log("cost", cost);
    return (
        <SectionBox>
            <h2>Network Performance</h2>
            <div>
                <LinePlot data2={averageCorrectness} data={cost} />
            </div>
            {`Cost: ${cost[cost.length - 1]}`}
            <br />
            {`Average Correctness: ${averageCorrectness[averageCorrectness.length - 1]}`}
        </SectionBox>
    );
};
