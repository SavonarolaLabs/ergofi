next:

1. mint all tokens and save token ids in dexyConstants.ts -> testTokenIds

2. in dexyConstants.ts add contractConfig values from ALL DeploymentRequest DexySpec.scala
   add missing names for addreses:

```
export const dexyAddresses = {
    // DexySpec.scala    // dexyAddressConstants.ts
	interventionAddress: DEXY_BANK_INTERVENTION
};
```

3. complete file deploymentRequests.ts
   example:

```scala
    def interventionDeploymentRequest(): String = {
      s"""
         |  [
         |    {
         |      "address": "$interventionAddress",
         |      "value": 1000000000,
         |      "assets": [
         |        {
         |          "tokenId": "$interventionNFT",
         |          "amount": 1
         |        }
         |      ]
         |    }
         |  ]
         |""".stripMargin
    }
```

```js
export function interventionDeploymentRequest(): Object {
    const box = {
        address: DEXY_GOLD.interventionAddress,
        value: '1000000000',
        assets: [
            {
                tokenId: DEXY_GOLD.interventionNFT,
                amount: '1'
            }
        ]
    }

    return box;
}
```

//-------------------------

3. run scala tests <- me
4. add contract backdoors <- me
5. move backdoored addresses to scala and test

after next: 2. create BoxMintTransaction chain

3. save mintedBoxes into file

//-------------- NEW ------------------
ADD BANK:
+src/test/scala/dexy/bank/ArbMintSpec.scala
src/test/scala/dexy/bank/InterventionSpec.scala
src/test/scala/dexy/bank/PayoutSpec.scala

TRACKING:
src/test/scala/dexy/TrackingSpec.scala

ADD PL:
src/test/scala/dexy/lp/LpSwapSpec.scala
src/test/scala/dexy/lp/LpMintSpec.scala
src/test/scala/dexy/lp/LpRedeemSpec.scala

src/test/scala/dexy/lp/ExtractSpec.scala
src/test/scala/dexy/lp/ReverseExtractSpec.scala

//-------------------------

find out where DEXY_BANK_EXTRACT_UPDATE_TREE is used
