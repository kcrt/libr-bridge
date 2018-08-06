"use strict";
import child_process from "child_process";
import process from "process";
import path from "path";

import ffi from "ffi";
import ref from "ref";
import refArray from "ref-array";
import refStruct from "ref-struct";

import { default as windowsRegistry } from "./safe-windows-registry.js";

import debug_ from "debug";
const debug = debug_("libr-bridge:libR");

/* Type */
const stringArr = refArray(ref.types.CString);			// char * [] or string[]
export const SEXP = ref.refType(ref.types.void);
export const SEXPREC_ALIGN_SIZE = ref.types.double.size;
export const ComplexInR = refStruct({
	r: ref.types.double,
	i: ref.types.double
});

/** R SEXP type enums */
export const SEXPTYPE = {
	NILSXP		: 0,	/* nil : NULL */
	SYMSXP		: 1,	/* symbols */
	LISTSXP		: 2,	/* lists of dotted pairs */
	CLOSXP		: 3,	/* closures */
	ENVSXP		: 4,	/* environments */
	PROMSXP		: 5,	/* promises: [un]evaluated closure arguments */
	LANGSXP		: 6,	/* language constructs (special lists) */
	SPECIALSXP	: 7,	/* special forms */
	BUILTINSXP	: 8,	/* builtin non-special forms */
	CHARSXP		: 9,	/* "scalar" string type (internal only)*/
	LGLSXP		: 10,	/* logical vectors */
	INTSXP		: 13,	/* integer vectors */
	REALSXP		: 14,	/* real variables */
	CPLXSXP		: 15,	/* complex variables */
	STRSXP		: 16,	/* string vectors */
	DOTSXP		: 17,	/* dot-dot-dot object */
	ANYSXP		: 18,	/* make "any" args work */
	VECSXP		: 19,	/* generic vectors */
	EXPRSXP		: 20,	/* expressions vectors */
	BCODESXP	: 21,	/* byte code */
	EXTPTRSXP	: 22,	/* external pointer */
	WEAKREFSXP	: 23,	/* weak reference */
	RAWSXP		: 24,	/* raw bytes */
	S4SXP		: 25,	/* S4 non-vector */
	NEWSXP		: 30,   /* fresh node creaed in new page */
	FREESXP		: 31,   /* node released by GC */
	FUNSXP		: 99	/* Closure or Builtin */
};

export const ParseStatus = {
	PARSE_NULL: 0,
	PARSE_OK: 1,
	PARSE_INCOMPLETE: 2,
	PARSE_ERROR: 3,
	PARSE_EOF: 4
};

export const cetype_t = {
	CE_NATIVE : 0,
	CE_UTF8   : 1,
	CE_LATIN1 : 2,
	CE_BYTES  : 3,
	CE_SYMBOL : 5,
	CE_ANY    : 99
};

