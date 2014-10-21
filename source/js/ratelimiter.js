var RateLimiter = {
    throttle: function(rawParams, func) {
	var defaults = {delay: 200, no_trailing: false};
	var params = $.extend(defaults, rawParams);    
	var timer;
	// If no_trailing false or unspecified
	if (!params.no_trailing) {
	    return function() {
		var args = arguments;
		debounce({delay: params.delay, at_begin: true}, function() {
		    func.apply(this, args);
		})();
		
		if (!timer) {
		    timer = window.setTimeout(function() {
			timer = null;
			func.apply(this, args);
		    }.bind(this), params.delay);
		}
	    }
	}

	// If no_trailing set to true
	return function() {
	    var args = arguments;
	    if (!timer) {
		func.apply(this, args);
		timer = window.setTimeout(function() {
		    timer = null;
		}.bind(this), params.delay);
	    }
	}
    },

    debounce: function(rawParams, func) {
	var defaults = {delay: 200, at_begin: false};
	var params = $.extend(defaults, rawParams);
	var timer;
	if (!at_begin) {
	    return function() {
		window.clearTimeout(timer);
		var args = arguments;
		timer = window.setTimeout(function() {
		    func.apply(this, args);
		}.bind(this), params.delay);
	    };
	}

	return function() {
	    if (!timer) {
		func.apply(this, arguments);
		timer = window.setTimeout(function() {
		    timer = null;
		});
	    } else {
		window.clearTimeout(timer);
	    }
	};
    }
}
