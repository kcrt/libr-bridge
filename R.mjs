"use strict";
/**
 *	@file libr-bridge: Bridging module between JavaScript and R
 *	@author TAKAHASHI, Kyohei <kcrt@kcrt.net>
 *	@version XXXX
 */

import ref from "ref";
import ffi from "ffi";
import createLibR, {ParseStatus} from "./libR";
import SEXPWrap from "./SEXPWrap";
import debug_ from "debug";
const debug = debug_("libr-bridge:class R");

let R_isInitialized = false;
let R_GlobalEnv = undefined;
let func_cached = {};
let libR = undefined;

/**
 * Class for accessing R via libR.
 */
export default class R{
	/**
	 * Constructor function for class R
	 */
	constructor(){
		if(!R.isInitialized()){
			debug("Initializing R...");
			const argv = ["REmbeddedOnBridge", "--vanilla", "--gui=none", "--silent"];
			libR = createLibR();
			if(libR === void 0){
				debug("Failed to initialize");
				throw new "R initialization failed.";
			}
			libR.Rf_initEmbeddedR(argv.length, argv);
			libR.R_setStartTime();
			/* Initialize values */
			R_GlobalEnv = new SEXPWrap(libR.R_GlobalEnv.deref()) ; //new SEXPWrap(libR.R_sysframe(0, ref.NULL));
			// R_GlobalEnv.preserve();
			R.R_NilValue = libR.Rf_GetRowNames(R.GlobalEnv);		// passing non vector returns Nil
			if(!(new SEXPWrap(R.R_NilValue)).isNull()){
				throw new Error("Can not acquire NilValue");
			}
			R.R_UnboundValue = libR.Rf_findVar(libR.Rf_install("__non_existing_value_kcrt__"), R.GlobalEnv);
			R.R_NamesSymbol = libR.Rf_install("names");
			R.R_NaInt = this.eval("as.integer(NA)");				// usually INT_MIN (-2147483648)
			//R.R_NaString = new SEXPWrap(libR.STRING_ELT(this.eval_raw("as.character(NA)").sexp, 0));
			R.R_NaString = new SEXPWrap(libR.R_NaString.deref());
			R.R_BlankString = new SEXPWrap(libR.R_BlankString.deref());
			R_isInitialized = true;
		}
		this.__initializeRfunc();
	}
	/**
	 *	Load some R functions.
	 *	Please do not call manually.
	 *	@private
	 */
	__initializeRfunc(){
		let funclist = ["print", "require", "mean", "cor", "var", "sd", "sqrt", "IQR", "min", "max",
			"range", "fisher.test", "t.test", "wilcox.test", "prop.test", "var.test", "p.adjust",
			"sin", "cos", "tan", "sum", "c",
			"is.na", "is.nan", "write.csv", "data.frame"];
		funclist.map((e) => {this[e] = this.func(e);});
	}
	/**
	 * Check whether R class is globally initialized or not.
	 * @return {boolean} Returns true if R is already loaded.
	 */
	static isInitialized(){
		return R_isInitialized;
	}
	/**
	 * Acquire global environment in R.
	 * @return {boolean} SEXP of global environment.
	 */
	static get GlobalEnv(){
		return R_GlobalEnv.sexp;
	}
	/**
	 * Initialized libR object for accessing R.
	 * @return {Object} libR
	 */
	static get libR() {
		return libR;
	}
	/**
	 * Acquire bridging function to access R function.
	 * Functions receive JavaScript value, and returns JavaScript compatible objects.
	 * @param {string} name		name of R function
	 * @return {function}		Bridging function
	 * @example
	 *	const sum = R.func("sum")
	 *	console.log(sum([1, 2, 3]))		// prints 6
	 */
	func(name){
		return this.__RFuncBridge.bind(this, this.__func_sexp(name));
	}
	/**
	 * Acquire bridging function to access R function.
	 * This function doesn't convert to/from SEXP.
	 * Receives SEXPWrap, and returns SEXPWrap. Please use carefully.
	 * @param {string} name		name of R function
	 * @return {function}		Bridging function
	 * @see {@link R#func}
	 */
	func_raw(name){
		return this.__RFuncBridge_raw.bind(this, this.__func_sexp(name));
	}
	/**
	 * Find functions in R environment.
	 * Please do not call this function manually.
	 * @private
	 * @param {string} name		name of function
	 * @return {SEXPWrap}		SEXPWrap object of R function
	 */
	__func_sexp(name){
		if(!(name in func_cached)){
			const func_sexp = libR.Rf_findFun(libR.Rf_install(name), R.GlobalEnv);
			func_cached[name] = new SEXPWrap(func_sexp);
			func_cached[name].preserve();			// Unfortunately, we have no destructor in JavaScript....
		}
		return func_cached[name];
	}
	/**
	 * Bridging function for R function.
	 * This bridging function doesn't handle SEXP.
	 * Please do not call this function manually.
	 * @private
	 * @param {function} _func	SEXPWrap object of R function
	 * @return {SEXPWrap}		SEXPWrap object of returned value
	 */
	__RFuncBridge_raw(_func){
		// Function name with "raw" receives SEXP, and returns SEXP
		let lang;
		R.range(0, arguments.length).reverse().map((i) => {
			if(lang === void 0){
				lang = new SEXPWrap(libR.Rf_lcons(arguments[i].sexp, R.R_NilValue));
			}else{
				lang.protect();
				lang = new SEXPWrap(libR.Rf_lcons(arguments[i].sexp, lang.sexp));
				lang.unprotect(1);	// this frees old lang
			}
			if(arguments[i].argtag !== void 0){
				libR.SET_TAG(lang.sexp, libR.Rf_install(arguments[i].argtag));
			}
		});
		lang.protect();	// protect the most recent one.
		try{
			const ret = this.__eval_langsxp(lang.sexp);
			lang.unprotect();
			return ret;
		}catch(e){
			lang.protect();
			throw e;
		}
	}
	/**
	 * Bridging function for R function.
	 * Please do not call this function manually.
	 * @private
	 * @param {function} func	SEXPWrap object of R function
	 * @return					JavaScript compatible returned value
	 */
	__RFuncBridge(func){
		// This receives normal Javascript value, and returns Javascript value
		const argumentsArr = Array.apply(null, arguments).slice(1);
		let argumentsSEXPWrap = new Array();
		argumentsArr.map((e) => {
			if(e.constructor.name == "Object"){
				// add all items
				for(let key of Object.keys(e)){
					const sw = new SEXPWrap(e[key]);
					sw.protect();
					sw.argtag = key;
					argumentsSEXPWrap.push(sw);
				}
			}else{
				// simply add
				const sw = new SEXPWrap(e);
				sw.protect();
				argumentsSEXPWrap.push(sw);
			}
		});
		try {
			let ret_sexp = this.__RFuncBridge_raw(func, ...argumentsSEXPWrap);
			ret_sexp.protect();
			let ret = ret_sexp.getValue();
			ret_sexp.unprotect();
			SEXPWrap.unprotect(argumentsSEXPWrap.length);
			return ret;
		}catch(e){
			SEXPWrap.unprotect(argumentsSEXPWrap.length);
			throw e;
		}
	}
	/**
	 * Execute R code.
	 * @param {string} code		R code
	 * @param {boolean} silent	Suppress error message if true.
	 * @throws {Error}			When execution fails.
	 * @return {SEXPWrap}		SEXPWrap object of returned value. Returns undefined on error.
	 * @see {@link eval}, R_ParseEvalString
	 */
	eval_raw(code, silent=false){
		const s = new SEXPWrap(code);	
		s.protect();
		var status = ref.alloc(ref.types.int);
		const ps = new SEXPWrap(libR.R_ParseVector(s.sexp, -1, status, R.R_NilValue));
		ps.protect();
		if(ref.deref(status) != ParseStatus.PARSE_OK ||
			!(ps.isExpression()) || 
			ps.length() != 1){
			ps.unprotect(2);
			debug(`Parse error.\n-----\n${code}\n-----`);
			throw new Error("Parse error of R code");
		}else{
			try {
				const ret = this.__eval_langsxp(libR.VECTOR_ELT(ps.sexp, 0), silent);
				ps.unprotect(2);
				return ret;
			}catch(e){
				const errmsg = libR.R_curErrorBuf();
				debug(`Execution error in eval_raw.\n----\n${code}\n\nReason: ${errmsg}----`);
				ps.unprotect(2);
				throw e;
			}
		}
	}
	/**
	 * Execute R code with LANGSXP
	 * @private
	 */
	__eval_langsxp(langsxp, silent=false){
		var errorOccurred = ref.alloc(ref.types.int, 0);
		const f = silent ? libR.R_tryEvalSilent : libR.R_tryEval;
		const retval = new SEXPWrap(f(langsxp, R.GlobalEnv, errorOccurred));
		if(ref.deref(errorOccurred)){
			const errmsg = libR.R_curErrorBuf();
			throw new Error(`Execution error: ${errmsg}`);
		}
		return retval;
	}
	/**
	 * Execute R code without error handling. App crashes when execution/parse failure.
	 * Please use this function with care.
	 * @param {string} code		R code
	 * @return {SEXPWrap}		SEXPWrap object of returned value. Returns undefined on error.
	 * @see {@link eval_raw}
	 */
	eval_direct(code){
		return new SEXPWrap(libR.R_ParseEvalString(code, R.GlobalEnv));
	}
	/**
	 * Execute R code.
	 * @param {string} code		R code
	 * @param {boolean} silent	Suppress error message if true.
	 * @throws {Error}			When execution fails.
	 * @return					JavaScript compatible object of returned value.
	 * @example
	 *		let value = R.eval("sum(c(1, 2, 3))")		// value will be 6
	 */
	eval(code, silent=false){
		const ret = this.eval_raw(code, silent);
		ret.protect();
		const retval = ret.getValue();
		ret.unprotect();
		return retval;
	}
	/**
	 * Execute R code with R try. This is more safe than {@link R#eval}.
	 * @param {string} code		R code
	 * @param {boolean} silent	Suppress error message if true.
	 * @return					Returned value. Returns undefined on error.
	 */
	evalWithTry(code, silent=false){
		const f = silent ? "TRUE" : "FALSE";
		return this.eval(`try({${code}}, silent=${f})`);
	}
	/**
	 * Acquire value of R variable
	 * @param {string} varname	Name of variable
	 * @return					Value in the R variable.
	 */
	getVar(varname){
		let varsexp = new SEXPWrap(libR.Rf_findVar(libR.Rf_install(varname), R.GlobalEnv));
		if(varsexp.sexp.address() == R.R_UnboundValue.address()){ return undefined; }
		varsexp.protect();
		let value = varsexp.getValue();
		varsexp.unprotect();
		return value;
	}
	/**
	 * Acquire names attribute of R variable
	 * @param {string} varname	Name of variable
	 * @return {string}			Associated name attribute for the specified R variable. If no name, undefined will be returned.
	 */
	getVarNames(varname){
		let varsexp = new SEXPWrap(libR.Rf_findVar(libR.Rf_install(varname), R.GlobalEnv));
		return varsexp.names;
	}
	/**
	 * Set value to R variable
	 * @param {string} varname	Name of variable
	 * @param {object} value	Value you want to set to variable.
	 */
	setVar(varname, value){
		let value_sexp = new SEXPWrap(value);
		value_sexp.protect();
		libR.Rf_setVar(libR.Rf_install(varname), value_sexp.sexp, R.GlobalEnv);
		value_sexp.unprotect();
	}
	/**
	 * Set names attribute to R variable
	 * @param {string} varname	Name of variable
	 * @param {object} value	Value you want to set to names attributes
	 */
	setVarNames(varname, value){
		let varsexp = new SEXPWrap(libR.Rf_findVar(libR.Rf_install(varname), R.GlobalEnv));
		varsexp.names = value;
	}
	/**
	 * Use your own console input/output instead of R's default one.
	 * @param {function} onMessage	Function on showing message
	 */
	overrideShowMessage(onMessage){
		const ShowMessage = ffi.Callback("void", [ref.types.CString], (msg) => onMessage(msg) );
		ref.writePointer(libR.ptr_R_ShowMessage, 0, ShowMessage);
	}
	/**
	 * Use your own console input/output instead of R's default one.
	 * @param {function} onReadConsole		Function on console read
	 */
	overrideReadConsole(onReadConsole){
		const ReadConsole = ffi.Callback("int", [ref.types.CString, ref.refType(ref.types.char), "int", "int"],
			(prompt, buf, len, _addtohistory) => {
				debug("Read console start: " + prompt);
				const ret = onReadConsole(prompt) + "\n";
				const rebuf = ref.reinterpret(buf, len, 0);
				if(ret.length + 1 > len){
					/* too large! */
					debug("Too long input for ReadConsole");
					ref.writeCString(rebuf, 0, "ERROR");
				}else{
					debug("Writedown to buffer.");
					ref.writeCString(rebuf, 0, ret);
				}
				debug("Read console fin");
				return 1;
			});
		ref.writePointer(libR.ptr_R_ReadConsole, 0, ReadConsole);
	}
	/**
	 * Use your own console input/output instead of R's default one.
	 * @param {function} onWriteConsole		Function on console write
	 */
	overrideWriteConsole(onWriteConsole){
		const WriteConsole = ffi.Callback("void", [ref.types.CString, "int"], (output, _len) => onWriteConsole(output) );
		const WriteConsoleEx = ffi.Callback(
			"void", [ref.types.CString, "int", "int"],
			(output, len, otype) => onWriteConsole(output, otype)
		);
		ref.writePointer(libR.ptr_R_WriteConsole, 0, WriteConsole);
		ref.writePointer(libR.ptr_R_WriteConsoleEx, 0, WriteConsoleEx);
	}
	/**
	 * Set callback on R's computation.
	 * @param {function} onBusy				Function called on busy/job finish
	 */
	overrideBusy(onBusy){
		const Busy = ffi.Callback("void", ["int"], (which) => onBusy(which));
		ref.writePointer(libR.ptr_R_Busy, 0, Busy);
	}
	/**
	 * Finish using R.
	 */
	release(){
		libR.Rf_endEmbeddedR(0);
	}
	/**
	 * Python like range function.
	 * Be careful, this is not R ':' operator
	 * range(0, 3) == [0, 1, 2], which is not eq. to 0:3
	 * @param {integer} a	from
	 * @param {integer} b	to (this value won't be included)
	 * @return {Array}		value in a <= x < b. range(0, 3) == [0, 1, 2]
	 */
	static range(a, b){
		let len = (b - a);
		return [...Array(len)].map((e, i) => i + a);
	}
}

/*
 * vim: filetype=javascript
 */
