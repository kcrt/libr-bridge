
import R from "../R";
import assert from "assert";
import assert_ext from "./assert_ext";

var r;
assert_ext(assert);

describe("Initialize", () => {
	it("Initialize", () => {
		r = new R();
	});
});

describe("Console", () => {
	it("test console", () => {
		r.overrideShowMessage( (msg) => console.log("[Message from R] " + msg));
		r.overrideReadConsole( (_prompt) => "Answer" );
		r.overrideWriteConsole( (msg) => console.log("[R] " + msg));
		r.print("Print from R");
		const readline = r.func("readline");
		const ans = readline("MyReadLine> ");
		assert.equal(ans, "Answer");
	});
});

describe("Busy", () => {
	it("on Busy", () => {
		r.overrideBusy((which) => console.log("[Busy status]: " + which));
	});
});

/*
 * vim: filetype=javascript
 */
