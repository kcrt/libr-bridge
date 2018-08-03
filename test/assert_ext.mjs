export default function assert_ext(assert){
	assert.almostEqual = (a, b, allow = 0.001) => assert.ok(Math.abs(a - b) < allow, `${a} is not equal to ${b}`);
	assert.arrayEqual = (a, b) => {
		if(!Array.isArray(a) || !Array.isArray(b)){
			assert.fail("not an array.");
		}else if(a.length != b.length){
			assert.fail("different length");
		}else{
			assert.ok(a.every((e, i) => (e == b[i])), `different item: ${a} !== ${b}`);
		}
	};
}
/*
 * vim: filetype=javascript
 */
