import {
	BlockHeader,
	BlockHeaders,
	ErgoStateContext,
	Parameters,
	PreHeader
} from 'ergo-lib-wasm-nodejs';

const dummyHeaders = [
  {
    "extensionId": "93ac67f2b3f8be469d44b76b2ad1225d2e3d6bc034ed376a3b73caa36a8d2ee0",
    "difficulty": "1587445682405376",
    "votes": "000000",
    "timestamp": 1738070172825,
    "size": 221,
    "unparsedBytes": "",
    "stateRoot": "3854fa14bfa86c0715a771dc804689cb91596a42e74910245c25e109e3150a4919",
    "height": 1449141,
    "nBits": 117810118,
    "version": 3,
    "id": "89519cbb83ad149ffdacda8e492ad055d5594ed55d1a61e5e1920865e77fbf58",
    "adProofsRoot": "b04a9fdcc2e3e7681bde295f42ea8327194a2aa7e21f9ce356a146bed74bc523",
    "transactionsRoot": "2c4fc56e63efc45f02f9c9c8b87ee87a49fac4419254863e495dec88ba7062d5",
    "extensionHash": "2a846e86896d06df2e8360313d543917487fa0be213bcc9cdfbc99f4fbb35efe",
    "powSolutions": {
      "pk": "03677d088e4958aedcd5cd65845540e91272eba99e4d98e382f5ae2351e0dfbefd",
      "w": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
      "n": "78755800f877764a",
      "d": 0
    },
    "adProofsId": "f3d12e02e211f5c42021858c5d753e1dfc0f8e2b7889811122e261e7888099ac",
    "transactionsId": "097dce072dbb568dbb3eb1a4b34bae19349bc16df27fe731258a666ab2d7d9d2",
    "parentId": "62dc2d4a975cbb2e981631431e0e69e5fa1577695ea030e9bc3dc6a3bb560adc"
  },
  {
    "extensionId": "456d980b30b5c123a18982c4145708d092ad9ebbda23c9b3f44bb7228aa56d94",
    "difficulty": "1587445682405376",
    "votes": "000000",
    "timestamp": 1738070486293,
    "size": 221,
    "unparsedBytes": "",
    "stateRoot": "f016b4041b04806b9beba94d1f6e2f2b9c5973127e73479f1485f2cf7384223019",
    "height": 1449142,
    "nBits": 117810118,
    "version": 3,
    "id": "accad7c03375522039dbde58f6b496432cbb1aff0bfba72a32e7a5bf3415c34c",
    "adProofsRoot": "8fba66c10d323943d4a0c83075d6601e31174c2a9c5bc0baba5f6a21f5112825",
    "transactionsRoot": "236ddfd8ae9e44802798477d87a44b3527ad1d14db3d5e12008d8cf46bf8900c",
    "extensionHash": "f71a20b6a66d3fad860a4eb80ff02451409d8324cb706c8342202db38510e873",
    "powSolutions": {
      "pk": "0274e729bb6615cbda94d9d176a2f1525068f12b330e38bbbf387232797dfd891f",
      "w": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
      "n": "29d249384c3b38f0",
      "d": 0
    },
    "adProofsId": "c3f448035227376efa51bb2d67cff9e3fc2b8e53035e16240238a9095418bc7c",
    "transactionsId": "235b5a194aabec91f82ce24d0545d29b861b1482172b9b909f57cabf4a16e50f",
    "parentId": "89519cbb83ad149ffdacda8e492ad055d5594ed55d1a61e5e1920865e77fbf58"
  },
  {
    "extensionId": "edfc69dae26663f3228e485ef33731727bcecae499a88f493c3ef0c9f7d53d66",
    "difficulty": "1587445682405376",
    "votes": "000000",
    "timestamp": 1738070739110,
    "size": 221,
    "unparsedBytes": "",
    "stateRoot": "f30d9ffe94d0067ead9eaba422db9292e9ef5c6b3394b6663fbac44afddf2c0b19",
    "height": 1449143,
    "nBits": 117810118,
    "version": 3,
    "id": "1f99238bbf4b5cf74077dc673ba47661a5fdef5a285c551e01874aa454d00832",
    "adProofsRoot": "335f7f917e1fb234ee6d5b951f8f74494f2a0af96c6d437cc2f386fcf1db8782",
    "transactionsRoot": "adb4d927470f9cf1bbc628a3df79851becc4daca1a3ca96fd470bb8b55fd321d",
    "extensionHash": "f71a20b6a66d3fad860a4eb80ff02451409d8324cb706c8342202db38510e873",
    "powSolutions": {
      "pk": "03b3fc3769bc7813f6287e130ea627b5350fd4709b359311606a1cc48d298cbfa7",
      "w": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
      "n": "ddc80dc0a0b80128",
      "d": 0
    },
    "adProofsId": "ca4433eb6f9788c25940c496e988e761cde5c2ec31f274bda097f98d20b5c725",
    "transactionsId": "5f4fcc8f15d59619bf045a443e8d18bf3fb3c0b189d70119c39980f8cfdac3b7",
    "parentId": "accad7c03375522039dbde58f6b496432cbb1aff0bfba72a32e7a5bf3415c34c"
  },
  {
    "extensionId": "7e440a0984ac94b61f04ad07332a4c8630e3a05badbce7306701f336bd801777",
    "difficulty": "1587445682405376",
    "votes": "000000",
    "timestamp": 1738070771297,
    "size": 221,
    "unparsedBytes": "",
    "stateRoot": "4ed4416057a99818cef6ed4bc06a1b84ceff2ffa6c171c25aee4b7dc13633b7619",
    "height": 1449144,
    "nBits": 117810118,
    "version": 3,
    "id": "917131e6b3d4dd4045610536df72c0d6764bf6f92a07ec5972bef99965e69102",
    "adProofsRoot": "1e618956b38b7daf82a2e81718cb708618ef384a23d1b5109ff5198cd8d3d171",
    "transactionsRoot": "7d43a344d6f4bd42eb4b17c8fc7ebf864aab9e64aa1f1ef9daa4027a25c770fb",
    "extensionHash": "9b95c161b0b1add7307feee7621350214807411733b103e3eaa807a260bbf5dc",
    "powSolutions": {
      "pk": "03677d088e4958aedcd5cd65845540e91272eba99e4d98e382f5ae2351e0dfbefd",
      "w": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
      "n": "48be30003ed1e13e",
      "d": 0
    },
    "adProofsId": "26a0077a8253edce70fc253d445af62d2daca6ec49d17c38430525ee73bf79bc",
    "transactionsId": "a29777caf9b115b46e3bfe862b4e1a20e688debf2ef78d190b4d38882644c12a",
    "parentId": "1f99238bbf4b5cf74077dc673ba47661a5fdef5a285c551e01874aa454d00832"
  },
  {
    "extensionId": "45f31f768cd8782fbb34b532340de3f7a33550d0d9c5a4a3b47e2481aad71195",
    "difficulty": "1587445682405376",
    "votes": "000000",
    "timestamp": 1738070851865,
    "size": 221,
    "unparsedBytes": "",
    "stateRoot": "7739e22100656b82b4f80c21f804dce53b2c87921d78f6dd55eb9a64a1306e8f19",
    "height": 1449145,
    "nBits": 117810118,
    "version": 3,
    "id": "35b09413399a817d10e36d527caeeac5de6cb55561fe2e936c2f8c66e35e5252",
    "adProofsRoot": "30df66c069fdacf31a40456968e6aad6da6d259f3199c34cdeefa142e19a14ad",
    "transactionsRoot": "784cbd33a974d12964681134d83a61789c3dba0f98b9f0399a8cae8603933cdf",
    "extensionHash": "b17f1d28f784f02d09bc8dc6df7f317efff557e47b71294c01c051d73d188e06",
    "powSolutions": {
      "pk": "03677d088e4958aedcd5cd65845540e91272eba99e4d98e382f5ae2351e0dfbefd",
      "w": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
      "n": "2cbb900008cf968f",
      "d": 0
    },
    "adProofsId": "3ae408b4172787875062e3d9c3da63a0f7a60d64b830cd87642b60d7727cac66",
    "transactionsId": "39e4407b95eb42c1f7247ea025af5a8c1650ab471ca30ad8b90f37c200210cda",
    "parentId": "917131e6b3d4dd4045610536df72c0d6764bf6f92a07ec5972bef99965e69102"
  },
  {
    "extensionId": "9acabcdb16d1eb4e69774ee48b637b32ec378147b5b5a35b6814ad02937a20f6",
    "difficulty": "1587445682405376",
    "votes": "000000",
    "timestamp": 1738070864827,
    "size": 221,
    "unparsedBytes": "",
    "stateRoot": "04a9086e6849849d6d8b98b8fea9d511508a62a54bc8404e0c768d377a93f2a419",
    "height": 1449146,
    "nBits": 117810118,
    "version": 3,
    "id": "51001c8c00f09adb63f257d1ec92c9d01fd5d7793d46fd8e04998961f3b08a80",
    "adProofsRoot": "628b23581bec21a4f2815776114363bf92c68c90827fe9b54a45604a680c7e8a",
    "transactionsRoot": "d7784aede7e05f73d7e58b55e446990fe928d1e395d9bd3f0a0c995b55300f90",
    "extensionHash": "69d36f43025d5e478a347c9accd9105efb14dd21c620e3b0427642f2fe81a6f5",
    "powSolutions": {
      "pk": "0295facb78290ac2b55f1453204d49df37be5bae9f185ed6704c1ba3ee372280c1",
      "w": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
      "n": "7023b773fc453938",
      "d": 0
    },
    "adProofsId": "c7f54b909e0e5da9d1ae8e8a90c99371904174d9137d9eec47aa42124f8f008e",
    "transactionsId": "bc6d8903a2bc93c1ac8819de5df537998ccc09306fb1b6460df20dca4bf5d31b",
    "parentId": "35b09413399a817d10e36d527caeeac5de6cb55561fe2e936c2f8c66e35e5252"
  },
  {
    "extensionId": "3f79aed1fe15789d5f29ae9198a9bfa3dea4d529731b37d959882ca60f482994",
    "difficulty": "1587445682405376",
    "votes": "000000",
    "timestamp": 1738071117532,
    "size": 221,
    "unparsedBytes": "",
    "stateRoot": "6bbe48d7ed396b768a2626441416acb43e7a586099f3251ab7413ede4ab2cded19",
    "height": 1449147,
    "nBits": 117810118,
    "version": 3,
    "id": "917c93de9dc694c192cd857e56a9f76592e3fbe5ad91926f0043b739add37a9e",
    "adProofsRoot": "4adbf6cad088f9f4fc09325f6b01df27a24a8b1145fe059371f37d0bf7bbcd3e",
    "transactionsRoot": "15d453b3af194f3b6ad2002605b1f8b1e21e7420a46052a5d77db04ac342b9ee",
    "extensionHash": "d4ceb2c53c7ee8ddb11ee82048b62487e7ded39a179764ae13fc2a1452015741",
    "powSolutions": {
      "pk": "03677d088e4958aedcd5cd65845540e91272eba99e4d98e382f5ae2351e0dfbefd",
      "w": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
      "n": "e03c5800c674f17f",
      "d": 0
    },
    "adProofsId": "4e2d4c0f32df80cc28ae425883876c57f19292aa9c06cb426b5d7e42ea193249",
    "transactionsId": "91c51b297cc0b8b70d00812affdb2134d5c83cf2c8d40ee5775c52c48949cf14",
    "parentId": "51001c8c00f09adb63f257d1ec92c9d01fd5d7793d46fd8e04998961f3b08a80"
  },
  {
    "extensionId": "75080542cd642c4be81c14d94c9f427c151ed8a04d80a5223178ef0b9d924740",
    "difficulty": "1587445682405376",
    "votes": "000000",
    "timestamp": 1738071368059,
    "size": 221,
    "unparsedBytes": "",
    "stateRoot": "502280501041d11d05dccaee1fac4c679125497120e9a543ecd6414e84c3790119",
    "height": 1449148,
    "nBits": 117810118,
    "version": 3,
    "id": "3622bca001486c8d0ab3552a6b14dfba099ce6e5184f2925ac678e4aa0eb9f9f",
    "adProofsRoot": "52c665f3d0218122df11917791ca58b07b5e729c19bc24a187ede830b8221355",
    "transactionsRoot": "ed435b98d3b79fb3080ef62ecbd9c917241ac6baeb880140b8e0db0cb856f94a",
    "extensionHash": "d4ceb2c53c7ee8ddb11ee82048b62487e7ded39a179764ae13fc2a1452015741",
    "powSolutions": {
      "pk": "0274e729bb6615cbda94d9d176a2f1525068f12b330e38bbbf387232797dfd891f",
      "w": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
      "n": "37aca31c61ec377a",
      "d": 0
    },
    "adProofsId": "188ba9eb63bc6cc2a6dd3250cf98e667dbdefc31b7fb8b21a22bc0188cfe1e32",
    "transactionsId": "03228a5dccc58a2c9425ee06514f8a60b2d8b5bafccea4b3c1c9b9e1f347331b",
    "parentId": "917c93de9dc694c192cd857e56a9f76592e3fbe5ad91926f0043b739add37a9e"
  },
  {
    "extensionId": "bf8c1b0b38e680fda05f714a07323c907f4a7d2c05505dbd4d1f7c0eddea6744",
    "difficulty": "1587445682405376",
    "votes": "000000",
    "timestamp": 1738071376012,
    "size": 221,
    "unparsedBytes": "",
    "stateRoot": "c94f36768328418a1edb2fbb4aa243e72c3516fa1109f1242207a3eea6f68e0519",
    "height": 1449149,
    "nBits": 117810118,
    "version": 3,
    "id": "f6e69e35eddefe989a76ef2931ab90fea78e2e8f09b3939c698ae01edfd1a807",
    "adProofsRoot": "a12d5afc329666cf70bbcdbf7d93ec0417393e8811c4f3af1c9d3ab96604aa81",
    "transactionsRoot": "17c87ce5df99275ab7019bbc55108a7c1f467ec988f37eb58632b543861c4959",
    "extensionHash": "f116dac273f80a16bfc074fa90724bc90ceac5f284edd0f1ec018dadf98337c1",
    "powSolutions": {
      "pk": "02eeec374f4e660e117fccbfec79e6fe5cdf44ac508fa228bfc654d2973f9bdc9a",
      "w": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
      "n": "391a0503f30d5682",
      "d": 0
    },
    "adProofsId": "1527960523849e07e0fdbd2ab5651c6f8e15cf0290c8dfe7a28f1f6aa71cb05a",
    "transactionsId": "6f930a5951841de706443287bab19a96c246ba5e1837e2496579a166509fcdab",
    "parentId": "3622bca001486c8d0ab3552a6b14dfba099ce6e5184f2925ac678e4aa0eb9f9f"
  },
  {
    "extensionId": "1e44da1a5d2475a41e0299e1e4f4e36ec676ed27ddd057d642a686c46b4a1104",
    "difficulty": "1587445682405376",
    "votes": "000000",
    "timestamp": 1738071408530,
    "size": 221,
    "unparsedBytes": "",
    "stateRoot": "4fe3f167eb92c4dc36d83e42d89ec4af8281c9840ee3a60e2aa90a10ebfddf3f19",
    "height": 1449150,
    "nBits": 117810118,
    "version": 3,
    "id": "89b9098b959011b76247f5bb074de38d845ffdfb3552d5a4b406cc5eb03ee9c2",
    "adProofsRoot": "90112a82d7339c8b4317b498014653f58dafd882ece9e42535dfb08ae530d4d8",
    "transactionsRoot": "775acad8e8b9e8cd0acdb992b906c01328195898f0792c42d68f3b5ada5339a2",
    "extensionHash": "cd80fc06877b3c241065e38e11a14efd577bec5a04242eff15ee05b8b2a986fe",
    "powSolutions": {
      "pk": "03677d088e4958aedcd5cd65845540e91272eba99e4d98e382f5ae2351e0dfbefd",
      "w": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
      "n": "8e50470014d59b98",
      "d": 0
    },
    "adProofsId": "be6bb736b06b7805cce718de6de684a35aca82a5d19ce00121e2cb5ad90adc3d",
    "transactionsId": "7ca2aa00120bbe80e168144b6e99ff73e38ee48c536e8725fcfed646de73d63b",
    "parentId": "f6e69e35eddefe989a76ef2931ab90fea78e2e8f09b3939c698ae01edfd1a807"
  }
]

async function fakeContext() {
	const blockHeaders = BlockHeaders.from_json(dummyHeaders);
	const preHeader = PreHeader.from_block_header(BlockHeader.from_json(JSON.stringify(dummyHeaders[9])));
	return new ErgoStateContext(preHeader, blockHeaders, Parameters.default_parameters());
}

// add real context

async function fetchChainSlice(fromHeight: number, toHeight: number) {
  const response = await fetch(
    `https://ergfi.xyz:9443/blocks/chainSlice?fromHeight=${fromHeight}&toHeight=${toHeight}`,
    { headers: { accept: 'application/json' } }
  );

  return response.json();
}

async function realContext(height:number) {
  const headers = await fetchChainSlice(height-10, height);
	const blockHeaders = BlockHeaders.from_json(headers);
	const preHeader = PreHeader.from_block_header(BlockHeader.from_json(JSON.stringify(headers[9])));
	return new ErgoStateContext(preHeader, blockHeaders, Parameters.default_parameters());
}

export async function createContext(height: number | undefined = undefined){
  if(height != undefined){
    return await realContext(height)
  }else{
    return fakeContext()
  }
}