const apiList = {
	"CAR": [SEXP, [SEXP]], 
	"CDR": [SEXP, [SEXP]],
	"NAMED": ["int", [SEXP]],
	"R_CHAR": ["string", [SEXP]],
	"R_curErrorBuf": ["string", []],
	"R_NilValue": [SEXP, []],
	// "R_ParseEvalString": [SEXP, ["string", SEXP]],	- I don't know why, but Windows dll doesn't have this function.
	"R_ParseVector": [SEXP, [SEXP, "int", "int*", SEXP]], // SEXP R_ParseVector(SEXP text, int n, ParseStatus *status, SEXP srcfile)
	"R_PreserveObject": ["void", [SEXP]],
	"R_ReleaseObject": ["void", [SEXP]],
	"R_setStartTime": ["void", []],						// void R_setStartTime(void);
	// "R_sysframe": [SEXP, ["int", "pointer"]],
	"R_tryEval": [SEXP, [SEXP, SEXP, "int*"]],			// SEXP R_tryEval(SEXP e, SEXP env, int *ErrorOccurred)
	"R_tryEvalSilent": [SEXP, [SEXP, SEXP, "int*"]],	// SEXP R_tryEvalSilent(SEXP e, SEXP env, int *ErrorOccurred)
	"Rf_GetRowNames": [SEXP, [SEXP]],
	"Rf_ScalarInteger": [SEXP, ["int"]],
	"Rf_ScalarLogical": [SEXP, ["int"]],
	"Rf_ScalarReal": [SEXP, ["double"]],				// SEXP ScalarReal(double x)	
	"Rf_allocVector": [SEXP, ["int", "int"]],			// SEXP Rf_allocVector(SEXPTYPE, int R_xlen_t);
	"Rf_asChar": [SEXP, [SEXP]],
	"Rf_asInteger": ["int", [SEXP]],
	"Rf_asLogical": ["int", [SEXP]],
	"Rf_asReal": ["double", [SEXP]],
	"Rf_cons": [SEXP, [SEXP, SEXP]],
	"Rf_defineVar": ["void", [SEXP, SEXP, "pointer"]],
	"Rf_elt": [SEXP, [SEXP, "int"]],
	"Rf_endEmbeddedR": ["void", ["int"]],				// void Rf_endEmbeddedR(int fatal);
	"Rf_eval": [SEXP, [SEXP, "int*"]],
	"Rf_findFun": [SEXP, [SEXP, SEXP]],					// SEXP Rf_findFun(SEXP, SEXP)
	"Rf_findVar": [SEXP, [SEXP, SEXP]],					// SEXP Rf_findVar(SEXP, SEXP)
	"Rf_getAttrib": [SEXP, [SEXP, SEXP]],
	"Rf_initEmbeddedR": ["int", ["int", stringArr]],	// int Rf_initEmbeddedR(int argc, char *argv[]);
	"Rf_initialize_R": ["int", ["int", stringArr]],
	"Rf_install": [SEXP, ["string"]],
	"Rf_isArray": ["int", [SEXP]],						// Rboolean Rf_isArray(SEXP);
	"Rf_isComplex": ["int", [SEXP]],					// Rboolean Rf_isComplex(SEXP);
	"Rf_isExpression": ["int", [SEXP]],					// Rboolean Rf_isExpression(SEXP);
	"Rf_isFactor": ["int", [SEXP]],						// Rboolean Rf_isFactor(SEXP);
	"Rf_isFunction": ["int", [SEXP]],					// Rboolean Rf_isFunction(SEXP);
	"Rf_isInteger": ["int", [SEXP]],					// Rboolean Rf_isInteger(SEXP);
	"Rf_isList": ["int", [SEXP]],						// Rboolean Rf_isList(SEXP);
	"Rf_isLogical": ["int", [SEXP]],					// Rboolean Rf_isLogical(SEXP);
	"Rf_isMatrix": ["int", [SEXP]],						// Rboolean Rf_isMatrix(SEXP);
	"Rf_isNull": ["int", [SEXP]],						// Rboolean Rf_isNull(SEXP);
	"Rf_isNumber": ["int", [SEXP]],						// Rboolean Rf_isNumber(SEXP);
	"Rf_isNumeric": ["int", [SEXP]],					// Rboolean Rf_isNumeric(SEXP);
	"Rf_isPrimitive": ["int", [SEXP]],					// Rboolean Rf_isPrimitive(SEXP);
	"Rf_isReal": ["int", [SEXP]],						// Rboolean Rf_isReal(SEXP);
	"Rf_isS4": ["int", [SEXP]],							// Rboolean Rf_isS4(SEXP);
	"Rf_isString": ["int", [SEXP]],						// Rboolean Rf_isString(SEXP);
	"Rf_isValidString": ["int", [SEXP]],				// Rboolean Rf_isValidString(SEXP);
	"Rf_isVector": ["int", [SEXP]],						// Rboolean Rf_isVector(SEXP);
	"Rf_isFrame": ["int", [SEXP]],						// Rboolean Rf_isFrame(SEXP);
	"Rf_isSymbol": ["int", [SEXP]],						// Rboolean Rf_isSymbol(SEXP);
	"Rf_lang1": [SEXP, [SEXP]],
	"Rf_lang2": [SEXP, [SEXP, SEXP]],
	"Rf_lang3": [SEXP, [SEXP, SEXP, SEXP]],
	"Rf_lang4": [SEXP, [SEXP, SEXP, SEXP, SEXP]],
	"Rf_lang5": [SEXP, [SEXP, SEXP, SEXP, SEXP, SEXP]],
	"Rf_lang6": [SEXP, [SEXP, SEXP, SEXP, SEXP, SEXP, SEXP]],
	"Rf_lcons": [SEXP, [SEXP, SEXP]],
	"Rf_length": ["int", [SEXP]],
	"Rf_lengthgets": [SEXP, [SEXP]],
	"Rf_mainloop": ["void", []],						// void Rf_mainloop();
	"Rf_mkChar": [SEXP, ["string"]],
	"Rf_mkCharCE": [SEXP, ["string", "int"]],
	"Rf_mkString": [SEXP, ["string"]],
	"Rf_protect": [SEXP, [SEXP]],
	"Rf_setAttrib": [SEXP, [SEXP, SEXP, SEXP]],
	"Rf_setVar": [SEXP, [SEXP, SEXP, SEXP]],
	"Rf_translateCharUTF8": ["string", [SEXP]],			// const char* Rf_translateCharUTF8(SEXP x)
	"Rf_unprotect": ["void", ["int"]],
	"SET_NAMED": ["void", [SEXP, "int"]],
	"SET_STRING_ELT": [SEXP, [SEXP, "int", SEXP]],		// memory.c
	"SET_TAG": ["void", [SEXP, SEXP]],
	"STRING_ELT": [SEXP, [SEXP, "int"]],				// memory.c
	"STRING_PTR": ["pointer", [SEXP]],					// memory.c
	"ALTVEC_DATAPTR": ["pointer", [SEXP]],
	"STDVEC_DATAPTR": ["pointer", [SEXP]],
	"DATAPTR": ["pointer", [SEXP]],
	"TAG": [SEXP, [SEXP]],
	"TYPEOF": ["int", [SEXP]],
	"VECTOR_ELT": [SEXP, [SEXP, "int"]],
	"ptr_R_Busy": ["pointer", undefined],	// void R_Busy (int which)
	"ptr_R_ShowMessage": ["pointer", undefined],	// void R_ShowMessage(const char *s)
	"ptr_R_ReadConsole": ["pointer", undefined],	// int R_ReadConsole(const char *prompt, unsigned char *buf, int len, int addtohistory);
	"ptr_R_WriteConsole": ["pointer", undefined],		// void R_WriteConsole(const char *buf, int len)
	"ptr_R_WriteConsoleEx": ["pointer", undefined],	// void R_WriteConsoleEx(const char *buf, int len, int otype)
	"R_GlobalEnv": [SEXP, undefined], 
	"R_NaString": [SEXP, undefined], 
	"R_BlankString": [SEXP, undefined], 
	//"R_IsNA": ["int", [ieee_double]],					// Rboolean R_IsNA(double);
	//"R_IsNaN": ["int", [ieee_double]],				// Rboolean R_IsNaN(double);
};

