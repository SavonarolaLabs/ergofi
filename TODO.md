next:

1. mint all tokens + Test in name
2. in dexyConstants.ts add contractConfig values from ALL DeploymentRequest DexySpec.scala
   add missing names for addreses:

```
export const addresses = {
    // DexySpec.scala    // dexyAddressConstants.ts
	interventionAddress: DEXY_BANK_INTERVENTION
};
```

3. run scala tests <- me
4. add contract backdoors <- me
5. move backdoored addresses to scala and test

after next:

1. create BoxMintOutputs
2. create BoxMintTransaction chain

3. save mintedBoxes into file
