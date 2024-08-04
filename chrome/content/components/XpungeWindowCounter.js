var EXPORTED_SYMBOLS = ["XpungeWindowCounter"];

var XpungeWindowCounter = {
	windowCounter : 0,

	getWindowCounter : function() {
		return this.windowCounter;
	},

	setWindowCounter : function(newValue) {
		this.windowCounter = newValue;
	}
};

