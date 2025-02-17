{ // ===== Contract Information ===== //
  // taken from https://github.com/spectrum-finance/ergo-dex/blob/master/contracts/amm/cfmm/v1/n2t/SwapSell.sc

  val FeeDenom            = 1000
  val FeeNum              = 997
  val DexFeePerTokenNum   = 10L
  val DexFeePerTokenDenom = 100000L
  val MinQuoteAmount      = 800L
  val BaseAmount          = 1200L

  val poolIn = INPUTS(0)

  val validTrade =
    if (INPUTS.size >= 3 && poolIn.tokens.size == 3) {

      val rewardBox = OUTPUTS(2)

      val poolNFT = poolIn.tokens(0)._1

      val poolY = poolIn.tokens(2)

      val poolReservesX = poolIn.value.toBigInt
      val poolReservesY = poolY._2.toBigInt
      val validPoolIn   = poolNFT == fromBase64("$lpNFT")

      val quoteAsset  = rewardBox.tokens(0)
      val quoteAmount = quoteAsset._2.toBigInt

      val fairDexFee =
              rewardBox.value >= SELF.value - quoteAmount * DexFeePerTokenNum / DexFeePerTokenDenom - BaseAmount

      val relaxedOutput = quoteAmount + 1 // handle rounding loss
      val fairPrice =
              poolReservesY * BaseAmount * FeeNum <= relaxedOutput * (poolReservesX * FeeDenom + BaseAmount * FeeNum)

  //    val validMinerFee = OUTPUTS.map { (o: Box) =>
  //      if (o.propositionBytes == MinerPropBytes) o.value else 0L
  //    }.fold(0L, { (a: Long, b: Long) => a + b }) <= MaxMinerFee

      validPoolIn &&
    //  rewardBox.propositionBytes == Pk.propBytes &&
  //    quoteAsset._1 == QuoteId &&
   //   quoteAmount >= MinQuoteAmount &&
      fairDexFee  &&
      fairPrice
      // && validMinerFee

    } else false

  sigmaProp(validTrade)|| PK("9gJa6Mict6TVu9yipUX5aRUW87Yv8J62bbPEtkTje28sh5i3Lz8")
}