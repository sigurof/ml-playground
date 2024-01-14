precision highp float;

in vec2 coord2d;

out vec4 out_Color;

uniform float[20] allWeightsAndBiases;

vec4 elementwiseSigmoid(vec4 v){
    return vec4(
    1.0 / (1.0 + exp(-v.x)),
    1.0 / (1.0 + exp(-v.y)),
    1.0 / (1.0 + exp(-v.z)),
    1.0 / (1.0 + exp(-v.w))
    );
}

float[30] elementwiseSigmoid(float[30] v, int rows){
    float[30] result;
    for (int i = 0; i < rows; i++){
        result[i] = 1.0 / (1.0 + exp(-v[i]));
    }
    return result;
}

float[100] flatMatrix(float[20] allMatricesFlat, int currentMatrixIndex, ivec2[10] allMatrixDimensions){
    int offset = 0;
    for (int i = 0; i < currentMatrixIndex; i++){
        offset += allMatrixDimensions[i].x * allMatrixDimensions[i].y;
    }
    int currentMatrixSize = allMatrixDimensions[currentMatrixIndex].x * allMatrixDimensions[currentMatrixIndex].y;
    float[100] currentMatrix;
    for (int i = 0; i < currentMatrixSize; i++){
        currentMatrix[i] = allMatricesFlat[offset + i];
    }
    // set the rest to 0
    for (int i = currentMatrixSize; i < 100; i++){
        currentMatrix[i] = 0.0;
    }
    return currentMatrix;
}

float element(float[100] matrix, ivec2 matrixDimensions, int row, int col){
    return matrix[row * matrixDimensions.y + col];
}

float[30] matrixMult(float[100] matrix, ivec2 matrixDimensions, vec2 firstLayer){
    float[3] vector = float[3](firstLayer.x, firstLayer.y, 1.0);
    float[30] result;
    // Set all elements to 0 first
    for (int i = 0; i < 30; i++){
        result[i] = 0.0;
    }
    for (int i = 0; i < matrixDimensions.x; i++){
        float sum = 0.0;
        for (int j = 0; j < matrixDimensions.y; j++){
            sum += element(matrix, matrixDimensions, i, j) * vector[j];
        }
        result[i] = sum;
    }
    return result;
}

float[30] matrixMult(float[100] matrix, ivec2 matrixDimensions, float[30] vector){
    float[30] result;
    vector[matrixDimensions.y - 1] = 1.0;
    for (int i = 0; i < matrixDimensions.x; i++){
        float sum = 0.0;
        for (int j = 0; j < matrixDimensions.y; j++){
            sum += element(matrix, matrixDimensions, i, j) * vector[j];
        }
        result[i] = sum;
    }
    return result;
}

void main(void){
    ivec2[10] matrixDimensions;
    matrixDimensions[0] = ivec2(3, 3);
    matrixDimensions[1] = ivec2(3, 4);

    // First Layer
    vec2 firstLayer = coord2d;

    // Second Layer (special treatment because uses vec2 type that comes from vertex shader instead of float[])
    float[100] firstWeights = flatMatrix(allWeightsAndBiases, 0, matrixDimensions);
    float[30] secondLayerZ = matrixMult(firstWeights, matrixDimensions[0], firstLayer);// zfirstWeights * vec3(firstLayer, 1);
    float[30] nextLayerActivation = elementwiseSigmoid(secondLayerZ, matrixDimensions[0].y);

    // Then iterate over all the remaining layers
    float[100] nextWeights;
    float[30] nextLayerZ;
    int remainingWeightMatrices = 2 -1;
    for (int i = 0; i < remainingWeightMatrices; i++){
        nextWeights = flatMatrix(allWeightsAndBiases, 1, matrixDimensions);
        nextLayerZ = matrixMult(nextWeights, matrixDimensions[1], nextLayerActivation);
        nextLayerActivation = elementwiseSigmoid(nextLayerZ, matrixDimensions[1].x);
    }

    vec3  lastLayer = vec3(nextLayerActivation[0], 0, nextLayerActivation[1]);
    out_Color = 0.8*vec4(lastLayer.r, lastLayer.g, lastLayer.b, 1.0);

    gl_FragDepth = 0.9;
}