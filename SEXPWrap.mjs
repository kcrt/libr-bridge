"use strict";
import util from "util";
import ref from "ref";
import Complex from "Complex";
import R from "./R";
import {SEXPTYPE, ComplexInR, cetype_t} from "./libR";
import { RFactor, RDataFrame, RArray, RBoolArray, RStrArray, RIntArray, RRealArray, RComplexArray } from "./RObject";
import debug_ from "debug";
const debug = debug_("libr-bridge:class SEXPWrap");

var sexpSize = void 0;

export default class SEXPWrap {
	constructor(value){
		
		if(value instanceof Buffer){
			// This may be SEXP!
			this.sexp = value;
		}else{
			this.__initializeWithValue(value);
		}
	}
	toString(){
		return "[SEXP]";
	}
	/**
	 *	Initialize this instance with specified value.
	 *	@private
	 */
	__initializeWithValue(value){

		if(value === []){
			debug("[]: " + value);
		}
		if(value instanceof RDataFrame){
			/* it is ok. */
		}else if(!Array.isArray(value)){
			// not an array.
			// convert to array and try again.
			// (You can use Rf_mkString, Rf_ScalarReal, Rf_ScalarLogical if you don't want SEXPWrap)
			return this.__initializeWithValue([value]);
		}else if(value.length === 0){
			this.sexp = R.R_NilValue;
		}else if(!(value instanceof RArray)){
			// Javascript normal array. (not RArray)
			// Need to determine type of array.
			if(typeof(value[0]) === "number" || value[0] === void 0){
				value = RRealArray.of(...value);
			}else if(typeof(value[0]) === "boolean"){
				value = RBoolArray.of(...value);
			}else if(typeof(value[0]) === "string"){
				value = RStrArray.of(...value);
			}else if(value[0] instanceof Complex){
				value = RComplexArray.of(...value);
			}else{
				debug("Cannot recognize " + typeof(value[0]));
				debug("value is: " + value);
				throw new Error("Unknown type of array.");
			}
		}
		
		if(value instanceof RFactor || value instanceof RIntArray){
			// Check if RFactor is proxy (asString)
			if(value instanceof RFactor && util.types.isProxy(value)){
				value = value["Unproxy"];
			}
			// Factor is actually an 1-origin integers with attributes.
			this.sexp = R.libR.Rf_allocVector(SEXPTYPE.INTSXP, value.length);
			this.protect();
			let p = ref.reinterpret(this.dataptr(), ref.types.int.size * value.length);
			value.map((e, i) => {
				ref.set(
					p, ref.types.int.size * i,
					e === void 0 ? R.R_NaInt : e, ref.types.int
				);
			});

			if(value instanceof RFactor){
				// add atribute
				this.setAttribute("class", value.ordered ? ["factor", "ordered"] : "factor");
				this.setAttribute("levels", value.levels);
			}
			this.unprotect();
		}else if(value instanceof RRealArray){
			// assume this is array of numbers (e.g. [1, 2, 3, ...])
			this.sexp = R.libR.Rf_allocVector(SEXPTYPE.REALSXP, value.length);
			this.protect();
			let p = ref.reinterpret(this.dataptr(), ref.types.double.size * value.length);
			value.map((e, i) => {
				ref.set(p, ref.types.double.size * i, 1.0 * e /* convert to double */, ref.types.double);
			});
			// Find NA and set 1954. (sizeof(double) = sizeof(int) * 2)
			p = ref.reinterpret(this.dataptr(), ref.types.int.size * 2 * value.length);
			value.map((e, i) => {
				if(e === void 0){ ref.set(p, ref.types.int.size * i * 2, 1954, ref.types.int); }
			});
			this.unprotect();
		}else if(value instanceof RBoolArray){
			// assume this is array of boolean (e.g. [false, true, true, ...])
			// to handle NA, we use int instead of bool.
			this.sexp = R.libR.Rf_allocVector(SEXPTYPE.LGLSXP, value.length);
			this.protect();
			let p = ref.reinterpret(this.dataptr(), ref.types.int.size * value.length);
			value.map((e, i) => {
				const value = e === void 0 ? R.R_NaInt : ( e ? 1 : 0 );
				ref.set(p, ref.types.int.size * i, value, ref.types.int);
			});
			this.unprotect();
		}else if(value instanceof RStrArray){
			// assuming this is array of strings (e.g. ["abc", "def", ...])
			this.sexp = R.libR.Rf_allocVector(SEXPTYPE.STRSXP, value.length);
			this.protect();
			value.map((e, i) => {
				if(e !== void 0){
					R.libR.SET_STRING_ELT(this.sexp, i, R.libR.Rf_mkCharCE(e, cetype_t.CE_UTF8));
				}else{
					R.libR.SET_STRING_ELT(this.sexp, i, R.R_NaString.sexp);
				}
			});
			this.unprotect();
		}else if(value instanceof RComplexArray){
			this.sexp = R.libR.Rf_allocVector(SEXPTYPE.CPLXSXP, value.length);
			this.protect();
			let p = ref.reinterpret(this.dataptr(), ComplexInR.size * value.length);
			value.map(
				(e) => new ComplexInR({r: e.real, i: e.im})).map(
				(e, i) => {
					ref.set(p, ComplexInR.size * i, e, ComplexInR);
				});
			this.unprotect();
		}else if(value instanceof RDataFrame){
			let dfitem_sexp = [];
			for (var [k, v] of value){
				const v_sexp = new SEXPWrap(v);
				v_sexp.protect();
				v_sexp.argtag = k;
				dfitem_sexp.push(v_sexp);
			}
			const false_sexp = new SEXPWrap(false);
			false_sexp.protect();
			false_sexp.argtag = "stringsAsFactors";
			dfitem_sexp.push(false_sexp);
			const r = new R();
			const dataFrame = r.func_raw("data.frame");
			const df_sexp = dataFrame(...dfitem_sexp);
			df_sexp.protect();
			for (const item in value){
				df_sexp[item].unprotect();
			}
			false_sexp.unprotect();
			this.sexp = df_sexp.sexp;
			df_sexp.unprotect();
		}else{
			console.log("Cannot convert " + typeof(value) + " in JavaScript to R SEXP / " + value);
		}
	}
	/** Protect this SEXP */
	protect(){ R.libR.Rf_protect(this.sexp); }
	/** Unprotect SEXPs */
	static unprotect(depth=1){ R.libR.Rf_unprotect(depth); }
	unprotect(depth=1){ R.libR.Rf_unprotect(depth); }
	/** Preserve this SEXP. Please use protect() if you can. */
	preserve(){ R.libR.R_PreserveObject(this.sexp); }
	/** Release preserved SEXP. protect()ed SEXP should be released with unprotect() */
	release(){ R.libR.R_ReleaseObject(this.sexp); }
	/** Return true if this SEXP is List. */
	isList(){ return R.libR.Rf_isList(this.sexp); }
	/** Return true if this SEXP is Vector. Please note single scalar value in R is vector. */
	isVector(){ return R.libR.Rf_isVector(this.sexp); }
	/** Return the length of vector. */
	length(){ return R.libR.Rf_length(this.sexp); }
	/** Return true if this SEXP is null. */
	isNull(){ return R.libR.Rf_isNull(this.sexp); }
	isComplex(){ return R.libR.Rf_isComplex(this.sexp); }
	isExpression(){ return R.libR.Rf_isExpression(this.sexp); }
	isInteger(){ return R.libR.Rf_isInteger(this.sexp); }
	isLogical(){ return R.libR.Rf_isLogical(this.sexp); }
	isReal(){ return R.libR.Rf_isReal(this.sexp); }
	isValidString(){ return R.libR.Rf_isValidString(this.sexp); }
	isFactor(){ return R.libR.Rf_isFactor(this.sexp); }
	isFrame(){ return R.libR.Rf_isFrame(this.sexp); }
	isSymbol(){ return R.libR.Rf_isSymbol(this.sexp); }
	isFunction(){ return R.libR.Rf_isFunction(this.sexp); }
	dataptr(){ return R.libR.DATAPTR(this.sexp); }
	getType(){ return R.libR.TYPEOF(this.sexp); } 
	asChar(){
		if(this.sexp.address() == R.R_NaString.sexp.address()){ return void 0;}
		if(this.sexp.address() == R.R_BlankString.sexp.address()){ return "";}
		return R.libR.Rf_translateCharUTF8(R.libR.Rf_asChar(this.sexp)).slice();
	}
	/** Return sizeof(SEXP) in byte. */
	get SEXPSize(){
		console.log("!!!");
		if(sexpSize === void 0){
			const intSEXP = new SEXPWrap(0);
			sexpSize = intSEXP.dataptr().address() - intSEXP.sexp.address();
		}
		return sexpSize;
	}
	get names(){
		let names = new SEXPWrap(R.libR.Rf_getAttrib(this.sexp, R.R_NamesSymbol));
		return names.isNull() ? undefined : names.getValue();
	}
	set names(newtag){
		if (newtag === void 0) return;
		R.libR.Rf_setAttrib(this.sexp, R.R_NamesSymbol, (new SEXPWrap(newtag)).sexp);
	}
	/** set attr of this variable. */
	setAttribute(attrname, newattr){
		const attrsymbol = R.libR.Rf_install(attrname);
		R.libR.Rf_setAttrib(this.sexp, attrsymbol, (new SEXPWrap(newattr)).sexp);
	}
	/** get attr of this variable. */
	getAttribute(attrname){
		const attrvalue = new SEXPWrap(this._getAttribute_raw(attrname));
		return attrvalue.getValue();
	}
	/** get attr SEXP of this variable. */
	_getAttribute_raw(attrname){
		const attrsymbol = R.libR.Rf_install(attrname);
		return R.libR.Rf_getAttrib(this.sexp, attrsymbol);
	}
	getValue(){
		if(this.sexp.address() == 0 || this.isNull()){
			return null;
		}
		const len = this.length();
		if(len == 0){
			return [];
		}if(this.isList()){
			// TODO: support this
			/*
			let v = this.sexp;
			return R.range(0, len).map( (e) => {
				let a = R.libR.CAR(v);
				v = R.libR.CDR(v);
				return this._getValue_scalar(a);
			});*/
			console.log("LIST NOT SUPPORTED");
			return undefined;
		}else if(this.isFrame()){
			// DataFrame is Vector of vectors.
			const names = this.names;
			const values = new Map();
			R.range(0, len).map( (i) => {
				const px = new SEXPWrap(R.libR.VECTOR_ELT(this.sexp, i));
				values.set(names[i], px.getValue());
			});
			return values;
		}else if(this.isVector()){		// be careful; is.vector(1) is even True
			let itemtype;
			let values = [];
			if(this.isInteger() || this.isLogical() || this.isFactor()){
				itemtype = ref.types.int;
				const f = this.isLogical() ? (e) => !!e : (e) => e;
				const p = ref.reinterpret(this.dataptr(), itemtype.size * len);
				values = R.range(0, len).map( (i) => ref.get(p, itemtype.size * i, itemtype) )
					.map( (e) => e == R.R_NaInt ? undefined : f(e));
				if(this.isFactor()){
					const levels = this.getAttribute("levels");
					const class_ = this.getAttribute("class");
					const isOrdered = Array.isArray(class_) && class_.indexOf("ordered") !== -1;
					values = new RFactor(values.map((v) => levels[v - 1]), levels, isOrdered);
				}
			}else if(this.isReal()){
				itemtype = ref.types.double;
				const p = ref.reinterpret(this.dataptr(), itemtype.size * len);
				values = R.range(0, len).map( (i) => ref.get(p, itemtype.size * i, itemtype) );
				/* Discriminate NA from NaN (1954; the year Ross Ihaka was born) */
				/* see main/arithmetic.c for detail. */
				itemtype = ref.types.uint;
				const q = ref.reinterpret(this.dataptr(), itemtype.size * len * 2);
				R.range(0, len).map( (i) => {
					if(isNaN(values[i])){
						if(ref.get(q, itemtype.size * i * 2, itemtype) == 1954) values[i] = undefined;
					}
				});
			}else if(this.isComplex()){
				itemtype = ComplexInR;
				const p = ref.reinterpret(this.dataptr(), itemtype.size * len);
				values = R.range(0, len).map( (i) => ref.get(p, itemtype.size * i, itemtype))
					.map( (e) => new Complex(e.r, e.i));
			}else if(this.isValidString()){
				values = R.range(0, len).map((i) => R.libR.STRING_ELT(this.sexp, i))
					.map((e) => {
						const s = new SEXPWrap(e);
						return s.asChar();
					});
			}else if(this.isExpression()){
				debug("getValue() for RExpression");
				values = ["(R Expression)"];
			}else{
				values = ["Unsupported vector item!"];
			}
			return values.length == 1 ? values[0] : values;
		}else if(this.isSymbol()){
			return "[R Symbol]";
		}else if(this.isFunction()){
			return "[R Function]";
		}else{
			switch(this.getType()){
			case 5:
				debug("Promissed value: Get before evaluation");
				return "[Promiss: Unevaluated value]";
			default:
				debug("Unknown type: " + this.getType());
				return "[unknown type]";
			}
		}
	}
	_getValue_scalar(sexp){
		// 'Number' includes complex, 'Vector' includes Array and Matrix
		if(R.libR.Rf_isInteger(sexp)){
			return R.libR.Rf_asInteger(sexp);
		}else if(R.libR.Rf_isNumeric(sexp)){
			return R.libR.Rf_asReal(sexp);
		}else if(R.libR.Rf_isValidString(sexp)){
			return R.libR.Rf_translateCharUTF8(R.libR.Rf_asChar(sexp)).slice();
		}else{
			return "SEXPWRAP: unknown SEXP Type";
		}
	}
}

/*
 * vim: filetype=javascript
 */
