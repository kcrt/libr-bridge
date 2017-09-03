import R from '../R';
import {RString} from '../RObject';
import assert from 'assert';

var r;

assert.almostEqual = (a, b, allow = 0.001) => assert.ok(Math.abs(a - b) < allow, `${a} is not equal to ${b}`)
assert.arrayEqual = (a, b) => {
	if(!Array.isArray(a) || !Array.isArray(b)){
		assert.fail("not an array.")
	}else if(a.length != b.length){
		assert.fail("different length")
	}else{
		assert.ok(a.every((e, i) => (e == b[i])), `different item: ${a} !== ${b}`)
	}
}

describe('Initialize', () => {
	it('Initialize', () => {
		r = new R();
	})
});

describe('Primitives', () => {
	it('Integer', () => {
		assert.equal(1, r.eval("as.integer(1)"));
		assert.equal(0, r.eval("as.integer(0)"));
		assert.equal(-1, r.eval("as.integer(-1)"));
	});
	it('Real', () => {
		assert.equal(1.0, r.eval("1.0"));
		assert.equal(0.5, r.eval("0.5"));
	});
	it('String', () => {
		assert.equal("abc", r.eval('"abc"'));
	});
	it('Logical (Boolean)', () => {
		assert.equal(true, r.eval('T'));
		assert.equal(false, r.eval('F'));
		assert.notEqual(false, r.eval('T'));
		assert.notEqual(true, r.eval('F'));
		r.setVar("logvar", true)
		assert.ok(r.eval("logvar"))
	});
	it('Variable', () => {
		r.setVar("numvar", 2017)
		assert.equal(2017, r.getVar("numvar"))
		assert.equal(2017, r.eval("numvar"))
		r.setVar("strvar", "kcrt")
		assert.equal("kcrt", r.getVar("strvar"))
		assert.equal("kcrt", r.eval("strvar"))
	});
});


describe('Array', () => {
	const arr_1to100 = R.range(1, 101)
	it('ES Array <-> R Array', () => {
		assert.arrayEqual([3, 2, 1], r.eval("as.integer(c(3, 2, 1))"));
		assert.arrayEqual([1, 2, 3], r.f.c(1, 2, 3));
		assert.arrayEqual(arr_1to100, r.eval("1:100"));
		r.setVar('myarr', arr_1to100);
		assert.ok(r.eval('all.equal(myarr, 1:100)'));
		assert.ok(!r.eval('isTRUE(all.equal(myarr, 2:101))'));
		assert.arrayEqual(arr_1to100, r.getVar('myarr'));
	});
	it('String Array', () => {
		assert.arrayEqual(["abc", "def", "ghi", "jkl", "mno"], r.eval('c("abc", "def", "ghi", "jkl", "mno")'));
	});
});

describe('Attribute', () => {
	it('Names', () => {
		r.setVar("numvar", 2017);
		r.eval('names(numvar) = "hello"')
		assert.equal("hello", r.getVar("numvar").names)

		let valWithName = new RString("kcrt")
		valWithName.names = "hello"
		r.setVar("strvar", valWithName);
		assert.equal("hello", r.eval("names(numvar)"))
	});
});

describe('Basic calculation', () => {
	it('+-*/', () => {
		const expression = [
			"1 + 1", "10 + 20", "1984 + 2017", "-1 + 3",
			"1 - 1", "2 - 30", "0 - 5", "1 - (-3)",
			"1 * 1", "2 * 10", "1984 * 2017", "0 * 99999", "99999 * 99999",
			"8 / 4", "200 / 5", "4 / 3", "22 / 7", "0 / 100"
		];
		expression.map((e) => {
			assert.almostEqual(eval(e), r.eval(e));
		})
	}),
	it('pow', () => {
		assert.almostEqual(3**15, r.eval("3**15"));
		assert.almostEqual(Math.pow(3, 15), r.eval("3^15"));
	}),
	it('modulo', () => {
		assert.almostEqual(1549 % 8, r.eval("1549 %% 8"));
	})
})

describe('Math function', () => {
	it('Trigonometric functions', () => {
		assert.almostEqual(Math.sin(0), r.f.sin(0));
		assert.almostEqual(Math.sin(0.5), r.f.sin(0.5));
		assert.almostEqual(Math.cos(0), r.f.cos(0));
		assert.almostEqual(Math.cos(0.5), r.f.cos(0.5));
		assert.almostEqual(Math.tan(0), r.f.tan(0));
		assert.almostEqual(Math.tan(0.5), r.f.tan(0.5));
	});
	it('Array and functions', () => {
		const arr_1to100 = R.range(1, 101)
		const sum_1to100 = arr_1to100.reduce((pre, v) => pre + v);
		assert.almostEqual(sum_1to100, r.f.sum(arr_1to100));
		assert.almostEqual(sum_1to100 / 100, r.f.mean(arr_1to100));
	});
})

describe('Long command', () => {
	it('factorial', () => {
		r.eval(`
			myfactorial <- function(x) {
				if (x == 0) {
					return(1)
				} else {
					return(x * myfactorial(x - 1))
				}
			}
		`);
		let factorial_50 = r.func("myfactorial")(50)
		assert.equal(factorial_50, R.range(1, 51).reduce((pre, v) => pre * v));
	});
})


/*
 * vim: filetype=javascript
 */
