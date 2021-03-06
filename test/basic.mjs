import R from "../R";
import assert from "assert";
import assert_ext from "./assert_ext";
import Complex from "Complex";
import { RFactor, RIntArray, RDataFrame } from "../RObject";

var r;
assert_ext(assert);

describe("Initialize", () => {
	it("Initialize", () => {
		r = new R();
	});
});

describe("Primitives", () => {
	it("Integer", () => {
		assert.equal(1, r.eval("as.integer(1)"));
		assert.equal(0, r.eval("as.integer(0)"));
		assert.equal(-1, r.eval("as.integer(-1)"));
		r.setVar("numvar", 2017);
		assert.equal(2017, r.getVar("numvar"));
		assert.equal(2017, r.eval("numvar"));
		r.setVar("intvar", RIntArray.of(1));
		assert.equal(1, r.getVar("intvar"));
		assert.equal(1, r.eval("intvar"));
		assert.equal("integer", r.eval("typeof(intvar)"));
	});
	it("Real", () => {
		assert.equal(1.0, r.eval("1.0"));
		assert.equal(0.5, r.eval("0.5"));
	});
	it("String", () => {
		assert.equal("abc", r.eval("\"abc\""));
		r.setVar("strvar", "kcrt");
		assert.equal("kcrt", r.getVar("strvar"));
		assert.equal("kcrt", r.eval("strvar"));
		assert.equal("", r.eval("\"\""));
	});
	it("Logical (Boolean)", () => {
		assert.equal(true, r.eval("T"));
		assert.equal(false, r.eval("F"));
		assert.notEqual(false, r.eval("T"));
		assert.notEqual(true, r.eval("F"));
		r.setVar("logvar", true);
		assert.ok(r.eval("logvar"));
	});
	it("Complex", () => {
		const cpxvar = new Complex(1, 2);
		assert.ok(cpxvar.equals(r.eval("1+2i")));
		r.setVar("cpxvar", cpxvar);
		assert.equal(r.eval("Re(cpxvar)"), cpxvar.real);
		assert.equal(r.eval("Im(cpxvar)"), cpxvar.im);
		assert.equal(r.eval("abs(cpxvar)"), cpxvar.abs());
		assert.equal(r.eval("Arg(cpxvar)"), cpxvar.angle());
		assert.ok(r.eval("cpxvar^2").equals(cpxvar.multiply(cpxvar)));
	});
});

describe("Special values", () => {
	it("Empty vector", () => {
		assert.equal(r.eval("vector(mode=\"numeric\", length=0)").length, 0);
		r.setVar("empty_vector", []);
		assert.equal(r.eval("length(empty_vector)"), 0);
	});
	it("NA", () => {
		assert.strictEqual(r.eval("NA"), void 0);
		assert.arrayEqual(r.eval("c(1.1, 2.1, NA)"), [1.1, 2.1, undefined]);
		assert.arrayEqual(r.eval("c(1:2, NA)"), [1, 2, undefined]);
		assert.arrayEqual(r.eval("c('a', '', NA)"), ["a", "", undefined]);

		r.setVar("NASingle", void 0);
		r.setVar("NAReal", [1.0, void 0]);
		r.setVar("NAStr", ["a", void 0]);
		r.setVar("NABool", [true, void 0]);
		assert.ok(r.eval("is.na(NASingle) && !is.nan(NASingle)"));
		assert.ok(r.eval("is.na(NAReal[2]) && !is.nan(NAReal[2])"));
		assert.ok(r.eval("is.na(NAStr[2]) && !is.nan(NAStr[2])"));
		assert.ok(r.eval("is.na(NABool[2]) && !is.nan(NABool[2])"));
	});
	it("NaN", () => {
		assert.ok(isNaN(r.eval("NaN")));
		assert.ok(isNaN(r.eval("0 / 0")));
	});
	it("Inf", () => {
		assert.strictEqual(r.eval("Inf"), Infinity);
		assert.strictEqual(r.eval("-Inf"), -Infinity);
	});
});

describe("Array", () => {
	const arr_1to100 = R.range(1, 101);
	it("ES Array <-> R Array", () => {
		assert.arrayEqual([3, 2, 1], r.eval("as.integer(c(3, 2, 1))"));
		assert.arrayEqual([1, 2, 3], r.c(1, 2, 3));
		assert.arrayEqual(arr_1to100, r.eval("1:100"));
		r.setVar("myarr", arr_1to100);
		assert.ok(r.eval("all.equal(myarr, 1:100)"));
		assert.ok(!r.eval("isTRUE(all.equal(myarr, 2:101))"));
		assert.arrayEqual(arr_1to100, r.getVar("myarr"));
	});
	it("Int Array", () => {
		assert.arrayEqual(new RIntArray(...arr_1to100), r.eval("1:100"));
	});
	it("String Array", () => {
		var strArr = ["abc", "def", "ghi", "jkl", "mno"];
		assert.arrayEqual(strArr, r.eval("c(\"abc\", \"def\", \"ghi\", \"jkl\", \"mno\")"));
		r.setVar("strArr", strArr);
		assert.arrayEqual(strArr, r.getVar("strArr"));
	});
});

