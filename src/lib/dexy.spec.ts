import { describe, it, expect } from 'vitest';
import { compileContract } from './compile';

const depositContract = `
{
	def getSellerPk(box: Box)              = box.R4[Coll[SigmaProp]].get(0)
	def getPoolPk(box: Box)                = box.R4[Coll[SigmaProp]].get(1)
	def unlockHeight(box: Box)             = box.R5[Int].get
	
	if(HEIGHT > unlockHeight(SELF)){
		getSellerPk(SELF)
	}else{
		getSellerPk(SELF) && getPoolPk(SELF)
	}
}
`;

describe('Contract Compilation', () => {
	it('should produce a valid address for depositContract', () => {
		const address = compileContract(depositContract);
		expect(address).toMatch(/^[1-9A-HJ-NP-Za-km-z]{95,}$/);
	});
});
