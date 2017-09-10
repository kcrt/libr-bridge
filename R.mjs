
/**
 *  @file libr-bridge: Bridging module between JavaScript and R
 *  @author TAKAHASHI, Kyohei <kcrt@kcrt.net> 
 *  @license XXXX
 *  @version XXXX
 */

import ref from 'ref';
import createLibR from './libR';
import SEXPWrap from './SEXPWrap'

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
			const argv = ["REmbeddedOnBridge", "--vanilla", "--gui=none", "--silent"].map((e) => ref.allocCString(e));
			libR = createLibR();
			libR.Rf_initEmbeddedR(argv.length, argv);
			libR.R_setStartTime();
			R_GlobalEnv = new SEXPWrap(libR.R_sysframe(0, ref.NULL))
			R_GlobalEnv.preserve();
			R.R_NilValue = libR.Rf_GetRowNames(R.GlobalEnv);		// passing non vector returns Nil
			if(!(new SEXPWrap(R.R_NilValue)).isNull()){
				throw "Can not acquire NilValue"
			}
			R.R_NamesSymbol = libR.Rf_install(ref.allocCString("names"))
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
		let funclist = ['print', 'require', 'mean', 'cor', 'var', 'sd', 'sqrt', 'IQR', 'min', 'max',
						'range', 'fisher.test', 't.test', 'wilcox.test', 'prop.test', 'var.test', 'p.adjust',
						'sin', 'cos', 'tan', 'sum', 'c',
						'is.na', 'is.nan', 'write.csv'];
		this.f = {};
		funclist.map((e) => {this.f[e] = this.func(e)});
	}
	/**
	 * Check whether R class is globally initialized or not.
	 * @return {boolean} Returns true if R is already loaded.
	 */
	static isInitialized(){
		return R_isInitialized;
	}
	/**
	 * Aquire global environment in R.
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
	 *		const sum = R.func("sum")
	 *		console.log(sum([1, 2, 3]))		// prints 6
	 */
	func(name){
		return this.__RFuncBridge.bind(this, this.__func_sexp(name))
	}
	/**
	 * Acquire bridging function to access R function.
	 * This function doesn't convert to/from SEXP.
	 * Receives SEXPWrap, and returns SEXPWrap. Please use carefully.
	 * @see {@link R#func}
	 */
	func_raw(name){
		return this._RFuncBridgeRaw.bind(this, this.__func_sexp(name))
	}
	/**
	 * Find functions in R environment.
	 * Please do not call this function manually.
	 * @private
	 * @param {string} name		name of function
	 * @return					SEXPWrap object of R function
	 */
	__func_sexp(name){
		if(!(name in func_cached)){
			func_cached[name] = new SEXPWrap(libR.Rf_findFun(libR.Rf_install(ref.allocCString(name)), R.GlobalEnv))
			func_cached[name].preserve();			// Unfortunately, we have no destructor in JavaScript....
		}
		return func_cached[name]
	}
	/**
	 * Bridging function for R function.
	 * This bridging function doesn't handle SEXP.
	 * Please do not call this function manually.
	 * @private
	 * @param {function} func	SEXPWrap object of R function
	 * @return					SEXPWrap object of returned value
	 */
	__RFuncBridge_raw(func){
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
		});
		const ret = new SEXPWrap(libR.Rf_eval(lang.sexp, R.GlobalEnv));	// TODO: change to tryEval
		return ret;
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
		const argumentsSEXPWrap = argumentsArr.map((e) => {
			const sw = new SEXPWrap(e);
			sw.protect();
			return sw;
		});
		let ret_sexp = this.__RFuncBridge_raw(func, ...argumentsSEXPWrap);
		ret_sexp.protect();
		let ret = ret_sexp.getValue();
		ret_sexp.unprotect();
		ret_sexp.unprotect(argumentsSEXPWrap.length);
		return ret;
	}
	/**
	 * Execute R code. Using {@link R#eval} is recommended.
	 * @param {string} code		R code
	 * @return					SEXPWrap object of returned value. Returns undefined on error.
	 * @see {@link eval}
	 */
	eval_raw(code){
		try{
			return new SEXPWrap(libR.R_ParseEvalString(code, R.GlobalEnv));
		}catch(e){
			return undefined;
		}
	}
	/**
	 * Execute R code.
	 * @param {string} code		R code
	 * @return					JavaScript compatible object of returned value. Returns undefined on error.
	 * @example
	 *		let value = R.eval("sum(c(1, 2, 3))")		// value will be 6
	 */
	eval(code){
		const ret = this.eval_raw(code);
		ret.protect();
		const retval = ret.getValue();
		ret.unprotect();
		return retval;
	}
	/**
	 * Execute R code with try. This is more safe than {@link R#eval}.
	 * @param {string} code		R code
	 * @return					Returned value. Returns undefined on error.
	 */
	evalWithTry(code){
		return this.eval("try(" + code + ")")
	}
	/**
	 * Acquire value of R variable
	 * @param {string} varname	Name of variable
	 * @return					Value in the R variable.
	 */
	getVar(varname){
		let varsexp = new SEXPWrap(libR.Rf_findVar(libR.Rf_install(varname), R.GlobalEnv));
		varsexp.protect();
		let value = varsexp.getValue();
		varsexp.unprotect();
		return value;
	}
	/**
	 * Acquire names attribute of R variable
	 * @param {string} varname	Name of variable
	 * @return					Associated name attribute for the specified R variable. If no name, undefined will be returned.
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
	 * Finish using R.
	 */
	release(){
		libR.Rf_endEmbeddedR(0)
	}
	/**
	 * Python like range function.
	 * Be careful, this is not R ':' operator
	 * range(0, 3) == [0, 1, 2], which is not eq. to 0:3
	 * @param{integer} a	from
	 * @param{integer} b	to (this value won't be included)
	 * @return				value in a <= x < b. range(0, 3) == [0, 1, 2]
	 */
	static range(a, b){
		let len = (b - a);
		return [...Array(len)].map((e, i) => i + a);
	}
}

/*
 * vim: filetype=javascript
 */