var libR = undefined;

/**
 * Load libR from appropriate place.
 *	@constructor
 *	@param r_path			"auto" (default) || "environment" || "system" || "buildin" || path to R_HOME
 *							"auto" - try "environment" -> "system" -> "buildin"
 *							"environment" - use environmental R_HOME and LD_LIBRARY_PATH. libr-bridge handles nothing.
 *							"system" - find system installed R
 *							"buildin" - (NOT IMPLEMENTED) use redistributed binary attached with libr-bridge-bin
 *	@returns libR object which enables access to dynamic link library.
 */
export default function createLibR(r_path = "auto"){

	if(libR !== void 0){
		return libR;
	}

	debug(`creating libR: ${r_path}`);

	if(r_path == "auto"){
		try{
			libR = createLibR("environment");
		}catch(e){
			try{
				libR = createLibR("system");
			}catch(e){
				try{
					libR = createLibR("buildin");
				}catch(e){
					throw new Error("R not found. Please specify path manually.");
				}
			}
		}
	}else if(r_path == "environment"){
		// use environmental R_HOME
		if(process.env.R_HOME !== void 0){
			libR = createLibR(process.env.R_HOME);
		}
	}else if(r_path == "system"){
		let my_path;
		try {
			if (process.platform == "win32") {
				const windef = windowsRegistry.windef;
				let k;
				try {
					k = new windowsRegistry.Key(windef.HKEY.HKEY_LOCAL_MACHINE, "SOFTWARE\\R-core\\R", windef.KEY_ACCESS.KEY_READ);
				}catch(e){
					debug("No key in HLM, finding HCU.");
					k = new windowsRegistry.Key(windef.HKEY.HKEY_CURRENT_USER, "SOFTWARE\\R-core\\R", windef.KEY_ACCESS.KEY_READ);
				}
				my_path = k.getValue("InstallPath");
				k.close();
			}else{
				const ret = child_process.execSync("Rscript -e \"cat(Sys.getenv('R_HOME'))\"");
				my_path = ret.toString();
			}
			libR = createLibR(my_path);
		}catch(e){
			debug("Loading system R failure: " + e);
			throw new Error("Couldn't load installed R (RScript not found or bad registry)");
		}
	}else if(r_path == "buildin"){
		throw new Error("NOT IMPLEMENTED.");
	}else if(r_path == ""){
		throw new Error("Please specify installed R.");
	}else{
		// assuming path of installed R is specified.
		const delim = path.delimiter;
		if(r_path.slice(-1) == path.sep) r_path = r_path.slice(0, -1);	// remove trailing "/" (or "\")
		process.env.R_HOME = r_path;
		if (process.platform == "win32") {
			process.env.PATH = `${r_path}\\bin\\x64${delim}` + process.env.PATH;
			libR = ffi.Library(`${r_path}\\bin\\x64\\R.dll`, apiList);
		}else{
			process.env.LD_LIBRARY_PATH = `${r_path}${delim}${r_path}/lib${delim}` + process.env.LD_LIBRARY_PATH;
			process.env.DYLD_LIBRARY_PATH = `${r_path}${delim}${r_path}/lib${delim}` + process.env.DYLD_LIBRARY_PATH;
			libR = ffi.Library("libR", apiList);
		}
	}

	if(libR == undefined){
		throw new Error("Couldn't read libR");
	}

	return libR;

}
/*
 * vim: filetype=javascript
 */
