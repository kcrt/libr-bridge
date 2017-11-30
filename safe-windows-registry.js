if (process.platform == "win32") {
	module.exports = require("windows-registry")
}else{
	module.exports = void 0;
}
