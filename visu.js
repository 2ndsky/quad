// idleTimer() takes an optional argument that defines the idle timeout
// timeout is in milliseconds; defaults to 30000
$(document).on('pageinit', function() {
    if (navigator.userAgent.match(/iPad/i) != null) {
        $.idleTimer(120 * 1000);
    }
});

$(document).bind('idle.idleTimer', function() {
    $.mobile.changePage("index.php?page=qlock");
});

$(document).bind('active.idleTimer', function() {
    parent.history.back();
});

// -----------------------------------------------------------------------------
// W I D G E T   D E L E G A T E   F U N C T I O N S
// -----------------------------------------------------------------------------



// ----- v i s u ---------------------------------------------------------------
// -----------------------------------------------------------------------------

// ----- visu.percent ----------------------------------------------------------
$(document).delegate('[data-widget="visu.percent"]', {
        'update': function(event, response) {
                $('#' + this.id).html(Math.round(parseInt(response) / 255 * 100) + ' %');
    }
});


// ----- visu.shutter ----------------------------------------------------------
$(document).delegate('[data-widget="visu.button"]', {
        'vmousedown': function(event) { // Short/Long Button
            event.preventDefault();
	    var items = widget.explode($(this).attr('data-item'));
            var obj = this;
            $(obj).attr('data-timer',
                setTimeout(function() {
                    $(obj).attr('data-long', true);
                    io.write(items[1], $(obj).attr('data-val'));
                }, 400)
            );
        },
        'vmouseup': function() { // Short/Long Button
            clearTimeout($(this).attr('data-timer'))
	    var items = widget.explode($(this).attr('data-item'));
            if ($(this).attr('data-long') == 'true') {
                $(this).attr('data-long', false);
            } else {
	        io.write(items[0], $(this).attr('data-val'));
            }
        },
        'click': function(event) {
        
	}
});

// ----- visu.shifter ----------------------------------------------------------
$(document).delegate('span[data-widget="visu.shifter"]', { 
        'update': function(event, response) {
        var step = Math.min((response / $(this).attr('data-max') * 10 + 0.49).toFixed(0) * 10, 100);
        $('#' + this.id + ' img').attr('src', $(this).attr('data-pic').replace('00', step));
    }
});
