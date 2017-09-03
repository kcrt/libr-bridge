import child_process from 'child_process';
import process from 'process';
import path from 'path';

import ffi from 'ffi';
import ref from 'ref';
import refArray from 'ref-array';

/* Type */
const stringPtr = ref.refType(ref.types.CString)		// char ** or string*
const stringPtrPtr = ref.refType(stringPtr)				// char *** or string**
const stringArr = refArray(ref.types.CString)			// char * [] or string[]
const intPtr = ref.refType(ref.types.int)
export const SEXP = ref.refType(ref.types.void);
export const SEXPTYPE = ref.types.int;
export const SEXPREC_ALIGN_SIZE = ref.types.double.size;
export const REALSXP = 14;

const apiList = {
	"Rf_initialize_R": ["int", ["int", stringArr]],
	"Rf_initEmbeddedR": ["int", ["int", stringArr]],	// int Rf_initEmbeddedR(int argc, char *argv[]);
	"R_setStartTime": ["void", []],				// void R_setStartTime(void);
	"Rf_endEmbeddedR": ["void", ["int"]],				// void Rf_endEmbeddedR(int fatal);
	"R_sysframe": [SEXP, ["int", "pointer"]],
	"Rf_findFun": [SEXP, [SEXP, SEXP]], // SEXP Rf_findFun(SEXP, SEXP)
	"Rf_findVar": [SEXP, [SEXP, SEXP]], // SEXP Rf_findVar(SEXP, SEXP)
	"Rf_setVar": [SEXP, [SEXP, SEXP, SEXP]],
	"Rf_mainloop": ["void", []], // void Rf_mainloop();
	"R_PreserveObject": ["void", [SEXP]],
	"R_ReleaseObject": ["void", [SEXP]],
	"Rf_allocVector": [SEXP, [SEXPTYPE, "int"]], // SEXP Rf_allocVector(SEXPTYPE, int R_xlen_t);
	"Rf_ScalarInteger": [SEXP, ["int"]],
	"Rf_ScalarReal": [SEXP, ["double"]],		// SEXP ScalarReal(double x)	
	"Rf_ScalarLogical": [SEXP, ["int"]],
	"Rf_protect": [SEXP, [SEXP]],
	"Rf_unprotect": ["void", ["int"]],
	"Rf_install": [SEXP, ["string"]],
	"Rf_mkString": [SEXP, [stringPtr]],
	"Rf_defineVar": ["void", [SEXP, SEXP, "pointer"]],
	"Rf_asLogical": ["int", [SEXP]],
	"Rf_asInteger": ["int", [SEXP]],
	"Rf_asChar": [SEXP, [SEXP]],
	"R_CHAR": ["string", [SEXP]],
	"Rf_asReal": ["double", [SEXP]],
	"Rf_translateCharUTF8": ["string", [SEXP]],			// const char* Rf_translateCharUTF8(SEXP x)
	"Rf_isArray": ["int", [SEXP]],						// Rboolean Rf_isArray(SEXP);
	"Rf_isFactor": ["int", [SEXP]],						// Rboolean Rf_isFactor(SEXP);
	"Rf_isFunction": ["int", [SEXP]],						// Rboolean Rf_isFunction(SEXP);
	"Rf_isInteger": ["int", [SEXP]],						// Rboolean Rf_isInteger(SEXP);
	"Rf_isLogical": ["int", [SEXP]],						// Rboolean Rf_isLogical(SEXP);
	"Rf_isReal": ["int", [SEXP]],						// Rboolean Rf_isReal(SEXP);
	"Rf_isNumber": ["int", [SEXP]],						// Rboolean Rf_isNumber(SEXP);
	"Rf_isNumeric": ["int", [SEXP]],						// Rboolean Rf_isNumeric(SEXP);
	"Rf_isList": ["int", [SEXP]],						// Rboolean Rf_isList(SEXP);
	"Rf_isMatrix": ["int", [SEXP]],						// Rboolean Rf_isMatrix(SEXP);
	"Rf_isPrimitive": ["int", [SEXP]],						// Rboolean Rf_isPrimitive(SEXP);
	"Rf_isValidString": ["int", [SEXP]],						// Rboolean Rf_isValidString(SEXP);
	"Rf_isVector": ["int", [SEXP]],						// Rboolean Rf_isVector(SEXP);
	"Rf_isNull": ["int", [SEXP]],						// Rboolean Rf_isNull(SEXP);
	"Rf_isS4": ["int", [SEXP]],						// Rboolean Rf_isS4(SEXP);
	"Rf_isString": ["int", [SEXP]],						// Rboolean Rf_isString(SEXP);
	"Rf_lang1": [SEXP, [SEXP]],
	"Rf_lang2": [SEXP, [SEXP, SEXP]],
	"Rf_lang3": [SEXP, [SEXP, SEXP, SEXP]],
	"Rf_lang4": [SEXP, [SEXP, SEXP, SEXP, SEXP]],
	"Rf_lang5": [SEXP, [SEXP, SEXP, SEXP, SEXP, SEXP]],
	"Rf_lang6": [SEXP, [SEXP, SEXP, SEXP, SEXP, SEXP, SEXP]],
	"Rf_length": ["int", [SEXP]],
	"Rf_eval": [SEXP, [SEXP, intPtr]],
	"R_ParseEvalString": [SEXP, ["string", SEXP]],
	"R_tryEval": [SEXP, [SEXP, SEXP, intPtr]],// SEXP R_tryEval(SEXP e, SEXP env, int *ErrorOccurred)
	"R_PreserveObject": ["void", [SEXP]],
	"R_ReleaseObject": ["void", [SEXP]],
	"Rf_elt": [SEXP, [SEXP, "int"]],
	"VECTOR_ELT": [SEXP, [SEXP, "int"]],
	"CAR": [SEXP, [SEXP]],
	"CDR": [SEXP, [SEXP]],
	"TAG": [SEXP, [SEXP]],
	"SET_TAG": ["void", [SEXP, SEXP]],
	"STRING_PTR": ["pointer", [SEXP]],		// we use this instead of DATAPTR
	"Rf_lcons": [SEXP, [SEXP, SEXP]],
	"Rf_cons": [SEXP, [SEXP, SEXP]],
	"R_NilValue": [SEXP, []],
	"TYPEOF": ["int", [SEXP]],
	"Rf_lengthgets": [SEXP, [SEXP]],
	"Rf_GetRowNames": [SEXP, [SEXP]],
	"STRING_ELT": [SEXP, [SEXP, "int"]],					// memory.c
	"SET_STRING_ELT": [SEXP, [SEXP, "int", SEXP]],			// memory.c
	"NAMED": ["int", [SEXP]],
	"SET_NAMED": ["void", [SEXP, "int"]],
	"Rf_getAttrib": [SEXP, [SEXP, SEXP]],
	"Rf_setAttrib": [SEXP, [SEXP, SEXP, SEXP]],
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
					throw "R not found. Please specify path manually."
				}
			}
		}
	}else if(r_path == "environment"){
		// use environmental R_HOME
		if(process.env.R_HOME !== void 0){
			libR = createLibR(process.env.R_HOME);
		}
	}else if(r_path == "system"){
	// Rscript -e "cat(Sys.getenv('R_HOME'))"
		// TODO: Windows registory
		let ret;
		try {
			ret = child_process.execSync(`Rscript -e "cat(Sys.getenv('R_HOME'))"`);
			libR = createLibR(ret.toString())
		}catch(e){
			throw "Couldn't find installed R (RScript not found)";
		}
	}else if(r_path == "buildin"){
		throw "NOT IMPLEMENTED.";
	}else if(r_path == ""){
		throw "Please specify r_path of R_HOME.";
	}else{
		// assuming path to R_HOME is specified.
		const delim = path.delimiter;
		if(r_path.slice(-1) == path.sep) r_path = r_path.slice(0, -1);	// remove trailing "/" (or "\")
		process.env.R_HOME = r_path;
		process.env.LD_LIBRARY_PATH = `${r_path}${delim}${r_path}/lib${delim}` + process.env.LD_LIBRARY_PATH;
		process.env.DYLD_LIBRARY_PATH = `${r_path}${delim}${r_path}/lib${delim}` + process.env.DYLD_LIBRARY_PATH;
		libR = ffi.Library("libR", apiList)
	}

	if(libR == undefined){
		throw "Couldn't read libR";
	}

	return libR;

}
/*
 * vim: filetype=javascript
 */