describe("Factor", () => {
	const v = ["apple", "banana", "apple", undefined, "orange"];
	const idx = [1, 2, 1, undefined, 3];
	it("Create factor", () => {
		const fac = new RFactor(v);
		assert.arrayEqual(fac, idx);
		assert.arrayEqual(fac.asString(), v);
		r.setVar("facvar", fac);
		assert.arrayEqual(r.getVar("facvar"), idx);
	});
	it("Create ordered factor", () => {
		const fac = new RFactor(v, void 0, true);
		assert.arrayEqual(fac, idx);
		r.setVar("facvar", fac);
		assert.arrayEqual(r.getVar("facvar"), idx);
	});
});

describe("Data frame", () => {
	const data = {
		"id": [ 12345, 23456, 34567],
		"Name": ["apple", "banana", "orange"],
		"Color": new RFactor(["red", "yellow", "orange"])
	};
	const data2 = new Map([
		["id", [ 12345, 23456, 34567]],
		["Name", ["apple", "banana", "orange"]],
		["Color", new RFactor(["red", "yellow", "orange"])]
	]);
	it("Create data frame", () => {
		r.setVar("mydataframe", new RDataFrame(data));
		assert.arrayEqual(data.id, r.getVar("mydataframe").get("id"));
		r.setVar("mydataframe", new RDataFrame(data2));
		assert.arrayEqual(data.Name, r.getVar("mydataframe").get("Name"));
		assert.notEqual(r.eval("iris").get("Species").levels.indexOf("versicolor"), -1);
	});
	it("Invalid data frame", () => {
		assert.throws(() => {r.setVar("test", {"id": [1, 2], "Name": "kcrt"});}, Error);
	});
});

describe("Attribute", () => {
	it("Names", () => {
		r.setVar("numvar", 2017);
		r.eval("names(numvar) = \"hello\"");
		assert.equal("hello", r.getVarNames("numvar"));

		r.setVar("strvar", "kcrt");
		r.setVarNames("strvar", "hello");
		assert.equal("hello", r.eval("names(strvar)"));

		r.setVar("no_name_var", "test");
		assert.strictEqual(r.getVarNames("no_name_var"), void 0);
	});
});

describe("Basic calculation", () => {
	it("+-*/", () => {
		const expression = [
			"1 + 1", "10 + 20", "1984 + 2017", "-1 + 3",
			"1 - 1", "2 - 30", "0 - 5", "1 - (-3)",
			"1 * 1", "2 * 10", "1984 * 2017", "0 * 99999", "99999 * 99999",
			"8 / 4", "200 / 5", "4 / 3", "22 / 7", "0 / 100"
		];
		expression.map((e) => {
			assert.almostEqual(eval(e), r.eval(e));
		});
	}),
	it("pow", () => {
		assert.almostEqual(Math.pow(3, 15), r.eval("3^15"));
	}),
	it("modulo", () => {
		assert.almostEqual(1549 % 8, r.eval("1549 %% 8"));
	});
});

describe("Math function", () => {
	it("Trigonometric functions", () => {
		assert.almostEqual(Math.sin(0), r.sin(0));
		assert.almostEqual(Math.sin(0.5), r.sin(0.5));
		assert.almostEqual(Math.cos(0), r.cos(0));
		assert.almostEqual(Math.cos(0.5), r.cos(0.5));
		assert.almostEqual(Math.tan(0), r.tan(0));
		assert.almostEqual(Math.tan(0.5), r.tan(0.5));
	});
	it("Array and functions", () => {
		const arr_1to100 = R.range(1, 101);
		const sum_1to100 = arr_1to100.reduce((pre, v) => pre + v);
		assert.almostEqual(sum_1to100, r.sum(arr_1to100));
		assert.almostEqual(sum_1to100 / 100, r.mean(arr_1to100));
	});
});

describe("Function call with named arguments", () => {
	it("Named arguments", () => {
		assert.strictEqual(r.mean([1, 2, 3, undefined]), void 0);
		assert.strictEqual(r.mean([1, 2, 3, undefined], {"na.rm": true}), 2);
	});
});

describe("Long command", () => {
	it("factorial", () => {
		r.eval(`
			myfactorial <- function(x) {
				if (x == 0) {
					return(1)
				} else {
					return(x * myfactorial(x - 1))
				}
			}
		`);
		let factorial_50 = r.func("myfactorial")(50);
		assert.equal(factorial_50, R.range(1, 51).reduce((pre, v) => pre * v));
	});
});

describe("Failing test", () => {
	it("non existing variable", () => {
		assert.strictEqual(r.getVar("non_exsisting_var"), void 0);
	});
	it("Syntax error in eval", () => {
		assert.throws(() => {r.eval("2 *+* 4", true);}, Error);
	});
	it("Execution error in eval", () => {
		assert.throws(() => {r.eval("1 <- 5", true);}, Error);
		assert.ok(r.evalWithTry("1 <- 5", true).startsWith("Error"));
	});
	it("Execution error in function call", () => {
		assert.throws(() => {r.func["stop"]("Test Error");}, Error);
	});
});

/*
 * vim: filetype=javascript
 */
