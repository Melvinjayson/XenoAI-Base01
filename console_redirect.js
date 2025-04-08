console.log = function() { var args = Array.prototype.slice.call(arguments); var formatted = args.join(" "); console.warn(formatted); };
