export function sigmaProp(a) {
    return a;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function PK(a) {
    return false;
}

export const min = Math.min
export const max = Math.max

export const createInputs = (tx) => {
    return (i) => {
      const boxes = tx.inputs.reduce((acc, input, index) => {
        acc[index] = {
          value: Number(input.value),
          propositionBytes: input.ergoTree,
          tokens: (j) => {
            const assets = input.assets.reduce((assetAcc, asset, assetIndex) => {
              assetAcc[assetIndex] = { _1: asset.tokenId, _2: Number(asset.amount) };
              return assetAcc;
            }, {});
            return j === undefined ? JSON.stringify(assets) : assets[j];
          },
          ...input.additionalRegisters
        };
        return acc;
      }, {});
      return boxes[i];
    };
  };
  
export const createOutputs = (tx) => {
    return (i) => {
      const boxes = tx.outputs.reduce((acc, output, index) => {
        acc[index] = {
          value: Number(output.value),
          propositionBytes: output.ergoTree,
          tokens: (j) => {
            const assets = output.assets.reduce((assetAcc, asset, assetIndex) => {
              assetAcc[assetIndex] = { _1: asset.tokenId, _2: Number(asset.amount) };
              return assetAcc;
            }, {});
            return j === undefined ? JSON.stringify(assets) : assets[j];
          },
          ...output.additionalRegisters
        };
        return acc;
      }, {});
      return boxes[i];
    };
  };

  export const createContext = (tx) => {
    return {
      dataInputs: (i) => {
        const dataInputs = tx.dataInputs.reduce((acc, dataInput, index) => {
          acc[index] = {
            value: Number(dataInput.value),
            propositionBytes: dataInput.ergoTree,
            tokens: (j) => {
              const assets = dataInput.assets.reduce((assetAcc, asset, assetIndex) => {
                assetAcc[assetIndex] = { _1: asset.tokenId, _2: Number(asset.amount) };
                return assetAcc;
              }, {});
              return j === undefined ? JSON.stringify(assets) : assets[j];
            },
            ...dataInput.additionalRegisters
          };
          return acc;
        }, {});
        return dataInputs[i];
      }
    };
  };
  
  
  